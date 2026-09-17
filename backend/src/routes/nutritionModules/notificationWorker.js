import { sendDocumentCreatedEmailNotification, sanitizeErrorMessage } from '../../services/nutritionModulesNotifications.js';

const documentNotificationDebugEnabled = process.env.DOCUMENTS_NOTIFICATIONS_DEBUG === '1' || process.env.NODE_ENV !== 'production';
const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const DAY_MS = 24 * 60 * 60 * 1000;

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

function getArgentinaDateKey(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getArgentinaDayUtcRange(dateKey) {
  // Argentina uses UTC-03:00. SGC timestamps are stored as timestamptz/UTC.
  const start = new Date(`${dateKey}T03:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + DAY_MS);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function loadNotificationScope(supabaseAdmin, row) {
  const fallbackDateKey = getArgentinaDateKey(row?.document_created_at || row?.created_at);
  const fallback = {
    documentId: row?.document_id || null,
    folderId: null,
    dateKey: fallbackDateKey,
    key: `document:${row?.document_id || row?.id || 'unknown'}:${fallbackDateKey || 'unknown'}`
  };

  if (!row?.document_id) return fallback;

  const { data, error } = await supabaseAdmin
    .from('nutrition_modules')
    .select('id, folder_id, created_at')
    .eq('id', row.document_id)
    .maybeSingle();

  if (error || !data) {
    if (documentNotificationDebugEnabled && error) {
      console.warn('[nutrition-modules-email] No se pudo resolver agrupación de documento', {
        documentId: row.document_id,
        error: error.message || error
      });
    }
    return fallback;
  }

  const dateKey = getArgentinaDateKey(data.created_at || row.document_created_at || row.created_at) || fallbackDateKey;
  const folderId = data.folder_id || null;

  return {
    documentId: data.id,
    folderId,
    dateKey,
    key: `${folderId ? `folder:${folderId}` : 'root'}:${dateKey || 'unknown'}`
  };
}

async function loadScopeDocumentIds(supabaseAdmin, scope) {
  if (!scope?.dateKey) return scope?.documentId ? [scope.documentId] : [];
  const range = getArgentinaDayUtcRange(scope.dateKey);
  if (!range) return scope?.documentId ? [scope.documentId] : [];

  let query = supabaseAdmin
    .from('nutrition_modules')
    .select('id')
    .gte('created_at', range.start)
    .lt('created_at', range.end);

  query = scope.folderId
    ? query.eq('folder_id', scope.folderId)
    : query.is('folder_id', null);

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Error consultando documentos de la tanda de notificación');
  }

  const ids = (Array.isArray(data) ? data : []).map((item) => item?.id).filter(Boolean);
  if (!ids.length && scope.documentId) ids.push(scope.documentId);
  return ids;
}

async function alreadySentForScope(supabaseAdmin, documentIds) {
  if (!documentIds.length) return false;

  const { data, error } = await supabaseAdmin
    .from('document_email_notifications')
    .select('id')
    .in('document_id', documentIds)
    .eq('status', 'sent')
    .limit(1);

  if (error) {
    throw new Error(error.message || 'Error verificando notificaciones ya enviadas');
  }
  return Array.isArray(data) && data.length > 0;
}

async function deleteProcessingNotificationsByIds(supabaseAdmin, notificationIds) {
  const ids = Array.from(new Set((notificationIds || []).filter(Boolean)));
  if (!ids.length) return;

  const { error } = await supabaseAdmin
    .from('document_email_notifications')
    .delete()
    .in('id', ids)
    .eq('status', 'processing');

  if (error) {
    throw new Error(error.message || 'Error descartando notificaciones agrupadas');
  }
}

async function deleteQueuedDuplicatesForScope(supabaseAdmin, documentIds) {
  if (!documentIds.length) return;

  const { error } = await supabaseAdmin
    .from('document_email_notifications')
    .delete()
    .in('document_id', documentIds)
    .in('status', ['pending', 'failed']);

  if (error) {
    throw new Error(error.message || 'Error limpiando notificaciones duplicadas');
  }
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
  const scopedRows = [];
  for (const row of rows) {
    const scope = await loadNotificationScope(supabaseAdmin, row);
    scopedRows.push({ row, scope });
  }

  const representativeByScope = new Map();
  const duplicateClaimedIds = [];
  for (const item of scopedRows) {
    if (!representativeByScope.has(item.scope.key)) {
      representativeByScope.set(item.scope.key, item);
    } else {
      duplicateClaimedIds.push(item.row.id);
    }
  }

  if (duplicateClaimedIds.length) {
    await deleteProcessingNotificationsByIds(supabaseAdmin, duplicateClaimedIds);
    if (documentNotificationDebugEnabled) {
      console.info('[nutrition-modules-email] Notificaciones agrupadas dentro del lote', {
        source,
        discarded: duplicateClaimedIds.length
      });
    }
  }

  const representatives = [...representativeByScope.values()];
  let sent = 0;
  let failed = 0;
  let skipped = duplicateClaimedIds.length;

  for (const { row, scope } of representatives) {
    try {
      const scopeDocumentIds = await loadScopeDocumentIds(supabaseAdmin, scope);
      const wasAlreadySent = await alreadySentForScope(supabaseAdmin, scopeDocumentIds);

      if (wasAlreadySent) {
        await deleteProcessingNotificationsByIds(supabaseAdmin, [row.id]);
        await deleteQueuedDuplicatesForScope(supabaseAdmin, scopeDocumentIds);
        skipped += 1;

        if (documentNotificationDebugEnabled) {
          console.info('[nutrition-modules-email] Aviso omitido por agrupación', {
            source,
            notificationId: row.id,
            documentId: row.document_id,
            scope: scope.folderId ? 'folder-day' : 'root-day',
            dateKey: scope.dateKey
          });
        }
        continue;
      }

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

      await deleteQueuedDuplicatesForScope(supabaseAdmin, scopeDocumentIds);

      sent += 1;
      if (documentNotificationDebugEnabled) {
        console.info('[nutrition-modules-email] Notificación enviada', {
          source,
          notificationId: row.id,
          documentId: row.document_id,
          scope: scope.folderId ? 'folder-day' : 'root-day',
          dateKey: scope.dateKey,
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
    console.info('[nutrition-modules-email] Worker end', { source, claimed: rows.length, sent, failed, skipped });
  }
  return { claimed: rows.length, sent, failed, skipped };
}
