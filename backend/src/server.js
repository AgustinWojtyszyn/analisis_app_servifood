import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import defaultRules from '../../shared/businessRules/defaultRules.json' assert { type: 'json' };
import { hashPassword } from './utils/auth.js';
import authRoutes from './routes/auth.js';
import analysisRoutes from './routes/analysis.js';
import rulesRoutes from './routes/rules.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  abortOnLimit: true,
  useTempFiles: false
}));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/rules', rulesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
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

// Inicializar BD con datos por defecto
async function initializeDatabase() {
  try {
    console.log('🔄 Inicializando base de datos...');

    // Crear usuario admin por defecto si no existe
    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (!adminExists) {
      const hashedPassword = await hashPassword('admin123');

      await prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: 'Administrador',
          password: hashedPassword,
          role: 'admin'
        }
      });

      console.log('✓ Usuario admin creado: admin@example.com / admin123');
    }

    // Crear usuario demo si no existe
    const userExists = await prisma.user.findUnique({
      where: { email: 'user@example.com' }
    });

    if (!userExists) {
      const hashedPassword = await hashPassword('user123');

      await prisma.user.create({
        data: {
          email: 'user@example.com',
          name: 'Usuario Demo',
          password: hashedPassword,
          role: 'user'
        }
      });

      console.log('✓ Usuario demo creado: user@example.com / user123');
    }

    // Crear reglas de negocio por defecto si no existen
    const rulesCount = await prisma.businessRule.count();
    if (rulesCount === 0) {
      for (const rule of defaultRules) {
        await prisma.businessRule.create({
          data: {
            name: rule.name,
            keywords: JSON.stringify(rule.keywords),
            category: rule.category,
            severity: rule.severity,
            suggestedAction: rule.suggestedAction
          }
        });
      }
      console.log(`✓ ${defaultRules.length} reglas de negocio creadas`);
    }

    console.log('✓ Base de datos inicializada');
  } catch (error) {
    console.error('❌ Error inicializando BD:', error.message);
  }
}

// Iniciar servidor
async function start() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`\n🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`📊 API disponible en http://localhost:${PORT}/api`);
      console.log(`🏥 Health check en http://localhost:${PORT}/api/health`);
      console.log(`\n📝 Credenciales de prueba:`);
      console.log(`   Admin:  admin@example.com / admin123`);
      console.log(`   User:   user@example.com / user123`);
      console.log(`\n⏳ Conecta el frontend en http://localhost:3000\n`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

start();

export default app;
