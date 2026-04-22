import express from 'express';
import multer from 'multer';
import {
  uploadAndAnalyze,
  getAnalysis,
  getHistory,
  deleteAnalysis,
  getActiveAnalysis,
  updateAnalysisStatus
} from '../controllers/analysisController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/analysis/upload
 * POST /api/upload-excel
 * Subir y procesar un archivo Excel
 */
router.post('/upload', authenticateToken, upload.single('file'), uploadAndAnalyze);
router.post('/upload-excel', authenticateToken, upload.single('excel'), uploadAndAnalyze);

/**
 * GET /api/analysis/user/history
 * Obtener historial de análisis del usuario actual
 */
router.get('/user/history', authenticateToken, getHistory);
router.get('/user/active', authenticateToken, getActiveAnalysis);

/**
 * GET /api/analysis/:id
 * Obtener un análisis específico
 */
router.get('/:id', authenticateToken, getAnalysis);

/**
 * DELETE /api/analysis/:id
 * Eliminar un análisis del usuario actual
 */
router.delete('/:id', authenticateToken, deleteAnalysis);
router.patch('/:id/status', authenticateToken, updateAnalysisStatus);

export default router;
