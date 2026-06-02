import { createClient } from '@supabase/supabase-js';
import {
  canManageByRole,
  canViewByRole,
  normalizeRole
} from '../../routes/nutritionModules/helpers.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export async function resolveUserRole(user) {
  if (!supabaseAdmin || !user?.id) return normalizeRole(user?.role || 'user');

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo validar permisos');
  }

  if (profile?.is_active === false) {
    throw new Error('Usuario inactivo');
  }

  return normalizeRole(profile?.role || user?.role || 'user');
}

export async function canAccessModule(role, moduleId) {
  if (!canViewByRole(role)) {
    return { allowed: false, row: null, reason: 'No autorizado para acceder a módulos nutricionales', status: 403 };
  }
  const { data, error } = await supabaseAdmin
    .from('nutrition_modules')
    .select('*')
    .eq('id', moduleId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Error consultando módulo');
  if (!data) return { allowed: false, row: null, reason: 'Módulo no encontrado', status: 404 };
  if (!canManageByRole(role) && data.status !== 'aprobado') {
    return { allowed: false, row: data, reason: 'No autorizado para acceder a este módulo', status: 403 };
  }
  return { allowed: true, row: data, reason: null, status: 200 };
}
