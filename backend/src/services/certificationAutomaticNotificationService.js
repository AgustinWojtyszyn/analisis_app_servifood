import { createClient } from '@supabase/supabase-js';
import { getCertificationNotificationTrigger } from './certificationNotificationService.js';
import {
  sendCertificationExpirationPilotEmail,
  CERTIFICATION_TEST_EMAIL_RECIPIENT
} from './email/emailService.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

function ensureConfigured() {
  if (!supabaseAdmin) {
    const error = new Error('Supabase no está configurado en el backend');
    error.status = 500;
    throw error;
  }
}

export async function runCertificationExpirationNotificationJob() {
  ensureConfigured();

  const { data, error } = await supabaseAdmin
    .from('certifications')
    .select('*')
    .order('expiration_date', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Error obteniendo certificaciones para notificación');
  }

  const rows = Array.isArray(data) ? data : [];
  const results = [];
  let eligible = 0;
  let sent = 0;
  let skippedAlreadySent = 0;
  let skippedWithoutTrigger = 0;
  let failed = 0;

  for (const certification of rows) {
    const triggerInfo = getCertificationNotificationTrigger(certification?.expiration_date);

    if (!triggerInfo?.shouldNotify) {
      skippedWithoutTrigger += 1;
      results.push({
        certificationId: certification?.id || null,
        status: 'skipped_without_trigger',
        triggerType: null,
        daysUntilExpiration: triggerInfo?.daysUntilExpiration ?? null
      });
      continue;
    }

    eligible += 1;

    const reservePayload = {
      certification_id: certification.id,
      trigger_type: triggerInfo.triggerType,
      recipient: CERTIFICATION_TEST_EMAIL_RECIPIENT,
      status: 'processing',
      error_message: null
    };

    const reserveRes = await supabaseAdmin
      .from('certification_notification_logs')
      .insert(reservePayload)
      .select('id')
      .single();

    if (reserveRes.error) {
      const code = String(reserveRes.error.code || '');
      if (code === '23505') {
        skippedAlreadySent += 1;
        results.push({
          certificationId: certification?.id || null,
          status: 'skipped_already_sent',
          triggerType: triggerInfo.triggerType,
          daysUntilExpiration: triggerInfo.daysUntilExpiration
        });
        continue;
      }

      failed += 1;
      results.push({
        certificationId: certification?.id || null,
        status: 'failed',
        triggerType: triggerInfo.triggerType,
        daysUntilExpiration: triggerInfo.daysUntilExpiration,
        error: reserveRes.error.message || 'No se pudo reservar log de notificación'
      });
      continue;
    }

    const logId = reserveRes.data?.id;

    try {
      await sendCertificationExpirationPilotEmail({
        certification,
        triggerInfo,
        to: CERTIFICATION_TEST_EMAIL_RECIPIENT
      });

      await supabaseAdmin
        .from('certification_notification_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null
        })
        .eq('id', logId);

      sent += 1;
      results.push({
        certificationId: certification?.id || null,
        status: 'sent',
        triggerType: triggerInfo.triggerType,
        daysUntilExpiration: triggerInfo.daysUntilExpiration
      });
    } catch (sendError) {
      await supabaseAdmin
        .from('certification_notification_logs')
        .update({
          status: 'failed',
          error_message: String(sendError?.message || 'Error de envío').slice(0, 2000)
        })
        .eq('id', logId);

      failed += 1;
      results.push({
        certificationId: certification?.id || null,
        status: 'failed',
        triggerType: triggerInfo.triggerType,
        daysUntilExpiration: triggerInfo.daysUntilExpiration,
        error: sendError?.message || 'Error de envío'
      });
    }
  }

  return {
    success: true,
    checked: rows.length,
    eligible,
    sent,
    skippedAlreadySent,
    skippedWithoutTrigger,
    failed,
    recipient: CERTIFICATION_TEST_EMAIL_RECIPIENT,
    results
  };
}
