import '../config/env.js';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { analyzeExcel } from '../services/analyzeExcel.js';
import defaultRules from '../../../shared/businessRules/defaultRules.json' with { type: 'json' };

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;
const prisma = new PrismaClient();
const STATUS_VALUES = new Set(['active', 'exported', 'archived']);

function returnSupabaseError(res, context, error, fallbackMessage = 'Error en Supabase') {
  const details = {
    message: error?.message || fallbackMessage,
    code: error?.code || null,
    details: error?.details || null,
    hint: error?.hint || null
  };
  console.error(`[Supabase:${context}]`, details);
  return res.status(500).json({ error: details.message });
}

function normalizeKeywords(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.keywords)) return parsed.keywords;
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function parseRuleMetadata(rawKeywords) {
  if (Array.isArray(rawKeywords)) return { keywords: rawKeywords };

  if (typeof rawKeywords === 'string') {
    try {
      const parsed = JSON.parse(rawKeywords);
      if (Array.isArray(parsed)) return { keywords: parsed };
      if (parsed && typeof parsed === 'object') {
        return {
          keywords: normalizeKeywords(parsed.keywords),
          origen: parsed.origen,
          accion_inmediata: parsed.accion_inmediata,
          accion_correctiva: parsed.accion_correctiva,
          peso: parsed.peso
        };
      }
    } catch {
      return { keywords: normalizeKeywords(rawKeywords) };
    }
  }

  return { keywords: [] };
}

async function getRulesForAnalysis() {
  try {
    const dbRules = await prisma.businessRule.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' }
    });

    if (!dbRules.length) return defaultRules;

    return dbRules.map((rule) => {
      const metadata = parseRuleMetadata(rule.keywords);
      return {
        id: rule.id,
        nombre: rule.name,
        categoria: rule.category,
        origen: metadata.origen || 'interno',
        gravedad: rule.severity,
        keywords: normalizeKeywords(metadata.keywords),
        accion_inmediata: metadata.accion_inmediata || rule.suggestedAction || 'aviso',
        accion_correctiva: metadata.accion_correctiva || '',
        peso: metadata.peso
      };
    });
  } catch {
    return defaultRules;
  }
}

function isStatusColumnMissing(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('status') && (
    message.includes('does not exist') ||
    message.includes('column') ||
    message.includes('schema cache')
  );
}

function isUpdatedAtColumnMissing(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('updated_at') && (
    message.includes('does not exist') ||
    message.includes('has no field') ||
    message.includes('record "new"') ||
    message.includes('record "old"') ||
    message.includes('column')
  );
}

function mapAnalysisRowToApi(row) {
  const summary = row.results?.summary || null;
  const processedAt = summary?.processedAt || row.created_at;
  return {
    id: row.id,
    filename: row.filename,
    status: row.status || null,
    userId: row.user_id,
    uploadDate: row.created_at,
    processedAt,
    totalRecords: row.results?.totalRecords || 0,
    summary,
    records: row.results?.records || [],
    cases: row.results?.cases || []
  };
}

function isValidExcelFilename(filename = '') {
  const lower = String(filename).toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xls');
}

async function insertAnalysisHistory({ userId, filename, resultPayload, status = 'active' }) {
  let insertResult = await supabaseAdmin
    .from('analysis_history')
    .insert({
      user_id: userId,
      filename,
      status,
      results: resultPayload
    })
    .select()
    .single();

  if (insertResult.error && isStatusColumnMissing(insertResult.error)) {
    insertResult = await supabaseAdmin
      .from('analysis_history')
      .insert({
        user_id: userId,
        filename,
        results: resultPayload
      })
      .select()
      .single();
  }

  return insertResult;
}

export async function processExcelFile(file, userId) {
  if (!file) {
    throw new Error('Excel file is required');
  }

  const filename = file.originalname;
  if (!isValidExcelFilename(filename)) {
    throw new Error('Solo se aceptan archivos .xlsx o .xls');
  }

  const activeRules = await getRulesForAnalysis();
  const analysisResult = await analyzeExcel(file.buffer, activeRules);
  if (!analysisResult.success) {
    throw new Error(analysisResult.error || 'Error procesando archivo');
  }

  const processingTimestamp = new Date().toISOString();
  const records = analysisResult.records || [];

  const resultPayload = {
    totalRecords: records.length,
    summary: {
      ...analysisResult.summary,
      totalRecords: records.length,
      processedAt: processingTimestamp
    },
    records,
    cases: analysisResult.cases || []
  };

  const insertResult = await insertAnalysisHistory({
    userId,
    filename,
    resultPayload,
    status: 'archived'
  });

  if (insertResult.error) {
    throw new Error(insertResult.error.message || 'Error guardando análisis');
  }

  return mapAnalysisRowToApi(insertResult.data);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function safeLower(value) {
  return String(value ?? '').trim().toLowerCase();
}

function applyHistoryFilters(data = [], query = {}, isAdmin = false, currentUserId = null) {
  const {
    search = '',
    from = '',
    to = '',
    status = '',
    userId = '',
    minRecords = '',
    maxRecords = '',
    minNC = '',
    minOBS = '',
    minConformes = ''
  } = query;

  const searchLower = safeLower(search);
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  const minRecordsNum = minRecords !== '' ? parsePositiveInt(minRecords, 0) : null;
  const maxRecordsNum = maxRecords !== '' ? parsePositiveInt(maxRecords, Number.MAX_SAFE_INTEGER) : null;
  const minNCNum = minNC !== '' ? parsePositiveInt(minNC, 0) : null;
  const minOBSNum = minOBS !== '' ? parsePositiveInt(minOBS, 0) : null;
  const minConformesNum = minConformes !== '' ? parsePositiveInt(minConformes, 0) : null;

  return data.filter((row) => {
    if (!isAdmin && currentUserId && row.user_id !== currentUserId) {
      return false;
    }

    if (isAdmin && userId && row.user_id !== userId) {
      return false;
    }

    if (searchLower && !safeLower(row.filename).includes(searchLower)) {
      return false;
    }

    if (status && row.status !== status) {
      return false;
    }

    const createdAt = new Date(row.created_at);
    if (fromDate && createdAt < fromDate) {
      return false;
    }

    if (toDate) {
      const toEnd = new Date(toDate);
      toEnd.setHours(23, 59, 59, 999);
      if (createdAt > toEnd) {
        return false;
      }
    }

    const summary = row.results?.summary || {};
    const totalRecords = Number(row.results?.totalRecords || 0);
    const totalNC = Number(summary.totalNC || 0);
    const totalOBS = Number(summary.totalOBS || 0);
    const totalConformes = Number(summary.totalConformes || 0);

    if (minRecordsNum != null && totalRecords < minRecordsNum) return false;
    if (maxRecordsNum != null && totalRecords > maxRecordsNum) return false;
    if (minNCNum != null && totalNC < minNCNum) return false;
    if (minOBSNum != null && totalOBS < minOBSNum) return false;
    if (minConformesNum != null && totalConformes < minConformesNum) return false;

    return true;
  });
}

function applyHistorySort(data = [], sort = 'date_desc') {
  const copy = [...data];

  switch (sort) {
    case 'date_asc':
      copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      break;
    case 'name_asc':
      copy.sort((a, b) => String(a.filename).localeCompare(String(b.filename), 'es'));
      break;
    case 'name_desc':
      copy.sort((a, b) => String(b.filename).localeCompare(String(a.filename), 'es'));
      break;
    case 'records_desc':
      copy.sort((a, b) => Number(b.results?.totalRecords || 0) - Number(a.results?.totalRecords || 0));
      break;
    case 'records_asc':
      copy.sort((a, b) => Number(a.results?.totalRecords || 0) - Number(b.results?.totalRecords || 0));
      break;
    case 'nc_desc':
      copy.sort((a, b) => Number(b.results?.summary?.totalNC || 0) - Number(a.results?.summary?.totalNC || 0));
      break;
    case 'nc_asc':
      copy.sort((a, b) => Number(a.results?.summary?.totalNC || 0) - Number(b.results?.summary?.totalNC || 0));
      break;
    case 'date_desc':
    default:
      copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
  }

  return copy;
}

export async function uploadAndAnalyze(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    const analysis = await processExcelFile(req.file, req.user.id);

    return res.json({
      success: true,
      analysisId: analysis.id,
      analysis
    });
  } catch (error) {
    console.error('Error en análisis:', error);
    return res.status(500).json({ error: 'Error procesando archivo: ' + error.message });
  }
}

export async function uploadAndAnalyzeMultiple(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Debes enviar al menos un archivo Excel' });
    }

    if (files.length > 10) {
      return res.status(400).json({ error: 'Máximo 10 archivos por carga' });
    }

    const results = [];

    for (const file of files) {
      try {
        const analysis = await processExcelFile(file, req.user.id);
        results.push({
          filename: file.originalname,
          success: true,
          analysisId: analysis.id,
          analysis
        });
      } catch (error) {
        results.push({
          filename: file.originalname,
          success: false,
          error: error.message || 'Error procesando archivo'
        });
      }
    }

    return res.json({
      success: true,
      total: results.length,
      ok: results.filter((r) => r.success).length,
      fail: results.filter((r) => !r.success).length,
      results
    });
  } catch (error) {
    console.error('Error en carga múltiple:', error);
    return res.status(500).json({ error: 'Error procesando carga múltiple' });
  }
}

export async function getAnalysis(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    return res.json(mapAnalysisRowToApi(data));
  } catch (error) {
    console.error('Error obteniendo análisis:', error);
    return res.status(500).json({ error: 'Error obteniendo análisis' });
  }
}

export async function getHistory(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 50);
    const sort = req.query.sort || 'date_desc';
    const offset = (page - 1) * limit;
    const isAdmin = req.user?.role === 'admin';

    let query = supabaseAdmin
      .from('analysis_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) {
      return returnSupabaseError(res, 'get_history', error);
    }

    const filtered = applyHistoryFilters(data || [], req.query || {}, isAdmin, req.user.id);
    const sorted = applyHistorySort(filtered, sort);
    const paged = sorted.slice(offset, offset + limit);

    const mapped = paged.map((item) => mapAnalysisRowToApi(item));

    return res.json({
      data: mapped,
      page,
      limit,
      total: sorted.length,
      totalPages: Math.ceil(sorted.length / limit) || 1
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return res.status(500).json({ error: 'Error obteniendo historial' });
  }
}

export async function deleteAnalysis(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('analysis_history')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return returnSupabaseError(res, 'delete_analysis', error);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando análisis:', error);
    return res.status(500).json({ error: 'Error eliminando análisis' });
  }
}

export async function deleteAnalysisBulk(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) {
      return res.status(400).json({ error: 'Debes enviar ids para eliminar' });
    }

    const { error } = await supabaseAdmin
      .from('analysis_history')
      .delete()
      .eq('user_id', req.user.id)
      .in('id', ids);

    if (error) {
      return returnSupabaseError(res, 'delete_analysis_bulk', error);
    }

    return res.json({ success: true, deletedCount: ids.length });
  } catch (error) {
    console.error('Error eliminando análisis en lote:', error);
    return res.status(500).json({ error: 'Error eliminando análisis en lote' });
  }
}

export async function deleteAllAnalyses(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { confirmText = '', userId = '' } = req.body || {};
    if (confirmText !== 'BORRAR') {
      return res.status(400).json({ error: 'Confirmación inválida. Debe ser BORRAR' });
    }

    const isAdmin = req.user?.role === 'admin';
    const targetUserId = isAdmin && userId ? userId : req.user.id;

    const { error } = await supabaseAdmin
      .from('analysis_history')
      .delete()
      .eq('user_id', targetUserId);

    if (error) {
      return returnSupabaseError(res, 'delete_all_analyses', error);
    }

    return res.json({ success: true, userId: targetUserId });
  } catch (error) {
    console.error('Error eliminando todos los análisis:', error);
    return res.status(500).json({ error: 'Error eliminando todos los análisis' });
  }
}

export async function exportBulkAnalyses(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) {
      return res.status(400).json({ error: 'Debes enviar ids para exportar' });
    }

    const { data, error } = await supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('user_id', req.user.id)
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (error) {
      return returnSupabaseError(res, 'export_bulk_fetch', error);
    }

    const rows = [];
    for (const item of data || []) {
      const summary = item.results?.summary || {};
      rows.push({
        analysisId: item.id,
        filename: item.filename,
        status: item.status || '',
        createdAt: item.created_at,
        totalRecords: item.results?.totalRecords || 0,
        totalNC: summary.totalNC || 0,
        totalOBS: summary.totalOBS || 0,
        totalConformes: summary.totalConformes || 0,
        totalOM: summary.totalOM || 0
      });
    }

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Analisis');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="analisis_bulk_${Date.now()}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error exportando análisis en lote:', error);
    return res.status(500).json({ error: 'Error exportando análisis en lote' });
  }
}

export async function getActiveAnalysis(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    let query = await supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (query.error && isStatusColumnMissing(query.error)) {
      return res.json(null);
    }

    if (query.error) {
      return returnSupabaseError(res, 'get_active_analysis', query.error);
    }

    const activeAnalysis = query.data?.[0];
    if (!activeAnalysis) {
      return res.json(null);
    }

    return res.json(mapAnalysisRowToApi(activeAnalysis));
  } catch (error) {
    console.error('Error obteniendo análisis activo:', error);
    return res.status(500).json({ error: 'Error obteniendo análisis activo' });
  }
}

export async function deleteActiveAnalysis(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const activeResult = await supabaseAdmin
      .from('analysis_history')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    if (activeResult.error && isStatusColumnMissing(activeResult.error)) {
      return res.json({ success: true, deletedCount: 0, warning: 'schema_column_missing' });
    }

    if (activeResult.error) {
      return returnSupabaseError(res, 'delete_active_analysis_select', activeResult.error);
    }

    const activeIds = (activeResult.data || []).map((row) => row.id).filter(Boolean);
    if (activeIds.length === 0) {
      return res.json({ success: true, deletedCount: 0 });
    }

    const deleteResult = await supabaseAdmin
      .from('analysis_history')
      .delete()
      .eq('user_id', req.user.id)
      .in('id', activeIds);

    if (deleteResult.error) {
      return returnSupabaseError(res, 'delete_active_analysis_delete', deleteResult.error);
    }

    return res.json({ success: true, deletedCount: activeIds.length });
  } catch (error) {
    console.error('Error eliminando análisis activo:', error);
    return res.status(500).json({ error: 'Error eliminando análisis activo' });
  }
}

export async function updateAnalysisStatus(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { id } = req.params;
    const { status } = req.body || {};

    if (!STATUS_VALUES.has(status)) {
      return res.status(400).json({ error: 'Status inválido. Valores: active, exported, archived' });
    }

    const updateResult = await supabaseAdmin
      .from('analysis_history')
      .update({ status })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateResult.error && (isStatusColumnMissing(updateResult.error) || isUpdatedAtColumnMissing(updateResult.error))) {
      return res.status(200).json({ success: true, status: null, warning: 'schema_column_missing' });
    }

    if (updateResult.error) {
      return returnSupabaseError(res, 'update_analysis_status', updateResult.error);
    }

    return res.json({
      success: true,
      analysis: mapAnalysisRowToApi(updateResult.data)
    });
  } catch (error) {
    console.error('Error actualizando estado de análisis:', error);
    return res.status(500).json({ error: 'Error actualizando estado de análisis' });
  }
}
