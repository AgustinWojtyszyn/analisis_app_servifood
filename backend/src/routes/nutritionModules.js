import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { upload } from './nutritionModules/helpers.js';
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  exportDocumentExcel,
  downloadDocument
} from '../controllers/sgcDocuments/documentsController.js';
import {
  processDocumentNotifications
} from '../controllers/sgcDocuments/notificationsController.js';
import {
  listAttachments,
  uploadAttachments,
  deleteAttachment,
  downloadAttachment
} from '../controllers/sgcDocuments/attachmentsController.js';

const router = express.Router();

router.get('/nutrition-modules', authenticateToken, listDocuments);
router.get('/nutrition-modules/:id', authenticateToken, getDocument);
router.post('/nutrition-modules', authenticateToken, createDocument);
router.post('/internal/nutrition-modules/process-notifications', processDocumentNotifications);
router.put('/nutrition-modules/:id', authenticateToken, updateDocument);
router.delete('/nutrition-modules/:id', authenticateToken, deleteDocument);
router.get('/nutrition-modules/:id/export/excel', authenticateToken, exportDocumentExcel);
router.get('/nutrition-modules/:id/files', authenticateToken, listAttachments);
router.post('/nutrition-modules/:id/files', authenticateToken, upload.array('files', 10), uploadAttachments);
router.delete('/nutrition-modules/files/:fileId', authenticateToken, deleteAttachment);
router.get('/nutrition-modules/files/:fileId/download', authenticateToken, downloadAttachment);
router.get('/nutrition-modules/:id/download', authenticateToken, downloadDocument);

export default router;
