import { CURRENT_POLICY_VERSION } from '../constants/policies';
import { supabase } from '../lib/supabaseClient';

const SELECT_FIELDS = 'id, user_id, policy_version, accepted_at, created_at, updated_at';

export async function getCurrentPolicyAcceptance() {
  const { data, error } = await supabase
    .from('policy_acceptances')
    .select(SELECT_FIELDS)
    .eq('policy_version', CURRENT_POLICY_VERSION)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'No se pudo leer la aceptación de políticas');
  }

  return data || null;
}

export async function acceptCurrentPolicy(userId) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    throw new Error('No hay usuario autenticado para registrar la aceptación');
  }

  const { data, error } = await supabase
    .from('policy_acceptances')
    .upsert(
      {
        user_id: normalizedUserId,
        policy_version: CURRENT_POLICY_VERSION,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,policy_version' }
    )
    .select(SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'No se pudo registrar la aceptación de políticas');
  }

  return data || null;
}
