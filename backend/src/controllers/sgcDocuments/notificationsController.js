import { supabaseAdmin } from './context.js';
import {
  isWorkerAuthorized,
  isWorkerTokenConfigured,
  processPendingDocumentNotifications
} from '../../routes/nutritionModules/notificationWorker.js';

const documentNotificationDebugEnabled = process.env.DOCUMENTS_NOTIFICATIONS_DEBUG === '1' || process.env.NODE_ENV !== 'production';

export async function processDocumentNotifications(req, res) {
  try {
    if (documentNotificationDebugEnabled) {
      console.info('[nutrition-modules-email] Internal worker endpoint hit');
    }
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }
    if (!isWorkerTokenConfigured()) {
      return res.status(500).json({ error: 'DOCUMENTS_NOTIFICATIONS_WORKER_TOKEN no está configurado' });
    }
    const authorized = isWorkerAuthorized(req);
    if (documentNotificationDebugEnabled) {
      console.info('[nutrition-modules-email] Internal worker auth check', { authorized });
    }
    if (!authorized) {
      return res.status(401).json({ error: 'No autorizado para procesar notificaciones' });
    }

    const batchSize = Math.max(1, Math.min(100, Number(req.body?.batchSize || 20)));
    const { claimed, sent, failed } = await processPendingDocumentNotifications({
      supabaseAdmin,
      batchSize,
      source: 'internal-endpoint'
    });

    return res.json({
      success: true,
      claimed,
      sent,
      failed
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error interno procesando notificaciones' });
  }
}
