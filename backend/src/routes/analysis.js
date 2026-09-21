import express from 'express';
import {
  uploadAndAnalyze,
  uploadAndAnalyzeMultiple,
  getAnalysis,
  getHistory,
  compareAnalysisPeriods,
  deleteAnalysis,
  deleteAnalysisBulk,
  deleteAllAnalyses,
  exportBulkAnalyses,
  getActiveAnalysis,
  deleteActiveAnalysis,
  updateAnalysisStatus,
  archiveAnalysis,
  reprocessHistoryClassifications,
  reprocessIsoAll
} from '../controllers/analysisController.js';
import {
  exportAnnualDeviationExcel,
  getAnnualDeviationUpload,
  listAnnualDeviationUploads,
  uploadAnnualDeviationExcel
} from '../controllers/analysis/annualDeviationController.js';
import { authenticateToken, requireAdmin, requireAdminOrNutritionist } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';

import { getExecutiveDashboard } from '../controllers/analysis/executiveDashboardController.js';

const router = express.Router();

router.get('/executive-dashboard', authenticateToken, requireAdmin, getExecutiveDashboard);

router.post('/upload', authenticateToken, requireAdmin, upload.single('file'), uploadAndAnalyze);
router.post('/upload-excel', authenticateToken, requireAdmin, upload.single('excel'), uploadAndAnalyze);
router.post('/upload-multiple', authenticateToken, requireAdmin, upload.array('files', 10), uploadAndAnalyzeMultiple);

router.get('/history', authenticateToken, requireAdmin, getHistory);
router.get('/compare-periods', authenticateToken, requireAdmin, compareAnalysisPeriods);
router.get('/user/history', authenticateToken, requireAdmin, getHistory);
router.get('/user/active', authenticateToken, requireAdmin, getActiveAnalysis);
router.delete('/user/active', authenticateToken, requireAdmin, deleteActiveAnalysis);

router.post('/export/bulk', authenticateToken, requireAdmin, exportBulkAnalyses);
router.delete('/bulk', authenticateToken, requireAdmin, deleteAnalysisBulk);
router.delete('/all', authenticateToken, requireAdmin, deleteAllAnalyses);

router.get('/annual/uploads', authenticateToken, requireAdminOrNutritionist, listAnnualDeviationUploads);
router.post('/annual/upload-excel', authenticateToken, requireAdminOrNutritionist, upload.single('excel'), uploadAnnualDeviationExcel);
router.get('/annual/:id/export/excel', authenticateToken, requireAdminOrNutritionist, exportAnnualDeviationExcel);
router.get('/annual/:id', authenticateToken, requireAdminOrNutritionist, getAnnualDeviationUpload);

router.post('/reprocess-history', authenticateToken, requireAdmin, reprocessHistoryClassifications);
router.patch('/reprocess-iso-all', authenticateToken, requireAdmin, reprocessIsoAll);
router.get('/:id', authenticateToken, requireAdmin, getAnalysis);
router.delete('/:id', authenticateToken, requireAdmin, deleteAnalysis);
router.patch('/:id/status', authenticateToken, requireAdmin, updateAnalysisStatus);
router.patch('/:id/archive', authenticateToken, requireAdmin, archiveAnalysis);

export default router;
