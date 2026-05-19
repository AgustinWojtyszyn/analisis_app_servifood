import '../config/env.js';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { analyzeExcel } from '../services/analyzeExcel.js';
import { normalizeCellValue } from '../services/analyzeExcel/normalizers.js';
import defaultRules from '../../../shared/businessRules/defaultRules.json' with { type: 'json' };
import {
  mapAnalysisRowToApi,
  normalizeStoredAnalysisResults,
  normalizeExportClassification,
  normalizeExportTipo,
  normalizeExportEstado,
  normalizeExportIso
} from './analysisController.mappers.js';
import {
  buildBatchUploadResponse,
  returnSupabaseError,
  isStatusColumnMissing,
  isUpdatedAtColumnMissing,
  processExcelFile,
  ensureSupabaseConfigured,
  isAdminUser,
  parseHistoryRequestParams
} from './analysisController.utils.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;
const prisma = new PrismaClient();
const STATUS_VALUES = new Set(['active', 'exported', 'archived']);
const ENABLE_DEBUG_EXCEL_ANALYSIS = process.env.DEBUG_EXCEL_ANALYSIS === 'true';
const ENABLE_REPROCESS_CLASSIFICATION_TRACE = process.env.REPROCESS_CLASSIFICATION_TRACE === '1';

export async function uploadAndAnalyze(req, res) {
  try {
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

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

    const analysis = await processExcelFile({
      file: req.file,
      userId: req.user.id,
      analyzeExcel,
      prisma,
      defaultRules,
      supabaseAdmin,
      mapAnalysisRowToApi
    });

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
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

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
        const analysis = await processExcelFile({
          file,
          userId: req.user.id,
          analyzeExcel,
          prisma,
          defaultRules,
          supabaseAdmin,
          mapAnalysisRowToApi
        });
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
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

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
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const { id } = req.params;

    const isAdmin = isAdminUser(req.user);

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
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) {
      return res.status(400).json({ error: 'Debes enviar ids para eliminar' });
    }

    const { data, error } = await supabaseAdmin
      .from('analysis_history')
      .delete()
      .select('id')
      .eq('user_id', req.user.id)
      .in('id', ids);

    if (error) {
      return returnSupabaseError(res, 'delete_analysis_bulk', error);
    }

    return res.json({ success: true, deletedCount: Array.isArray(data) ? data.length : 0 });
  } catch (error) {
    console.error('Error eliminando análisis en lote:', error);
    return res.status(500).json({ error: 'Error eliminando análisis en lote' });
  }
}

export async function deleteAllAnalyses(req, res) {
  try {
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const { confirmText = '', userId = '' } = req.body || {};
    if (confirmText !== 'BORRAR') {
      return res.status(400).json({ error: 'Confirmación inválida. Debe ser BORRAR' });
    }

    const isAdmin = isAdminUser(req.user);
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
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

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
      const normalized = normalizeStoredAnalysisResults(item.results || {});
      const records = Array.isArray(normalized?.records) ? normalized.records : [];
      const processedAt = normalizeCellValue(normalized?.summary?.processedAt || item.created_at).trim();

      for (const record of records) {
        rows.push({
          analysisId: item.id,
          filename: item.filename || '',
          processedAt,
          Fecha: normalizeCellValue(record.fecha),
          'Área/Sector': normalizeCellValue(record.areaSector || record.areaClasificada),
          'Desvío detectado': normalizeCellValue(record.desvioDetectado || record.hallazgoDetectado),
          'Clasificación del desvío': normalizeExportClassification(record),
          'Tipo de desvío': normalizeExportTipo(record),
          'Relación ISO 22000': normalizeExportIso(record),
          'Estado de acciones': normalizeExportEstado(record),
          'Acción inmediata': normalizeCellValue(record.immediate_action || record.accionInmediata),
          'Acción correctiva': normalizeCellValue(record.corrective_action || record.accionCorrectiva)
        });
      }
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
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

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
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

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
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

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
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const { id } = req.params;

    const currentResult = await supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
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
      .eq('user_id', req.user.id)
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

export function __setSupabaseAdminForTests(client) {
  supabaseAdmin = client;
}

export async function reprocessHistoryClassifications(req, res) {
  try {
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

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
          const verifyRes = await supabaseAdmin
            .from('analysis_history')
            .select('results')
            .eq('id', row.id)
            .eq('user_id', req.user.id)
            .single();
          const persistedSummary = verifyRes?.data?.results?.summary || {};
          console.log('[REPROCESS PERSISTED]', {
            analysisId: row.id,
            updated: true,
            totalLogisticaPersisted: persistedSummary.totalLogistica ?? null,
            byCategoriaPersisted: persistedSummary.byCategoria || {}
          });
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
