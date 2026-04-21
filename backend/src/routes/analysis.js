import express from 'express';
import { uploadAndAnalyze, getAnalysis, getHistory } from '../controllers/analysisController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

/**
 * POST /api/analysis/upload
 * Subir y procesar un archivo Excel
 */
router.post('/upload', authenticateToken, uploadAndAnalyze);

/**
 * GET /api/analysis/:id
 * Obtener un análisis específico
 */
router.get('/:id', authenticateToken, getAnalysis);

/**
 * GET /api/analysis/user/history
 * Obtener historial de análisis del usuario actual
 */
router.get('/user/history', authenticateToken, getHistory);

export default router;
