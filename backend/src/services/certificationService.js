import { createClient } from '@supabase/supabase-js';
import { enrichCertificationWithNotification } from './certificationNotificationService.js';
import { parseDateInputToParts, getArgentinaDateISO } from '../utils/argentinaDateUtils.js';

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
  const summary = {
    total: items.length,
    active: items.filter((i) => i.status === 'active').length,
    nearExpiration: items.filter((i) => i.status === 'near_expiration' || i.status === 'expires_in_7_days' || i.status === 'expires_tomorrow').length,
    expired: items.filter((i) => i.status === 'expired').length,
    triggersDetected: items.filter((i) => i.shouldNotify).length
  };

  return { items, summary };
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
    sendEnabled: false,
    triggerCount: triggered.length,
    message: 'Trigger detectado, envío desactivado en período de prueba',
    items: triggered
  };
}
