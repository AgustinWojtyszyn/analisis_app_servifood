import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { upload, zipUpload } from './nutritionModules/helpers.js';
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  moveDocument,
  deleteDocument,
  exportDocumentExcel,
  downloadDocument
} from '../controllers/sgcDocuments/documentsController.js';
import {
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder
} from '../controllers/sgcDocuments/foldersController.js';
import {
  processDocumentNotifications
} from '../controllers/sgcDocuments/notificationsController.js';
import {
  listAttachments,
  uploadAttachments,
  deleteAttachment,
  downloadAttachment
} from '../controllers/sgcDocuments/attachmentsController.js';
import {
  analyzeZipImport,
  confirmZipImport,
  handleZipUploadError
} from '../controllers/sgcDocuments/zipImportController.js';

const router = express.Router();

router.get('/nutrition-modules', authenticateToken, listDocuments);
router.get('/nutrition-modules/folders', authenticateToken, listFolders);
router.post('/nutrition-modules/folders', authenticateToken, createFolder);
router.put('/nutrition-modules/folders/:id', authenticateToken, updateFolder);
router.delete('/nutrition-modules/folders/:id', authenticateToken, deleteFolder);
router.post('/nutrition-modules/import/zip/analyze', authenticateToken, zipUpload.single('zip'), handleZipUploadError, analyzeZipImport);
router.post('/nutrition-modules/import/zip/confirm', authenticateToken, confirmZipImport);
router.get('/nutrition-modules/:id', authenticateToken, getDocument);
router.post('/nutrition-modules', authenticateToken, createDocument);
router.post('/internal/nutrition-modules/process-notifications', processDocumentNotifications);
router.put('/nutrition-modules/:id', authenticateToken, updateDocument);
router.put('/nutrition-modules/:id/move', authenticateToken, moveDocument);
router.delete('/nutrition-modules/:id', authenticateToken, deleteDocument);
router.get('/nutrition-modules/:id/export/excel', authenticateToken, exportDocumentExcel);
router.get('/nutrition-modules/:id/files', authenticateToken, listAttachments);
router.post('/nutrition-modules/:id/files', authenticateToken, upload.array('files', 10), uploadAttachments);
router.delete('/nutrition-modules/files/:fileId', authenticateToken, deleteAttachment);
router.get('/nutrition-modules/files/:fileId/download', authenticateToken, downloadAttachment);
router.get('/nutrition-modules/:id/download', authenticateToken, downloadDocument);

export default router;
