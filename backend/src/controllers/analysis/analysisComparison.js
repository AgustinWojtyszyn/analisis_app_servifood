import {
  ensureSupabaseConfigured,
  returnSupabaseError
} from '../analysisController.utils.js';
import {
  getArgentinaDayEndIso,
  getArgentinaDayStartIso,
  parseDateInputToParts,
  toUtcDayNumber
} from '../../utils/argentinaDateUtils.js';
import { getSupabaseAdmin } from './context.js';

const MAX_PERIOD_DAYS = 366;
const PAGE_SIZE = 200;

const SUM_METRICS = [
  'totalRecords',
  'totalCases',
  'totalDesvios',
  'totalConformes',
  'totalInocuidad',
  'totalCalidad',
  'totalLogistica',
  'totalLegal',
  'totalProcedimiento',
  'totalMedioAmbiente',
  'totalRevisionManual',
  'totalInternos',
  'totalExternos',
  'totalNC',
  'totalOBS',
  'totalOM'
];

const CHANGE_METRICS = [
  'totalAnalyses',
  'totalRecords',
  'totalDesvios',
  'totalConformes',
  'totalNC',
  'totalOBS',
  'totalOM',
  'totalInocuidad',
  'totalCalidad',
  'totalLogistica',
  'totalLegal',
  'totalRevisionManual',
  'conformityRate',
  'deviationRate',
  'actionClosureRate'
];

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
}

function mergeCounter(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return target;
  Object.entries(source).forEach(([key, value]) => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) return;
    target[normalizedKey] = toNumber(target[normalizedKey]) + toNumber(value);
  });
  return target;
}

function createAggregate() {
  const aggregate = {
    totalAnalyses: 0,
    byCategoria: {},
    byArea: {},
    byTipo: {},
    actions: {
      abiertas: 0,
      cerradas: 0,
      enProceso: 0,
      sinAccion: 0
    }
  };

  SUM_METRICS.forEach((key) => {
    aggregate[key] = 0;
  });

  return aggregate;
}

function extractSummary(row = {}) {
  if (row.summary && typeof row.summary === 'object') return row.summary;
  if (row.results?.summary && typeof row.results.summary === 'object') return row.results.summary;
  return {};
}

function buildPeriodAggregate(rows = []) {
  const aggregate = createAggregate();
  const normalizedRows = Array.isArray(rows) ? rows : [];
  aggregate.totalAnalyses = normalizedRows.length;

  normalizedRows.forEach((row) => {
    const summary = extractSummary(row);

    SUM_METRICS.forEach((key) => {
      aggregate[key] += toNumber(summary[key]);
    });

    mergeCounter(aggregate.byCategoria, summary.byCategoria);
    mergeCounter(aggregate.byArea, summary.byArea);
    mergeCounter(aggregate.byTipo, summary.byTipo);

    const actions = summary.actions || {};
    aggregate.actions.abiertas += toNumber(actions.abiertas);
    aggregate.actions.cerradas += toNumber(actions.cerradas);
    aggregate.actions.enProceso += toNumber(actions.enProceso);
    aggregate.actions.sinAccion += toNumber(actions.sinAccion);
  });

  const actionTotal = Object.values(aggregate.actions).reduce((sum, value) => sum + toNumber(value), 0);
  aggregate.conformityRate = aggregate.totalRecords > 0
    ? round((aggregate.totalConformes / aggregate.totalRecords) * 100)
    : 0;
  aggregate.deviationRate = aggregate.totalRecords > 0
    ? round((aggregate.totalDesvios / aggregate.totalRecords) * 100)
    : 0;
  aggregate.actionClosureRate = actionTotal > 0
    ? round((aggregate.actions.cerradas / actionTotal) * 100)
    : 0;

  return aggregate;
}

function buildMetricChange(currentValue, previousValue) {
  const current = toNumber(currentValue);
  const previous = toNumber(previousValue);
  const absolute = round(current - previous);

  let percentage = null;
  if (previous === 0) {
    percentage = current === 0 ? 0 : null;
  } else {
    percentage = round(((current - previous) / Math.abs(previous)) * 100);
  }

  return {
    current: round(current),
    previous: round(previous),
    absolute,
    percentage,
    direction: absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'same'
  };
}

function buildComparisonChanges(periodA, periodB) {
  return CHANGE_METRICS.reduce((acc, key) => {
    acc[key] = buildMetricChange(periodA?.[key], periodB?.[key]);
    return acc;
  }, {});
}

function buildInsights(periodA, periodB) {
  const insights = [];
  const deviationRateDelta = round(toNumber(periodA.deviationRate) - toNumber(periodB.deviationRate));
  const conformityRateDelta = round(toNumber(periodA.conformityRate) - toNumber(periodB.conformityRate));
  const ncDelta = toNumber(periodA.totalNC) - toNumber(periodB.totalNC);
  const closureDelta = round(toNumber(periodA.actionClosureRate) - toNumber(periodB.actionClosureRate));

  if (deviationRateDelta !== 0) {
    insights.push({
      key: 'deviationRate',
      tone: deviationRateDelta < 0 ? 'positive' : 'negative',
      text: `La tasa de desvíos ${deviationRateDelta < 0 ? 'bajó' : 'subió'} ${Math.abs(deviationRateDelta)} puntos porcentuales.`
    });
  }

  if (conformityRateDelta !== 0) {
    insights.push({
      key: 'conformityRate',
      tone: conformityRateDelta > 0 ? 'positive' : 'negative',
      text: `La conformidad ${conformityRateDelta > 0 ? 'mejoró' : 'bajó'} ${Math.abs(conformityRateDelta)} puntos porcentuales.`
    });
  }

  if (ncDelta !== 0) {
    insights.push({
      key: 'totalNC',
      tone: ncDelta < 0 ? 'positive' : 'negative',
      text: `Las no conformidades ${ncDelta < 0 ? 'disminuyeron' : 'aumentaron'} en ${Math.abs(ncDelta)}.`
    });
  }

  if (closureDelta !== 0) {
    insights.push({
      key: 'actionClosureRate',
      tone: closureDelta > 0 ? 'positive' : 'negative',
      text: `El cierre de acciones ${closureDelta > 0 ? 'mejoró' : 'bajó'} ${Math.abs(closureDelta)} puntos porcentuales.`
    });
  }

  if (insights.length === 0) {
    insights.push({
      key: 'stable',
      tone: 'neutral',
      text: 'Los indicadores principales se mantuvieron estables entre ambos períodos.'
    });
  }

  return insights.slice(0, 4);
}

function parsePeriod(from, to, label) {
  const fromParts = parseDateInputToParts(from);
  const toParts = parseDateInputToParts(to);

  if (!fromParts || !toParts) {
    return { error: `${label}: las fechas deben usar formato YYYY-MM-DD` };
  }

  const fromDay = toUtcDayNumber(fromParts);
  const toDay = toUtcDayNumber(toParts);
  if (fromDay > toDay) {
    return { error: `${label}: la fecha inicial no puede ser posterior a la final` };
  }

  const days = toDay - fromDay + 1;
  if (days > MAX_PERIOD_DAYS) {
    return { error: `${label}: el período no puede superar ${MAX_PERIOD_DAYS} días` };
  }

  return {
    value: {
      from,
      to,
      days,
      fromIso: getArgentinaDayStartIso(from),
      toIso: getArgentinaDayEndIso(to)
    }
  };
}

function parseComparisonRequest(query = {}) {
  const periodA = parsePeriod(
    String(query.periodAFrom || '').trim(),
    String(query.periodATo || '').trim(),
    'Período A'
  );
  if (periodA.error) return { error: periodA.error };

  const periodB = parsePeriod(
    String(query.periodBFrom || '').trim(),
    String(query.periodBTo || '').trim(),
    'Período B'
  );
  if (periodB.error) return { error: periodB.error };

  return { periodA: periodA.value, periodB: periodB.value };
}

async function fetchPeriodRows(supabaseAdmin, period) {
  const rows = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const result = await supabaseAdmin
      .from('analysis_history')
      .select('id, created_at, summary:results->summary')
      .gte('created_at', period.fromIso)
      .lte('created_at', period.toIso)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (result.error) return result;

    const pageRows = Array.isArray(result.data) ? result.data : [];
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }

  return { data: rows, error: null };
}

export async function compareAnalysisPeriods(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const parsed = parseComparisonRequest(req.query || {});
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const [periodAResult, periodBResult] = await Promise.all([
      fetchPeriodRows(supabaseAdmin, parsed.periodA),
      fetchPeriodRows(supabaseAdmin, parsed.periodB)
    ]);

    if (periodAResult.error) {
      return returnSupabaseError(res, 'compare_period_a', periodAResult.error, 'No se pudo consultar el período A');
    }
    if (periodBResult.error) {
      return returnSupabaseError(res, 'compare_period_b', periodBResult.error, 'No se pudo consultar el período B');
    }

    const periodA = buildPeriodAggregate(periodAResult.data);
    const periodB = buildPeriodAggregate(periodBResult.data);

    return res.json({
      periodA: {
        range: { from: parsed.periodA.from, to: parsed.periodA.to, days: parsed.periodA.days },
        metrics: periodA
      },
      periodB: {
        range: { from: parsed.periodB.from, to: parsed.periodB.to, days: parsed.periodB.days },
        metrics: periodB
      },
      changes: buildComparisonChanges(periodA, periodB),
      insights: buildInsights(periodA, periodB),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error comparando períodos de análisis:', error);
    return res.status(500).json({ error: 'Error comparando períodos de análisis' });
  }
}

export {
  buildPeriodAggregate,
  buildMetricChange,
  buildComparisonChanges,
  buildInsights,
  parseComparisonRequest
};
