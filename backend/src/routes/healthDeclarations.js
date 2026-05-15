import '../config/env.js';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export function __setSupabaseAdminForTests(client) {
  supabaseAdmin = client;
}

const EDIT_WINDOW_MINUTES = 15;
const HEALTH_DECLARATION_TIMEZONE = 'America/Argentina/Buenos_Aires';

function buildHealthEvaluation({
  hasSymptoms = false,
  hasFever = false,
  recentContact = false,
  symptomsDetail = {}
} = {}) {
  const detail = symptomsDetail && typeof symptomsDetail === 'object' ? symptomsDetail : {};
  const flags = {
    cough: Boolean(detail.cough),
    soreThroat: Boolean(detail.soreThroat),
    difficultyBreathing: Boolean(detail.difficultyBreathing),
    vomiting: Boolean(detail.vomiting),
    diarrhea: Boolean(detail.diarrhea),
    jaundice: Boolean(detail.jaundice),
    skinLesions: Boolean(detail.skinLesions),
    uncoveredWounds: Boolean(detail.uncoveredWounds)
  };

  const isRed = flags.vomiting
    || flags.diarrhea
    || flags.jaundice
    || Boolean(hasFever)
    || flags.difficultyBreathing;

  const isYellow = !isRed && (
    flags.uncoveredWounds
    || flags.skinLesions
    || flags.cough
    || flags.soreThroat
    || Boolean(recentContact)
    || Boolean(hasSymptoms)
  );

  if (isRed) {
    return {
      healthStatus: 'No Apto',
      trafficLight: 'Rojo',
      suggestedAction: 'No ingresar a producción. Derivar a médico laboral, informar a supervisor/calidad y activar reemplazo operativo si corresponde.'
    };
  }

  if (isYellow) {
    return {
      healthStatus: 'Requiere evaluación',
      trafficLight: 'Amarillo',
      suggestedAction: 'Avisar al supervisor y evaluar gravedad. Si hay herida leve: vendaje impermeable + guante de nitrilo. Si hay síntoma respiratorio leve: barbijo y refuerzo de lavado de manos.'
    };
  }

  return {
    healthStatus: 'Apto',
    trafficLight: 'Verde',
    suggestedAction: 'Puede ingresar. Mantener higiene de manos y cumplimiento de prácticas sanitarias.'
  };
}

function getLocalDateParts(date = new Date(), timeZone = HEALTH_DECLARATION_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    const fallback = new Date(date);
    return {
      year: String(fallback.getUTCFullYear()),
      month: String(fallback.getUTCMonth() + 1).padStart(2, '0'),
      day: String(fallback.getUTCDate()).padStart(2, '0')
    };
  }

  return { year, month, day };
}

function localDateString(date = new Date(), timeZone = HEALTH_DECLARATION_TIMEZONE) {
  const { year, month, day } = getLocalDateParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

function isSameLocalDay(dateA, dateB, timeZone = HEALTH_DECLARATION_TIMEZONE) {
  if (!dateA || !dateB) return false;
  const a = dateA instanceof Date ? dateA : new Date(dateA);
  const b = dateB instanceof Date ? dateB : new Date(dateB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  const pa = getLocalDateParts(a, timeZone);
  const pb = getLocalDateParts(b, timeZone);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

function canManageWithinWindow(row) {
  const base = row?.declared_at || row?.created_at;
  if (!base) return false;
  const diffMs = Date.now() - new Date(base).getTime();
  return diffMs >= 0 && diffMs <= EDIT_WINDOW_MINUTES * 60 * 1000;
}

function toYesNo(value) {
  return value === true ? 'Sí' : 'No';
}

function toPolicyValue(value) {
  return value === true ? 'Aceptada' : 'No aceptada';
}

function normalizeStatus(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'apto') return 'Apto';
  if (v === 'no apto') return 'No Apto';
  if (!v) return 'No informado';
  if (v === 'requiere evaluación' || v === 'requiere evaluacion') return 'No Apto';
  return value;
}

function normalizeTrafficLight(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'verde') return 'Verde';
  if (v === 'amarillo') return 'Amarillo';
  if (v === 'rojo') return 'Rojo';
  return 'No informado';
}

function getDateTimeParts(value) {
  if (!value) return { fecha: '', hora: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { fecha: '', hora: '' };
  const fecha = new Intl.DateTimeFormat('es-AR', {
    timeZone: HEALTH_DECLARATION_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
  const hora = new Intl.DateTimeFormat('es-AR', {
    timeZone: HEALTH_DECLARATION_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
  return { fecha, hora };
}

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = getLocalDateParts(date, HEALTH_DECLARATION_TIMEZONE);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function mapDeclaration(row, profileByUserId = new Map()) {
  if (!row) return null;
  const profile = profileByUserId.get(row.user_id) || null;
  const fallbackEvaluation = buildHealthEvaluation({
    hasSymptoms: Boolean(row.has_symptoms),
    hasFever: Boolean(row.has_fever),
    recentContact: Boolean(row.recent_contact),
    symptomsDetail: row.symptoms_detail || {}
  });
  return {
    id: row.id,
    userId: row.user_id,
    userName: profile?.full_name || profile?.email || row.user_id,
    userEmail: profile?.email || null,
    declarationDate: row.declaration_date || null,
    declaredAt: row.declared_at || row.created_at || null,
    hasSymptoms: Boolean(row.has_symptoms),
    hasFever: Boolean(row.has_fever),
    recentContact: Boolean(row.recent_contact),
    symptomsDetail: row.symptoms_detail || {},
    commitInform: Boolean(row.commit_inform),
    policyAccepted: Boolean(row.policy_accepted),
    healthStatus: row.health_status || fallbackEvaluation.healthStatus,
    trafficLight: row.traffic_light || fallbackEvaluation.trafficLight,
    suggestedAction: row.suggested_action || fallbackEvaluation.suggestedAction,
    actionTaken: row.action_taken || '',
    supervisorObservation: row.supervisor_observation || '',
    medicalReferral: Boolean(row.medical_referral),
    medicalClearance: Boolean(row.medical_clearance),
    returnDate: row.return_date || null,
    policyId: row.policy_id || null,
    createdAt: row.created_at || null,
    editableUntil: row.declared_at || row.created_at || null,
    canEditOrDelete: canManageWithinWindow(row)
  };
}

async function loadProfilesMap(userIds = []) {
  const validIds = [...new Set((userIds || []).filter(Boolean))];
  if (!validIds.length) return new Map();

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', validIds);

  if (error || !Array.isArray(data)) return new Map();
  return new Map(data.map((row) => [row.id, row]));
}

async function getRecentDeclarationsByUser(userId, limit = 60) {
  return await supabaseAdmin
    .from('health_declarations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

function pickTodayDeclaration(rows = [], now = new Date()) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows.find((row) => {
    const sourceDate = row?.declared_at || row?.created_at;
    return isSameLocalDay(sourceDate, now, HEALTH_DECLARATION_TIMEZONE);
  }) || null;
}

async function getTodayDeclaration(userId) {
  const date = localDateString(new Date(), HEALTH_DECLARATION_TIMEZONE);

  const byDeclarationDate = await supabaseAdmin
    .from('health_declarations')
    .select('*')
    .eq('user_id', userId)
    .eq('declaration_date', date)
    .order('created_at', { ascending: false })
    .limit(1);

  if (byDeclarationDate.error) {
    const recentQuery = await getRecentDeclarationsByUser(userId);

    if (recentQuery.error) return recentQuery;

    const todayRow = pickTodayDeclaration(recentQuery.data, new Date());
    return { data: todayRow ? [todayRow] : [], error: null };
  }

  // Defensive check: even if declaration_date is populated, enforce local-day match from timestamp.
  const candidate = byDeclarationDate.data?.[0] || null;
  if (candidate) {
    const sourceDate = candidate.declared_at || candidate.created_at;
    if (isSameLocalDay(sourceDate, new Date(), HEALTH_DECLARATION_TIMEZONE)) {
      return byDeclarationDate;
    }
  }

  const recentQuery = await getRecentDeclarationsByUser(userId);

  if (recentQuery.error) return recentQuery;
  const todayRow = pickTodayDeclaration(recentQuery.data, new Date());
  return { data: todayRow ? [todayRow] : [], error: null };
}

router.get('/health-policies/active', authenticateToken, async (_req, res) => {
  try {
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
});

router.get('/health-declarations/today', authenticateToken, async (req, res) => {
  try {
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
});

router.post('/health-declarations', authenticateToken, async (req, res) => {
  try {
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
      return res.status(409).json({ error: 'Ya completaste la declaración de hoy' });
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
      if (String(error.message || '').toLowerCase().includes('duplicate') || String(error.code || '') === '23505') {
        return res.status(409).json({ error: 'Ya completaste la declaración de hoy' });
      }
      return res.status(500).json({ error: error.message || 'Error guardando declaración' });
    }

    const risk = Boolean(hasSymptoms || hasFever || recentContact);
    const profileMap = await loadProfilesMap([data.user_id]);
    return res.status(201).json({ success: true, risk, declaration: mapDeclaration(data, profileMap) });
  } catch {
    return res.status(500).json({ error: 'Error interno guardando declaración' });
  }
});

router.put('/health-declarations/:id/me', authenticateToken, async (req, res) => {
  try {
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
});

router.delete('/health-declarations/:id/me', authenticateToken, async (req, res) => {
  try {
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
});

router.get('/health-declarations/me', authenticateToken, async (req, res) => {
  try {
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
});

router.get('/health-declarations/admin', authenticateToken, requireAdmin, async (_req, res) => {
  try {
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
});

router.delete('/health-declarations/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
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
});

export async function exportHealthDeclarationsHandler(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const requestedIds = Array.isArray(req.body?.ids)
      ? [...new Set(req.body.ids.filter((id) => typeof id === 'string' && id.trim()))]
      : [];

    let query = supabaseAdmin
      .from('health_declarations')
      .select('*')
      .order('created_at', { ascending: false });

    if (requestedIds.length) {
      query = query.in('id', requestedIds);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message || 'Error exportando declaraciones' });
    }

    const profileMap = await loadProfilesMap((data || []).map((item) => item.user_id));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Declaraciones Salud');

    const tableRows = [];
    for (const row of data || []) {
      const profile = profileMap.get(row.user_id) || null;
      const declaredAt = row.declared_at || row.created_at || null;
      const { fecha, hora } = getDateTimeParts(declaredAt);
      const evalRow = buildHealthEvaluation({
        hasSymptoms: Boolean(row.has_symptoms),
        hasFever: Boolean(row.has_fever),
        recentContact: Boolean(row.recent_contact),
        symptomsDetail: row.symptoms_detail || {}
      });
      tableRows.push([
        profile?.full_name || profile?.email || row.user_id,
        profile?.email || '',
        fecha,
        hora,
        toYesNo(row.has_symptoms === true),
        toYesNo(row.has_fever === true),
        toYesNo(row.recent_contact === true),
        toPolicyValue(row.policy_accepted === true),
        normalizeStatus(row.health_status || evalRow.healthStatus),
        normalizeTrafficLight(row.traffic_light || evalRow.trafficLight)
      ]);
    }

    sheet.addTable({
      name: 'DeclaracionesSaludTable',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleLight9',
        showRowStripes: false
      },
      columns: [
        { name: 'Usuario', filterButton: true },
        { name: 'Email', filterButton: true },
        { name: 'Fecha', filterButton: true },
        { name: 'Hora', filterButton: true },
        { name: 'Síntomas', filterButton: true },
        { name: 'Fiebre', filterButton: true },
        { name: 'Contacto', filterButton: true },
        { name: 'Política aceptada', filterButton: true },
        { name: 'Estado', filterButton: true },
        { name: 'Semáforo', filterButton: true }
      ],
      rows: tableRows
    });

    sheet.getColumn(1).width = 24;
    sheet.getColumn(2).width = 34;
    sheet.getColumn(3).width = 14;
    sheet.getColumn(4).width = 10;
    sheet.getColumn(5).width = 12;
    sheet.getColumn(6).width = 10;
    sheet.getColumn(7).width = 12;
    sheet.getColumn(8).width = 16;
    sheet.getColumn(9).width = 14;
    sheet.getColumn(10).width = 12;

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });

    for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
      const row = sheet.getRow(rowIndex);
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
      for (let col = 3; col <= 10; col += 1) {
        row.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
      }
    }

    const exportedDates = (data || [])
      .map((row) => toIsoDate(row.declared_at || row.created_at))
      .filter(Boolean)
      .sort();
    const defaultIsoDate = new Date().toISOString().slice(0, 10);
    const fromIso = (typeof req.body?.fromDate === 'string' && req.body.fromDate) || exportedDates[0] || defaultIsoDate;
    const toIso = (typeof req.body?.toDate === 'string' && req.body.toDate) || exportedDates[exportedDates.length - 1] || defaultIsoDate;
    const fileName = `declaraciones_salud_${fromIso}_a_${toIso}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(Buffer.from(buffer));
  } catch {
    return res.status(500).json({ error: 'Error interno exportando declaraciones' });
  }
}

router.post('/health-declarations/export', authenticateToken, requireAdmin, exportHealthDeclarationsHandler);

export default router;
