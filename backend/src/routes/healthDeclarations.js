import express from 'express';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { __setSupabaseAdminForTests } from '../controllers/healthDeclarations/context.js';
import {
  createHealthDeclarationHandler,
  deleteHealthDeclarationByIdHandler,
  deleteMyHealthDeclarationHandler,
  getActiveHealthPolicyHandler,
  getAdminHealthDeclarationsHandler,
  getMyHealthDeclarationsHandler,
  getTodayHealthDeclarationHandler,
  updateMyHealthDeclarationHandler
} from '../controllers/healthDeclarations/healthDeclarationsController.js';
import { exportHealthDeclarationsHandler } from '../controllers/healthDeclarations/healthDeclarationsExportController.js';

const router = express.Router();

router.get('/health-policies/active', authenticateToken, getActiveHealthPolicyHandler);
router.get('/health-declarations/today', authenticateToken, getTodayHealthDeclarationHandler);
router.post('/health-declarations', authenticateToken, createHealthDeclarationHandler);
router.put('/health-declarations/:id/me', authenticateToken, updateMyHealthDeclarationHandler);
router.delete('/health-declarations/:id/me', authenticateToken, deleteMyHealthDeclarationHandler);
router.get('/health-declarations/me', authenticateToken, getMyHealthDeclarationsHandler);
router.get('/health-declarations/admin', authenticateToken, requireAdmin, getAdminHealthDeclarationsHandler);
router.delete('/health-declarations/:id', authenticateToken, requireAdmin, deleteHealthDeclarationByIdHandler);
router.post('/health-declarations/export', authenticateToken, requireAdmin, exportHealthDeclarationsHandler);

export {
  __setSupabaseAdminForTests,
  createHealthDeclarationHandler,
  exportHealthDeclarationsHandler
};

export default router;
