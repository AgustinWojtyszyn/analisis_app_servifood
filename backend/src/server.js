import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import analysisRoutes from './routes/analysis.js';
import rulesRoutes from './routes/rules.js';
import healthDeclarationsRoutes from './routes/healthDeclarations.js';
import nutritionModulesRoutes from './routes/nutritionModules.js';
import adminUsersRoutes from './routes/adminUsers.js';
import certificationRoutes from './routes/certificationRoutes.js';
import { authenticateToken, requireAdmin } from './middlewares/auth.js';
import { uploadAndAnalyze } from './controllers/analysisController.js';
import { upload, MAX_EXCEL_FILE_SIZE_MB } from './middlewares/upload.js';

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const enableStartupDiagnostics = !isProduction || process.env.DEBUG_STARTUP === '1';

function resolveTrustProxy() {
  const raw = String(process.env.TRUST_PROXY || '').trim().toLowerCase();
  if (!raw) return isProduction ? 1 : false;
  if (raw === 'true') return 1;
  if (raw === 'false') return false;
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 1;
}

app.set('trust proxy', resolveTrustProxy());

function buildRateLimitHandler(message) {
  return (_req, res) => res.status(429).json({ error: message });
}

function buildRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
    handler: buildRateLimitHandler(message)
  });
}

const apiLimiter = buildRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: 'Demasiadas solicitudes. Intentá nuevamente en unos minutos.'
});

const authLimiter = buildRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Demasiados intentos de autenticación. Intentá nuevamente en unos minutos.'
});

const exportLimiter = buildRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Demasiadas solicitudes de exportación. Intentá nuevamente en unos minutos.'
});

const adminLimiter = buildRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Demasiadas operaciones administrativas. Intentá nuevamente en unos minutos.'
});

const expensiveLimiter = buildRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Demasiadas operaciones costosas. Intentá nuevamente más tarde.'
});

function normalizeOrigin(origin = '') {
  return String(origin).trim().replace(/\/+$/, '');
}

function resolveRequestOrigin(req) {
  const forwardedProtoHeader = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProtoHeader || req.protocol || 'https';
  const forwardedHostHeader = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHostHeader || req.headers.host || '';
  if (!host) return '';
  return normalizeOrigin(`${protocol}://${host}`);
}

function extractHostname(value = '') {
  try {
    return new URL(normalizeOrigin(value)).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isSameHostOrigin(req, origin) {
  const originHost = extractHostname(origin);
  if (!originHost) return false;

  const requestOrigin = resolveRequestOrigin(req);
  const requestHost = extractHostname(requestOrigin);
  if (requestHost && requestHost === originHost) return true;

  const rawHost = String(req.headers.host || '').split(':')[0].toLowerCase();
  return rawHost && rawHost === originHost;
}

const envAllowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
]
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const devAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

const allowedOrigins = [...new Set([
  ...envAllowedOrigins,
  ...(!isProduction ? devAllowedOrigins : []).map((origin) => normalizeOrigin(origin))
])];

function isDevLocalOrigin(origin = '') {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function isDevLanOrigin(origin = '') {
  return /^https?:\/\/((10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(192\.168\.\d{1,3}\.\d{1,3})|(172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}))(:\d+)?$/i.test(origin);
}

if (isProduction && allowedOrigins.length === 0) {
  console.warn('[CORS] Producción sin orígenes configurados. Se bloquearán requests de navegador con Origin.');
}

function buildCorsOptions(req, callback) {
  const requestOrigin = req.headers.origin;
  const normalizedOrigin = normalizeOrigin(requestOrigin);
  const sameOrigin = normalizedOrigin && isSameHostOrigin(req, normalizedOrigin);

  const baseOptions = {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  if (!requestOrigin || sameOrigin) {
    return callback(null, { ...baseOptions, origin: true });
  }

  if (allowedOrigins.includes(normalizedOrigin)) {
    return callback(null, { ...baseOptions, origin: true });
  }

  if (!isProduction && (isDevLocalOrigin(normalizedOrigin) || isDevLanOrigin(normalizedOrigin))) {
    return callback(null, { ...baseOptions, origin: true });
  }

  const corsError = new Error('CORS: Origin no permitido');
  corsError.status = 403;
  return callback(corsError);
}

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use('/api', cors(buildCorsOptions));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api', apiLimiter);
app.use(['/api/auth/login', '/api/auth/register', '/api/login', '/api/register'], authLimiter);
app.use([
  '/api/analysis/export',
  '/api/analysis/annual',
  '/api/health-declarations/export',
  '/api/nutrition-modules/:id/export/excel',
  '/api/nutrition-modules/:id/download',
  '/api/nutrition-modules/files/:fileId/download'
], exportLimiter);
app.use([
  '/api/admin',
  '/api/rules',
  '/api/certifications/run-notification-job',
  '/api/certifications/:id/send-test-notification'
], adminLimiter);
app.use([
  '/api/upload-excel',
  '/api/analysis/upload',
  '/api/analysis/upload-excel',
  '/api/analysis/upload-multiple',
  '/api/analysis/reprocess-history',
  '/api/analysis/reprocess-iso-all',
  '/api/analysis/bulk',
  '/api/analysis/all',
  '/api/nutrition-modules/import/zip'
], expensiveLimiter);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Alias compatible con frontend: POST /api/upload-excel
app.post('/api/upload-excel', authenticateToken, requireAdmin, upload.single('excel'), uploadAndAnalyze);

// Rutas API
app.use('/api/analysis', analysisRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api', healthDeclarationsRoutes);
app.use('/api', nutritionModulesRoutes);
app.use('/api', adminUsersRoutes);
app.use('/api', certificationRoutes);

// Servir frontend build (Vite)
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  // No hacer fallback SPA para requests de archivos estaticos (.js, .css, .png, etc)
  if (path.extname(req.path)) {
    return res.status(404).send('Not Found');
  }

  return res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler global
app.use((err, req, res) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `Cada archivo no puede superar el tamaño máximo permitido de ${MAX_EXCEL_FILE_SIZE_MB} MB`
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Se permite un máximo de 10 archivos por solicitud' });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Campo de archivo inesperado o exceso de archivos para este endpoint' });
    }

    return res.status(400).json({ error: `Error de carga de archivo: ${err.message}` });
  }

  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

app.listen(PORT, () => {
  if (enableStartupDiagnostics) {
    console.log(`[CORS] Entorno ${isProduction ? 'producción' : 'desarrollo'}. Orígenes permitidos:`, allowedOrigins);
  }
  console.log(`Servidor ejecutandose en http://localhost:${PORT}`);
});

export default app;
