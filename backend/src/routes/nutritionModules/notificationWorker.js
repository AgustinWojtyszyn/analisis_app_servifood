import { sendDocumentCreatedEmailNotification, sanitizeErrorMessage } from '../../services/nutritionModulesNotifications.js';

const documentNotificationDebugEnabled = process.env.DOCUMENTS_NOTIFICATIONS_DEBUG === '1' || process.env.NODE_ENV !== 'production';

function resolveWorkerToken() {
  return String(process.env.DOCUMENTS_NOTIFICATIONS_WORKER_TOKEN || '').trim();
}

export function isWorkerTokenConfigured() {
  return Boolean(resolveWorkerToken());
}

export function isWorkerAuthorized(req) {
  const configuredToken = resolveWorkerToken();
  if (!configuredToken) return false;
  const authHeader = String(req.headers.authorization || '');
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerToken = String(req.headers['x-worker-token'] || '').trim();
  return bearer === configuredToken || headerToken === configuredToken;
}

export async function processPendingDocumentNotifications({ supabaseAdmin, batchSize = 20, source = 'unknown' } = {}) {
  const limitedBatch = Math.max(1, Math.min(100, Number(batchSize || 20)));
  if (documentNotificationDebugEnabled) {
    console.info('[nutrition-modules-email] Worker start', { source, batchSize: limitedBatch, provider: 'smtp-nodemailer' });
  }

  const { data: claimedRows, error: claimError } = await supabaseAdmin
    .rpc('claim_document_email_notifications', { max_rows: limitedBatch });

  if (claimError) {
    console.error('[nutrition-modules-email] Error reclamando notificaciones pendientes', { source, error: claimError.message || claimError });
    throw new Error(claimError.message || 'Error reclamando notificaciones pendientes');
  }

  const rows = Array.isArray(claimedRows) ? claimedRows : [];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const sendResult = await sendDocumentCreatedEmailNotification(row);
      if (!sendResult?.providerMessageId || !sendResult?.providerResponse) {
        throw new Error('Evidencia SMTP insuficiente: faltan providerMessageId/providerResponse');
      }
      const { error: updateError } = await supabaseAdmin
        .from('document_email_notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: null,
          provider_message_id: sendResult.providerMessageId,
          provider_response: sendResult.providerResponse
        })
        .eq('id', row.id)
        .eq('status', 'processing');

      if (updateError) {
        failed += 1;
        console.error('[nutrition-modules-email] Error marcando notificación como sent', {
          source,
          notificationId: row.id,
          error: updateError.message || updateError
        });
        continue;
      }

      sent += 1;
      if (documentNotificationDebugEnabled) {
        console.info('[nutrition-modules-email] Notificación enviada', {
          source,
          notificationId: row.id,
          documentId: row.document_id,
          provider: sendResult?.provider || 'smtp-nodemailer'
        });
      }
    } catch (mailError) {
      failed += 1;
      const message = mailError?.message ? String(mailError.message) : 'Error desconocido de envío';
      console.error('[nutrition-modules-email] Error enviando notificación', {
        source,
        notificationId: row.id,
        documentId: row.document_id,
        error: sanitizeErrorMessage(message)
      });

      const { error: updateError } = await supabaseAdmin
        .from('document_email_notifications')
        .update({
          status: 'failed',
          last_error: message.slice(0, 2000),
          provider_message_id: null,
          provider_response: null
        })
        .eq('id', row.id)
        .eq('status', 'processing');

      if (updateError) {
        console.error('[nutrition-modules-email] Error actualizando notificación fallida', {
          source,
          notificationId: row.id,
          error: updateError.message || updateError
        });
      }
    }
  }

  if (documentNotificationDebugEnabled) {
    console.info('[nutrition-modules-email] Worker end', { source, claimed: rows.length, sent, failed });
  }
  return { claimed: rows.length, sent, failed };
}
