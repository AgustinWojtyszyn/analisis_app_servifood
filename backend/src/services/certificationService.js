import { createClient } from '@supabase/supabase-js';
import { enrichCertificationWithNotification, getCertificationNotificationTrigger } from './certificationNotificationService.js';
import { parseDateInputToParts, getArgentinaDateISO } from '../utils/argentinaDateUtils.js';
import {
  sendCertificationExpirationTestEmail,
  CERTIFICATION_TEST_EMAIL_RECIPIENT
} from './email/emailService.js';
import { processCertificationAutomaticNotification } from './certificationAutomaticNotificationService.js';

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

  if (!name) throwBadRequest('El nombre es requerido');
  if (!expirationDate) throwBadRequest('La fecha de vencimiento es requerida');
  if (!parseDateInputToParts(expirationDate)) throwBadRequest('La fecha de vencimiento es inválida');

  return {
    name,
    type: String(payload.type || '').trim() || null,
    module: String(payload.module || '').trim() || null,
    description: String(payload.description || '').trim() || null,
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

  const byCertificationTrigger = new Map();
  if (ids.length) {
    const { data: logRows } = await supabaseAdmin
      .from('certification_notification_logs')
      .select('certification_id, trigger_type, status')
      .eq('recipient', CERTIFICATION_TEST_EMAIL_RECIPIENT)
      .in('certification_id', ids);

    for (const log of (logRows || [])) {
      const key = `${log?.certification_id || ''}::${log?.trigger_type || ''}`;
      if (key !== '::') byCertificationTrigger.set(key, String(log?.status || '').toLowerCase());
    }
  }

  const decoratedItems = items.map((item) => {
    if (!item?.shouldNotify || !item?.triggerType) {
      return {
        ...item,
        notificationMessage: 'Sin aviso para hoy',
        notificationStatus: 'none'
      };
    }

    const key = `${item.id}::${item.triggerType}`;
    const currentStatus = byCertificationTrigger.get(key) || '';
    if (currentStatus === 'sent') {
      return {
        ...item,
        notificationMessage: 'Notificación enviada',
        notificationStatus: 'sent'
      };
    }

    if (currentStatus === 'processing') {
      return {
        ...item,
        notificationMessage: 'Trigger detectado, pendiente de envío automático',
        notificationStatus: 'processing'
      };
    }

    return {
      ...item,
      notificationMessage: 'Trigger detectado, listo para notificación automática piloto',
      notificationStatus: currentStatus === 'failed' ? 'failed' : 'pending'
    };
  });
  const summary = {
    total: decoratedItems.length,
    active: decoratedItems.filter((i) => i.status === 'active').length,
    nearExpiration: decoratedItems.filter((i) => i.status === 'near_expiration' || i.status === 'expires_in_7_days' || i.status === 'expires_tomorrow').length,
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
  const { items } = await listCertifications();
  const triggered = items.filter((item) => item.shouldNotify);
  return {
    date: getArgentinaDateISO(),
    sendEnabled: true,
    triggerCount: triggered.length,
    message: 'Trigger detectado, listo para notificación automática piloto',
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
  if (!triggerInfo.shouldNotify) {
    return {
      success: false,
      message: 'La certificación no dispara notificación hoy. Ajustá la fecha de vencimiento para probar un trigger de 7 días o 1 día.',
      recipient: CERTIFICATION_TEST_EMAIL_RECIPIENT,
      certificationId: id,
      triggerType: triggerInfo.triggerType,
      daysUntilExpiration: triggerInfo.daysUntilExpiration
    };
  }

  await sendCertificationExpirationTestEmail({
    certification: data,
    triggerInfo,
    to: CERTIFICATION_TEST_EMAIL_RECIPIENT
  });

  return {
    success: true,
    message: 'Email de prueba enviado correctamente',
    recipient: CERTIFICATION_TEST_EMAIL_RECIPIENT,
    certificationId: id,
    triggerType: triggerInfo.triggerType,
    daysUntilExpiration: triggerInfo.daysUntilExpiration
  };
}
