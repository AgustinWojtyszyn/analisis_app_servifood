import { buildSummary, getCanonicalAnnualDeviationRows } from '../annualDeviation/annualDeviationService.js';
import { buildMetricChange } from '../../controllers/analysis/analysisComparison.js';
import { enrichCertificationWithNotification } from '../certificationNotificationService.js';
import { getArgentinaTodayDateParts } from '../../utils/argentinaDateUtils.js';

const PAGE_SIZE = 500;

// Stable ordering is required so Supabase's row limit never silently truncates a KPI.
export async function readAllPages(queryFactory) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await queryFactory().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export function dashboardMonths(now = new Date()) {
  const { year, month } = getArgentinaTodayDateParts(now);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 6 + index, 1));
    return {
      key: date.toISOString().slice(0, 7), year: date.getUTCFullYear(), month: date.getUTCMonth() + 1,
      label: date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      shortLabel: date.toLocaleDateString('es-AR', { month: 'short', timeZone: 'UTC' }),
      partial: index === 5
    };
  });
}

export function buildDeviationOverview(uploads, rows, now = new Date()) {
  const months = dashboardMonths(now).map((month) => {
    const upload = uploads.find((item) => Number(item.year) === month.year);
    const sourceRows = getCanonicalAnnualDeviationRows(rows.filter((row) => row.uploadId === upload?.id));
    const cutoff = Number(upload?.metadata?.validThroughMonth) || 0;
    const monthRows = sourceRows.filter((row) => Number(row.monthNumber) === month.month
      && Number(row.year || upload.year) === month.year);
    // An absent month is unknown unless the workbook explicitly declares coverage.
    const available = Boolean(upload && (cutoff ? month.month <= cutoff : monthRows.length > 0));
    const summary = available ? buildSummary(monthRows) : null;
    return { ...month, total: summary?.total ?? null, sectors: summary?.byArea || [], categories: summary?.byClassification || [] };
  });
  const current = months.at(-1);
  const previous = months.at(-2);
  const change = current.total !== null && previous.total !== null
    ? buildMetricChange(current.total, previous.total) : null;
  return {
    months, current, previous, change,
    topSectors: current.sectors.slice(0, 3).map((item) => ({ ...item, share: current.total ? item.value / current.total * 100 : 0 })),
    sources: uploads.map(({ id, filename, uploaded_at, year }) => ({ id, filename, uploadedAt: uploaded_at, year }))
  };
}

async function loadDeviations(db, now) {
  const years = [...new Set(dashboardMonths(now).map((month) => month.year))];
  const uploads = (await Promise.all(years.map(async (year) => {
    const { data, error } = await db.from('annual_deviation_uploads')
      .select('id, filename, uploaded_at, year, metadata').eq('year', year)
      .order('uploaded_at', { ascending: false }).order('id', { ascending: false }).limit(1);
    if (error) throw error;
    return data?.[0];
  }))).filter(Boolean);
  if (!uploads.length) return buildDeviationOverview([], [], now);
  const rows = await readAllPages(() => db.from('annual_deviation_rows')
    .select('id, upload_id, sheet_type, month, month_number, year, area_sector, classification')
    .in('upload_id', uploads.map((upload) => upload.id)).order('id', { ascending: true }));
  return buildDeviationOverview(uploads, rows.map((row) => ({
    uploadId: row.upload_id, sheetType: row.sheet_type, month: row.month, monthNumber: row.month_number,
    year: row.year, areaSector: row.area_sector, classification: row.classification
  })), now);
}

export function buildNonconformityOverview(rows) {
  let open = 0;
  let overdue = 0;
  let unknown = 0;
  rows.forEach((row) => {
    const status = String(row.status || '').trim().toLowerCase();
    if (['vencido', 'vencida'].includes(status)) { open += 1; overdue += 1; }
    else if (['abierto', 'abierta', 'pendiente', 'en proceso'].includes(status)) open += 1;
    else if (!['cerrado', 'cerrada'].includes(status)) unknown += 1;
  });
  return { total: rows.length, open, overdue, unknown, deadlineSupported: false };
}

export function buildCertificationOverview(rows, now = new Date()) {
  const items = rows.map((row) => enrichCertificationWithNotification(row, now));
  const upcoming = items.filter((item) => Number.isFinite(item.daysUntilExpiration)
    && item.daysUntilExpiration >= 0 && item.daysUntilExpiration <= 30)
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration || a.name.localeCompare(b.name));
  const expired = items.filter((item) => item.daysUntilExpiration < 0);
  return { total: items.length, count: upcoming.length, urgent: upcoming.slice(0, 3), expired: expired.length,
    invalidDates: items.filter((item) => !Number.isFinite(item.daysUntilExpiration)).length };
}

export function buildExecutiveAlerts({ deviations, nonconformities, certifications, errors }) {
  const alerts = [];
  const add = (id, severity, title, detail, target) => alerts.push({ id, severity, title, detail, target });
  Object.entries(errors).forEach(([key, message]) => add(`error-${key}`, 'warning', 'Información no disponible', message,
    { deviations: 'annualAnalysis', nonconformities: 'customerNonconformities', certifications: 'certifications' }[key]));
  if (certifications?.expired) add('expired', 'error', `${certifications.expired} certificaciones vencidas`, 'Revisá su renovación con los responsables.', 'certifications');
  if (nonconformities?.overdue) add('nc-overdue', 'error', `${nonconformities.overdue} NC declaradas vencidas`, 'El estado registrado requiere seguimiento inmediato.', 'customerNonconformities');
  if (certifications?.count) {
    const first = certifications.urgent[0];
    add('upcoming', first.daysUntilExpiration <= 7 ? 'error' : 'warning', `${certifications.count} certificaciones por vencer`,
      `${first.name}: ${first.daysUntilExpiration === 0 ? 'vence hoy' : `vence en ${first.daysUntilExpiration} días`}.`, 'certifications');
  }
  if (deviations?.change?.percentage >= 15) add('increase', 'warning', `Desvíos: +${deviations.change.percentage.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`,
    'El mes en curso ya supera al mes anterior completo.', 'annualAnalysis');
  const top = deviations?.topSectors[0];
  if (top && deviations.previous.sectors.some((item) => item.key === top.key && item.value > 0)) {
    add('recurring', 'warning', `Foco recurrente: ${top.name}`, `${top.value} desvíos este mes; también registró desvíos el mes anterior.`, 'annualAnalysis');
  }
  // Compare three completed months; a partial month cannot establish sustained growth.
  const completed = deviations?.months.slice(-4, -1) || [];
  if (completed.length === 3 && completed.every((item) => item.total !== null)) {
    const growing = completed[2].categories.find((category) => {
      const values = completed.map((month) => month.categories.find((item) => item.key === category.key)?.value || 0);
      return values[0] > 0 && values[0] < values[1] && values[1] < values[2];
    });
    if (growing) add('category-growth', 'warning', `${growing.name} en aumento`, 'Creció en los últimos tres meses completos. Revisá las causas.', 'annualAnalysis');
  }
  if (nonconformities?.open) add('nc-open', 'warning', `${nonconformities.open} no conformidades abiertas`,
    'Revisá los casos pendientes en NC Clientes.', 'customerNonconformities');
  if (deviations?.current.total === null) add('missing-month', 'info', 'El mes actual todavía no tiene cobertura',
    'Cargá o revisá la planilla anual para completar los indicadores.', 'annualAnalysis');
  if (nonconformities && !nonconformities.total) add('nc-empty', 'info', 'Sin NC persistidas para consultar',
    'Las planillas locales de NC Clientes no se guardan en la base de datos.', 'customerNonconformities');
  if (nonconformities && alerts.length < 3) add('nc-dates', 'info', 'Vencimientos de NC sin fecha disponible',
    'El registro actual no guarda fechas límite; solo permite identificar estados declarados.', 'customerNonconformities');
  if (certifications && alerts.length < 3) add('cert-status', 'info', certifications.total ? 'Agenda de certificaciones revisada' : 'Sin certificaciones registradas',
    certifications.total ? `${certifications.count} vencimientos en los próximos 30 días; ${certifications.expired} ya vencidas.` : 'Registrá las certificaciones para activar su seguimiento.', 'certifications');
  if (deviations && alerts.length < 3) add('month-status', 'info', 'Seguimiento del mes en curso',
    deviations.current.total === null ? 'Sin cobertura para calcular la variación.' : `${deviations.current.total} desvíos registrados. El mes aún no está cerrado.`, 'annualAnalysis');
  const priority = { error: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => priority[a.severity] - priority[b.severity]).slice(0, 5);
}

export async function loadExecutiveDashboard(db, now = new Date()) {
  const tasks = {
    deviations: () => loadDeviations(db, now),
    nonconformities: async () => buildNonconformityOverview(await readAllPages(() => db.from('customer_nonconformities').select('id, status').order('id', { ascending: true }))),
    certifications: async () => buildCertificationOverview(await readAllPages(() => db.from('certifications')
      .select('id, name, expiration_date, responsible_area, responsible_person').order('id', { ascending: true })), now)
  };
  const names = Object.keys(tasks);
  const results = await Promise.allSettled(names.map((name) => tasks[name]()));
  const result = { generatedAt: now.toISOString(), errors: {} };
  const labels = { deviations: 'el análisis anual', nonconformities: 'las NC persistidas', certifications: 'las certificaciones' };
  results.forEach((item, index) => {
    const name = names[index];
    result[name] = item.status === 'fulfilled' ? item.value : null;
    if (item.status === 'rejected') result.errors[name] = `No se pudo consultar ${labels[name]}. Intentá actualizar.`;
  });
  return { ...result, alerts: buildExecutiveAlerts(result) };
}
