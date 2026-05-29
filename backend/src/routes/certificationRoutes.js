import express from 'express';
import {
  getCertifications,
  postCertification,
  putCertification,
  removeCertification,
  getCertificationNotificationPreview,
  postCertificationTestNotification,
  postRunCertificationNotificationJob
} from '../controllers/certificationController.js';
import { authenticateToken, requireAdminOrNutritionist } from '../middlewares/auth.js';

const router = express.Router();

router.get('/certifications', authenticateToken, requireAdminOrNutritionist, getCertifications);
router.post('/certifications', authenticateToken, requireAdminOrNutritionist, postCertification);
router.put('/certifications/:id', authenticateToken, requireAdminOrNutritionist, putCertification);
router.delete('/certifications/:id', authenticateToken, requireAdminOrNutritionist, removeCertification);
router.get('/certifications/notification-preview', authenticateToken, requireAdminOrNutritionist, getCertificationNotificationPreview);
router.post('/certifications/:id/send-test-notification', authenticateToken, requireAdminOrNutritionist, postCertificationTestNotification);
router.post('/certifications/run-notification-job', authenticateToken, requireAdminOrNutritionist, postRunCertificationNotificationJob);

router.post('/internal/certifications/notification-job', async (req, res) => {
  const configuredSecret = String(process.env.INTERNAL_CRON_SECRET || '').trim();
  if (!configuredSecret) {
    return res.status(500).json({ error: 'INTERNAL_CRON_SECRET no está configurada' });
  }

  const incomingSecret = String(req.headers['x-internal-cron-secret'] || '').trim();
  if (!incomingSecret || incomingSecret !== configuredSecret) {
    return res.status(401).json({ error: 'Unauthorized cron secret' });
  }

  return postRunCertificationNotificationJob(req, res);
});

export default router;
