import { supabaseAdmin } from './context.js';
import {
  isWorkerAuthorized,
  processPendingDocumentNotifications
} from '../../routes/nutritionModules/notificationWorker.js';

export async function processDocumentNotifications(req, res) {
  try {
    console.info('[nutrition-modules-email] Internal worker endpoint hit');
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }
    const authorized = isWorkerAuthorized(req);
    console.info('[nutrition-modules-email] Internal worker auth check', { authorized });
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
