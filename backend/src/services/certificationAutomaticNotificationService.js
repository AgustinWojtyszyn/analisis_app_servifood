import { createClient } from '@supabase/supabase-js';
import { getCertificationNotificationTrigger } from './certificationNotificationService.js';
import {
  sendCertificationExpirationPilotEmail,
  getCertificationNotificationRecipients
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

function getEquivalentTriggerTypes(triggerType = '') {
  if (triggerType === 'early_warning') return ['early_warning', 'seven_days_before'];
  if (triggerType === 'urgent_warning') return ['urgent_warning', 'one_day_before'];
  return [triggerType].filter(Boolean);
}

async function processCertificationAutomaticNotificationForRecipient({
  certification,
  triggerInfo,
  recipient
}) {
  const normalizedRecipient = String(recipient || '').trim().toLowerCase();

  const reservePayload = {
    certification_id: certification.id,
    trigger_type: triggerInfo.triggerType,
    recipient: normalizedRecipient,
    status: 'processing',
    error_message: null
  };

  const equivalentTypes = getEquivalentTriggerTypes(triggerInfo.triggerType);
  const { data: existingLogs, error: existingLogsError } = await supabaseAdmin
    .from('certification_notification_logs')
    .select('id')
    .eq('certification_id', certification.id)
    .eq('recipient', normalizedRecipient)
    .in('trigger_type', equivalentTypes)
    .limit(1);

  if (existingLogsError) {
    return {
      certificationId: certification?.id || null,
      recipient: normalizedRecipient,
      status: 'failed',
      triggerType: triggerInfo.triggerType,
      daysUntilExpiration: triggerInfo.daysUntilExpiration,
      error: existingLogsError.message || 'Error consultando logs de notificación'
    };
  }

  if (Array.isArray(existingLogs) && existingLogs.length > 0) {
    return {
      certificationId: certification?.id || null,
      recipient: normalizedRecipient,
      status: 'skipped_already_sent',
      triggerType: triggerInfo.triggerType,
      daysUntilExpiration: triggerInfo.daysUntilExpiration
    };
  }

  const reserveRes = await supabaseAdmin
    .from('certification_notification_logs')
    .insert(reservePayload)
    .select('id')
    .single();

  if (reserveRes.error) {
    const code = String(reserveRes.error.code || '');
    if (code === '23505') {
      return {
        certificationId: certification?.id || null,
        recipient: normalizedRecipient,
        status: 'skipped_already_sent',
        triggerType: triggerInfo.triggerType,
        daysUntilExpiration: triggerInfo.daysUntilExpiration
      };
    }

    return {
      certificationId: certification?.id || null,
      recipient: normalizedRecipient,
      status: 'failed',
      triggerType: triggerInfo.triggerType,
      daysUntilExpiration: triggerInfo.daysUntilExpiration,
      error: reserveRes.error.message || 'No se pudo reservar log de notificación'
    };
  }

  const logId = reserveRes.data?.id;
  try {
    await sendCertificationExpirationPilotEmail({
      certification,
      triggerInfo,
      to: normalizedRecipient
    });

    await supabaseAdmin
      .from('certification_notification_logs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        error_message: null
      })
      .eq('id', logId);

    return {
      certificationId: certification?.id || null,
      recipient: normalizedRecipient,
      status: 'sent',
      triggerType: triggerInfo.triggerType,
      daysUntilExpiration: triggerInfo.daysUntilExpiration
    };
  } catch (sendError) {
    await supabaseAdmin
      .from('certification_notification_logs')
      .update({
        status: 'failed',
        error_message: String(sendError?.message || 'Error de envío').slice(0, 2000)
      })
      .eq('id', logId);

    return {
      certificationId: certification?.id || null,
      recipient: normalizedRecipient,
      status: 'failed',
      triggerType: triggerInfo.triggerType,
      daysUntilExpiration: triggerInfo.daysUntilExpiration,
      error: sendError?.message || 'Error de envío'
    };
  }
}

export async function processCertificationAutomaticNotification(certification) {
  ensureConfigured();
  const triggerInfo = getCertificationNotificationTrigger(certification?.expiration_date);
  const recipients = getCertificationNotificationRecipients();

  if (!triggerInfo?.shouldNotify) {
    return {
      certificationId: certification?.id || null,
      status: 'skipped_without_trigger',
      triggerType: null,
      daysUntilExpiration: triggerInfo?.daysUntilExpiration ?? null,
      recipients,
      results: []
    };
  }

  const results = [];
  let sent = 0;
  let skippedAlreadySent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const row = await processCertificationAutomaticNotificationForRecipient({
      certification,
      triggerInfo,
      recipient
    });
    results.push(row);
    const status = String(row?.status || '');
    if (status === 'sent') sent += 1;
    else if (status === 'skipped_already_sent') skippedAlreadySent += 1;
    else if (status !== 'skipped_without_trigger') failed += 1;
  }

  return {
    certificationId: certification?.id || null,
    triggerType: triggerInfo.triggerType,
    daysUntilExpiration: triggerInfo.daysUntilExpiration,
    recipients,
    sent,
    skippedAlreadySent,
    failed,
    status: failed > 0 ? 'partial_or_failed' : 'processed',
    results
  };
}

export async function runCertificationExpirationNotificationJob() {
  ensureConfigured();
  const recipients = getCertificationNotificationRecipients();

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
    const rowResult = await processCertificationAutomaticNotification(certification);
    results.push(rowResult);

    if (String(rowResult?.status || '') === 'skipped_without_trigger') {
      skippedWithoutTrigger += 1;
      continue;
    }
    eligible += 1;
    sent += Number(rowResult?.sent || 0);
    skippedAlreadySent += Number(rowResult?.skippedAlreadySent || 0);
    failed += Number(rowResult?.failed || 0);
  }

  return {
    success: true,
    checked: rows.length,
    eligible,
    sent,
    skippedAlreadySent,
    skippedWithoutTrigger,
    failed,
    recipients,
    results
  };
}
