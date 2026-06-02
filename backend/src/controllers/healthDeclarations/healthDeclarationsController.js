import { getSupabaseAdmin } from './context.js';
import {
  buildHealthEvaluation,
  canManageWithinWindow,
  declarationAlreadyExistsResponse,
  getTodayDeclaration,
  HEALTH_DECLARATION_TIMEZONE,
  isUniqueViolation,
  loadProfilesMap,
  localDateString,
  mapDeclaration
} from './helpers.js';

export async function getActiveHealthPolicyHandler(_req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await supabaseAdmin
      .from('health_policies')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando políticas' });
    }

    return res.json(data || null);
  } catch {
    return res.status(500).json({ error: 'Error interno consultando política activa' });
  }
}

export async function getTodayHealthDeclarationHandler(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await getTodayDeclaration(req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando declaración diaria' });
    }

    const row = data?.[0] || null;
    const profileMap = row ? await loadProfilesMap([row.user_id]) : new Map();
    return res.json({ completed: Boolean(row), declaration: mapDeclaration(row, profileMap) });
  } catch {
    return res.status(500).json({ error: 'Error interno consultando declaración diaria' });
  }
}

export async function createHealthDeclarationHandler(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'user_id')) {
      return res.status(400).json({ error: 'No se permite enviar user_id en el body' });
    }

    const {
      hasSymptoms,
      hasFever,
      recentContact,
      symptomsDetail = {},
      commitInform,
      policyAccepted,
      policyId = null
    } = req.body || {};

    const requiredBooleans = [hasSymptoms, hasFever, recentContact, commitInform, policyAccepted];
    if (requiredBooleans.some((value) => typeof value !== 'boolean')) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!commitInform) {
      return res.status(400).json({ error: 'Debes comprometerte a informar síntomas durante la jornada' });
    }

    if (!policyAccepted) {
      return res.status(400).json({ error: 'Debes aceptar la política vigente' });
    }

    const todayResult = await getTodayDeclaration(req.user.id);
    if (!todayResult.error && todayResult.data?.length) {
      return declarationAlreadyExistsResponse(res);
    }

    const date = localDateString(new Date(), HEALTH_DECLARATION_TIMEZONE);
    const evaluation = buildHealthEvaluation({ hasSymptoms, hasFever, recentContact, symptomsDetail });

    const baseInsertPayload = {
      user_id: req.user.id,
      declaration_date: date,
      declared_at: new Date().toISOString(),
      has_symptoms: hasSymptoms,
      has_fever: hasFever,
      recent_contact: recentContact,
      commit_inform: commitInform,
      policy_accepted: policyAccepted,
      policy_id: policyId
    };

    let insertResponse = await supabaseAdmin
      .from('health_declarations')
      .insert({
        ...baseInsertPayload,
        symptoms_detail: symptomsDetail,
        health_status: evaluation.healthStatus,
        traffic_light: evaluation.trafficLight,
        suggested_action: evaluation.suggestedAction
      })
      .select('*')
      .single();

    if (insertResponse.error) {
      insertResponse = await supabaseAdmin
        .from('health_declarations')
        .insert(baseInsertPayload)
        .select('*')
        .single();
    }

    const { data, error } = insertResponse;

    if (error) {
      if (isUniqueViolation(error)) {
        return declarationAlreadyExistsResponse(res);
      }
      return res.status(500).json({ error: error.message || 'Error guardando declaración' });
    }

    const risk = Boolean(hasSymptoms || hasFever || recentContact);
    const profileMap = await loadProfilesMap([data.user_id]);
    return res.status(201).json({ success: true, risk, declaration: mapDeclaration(data, profileMap) });
  } catch {
    return res.status(500).json({ error: 'Error interno guardando declaración' });
  }
}

export async function updateMyHealthDeclarationHandler(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { id } = req.params;
    const {
      hasSymptoms,
      hasFever,
      recentContact,
      symptomsDetail = {},
      commitInform,
      policyAccepted,
      policyId = null
    } = req.body || {};

    const requiredBooleans = [hasSymptoms, hasFever, recentContact, commitInform, policyAccepted];
    if (requiredBooleans.some((value) => typeof value !== 'boolean')) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const existing = await supabaseAdmin
      .from('health_declarations')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existing.error || !existing.data) {
      return res.status(404).json({ error: 'Declaración no encontrada' });
    }

    if (!canManageWithinWindow(existing.data)) {
      return res.status(403).json({ error: 'Solo puedes editar dentro de los primeros 15 minutos' });
    }

    const evaluation = buildHealthEvaluation({ hasSymptoms, hasFever, recentContact, symptomsDetail });

    let updateResponse = await supabaseAdmin
      .from('health_declarations')
      .update({
        has_symptoms: hasSymptoms,
        has_fever: hasFever,
        recent_contact: recentContact,
        commit_inform: commitInform,
        policy_accepted: policyAccepted,
        policy_id: policyId,
        symptoms_detail: symptomsDetail,
        health_status: evaluation.healthStatus,
        traffic_light: evaluation.trafficLight,
        suggested_action: evaluation.suggestedAction
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single();

    if (updateResponse.error) {
      updateResponse = await supabaseAdmin
        .from('health_declarations')
        .update({
          has_symptoms: hasSymptoms,
          has_fever: hasFever,
          recent_contact: recentContact,
          commit_inform: commitInform,
          policy_accepted: policyAccepted,
          policy_id: policyId
        })
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select('*')
        .single();
    }

    const { data, error } = updateResponse;

    if (error) {
      return res.status(500).json({ error: error.message || 'No se pudo actualizar la declaración' });
    }

    const profileMap = await loadProfilesMap([data.user_id]);
    return res.json({ success: true, declaration: mapDeclaration(data, profileMap) });
  } catch {
    return res.status(500).json({ error: 'Error interno actualizando declaración' });
  }
}

export async function deleteMyHealthDeclarationHandler(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { id } = req.params;

    const existing = await supabaseAdmin
      .from('health_declarations')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existing.error || !existing.data) {
      return res.status(404).json({ error: 'Declaración no encontrada' });
    }

    if (!canManageWithinWindow(existing.data)) {
      return res.status(403).json({ error: 'Solo puedes eliminar dentro de los primeros 15 minutos' });
    }

    const { error } = await supabaseAdmin
      .from('health_declarations')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message || 'Error eliminando declaración' });
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Error interno eliminando declaración' });
  }
}

export async function getMyHealthDeclarationsHandler(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await supabaseAdmin
      .from('health_declarations')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando historial' });
    }

    const profileMap = await loadProfilesMap([req.user.id]);
    return res.json((data || []).map((row) => mapDeclaration(row, profileMap)));
  } catch {
    return res.status(500).json({ error: 'Error interno consultando historial' });
  }
}

export async function getAdminHealthDeclarationsHandler(_req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await supabaseAdmin
      .from('health_declarations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando declaraciones' });
    }

    const profileMap = await loadProfilesMap((data || []).map((item) => item.user_id));
    return res.json((data || []).map((row) => mapDeclaration(row, profileMap)));
  } catch {
    return res.status(500).json({ error: 'Error interno consultando declaraciones' });
  }
}

export async function deleteHealthDeclarationByIdHandler(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('health_declarations')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message || 'Error eliminando declaración' });
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Error interno eliminando declaración' });
  }
}
