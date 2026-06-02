import { createClient } from '@supabase/supabase-js';
import { enrichCertificationWithNotification, getCertificationNotificationTrigger } from './certificationNotificationService.js';
import { parseDateInputToParts, getArgentinaDateISO } from '../utils/argentinaDateUtils.js';
import {
  getCertificationNotificationRecipients,
  sendCertificationExpirationPilotEmail
} from './email/emailService.js';
import { processCertificationAutomaticNotification } from './certificationAutomaticNotificationService.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

function getEquivalentTriggerTypes(triggerType = '') {
  if (triggerType === 'early_warning') return ['early_warning', 'seven_days_before'];
  if (triggerType === 'urgent_warning') return ['urgent_warning', 'one_day_before'];
  return [triggerType].filter(Boolean);
}

function ensureConfigured() {
  if (!supabaseAdmin) {
    const error = new Error('Supabase no está configurado en el backend');
    error.status = 500;
    throw error;
  }
}

function throwBadRequest(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function throwNotFound(message) {
  const error = new Error(message);
  error.status = 404;
  throw error;
}

function validatePayload(payload = {}) {
  const name = String(payload.name || '').trim();
  const expirationDate = String(payload.expirationDate || '').trim();
  const rawUrl = payload.url ?? payload.enlace ?? '';
  const url = String(rawUrl || '').trim();

  if (!name) throwBadRequest('El nombre es requerido');
  if (!expirationDate) throwBadRequest('La fecha de vencimiento es requerida');
  if (!parseDateInputToParts(expirationDate)) throwBadRequest('La fecha de vencimiento es inválida');
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('invalid_protocol');
      }
    } catch {
      throwBadRequest('El enlace debe ser una URL válida con http:// o https://');
    }
  }

  return {
    name,
    type: String(payload.type || '').trim() || null,
    module: String(payload.module || '').trim() || null,
    description: String(payload.description || '').trim() || null,
    url: url || null,
    expiration_date: expirationDate,
    responsible_area: String(payload.responsibleArea || '').trim() || null,
    responsible_person: String(payload.responsiblePerson || '').trim() || null
  };
}

export async function listCertifications() {
  ensureConfigured();
  const { data, error } = await supabaseAdmin
    .from('certifications')
    .select('*')
    .order('expiration_date', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Error obteniendo certificaciones');

  const items = (data || []).map((row) => enrichCertificationWithNotification(row));
  const ids = items.map((item) => item.id).filter(Boolean);
  const recipients = getCertificationNotificationRecipients();

  const byCertificationTrigger = new Map();
  if (ids.length) {
    const { data: logRows } = await supabaseAdmin
      .from('certification_notification_logs')
      .select('certification_id, trigger_type, status')
      .in('recipient', recipients)
      .in('certification_id', ids);

    for (const log of (logRows || [])) {
      const key = `${log?.certification_id || ''}::${log?.trigger_type || ''}::${log?.recipient || ''}`;
      if (key !== '::') byCertificationTrigger.set(key, String(log?.status || '').toLowerCase());
    }
  }

  const decoratedItems = items.map((item) => {
    if (!item?.shouldNotify || !item?.triggerType) {
      return {
        ...item,
        notificationMessage: item?.status === 'expired' ? 'Vencida' : 'Sin aviso para hoy',
        notificationStatus: 'none'
      };
    }
    const equivalentTypes = getEquivalentTriggerTypes(item.triggerType);
    let sentCount = 0;
    let hasProcessing = false;
    let hasFailed = false;
    for (const type of equivalentTypes) {
      for (const recipient of recipients) {
        const key = `${item.id}::${type}::${recipient}`;
        const status = byCertificationTrigger.get(`${key}`) || '';
        if (status === 'sent') sentCount += 1;
        if (status === 'processing') hasProcessing = true;
        if (status === 'failed') hasFailed = true;
      }
    }
    if (sentCount >= recipients.length && recipients.length > 0) {
      return {
        ...item,
        notificationMessage: item.triggerType === 'urgent_warning' ? 'Aviso urgente enviado' : 'Aviso temprano enviado',
        notificationStatus: 'sent'
      };
    }

    if (hasProcessing) {
      return {
        ...item,
        notificationMessage: 'Trigger detectado, pendiente de envío automático',
        notificationStatus: 'processing'
      };
    }

    return {
      ...item,
      notificationMessage: 'Trigger detectado, pendiente de envío automático',
      notificationStatus: hasFailed ? 'failed' : 'pending'
    };
  });
  const summary = {
    total: decoratedItems.length,
    active: decoratedItems.filter((i) => i.status === 'active').length,
    nearExpiration: decoratedItems.filter((i) => i.status === 'near_expiration' || i.status === 'expires_tomorrow' || i.status === 'expires_today').length,
    expired: decoratedItems.filter((i) => i.status === 'expired').length,
    triggersDetected: decoratedItems.filter((i) => i.shouldNotify).length
  };

  return { items: decoratedItems, summary };
}

export async function createCertification(payload, userId) {
  ensureConfigured();
  const valid = validatePayload(payload);
  const { data, error } = await supabaseAdmin
    .from('certifications')
    .insert({
      ...valid,
      created_by: userId
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Error creando certificación');
  try {
    await processCertificationAutomaticNotification(data);
  } catch (notificationError) {
    console.error('[certifications-auto] create notification error', {
      certificationId: data?.id || null,
      message: notificationError?.message || 'unknown_error'
    });
  }
  return enrichCertificationWithNotification(data);
}

export async function updateCertification(id, payload) {
  ensureConfigured();
  const valid = validatePayload(payload);
  const { data, error } = await supabaseAdmin
    .from('certifications')
    .update({
      ...valid,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (String(error.code || '') === 'PGRST116') throwNotFound('Certificación no encontrada');
    throw new Error(error.message || 'Error actualizando certificación');
  }

  try {
    await processCertificationAutomaticNotification(data);
  } catch (notificationError) {
    console.error('[certifications-auto] update notification error', {
      certificationId: data?.id || null,
      message: notificationError?.message || 'unknown_error'
    });
  }

  return enrichCertificationWithNotification(data);
}

export async function deleteCertification(id) {
  ensureConfigured();
  const { data, error } = await supabaseAdmin
    .from('certifications')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) throw new Error(error.message || 'Error eliminando certificación');
  if (!Array.isArray(data) || data.length === 0) throwNotFound('Certificación no encontrada');
  return { success: true };
}

export async function getNotificationPreview() {
  const recipients = getCertificationNotificationRecipients();
  const { items } = await listCertifications();
  const triggered = items.filter((item) => item.shouldNotify);
  return {
    date: getArgentinaDateISO(),
    sendEnabled: true,
    recipients,
    triggerCount: triggered.length,
    message: 'Monitoreo automático piloto activo',
    items: triggered
  };
}

export async function sendCertificationExpirationTestNotification(certificationId) {
  ensureConfigured();
  const id = String(certificationId || '').trim();
  if (!id) throwBadRequest('Certification id es requerido');

  const { data, error } = await supabaseAdmin
    .from('certifications')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (String(error.code || '') === 'PGRST116') throwNotFound('Certificación no encontrada');
    throw new Error(error.message || 'Error obteniendo certificación');
  }

  const triggerInfo = getCertificationNotificationTrigger(data?.expiration_date);
  const manualTriggerInfo = {
    ...triggerInfo,
    shouldNotify: true,
    triggerType: triggerInfo.triggerType || 'manual_test',
    humanTriggerLabel: triggerInfo.humanTriggerLabel || 'Prueba manual'
  };
  const recipients = getCertificationNotificationRecipients();
  const results = [];
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const providerResult = await sendCertificationExpirationPilotEmail({
        certification: data,
        triggerInfo: manualTriggerInfo,
        to: recipient
      });
      const accepted = Array.isArray(providerResult?.accepted) ? providerResult.accepted : [];
      const rejected = Array.isArray(providerResult?.rejected) ? providerResult.rejected : [];
      const acceptedByProvider = accepted.map((mail) => String(mail || '').toLowerCase()).includes(String(recipient || '').toLowerCase());

      if (!acceptedByProvider || rejected.length) {
        failed += 1;
        results.push({
          recipient,
          status: 'failed',
          messageId: providerResult?.messageId || null,
          accepted,
          rejected,
          error: rejected.length ? `Proveedor rechazó: ${rejected.join(', ')}` : 'El proveedor SMTP no confirmó aceptación del destinatario'
        });
        continue;
      }

      sent += 1;
      results.push({
        recipient,
        status: 'sent',
        messageId: providerResult?.messageId || null,
        accepted,
        rejected
      });
    } catch (sendError) {
      failed += 1;
      results.push({
        recipient,
        status: 'failed',
        error: sendError?.message || 'Error de envío SMTP'
      });
    }
  }

  if (failed > 0 || sent === 0) {
    const error = new Error(
      `No se pudo completar el envío manual. Enviados: ${sent}. Errores: ${failed}. ${results.filter((row) => row.status === 'failed').map((row) => `${row.recipient}: ${row.error || 'error desconocido'}`).join(' | ')}`
    );
    error.status = 502;
    error.details = results;
    throw error;
  }

  return {
    success: true,
    message: 'Notificación manual aceptada por el proveedor SMTP',
    recipients,
    certificationId: id,
    triggerType: manualTriggerInfo.triggerType,
    daysUntilExpiration: manualTriggerInfo.daysUntilExpiration,
    sent,
    failed,
    results
  };
}
