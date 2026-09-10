import {
  ensureSupabaseConfigured,
  isAdminUser,
  parseHistoryRequestParams,
  returnSupabaseError
} from '../analysisController.utils.js';
import { getSupabaseAdmin } from './context.js';

const HISTORY_SELECT_COLUMNS = [
  'id',
  'filename',
  'status',
  'user_id',
  'created_at',
  'summary:results->summary',
  'total_records:results->totalRecords'
].join(', ');

const HISTORY_SUMMARY_KEYS = [
  'totalRecords',
  'totalDesvios',
  'totalInternos',
  'totalExternos',
  'totalRevisionManual',
  'totalNC',
  'totalOBS',
  'totalConformes'
];

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildCompactSummary(rawSummary = {}, topLevelTotalRecords = null) {
  const source = rawSummary && typeof rawSummary === 'object' && !Array.isArray(rawSummary)
    ? rawSummary
    : {};

  const compact = {};
  HISTORY_SUMMARY_KEYS.forEach((key) => {
    if (source[key] !== undefined && source[key] !== null) {
      compact[key] = toFiniteNumber(source[key]);
    }
  });

  const totalRecords = topLevelTotalRecords ?? source.totalRecords;
  compact.totalRecords = toFiniteNumber(totalRecords, 0);

  if (source.byAlcance && typeof source.byAlcance === 'object' && !Array.isArray(source.byAlcance)) {
    compact.byAlcance = source.byAlcance;
  }

  return compact;
}

function mapHistoryRowToApi(row = {}) {
  const summary = buildCompactSummary(row.summary, row.total_records);

  return {
    id: row.id,
    filename: row.filename,
    status: row.status || null,
    userId: row.user_id,
    uploadDate: row.created_at,
    processedAt: row.summary?.processedAt || row.created_at,
    totalRecords: summary.totalRecords,
    summary
  };
}

export async function getHistory(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const {
      page,
      limit,
      search,
      status,
      userId,
      minRecords,
      maxRecords,
      minNC,
      minOBS,
      minConformes,
      fromDateIso,
      toDateIso,
      sortConfig,
      rangeFrom,
      rangeTo
    } = parseHistoryRequestParams(req.query || {});
    const isAdmin = isAdminUser(req.user);

    let query = supabaseAdmin
      .from('analysis_history')
      .select(HISTORY_SELECT_COLUMNS, { count: 'exact' });

    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    if (search) {
      query = query.or(`filename.ilike.%${search}%,status.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (fromDateIso) {
      query = query.gte('created_at', fromDateIso);
    }

    if (toDateIso) {
      query = query.lte('created_at', toDateIso);
    }

    if (minRecords != null) {
      query = query.filter('results->totalRecords', 'gte', String(minRecords));
    }

    if (maxRecords != null) {
      query = query.filter('results->totalRecords', 'lte', String(maxRecords));
    }

    if (minNC != null) {
      query = query.filter('results->summary->totalNC', 'gte', String(minNC));
    }

    if (minOBS != null) {
      query = query.filter('results->summary->totalOBS', 'gte', String(minOBS));
    }

    if (minConformes != null) {
      query = query.filter('results->summary->totalConformes', 'gte', String(minConformes));
    }

    query = query
      .order(sortConfig.column, { ascending: sortConfig.ascending, nullsFirst: false })
      .range(rangeFrom, rangeTo);

    const { data, error, count } = await query;

    if (error) {
      return returnSupabaseError(res, 'get_history', error);
    }

    const total = Number(count || 0);
    const mapped = (data || []).map(mapHistoryRowToApi);

    return res.json({
      data: mapped,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return res.status(500).json({ error: 'Error obteniendo historial' });
  }
}

export {
  HISTORY_SELECT_COLUMNS,
  buildCompactSummary,
  mapHistoryRowToApi
};
