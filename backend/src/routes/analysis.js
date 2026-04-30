import express from 'express';
import multer from 'multer';
import {
  uploadAndAnalyze,
  uploadAndAnalyzeMultiple,
  getAnalysis,
  getHistory,
  deleteAnalysis,
  deleteAnalysisBulk,
  deleteAllAnalyses,
  exportBulkAnalyses,
  getActiveAnalysis,
  deleteActiveAnalysis,
  updateAnalysisStatus
} from '../controllers/analysisController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', authenticateToken, requireAdmin, upload.single('file'), uploadAndAnalyze);
router.post('/upload-excel', authenticateToken, requireAdmin, upload.single('excel'), uploadAndAnalyze);
router.post('/upload-multiple', authenticateToken, requireAdmin, upload.array('files', 10), uploadAndAnalyzeMultiple);

router.get('/history', authenticateToken, requireAdmin, getHistory);
router.get('/user/history', authenticateToken, requireAdmin, getHistory);
router.get('/user/active', authenticateToken, requireAdmin, getActiveAnalysis);
router.delete('/user/active', authenticateToken, requireAdmin, deleteActiveAnalysis);

router.post('/export/bulk', authenticateToken, requireAdmin, exportBulkAnalyses);
router.delete('/bulk', authenticateToken, requireAdmin, deleteAnalysisBulk);
router.delete('/all', authenticateToken, requireAdmin, deleteAllAnalyses);

router.get('/:id', authenticateToken, requireAdmin, getAnalysis);
router.delete('/:id', authenticateToken, requireAdmin, deleteAnalysis);
router.patch('/:id/status', authenticateToken, requireAdmin, updateAnalysisStatus);

export default router;
