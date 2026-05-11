import '../config/env.js';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { analyzeExcel } from '../services/analyzeExcel.js';
import { normalizeCellValue } from '../services/analyzeExcel/normalizers.js';
import { classifyDeviation } from '../services/excel/analyzeExcel/classifiers/deviationClassifier.js';
import defaultRules from '../../../shared/businessRules/defaultRules.json' with { type: 'json' };

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;
const prisma = new PrismaClient();
const STATUS_VALUES = new Set(['active', 'exported', 'archived']);
const ENABLE_DEBUG_EXCEL_ANALYSIS = process.env.DEBUG_EXCEL_ANALYSIS === 'true';
const ENABLE_REPROCESS_CLASSIFICATION_TRACE = process.env.REPROCESS_CLASSIFICATION_TRACE === '1';

function buildBatchUploadResponse(results = []) {
  const normalized = Array.isArray(results) ? results : [];
  const successful = normalized.filter((r) => r.success);
  const failed = normalized.filter((r) => !r.success);
  return {
    success: failed.length === 0,
    totalFiles: normalized.length,
    successfulFiles: successful.length,
    failedFiles: failed.length,
    results: normalized,
    errors: failed.map((f) => ({
      fileName: f.fileName || f.filename,
      message: f.error || 'Error procesando archivo',
      stage: f.stage || 'processing',
      diagnostics: f.diagnostics || null
    }))
  };
}

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
  const normalizedResults = normalizeStoredAnalysisResults(row.results || {});
  const summary = normalizedResults?.summary || null;
  const processedAt = summary?.processedAt || row.created_at;
  return {
    id: row.id,
    filename: row.filename,
    status: row.status || null,
    userId: row.user_id,
    uploadDate: row.created_at,
    processedAt,
    totalRecords: normalizedResults?.totalRecords || 0,
    summary,
    records: normalizedResults?.records || [],
    cases: normalizedResults?.cases || [],
    diagnostics: normalizedResults?.diagnostics || null
  };
}

function isManualCategoryOverride(record = {}) {
  return Boolean(record?.classification_manual || record?.clasificacionManual || record?.manualOverride);
}

function normalizeModernCategory(category = '') {
  const raw = String(category || '').trim().toLowerCase();
  if (raw.includes('inocuidad')) return 'Desvío de Inocuidad';
  if (raw.includes('mantenimiento')) return 'Desvío de Mantenimiento';
  if (raw.includes('recursos humanos')) return 'Desvío de Recursos Humanos';
  if (raw.includes('logistica')) return 'Desvío de Logística';
  if (raw.includes('legal')) return 'Desvío Legal';
  if (raw.includes('calidad')) return 'Desvío de Calidad';
  if (raw.includes('revision manual') || raw.includes('revisar manualmente')) return 'Revisar manualmente';
  return 'Revisar manualmente';
}

function reclassifyStoredRecord(record = {}) {
  if (isManualCategoryOverride(record)) return record;

  const baseText = [
    record.hallazgoDetectado,
    record.desvioDetectado,
    record.descripcion,
    record.observaciones,
    record.actividadRealizada
  ].map((v) => normalizeCellValue(v).trim()).filter(Boolean).join(' | ');
  const area = normalizeCellValue(record.areaSector || record.areaClasificada || record.areaProceso).trim();
  const immediateAction = normalizeCellValue(record.immediate_action || record.accionInmediata).trim();
  const correctiveAction = normalizeCellValue(record.corrective_action || record.accionCorrectiva).trim();
  const iso = normalizeCellValue(record.relacionIso22000 || record.iso22000).trim();

  const classified = classifyDeviation(baseText, area, immediateAction, correctiveAction, iso);
  const mapNewToLegacy = {
    Inocuidad: 'Desvío de Inocuidad',
    'Mantenimiento': 'Desvío de Mantenimiento',
    'Recursos Humanos': 'Desvío de Recursos Humanos',
    'Logística': 'Desvío de Logística',
    Legales: 'Desvío Legal',
    Calidad: 'Desvío de Calidad',
    'Revisar manualmente': 'Revisar manualmente'
  };
  const categoria = mapNewToLegacy[classified.clasificacion] || 'Revisar manualmente';
  if (ENABLE_REPROCESS_CLASSIFICATION_TRACE) {
    console.log('[REPROCESS BEFORE]', {
      id: record?.id || null,
      classification_original: record?.classification_original || null,
      classification_normalized: record?.classification_normalized || null,
      categoriaDesvio: record?.categoriaDesvio || null,
      clasificacionDesvio: record?.clasificacionDesvio || null
    });
    console.log('[REPROCESS SCORE/RULES]', {
      id: record?.id || null,
      clasificacionNueva: classified.clasificacion,
      confidence: classified.confidence,
      matchedRules: classified.matchedRules || []
    });
    console.log('[REPROCESS AFTER]', {
      id: record?.id || null,
      classification_normalized: categoria,
      categoriaDesvio: categoria,
      clasificacionDesvio: categoria
    });
  }

  return {
    ...record,
    categoriaDesvio: categoria,
    classification_normalized: categoria,
    clasificacionDesvio: categoria,
    classification_confidence: classified.confidence,
    classification_matched_rules: classified.matchedRules
  };
}

function normalizeStoredAnalysisResults(results = {}) {
  const originalRecords = Array.isArray(results?.records) ? results.records : [];
  if (originalRecords.length === 0) return results;

  const normalizedRecords = originalRecords.map(reclassifyStoredRecord);
  const byCategoria = normalizedRecords.reduce((acc, record) => {
    const key = normalizeModernCategory(record?.clasificacionDesvio || record?.classification_normalized || record?.categoriaDesvio);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalInocuidad = Number(byCategoria['Desvío de Inocuidad'] || 0);
  const totalLogistica = Number(byCategoria['Desvío de Logística'] || 0);
  const totalCalidad = Number(byCategoria['Desvío de Calidad'] || 0);
  const totalLegal = Number(byCategoria['Desvío Legal'] || 0);
  const totalMantenimiento = Number(byCategoria['Desvío de Mantenimiento'] || 0);
  const totalRRHH = Number(byCategoria['Desvío de Recursos Humanos'] || 0);
  const totalRevisionManual = Number(byCategoria['Revisar manualmente'] || 0);

  const baseSummary = results?.summary || {};
  const normalizedSummary = {
    ...baseSummary,
    totalRecords: normalizedRecords.length,
    totalDesvios: normalizedRecords.length,
    totalInocuidad,
    totalLogistica,
    totalCalidad,
    totalLegal,
    totalMantenimiento,
    totalRRHH,
    totalRevisionManual,
    byCategoria: {
      ...byCategoria
    }
  };

  return {
    ...results,
    records: normalizedRecords,
    summary: normalizedSummary
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
  const analysisResult = await analyzeExcel(file.buffer, activeRules, null, {
    filename,
    uploadedAt: new Date().toISOString()
  });
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
    cases: analysisResult.cases || [],
    ...(analysisResult.diagnostics ? { diagnostics: analysisResult.diagnostics } : {})
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

function parseNonNegativeInt(value) {
  if (value === '' || value == null) return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function parseDateStart(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function parseDateEnd(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function escapeIlike(value) {
  return String(value ?? '').replace(/[%_,]/g, ' ').trim();
}

function resolveHistorySort(query = {}) {
  const sortBy = String(query.sortBy || '').trim();
  const sortOrder = String(query.sortOrder || '').trim().toLowerCase();
  const legacySort = String(query.sort || '').trim().toLowerCase();

  const allowedSortBy = new Map([
    ['created_at', 'created_at'],
    ['filename', 'filename'],
    ['status', 'status'],
    ['totalrecords', 'results->totalRecords'],
    ['totalnc', 'results->summary->totalNC']
  ]);

  if (sortBy) {
    const normalized = sortBy.toLowerCase();
    const column = allowedSortBy.get(normalized);
    if (column) {
      return {
        column,
        ascending: sortOrder === 'asc'
      };
    }
  }

  switch (legacySort) {
    case 'date_asc':
      return { column: 'created_at', ascending: true };
    case 'name_asc':
      return { column: 'filename', ascending: true };
    case 'name_desc':
      return { column: 'filename', ascending: false };
    case 'records_asc':
      return { column: 'results->totalRecords', ascending: true };
    case 'records_desc':
      return { column: 'results->totalRecords', ascending: false };
    case 'nc_asc':
      return { column: 'results->summary->totalNC', ascending: true };
    case 'nc_desc':
      return { column: 'results->summary->totalNC', ascending: false };
    case 'date_desc':
    default:
      return { column: 'created_at', ascending: false };
  }
}

export async function uploadAndAnalyze(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
      console.log({
        endpoint: 'POST /analysis/upload-excel',
        hasFile: !!req.file,
        fileField: req.file?.fieldname || null,
        originalname: req.file?.originalname || null,
        mimetype: req.file?.mimetype || null,
        size: req.file?.size || null,
        bodyKeys: Object.keys(req.body || {})
      });
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
    const uploadDiagnostics = {
      hasFile: !!req.file,
      hasFiles: Array.isArray(files) && files.length > 0,
      receivedFilesCount: Array.isArray(files) ? files.length : 0,
      fieldNames: Array.isArray(files) ? files.map((f) => f.fieldname) : [],
      fileNames: Array.isArray(files) ? files.map((f) => f.originalname) : [],
      sizes: Array.isArray(files) ? files.map((f) => f.size) : []
    };
    if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
      console.log({
        endpoint: 'POST /analysis/upload-multiple',
        hasFiles: Array.isArray(files) && files.length > 0,
        filesCount: Array.isArray(files) ? files.length : 0,
        fields: Array.isArray(files) ? files.map((f) => f.fieldname) : [],
        names: Array.isArray(files) ? files.map((f) => f.originalname) : [],
        bodyKeys: Object.keys(req.body || {})
      });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Debes enviar al menos un archivo Excel' });
    }

    if (files.length > 10) {
      return res.status(400).json({ error: 'Máximo 10 archivos por carga' });
    }

    const results = [];

    for (const file of files) {
      try {
        if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
          console.log('BATCH FILE RECEIVED', {
            fileName: file.originalname,
            mimetype: file.mimetype,
            size: file.size
          });
        }
        const analysis = await processExcelFile(file, req.user.id);
        const recordsLength = Array.isArray(analysis?.records) ? analysis.records.length : 0;
        if (recordsLength === 0) {
          const emptyResult = {
            fileName: file.originalname,
            filename: file.originalname,
            success: false,
            stage: 'post_processing',
            error: 'Archivo procesado sin registros detectados',
            diagnostics: ENABLE_DEBUG_EXCEL_ANALYSIS
              ? { upload: uploadDiagnostics, excel: analysis?.diagnostics || null }
              : null,
            analysisId: analysis?.id || null
          };
          if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
            console.log('BATCH FILE RESULT', {
              fileName: file.originalname,
              success: emptyResult.success,
              recordsLength,
              diagnostics: emptyResult.diagnostics
            });
          }
          results.push(emptyResult);
          continue;
        }
        if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
          console.log('BATCH FILE RESULT', {
            fileName: file.originalname,
            success: true,
            recordsLength,
            diagnostics: analysis?.diagnostics || null
          });
        }
        results.push({
          fileName: file.originalname,
          filename: file.originalname,
          success: true,
          analysisId: analysis.id,
          totalRecords: recordsLength,
          records: analysis.records || [],
          diagnostics: ENABLE_DEBUG_EXCEL_ANALYSIS
            ? { upload: uploadDiagnostics, excel: analysis.diagnostics || null }
            : null,
          analysis
        });
      } catch (error) {
        if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
          console.log('BATCH FILE RESULT', {
            fileName: file.originalname,
            success: false,
            recordsLength: 0,
            diagnostics: error?.diagnostics || null
          });
        }
        results.push({
          fileName: file.originalname,
          filename: file.originalname,
          success: false,
          stage: error?.stage || 'processing',
          diagnostics: ENABLE_DEBUG_EXCEL_ANALYSIS
            ? { upload: uploadDiagnostics, excel: error?.diagnostics || null }
            : null,
          error: error.message || 'Error procesando archivo'
        });
      }
    }

    const payload = buildBatchUploadResponse(results);
    return res.json(payload);
  } catch (error) {
    console.error('Error en carga múltiple:', error);
    return res.status(500).json({ error: 'Error procesando carga múltiple' });
  }
}

export { buildBatchUploadResponse };

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
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
    const offset = (page - 1) * limit;
    const isAdmin = Boolean(req.user?.isAdmin) || String(req.user?.role || '').toLowerCase() === 'admin';
    const search = escapeIlike(req.query.search);
    const status = String(req.query.status || '').trim();
    const userId = String(req.query.userId || '').trim();
    const fromValue = req.query.dateFrom || req.query.from || '';
    const toValue = req.query.dateTo || req.query.to || '';
    const minRecords = parseNonNegativeInt(req.query.minRecords);
    const maxRecords = parseNonNegativeInt(req.query.maxRecords);
    const minNC = parseNonNegativeInt(req.query.minNC);
    const minOBS = parseNonNegativeInt(req.query.minOBS);
    const minConformes = parseNonNegativeInt(req.query.minConformes);
    const fromDateIso = parseDateStart(fromValue);
    const toDateIso = parseDateEnd(toValue);
    const sortConfig = resolveHistorySort(req.query || {});
    const rangeFrom = offset;
    const rangeTo = offset + limit - 1;

    let query = supabaseAdmin
      .from('analysis_history')
      .select('*', { count: 'exact' });

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
    const mapped = (data || []).map((item) => mapAnalysisRowToApi(item));

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

export async function deleteAnalysis(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { id } = req.params;

    const isAdmin = Boolean(req.user?.isAdmin) || String(req.user?.role || '').toLowerCase() === 'admin';

    let query = supabaseAdmin
      .from('analysis_history')
      .delete()
      .eq('id', id);

    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    }

    const { error } = await query;

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

    const isAdmin = Boolean(req.user?.isAdmin) || String(req.user?.role || '').toLowerCase() === 'admin';
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

export async function archiveAnalysis(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { id } = req.params;

    const currentResult = await supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('id', id)
      .single();

    if (currentResult.error) {
      if (String(currentResult.error.code || '') === 'PGRST116') {
        return res.status(404).json({ error: 'Análisis no encontrado' });
      }
      return returnSupabaseError(res, 'archive_analysis_find', currentResult.error);
    }

    const current = currentResult.data;
    if (!current) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    if (current.status === 'archived') {
      return res.status(200).json({
        success: true,
        message: 'El análisis ya estaba archivado',
        data: mapAnalysisRowToApi(current)
      });
    }

    if (current.status !== 'active') {
      return res.status(409).json({
        success: false,
        error: `No se puede archivar un análisis con estado ${current.status || 'desconocido'}`
      });
    }

    const updateResult = await supabaseAdmin
      .from('analysis_history')
      .update({ status: 'archived' })
      .eq('id', id)
      .select('*')
      .single();

    if (updateResult.error && (isStatusColumnMissing(updateResult.error) || isUpdatedAtColumnMissing(updateResult.error))) {
      return res.status(200).json({
        success: true,
        message: 'Archivado aplicado con compatibilidad de esquema',
        data: mapAnalysisRowToApi({ ...current, status: 'archived' }),
        warning: 'schema_column_missing'
      });
    }

    if (updateResult.error) {
      return returnSupabaseError(res, 'archive_analysis_update', updateResult.error);
    }

    return res.status(200).json({
      success: true,
      message: 'Análisis archivado correctamente',
      data: mapAnalysisRowToApi(updateResult.data)
    });
  } catch (error) {
    console.error('Error archivando análisis:', error?.message || error);
    return res.status(500).json({ error: 'Error archivando análisis' });
  }
}

export async function reprocessHistoryClassifications(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return returnSupabaseError(res, 'reprocess_history_select', error);
    }

    let updated = 0;
    for (const row of (data || [])) {
      const normalized = normalizeStoredAnalysisResults(row.results || {});
      if (ENABLE_REPROCESS_CLASSIFICATION_TRACE) {
        console.log('[REPROCESS UPDATE TRY]', {
          analysisId: row.id,
          records: Array.isArray(row?.results?.records) ? row.results.records.length : 0,
          totalLogisticaBefore: row?.results?.summary?.totalLogistica ?? null,
          totalLogisticaAfter: normalized?.summary?.totalLogistica ?? null,
          byCategoriaAfter: normalized?.summary?.byCategoria || {}
        });
      }
      const updateRes = await supabaseAdmin
        .from('analysis_history')
        .update({ results: normalized })
        .eq('id', row.id)
        .eq('user_id', req.user.id);
      if (!updateRes.error) {
        updated += 1;
        if (ENABLE_REPROCESS_CLASSIFICATION_TRACE) {
          console.log('[REPROCESS PERSISTED]', { analysisId: row.id, updated: true });
        }
      } else if (ENABLE_REPROCESS_CLASSIFICATION_TRACE) {
        console.log('[REPROCESS PERSIST FAILED]', {
          analysisId: row.id,
          error: updateRes.error?.message || 'unknown_error'
        });
      }
    }

    return res.json({ success: true, total: (data || []).length, updated });
  } catch (error) {
    console.error('Error reprocesando historial:', error);
    return res.status(500).json({ error: 'Error reprocesando historial' });
  }
}
