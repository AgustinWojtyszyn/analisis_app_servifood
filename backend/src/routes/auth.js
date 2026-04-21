import express from 'express';
import { login, register, getMe } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Login de usuario
 */
router.post('/login', login);

/**
 * POST /api/auth/register
 * Registro de nuevo usuario
 */
router.post('/register', register);

/**
 * GET /api/auth/me
 * Obtener información del usuario actual (requiere autenticación)
 */
router.get('/me', authenticateToken, getMe);

export default router;
