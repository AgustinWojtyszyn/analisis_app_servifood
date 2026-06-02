import { getSupabaseAdmin } from './context.js';

export const EDIT_WINDOW_MINUTES = 15;
export const HEALTH_DECLARATION_TIMEZONE = 'America/Argentina/Buenos_Aires';

export function buildHealthEvaluation({
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

export function getLocalDateParts(date = new Date(), timeZone = HEALTH_DECLARATION_TIMEZONE) {
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

export function localDateString(date = new Date(), timeZone = HEALTH_DECLARATION_TIMEZONE) {
  const { year, month, day } = getLocalDateParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

export function isSameLocalDay(dateA, dateB, timeZone = HEALTH_DECLARATION_TIMEZONE) {
  if (!dateA || !dateB) return false;
  const a = dateA instanceof Date ? dateA : new Date(dateA);
  const b = dateB instanceof Date ? dateB : new Date(dateB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  const pa = getLocalDateParts(a, timeZone);
  const pb = getLocalDateParts(b, timeZone);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

export function canManageWithinWindow(row) {
  const base = row?.declared_at || row?.created_at;
  if (!base) return false;
  const diffMs = Date.now() - new Date(base).getTime();
  return diffMs >= 0 && diffMs <= EDIT_WINDOW_MINUTES * 60 * 1000;
}

export function toYesNo(value) {
  return value === true ? 'Sí' : 'No';
}

export function toPolicyValue(value) {
  return value === true ? 'Aceptada' : 'No aceptada';
}

export function normalizeStatus(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'apto') return 'Apto';
  if (v === 'no apto') return 'No Apto';
  if (!v) return 'No informado';
  if (v === 'requiere evaluación' || v === 'requiere evaluacion') return 'No Apto';
  return value;
}

export function normalizeTrafficLight(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'verde') return 'Verde';
  if (v === 'amarillo') return 'Amarillo';
  if (v === 'rojo') return 'Rojo';
  return 'No informado';
}

export function getDateTimeParts(value) {
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

export function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = getLocalDateParts(date, HEALTH_DECLARATION_TIMEZONE);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isUniqueViolation(error) {
  const code = String(error?.code || '').trim();
  if (code === '23505') return true;
  const message = String(error?.message || '').toLowerCase();
  return message.includes('duplicate') || message.includes('unique');
}

export function declarationAlreadyExistsResponse(res) {
  return res.status(409).json({
    success: false,
    code: 'DECLARATION_ALREADY_EXISTS',
    message: 'Ya registraste tu declaración de salud de hoy.'
  });
}

export function mapDeclaration(row, profileByUserId = new Map()) {
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

export async function loadProfilesMap(userIds = []) {
  const validIds = [...new Set((userIds || []).filter(Boolean))];
  if (!validIds.length) return new Map();

  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, full_name, email')
    .in('id', validIds);

  if (error || !Array.isArray(data)) return new Map();
  return new Map(data.map((row) => [row.id, row]));
}

export async function getRecentDeclarationsByUser(userId, limit = 60) {
  return await getSupabaseAdmin()
    .from('health_declarations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

export function pickTodayDeclaration(rows = [], now = new Date()) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows.find((row) => {
    const sourceDate = row?.declared_at || row?.created_at;
    return isSameLocalDay(sourceDate, now, HEALTH_DECLARATION_TIMEZONE);
  }) || null;
}

export async function getTodayDeclaration(userId) {
  const date = localDateString(new Date(), HEALTH_DECLARATION_TIMEZONE);

  const byDeclarationDate = await getSupabaseAdmin()
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
