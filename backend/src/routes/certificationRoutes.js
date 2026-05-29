import express from 'express';
import {
  getCertifications,
  postCertification,
  putCertification,
  removeCertification,
  getCertificationNotificationPreview
} from '../controllers/certificationController.js';
import { authenticateToken, requireAdminOrNutritionist } from '../middlewares/auth.js';

const router = express.Router();

router.get('/certifications', authenticateToken, requireAdminOrNutritionist, getCertifications);
router.post('/certifications', authenticateToken, requireAdminOrNutritionist, postCertification);
router.put('/certifications/:id', authenticateToken, requireAdminOrNutritionist, putCertification);
router.delete('/certifications/:id', authenticateToken, requireAdminOrNutritionist, removeCertification);
router.get('/certifications/notification-preview', authenticateToken, requireAdminOrNutritionist, getCertificationNotificationPreview);

export default router;
