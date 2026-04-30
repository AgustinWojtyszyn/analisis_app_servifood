import './config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import analysisRoutes from './routes/analysis.js';
import rulesRoutes from './routes/rules.js';
import { authenticateToken, requireAdmin } from './middlewares/auth.js';
import { uploadAndAnalyze } from './controllers/analysisController.js';

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ storage: multer.memoryStorage() });

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Alias compatible con frontend: POST /api/upload-excel
app.post('/api/upload-excel', authenticateToken, requireAdmin, upload.single('excel'), uploadAndAnalyze);

// Rutas API
app.use('/api/analysis', analysisRoutes);
app.use('/api/rules', rulesRoutes);

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
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

app.listen(PORT, () => {
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SUPABASE_KEY_OK:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(`Servidor ejecutandose en http://localhost:${PORT}`);
});

export default app;
