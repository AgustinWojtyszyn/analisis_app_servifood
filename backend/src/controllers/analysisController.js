import '../config/env.js';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { analyzeExcel } from '../services/analyzeExcel.js';
import { normalizeCellValue, normalizeIncidentText } from '../services/analyzeExcel/normalizers.js';
import {
  classifyIso22000FromDescription,
  resolveIsoWithContextFallback,
  mergeCompositeIsoLabels
} from '../services/excel/analyzeExcel/classifiers/isoClassifier.js';
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
const ENABLE_REPROCESS_ISO_TRACE = process.env.REPROCESS_ISO_TRACE === '1';

function isIsoManual(value = '') {
  const normalized = normalizeCellValue(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized.includes('revisar manualmente') || normalized.includes('revision manual');
}

function isInvalidStoredIso(value = '') {
  const normalized = normalizeCellValue(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!normalized || normalized === '-' || normalized === 'n/a' || normalized === 'na') return true;
  if (normalized.includes('revisar manualmente') || normalized.includes('revision manual')) return true;
  if (normalized.includes('requisito no identificado')) return true;
  if (normalized.includes('sin norma')) return true;
  return false;
}

function resolveRecordIsoWithCurrentRules(record = {}) {
  const pickFirstText = (...candidates) => {
    for (const value of candidates) {
      const normalized = normalizeCellValue(value || '').trim();
      if (normalized && normalized !== '-') return normalized;
    }
    return '';
  };
  const usedFields = [];
  const pickField = (label, ...candidates) => {
    const value = pickFirstText(...candidates);
    if (value) usedFields.push(label);
    return value;
  };
  const hallazgoDetectado = pickFirstText(
    record?.hallazgoDetectado,
    record?.desvioDetectado,
    record?.rawDesvioDetectado,
    record?.hallazgo,
    record?.desvio,
    record?.finding
  );
  const fecha = pickField('fecha', record?.fecha, record?.date);
  const desvioDetectado = pickField('desvioDetectado', hallazgoDetectado, record?.['Desvío detectado']);
  const areaClasificada = pickField(
    'areaSector',
    record?.areaSector,
    record?.areaClasificada,
    record?.areaProceso,
    record?.['Área/Sector']
  );
  const clasificacion = pickField(
    'clasificacion',
    record?.clasificacionDesvio,
    record?.classification_normalized,
    record?.classification_original,
    record?.['Clasificación']
  );
  const tipo = pickField(
    'tipo',
    record?.tipoDesvioOrigen,
    record?.tipoDesvio,
    record?.scope_normalized,
    record?.alcanceDesvio,
    record?.tipo
  );
  const estado = pickField('estado', record?.estadoAcciones, record?.estadoAccion, record?.estado);
  const actividadRealizada = pickField('actividadRealizada',
    record?.actividadRealizada, record?.textoBase, record?.actividad, record?.activity
  );
  const descripcion = pickField('descripcion', record?.descripcion, record?.description);
  const observaciones = pickField('observaciones', record?.observaciones, record?.comments, record?.notas);
  const accionInmediata = pickField('accionInmediata',
    record?.accionInmediata,
    record?.immediate_action,
    record?.accion_inmediata
  );
  const accionCorrectiva = pickField('accionCorrectiva',
    record?.accionCorrectiva,
    record?.corrective_action,
    record?.accion_correctiva
  );
  const resultadoClasificado = normalizeCellValue(record?.resultadoClasificado || '').trim();

  const descripcionDetectada = [desvioDetectado, descripcion, observaciones]
    .filter(Boolean)
    .join(' | ');
  const actividadConAcciones = [actividadRealizada, accionInmediata, accionCorrectiva, clasificacion, tipo, estado, areaClasificada, fecha]
    .filter(Boolean)
    .join(' | ');

  const sourceText = [descripcionDetectada, actividadConAcciones].filter(Boolean).join(' | ');
  const sourceTextPreview = sourceText.slice(0, 240);
  const strongText = normalizeIncidentText(sourceText);

  if (!strongText || strongText.length < 8) {
    return { iso: 'Revisar manualmente', matchedRule: 'insufficient_text', decisionReason: 'manual_insufficient_data', usedFields, sourceTextPreview };
  }

  const explicitIso = pickFirstText(record?.relacionIso22000, record?.iso22000, record?.iso, record?.normaISO);
  if (explicitIso && !isInvalidStoredIso(explicitIso)) {
    return { iso: explicitIso, matchedRule: 'excel_iso_field', decisionReason: 'excel_field', usedFields, sourceTextPreview };
  }

  const hasAny = (terms = []) => terms.some((term) => strongText.includes(normalizeIncidentText(term)));
  const clasificacionNorm = normalizeIncidentText(clasificacion);
  const hasInocuidadSignal = hasAny(['contaminacion', 'contaminación', 'inocuidad', 'plaga', 'temperatura critica', 'temperatura crítica', 'alimento no apto']);
  const hasLegalSignal = hasAny(['habilitacion', 'habilitación', 'contrato', 'legal', 'normativa']);
  if ((clasificacionNorm.includes('legal') && hasInocuidadSignal) || (clasificacionNorm.includes('inocu') && hasLegalSignal)) {
    return { iso: 'Revisar manualmente', matchedRule: 'strong_contradiction', decisionReason: 'manual_contradiction', usedFields, sourceTextPreview };
  }

  if (hasInocuidadSignal) {
    return { iso: '8.5 HACCP', matchedRule: 'inocuidad_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasAny(['maquina', 'máquina', 'equipo', 'luz', 'oficina', 'mantenimiento', 'instalacion', 'instalación'])) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'maintenance_operational_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  const hasCookingPattern = /(carne.*(rigida|rigida|dura))|((rigida|dura).*carne)/.test(strongText);
  if (hasAny(['coccion', 'cocción', 'horno', 'temperatura de coccion', 'temperatura de cocción']) || hasCookingPattern) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'cooking_operational_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasAny(['planificacion', 'planificación', 'menu', 'menú', 'postre', 'postres', 'variedad', 'semana'])) {
    return { iso: '8.1 Planificación y control operacional', matchedRule: 'planning_menu_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasAny(['salio tarde', 'salió tarde', 'tarde', 'demora', 'demoraron', 'refrigerio', 'entrega', 'transporte', 'retiro', 'logistica', 'logística'])) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'operational_delay_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasAny(['falta personal', 'falta de personal', 'faltar personal', 'reubicar personal', 'reorganizar personal', 're organizar personal', 'prioridades'])) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'staff_secondary_operational_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasAny(['capacitacion', 'capacitación', 'conducta', 'empleado', 'rrhh'])) {
    return { iso: '7.2 Competencia / capacitación', matchedRule: 'hr_training_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasLegalSignal) {
    return { iso: 'Requisito legal / Documentación legal', matchedRule: 'legal_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }

  const isoBase = classifyIso22000FromDescription({
    descripcionDetectada,
    actividadRealizada: actividadConAcciones,
    areaClasificada,
    resultadoClasificado
  });

  const isoResolved = resolveIsoWithContextFallback({
    iso22000: isoBase,
    hallazgoDetectado: descripcionDetectada,
    actividadRealizada: actividadConAcciones,
    areaClasificada,
    resultadoClasificado
  });

  const mergedIso = mergeCompositeIsoLabels({
    iso22000: isoResolved,
    hallazgoDetectado: descripcionDetectada,
    actividadRealizada: actividadConAcciones,
    areaClasificada
  });

  if (!isIsoManual(mergedIso)) {
    return { iso: mergedIso, matchedRule: 'classifier_merge', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }

  // Fallback para análisis históricos con claves no uniformes: usa contexto profundo (incluye estructuras anidadas).
  const collectTextLeaves = (input, depth = 0, acc = []) => {
    if (depth > 5 || input == null) return acc;
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
      const value = normalizeCellValue(input).trim();
      if (value && value !== '-') acc.push(value);
      return acc;
    }
    if (Array.isArray(input)) {
      for (const item of input) collectTextLeaves(item, depth + 1, acc);
      return acc;
    }
    if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        const keyNorm = normalizeCellValue(key).toLowerCase();
        // Evita campos irrelevantes de metadata muy ruidosos.
        if (/(traceability|fuente_del_valor|valor_original_excel|valor_final_usado)/.test(keyNorm)) continue;
        collectTextLeaves(value, depth + 1, acc);
      }
      return acc;
    }
    return acc;
  };

  const wideContext = Array.from(new Set(collectTextLeaves(record)))
    .join(' | ');

  if (!wideContext) return { iso: mergedIso, matchedRule: 'insufficient_wide_context', decisionReason: 'manual_insufficient_data', usedFields, sourceTextPreview };

  const wideIso = resolveIsoWithContextFallback({
    iso22000: classifyIso22000FromDescription({
      descripcionDetectada: wideContext,
      actividadRealizada: wideContext,
      areaClasificada,
      resultadoClasificado
    }),
    hallazgoDetectado: wideContext,
    actividadRealizada: wideContext,
    areaClasificada,
    resultadoClasificado
  });

  const normalizedWideIso = normalizeCellValue(wideIso).trim() || mergedIso;
  if (!isIsoManual(normalizedWideIso)) {
    return { iso: normalizedWideIso, matchedRule: 'wide_context_classifier', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }

  // Salvaguarda final: detecta patrones operativos en todo el registro serializado.
  const serializedContext = normalizeIncidentText(JSON.stringify(record || {}));
  const hasAnySerialized = (terms = []) => terms.some((term) => serializedContext.includes(normalizeIncidentText(term)));

  if (hasAnySerialized([
    'coccion', 'proceso de coccion', 'carne dura', 'carne rigida', 'horno', 'temperatura de coccion'
  ])) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'serialized_cooking_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }

  if (hasAnySerialized([
    'demora', 'tarde', 'entrega tarde', 'faltante de personal', 'falta de personal',
    'reubicacion de personal', 'reorganizar personal', 're organizar al personal',
    'prioridades operativas', 'definir prioridades', 'planificacion de menu',
    'falta de variedad de postres', 'envio repetido de postres', 'postre toda la semana',
    'refrigerio salio tarde', 'menu toda la semana'
  ])) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'serialized_operational_delay_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }

  return { iso: normalizedWideIso, matchedRule: 'no_reliable_rule', decisionReason: 'manual_insufficient_data', usedFields, sourceTextPreview };
}

function normalizeIsoManualCounters(summary = {}, records = []) {
  const safeSummary = summary && typeof summary === 'object' ? summary : {};
  const recordList = Array.isArray(records) ? records : [];
  const manualCount = recordList.reduce((acc, record) => {
    const iso = normalizeCellValue(record?.relacionIso22000 || record?.iso22000).trim() || 'Revisar manualmente';
    return acc + (isIsoManual(iso) ? 1 : 0);
  }, 0);
  return {
    ...safeSummary,
    totalRevisionManual: manualCount
  };
}

function recalculateIsoForStoredResults(results = {}, options = {}) {
  const { collectDebug = false, analysisId = null } = options;
  const originalRecords = Array.isArray(results?.records) ? results.records : [];
  const debugRecords = [];
  if (originalRecords.length === 0) {
    return {
      nextResults: {
        ...results,
        reprocessedWithCurrentIsoRules: true,
        isoReprocessedAt: new Date().toISOString()
      },
      recordsProcessed: 0,
      manualBefore: 0,
      manualAfter: 0,
      changed: false,
      debugRecords
    };
  }

  let manualBefore = 0;
  let manualAfter = 0;
  let changed = false;

  const byIso22000 = {};

  const nextRecords = originalRecords.map((record, index) => {
    const prevIso = normalizeCellValue(record?.relacionIso22000 || record?.iso22000).trim() || 'Revisar manualmente';
    if (isIsoManual(prevIso)) manualBefore += 1;

    const resolved = resolveRecordIsoWithCurrentRules(record) || {};
    const nextIsoComputed = normalizeCellValue(resolved?.iso || '').trim() || 'Revisar manualmente';
    const nextIso = normalizeCellValue(nextIsoComputed).trim() || 'Revisar manualmente';
    if (isIsoManual(nextIso)) manualAfter += 1;
    byIso22000[nextIso] = (byIso22000[nextIso] || 0) + 1;

    if (nextIso !== prevIso) changed = true;

    if (collectDebug || ENABLE_REPROCESS_ISO_TRACE) {
      const sourceText = [
        record?.hallazgoDetectado,
        record?.desvioDetectado,
        record?.rawDesvioDetectado,
        record?.descripcion,
        record?.observaciones,
        record?.accionInmediata,
        record?.immediate_action,
        record?.accionCorrectiva,
        record?.corrective_action,
        record?.actividadRealizada,
        record?.textoBase
      ].map((v) => normalizeCellValue(v).trim()).filter(Boolean).join(' | ');

      debugRecords.push({
        analysisId,
        recordIndex: index,
        desvioDetectado: normalizeCellValue(record?.desvioDetectado || record?.hallazgoDetectado || '').trim() || null,
        recordDate: normalizeCellValue(record?.fecha).trim() || null,
        prevIso,
        previousValueFromDisplayedField: prevIso,
        nextIso,
        changed: nextIso !== prevIso,
        fieldUpdated: 'relacionIso22000',
        sourceTextPreview: normalizeCellValue(resolved?.sourceTextPreview).trim() || sourceText.slice(0, 240),
        usedFields: Array.isArray(resolved?.usedFields) ? resolved.usedFields : [],
        decisionReason: normalizeCellValue(resolved?.decisionReason).trim() || 'keyword_rule',
        matchedRule: normalizeCellValue(resolved?.matchedRule).trim() || 'unknown'
      });
    }

    const nextTraceability = record?.traceability && typeof record.traceability === 'object'
      ? {
          ...record.traceability,
          relacionIso22000: {
            ...(record.traceability.relacionIso22000 || {}),
            valor_final_usado: nextIso,
            fuente_del_valor: 'heuristica'
          }
        }
      : record?.traceability;

    return {
      ...record,
      iso22000: nextIso,
      relacionIso22000: nextIso,
      ...(nextTraceability ? { traceability: nextTraceability } : {})
    };
  });

  const baseSummary = results?.summary && typeof results.summary === 'object' ? results.summary : {};
  const previousSummaryManual = Number(baseSummary.totalRevisionManual || 0);
  if (previousSummaryManual !== manualAfter) changed = true;

  const nextSummary = normalizeIsoManualCounters({
    ...baseSummary,
    byIso22000
  }, nextRecords);

  const nextResults = {
    ...results,
    records: nextRecords,
    summary: nextSummary,
    reprocessedWithCurrentIsoRules: true,
    isoReprocessedAt: new Date().toISOString()
  };

  return {
    nextResults,
    recordsProcessed: nextRecords.length,
    manualBefore,
    manualAfter: Number(nextSummary.totalRevisionManual || 0),
    changed,
    debugRecords
  };
}

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
    const isAdmin = isAdminUser(req.user);
    let query = supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('id', id);

    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query.single();

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

export async function reprocessIsoAll(req, res) {
  try {
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const debugMode = String(req.query?.debug || '').trim() === '1';
    const isAdmin = isAdminUser(req.user);
    const requestedUserId = normalizeCellValue(req.query?.userId || '').trim();

    let query = supabaseAdmin
      .from('analysis_history')
      .select('id, user_id, filename, status, results')
      .order('created_at', { ascending: false });
    const shouldConstrainToRequester = !isAdmin || Boolean(requestedUserId);
    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    } else if (requestedUserId) {
      query = query.eq('user_id', requestedUserId);
    }

    const { data, error } = await query;

    if (error) {
      return returnSupabaseError(res, 'reprocess_iso_all_select', error);
    }

    const rows = Array.isArray(data) ? data : [];
    const analysesFound = rows.length;
    if (rows.length === 0) {
      return res.json({
        success: true,
        analysesFound: 0,
        analysesProcessed: 0,
        recordsProcessed: 0,
        recordsProcessedTotal: 0,
        manualBefore: 0,
        manualAfter: 0,
        updatedAnalyses: 0,
        analysesDebug: []
      });
    }

    let analysesProcessed = 0;
    let recordsProcessed = 0;
    let manualBefore = 0;
    let manualAfter = 0;
    let updatedAnalyses = 0;
    const debug = [];

    for (const row of rows) {
      analysesProcessed += 1;
      const currentResults = row?.results && typeof row.results === 'object' ? row.results : {};
      const recordsPathRead = Array.isArray(currentResults?.records) ? 'results.records' : 'results.records (missing)';
      const recalculated = recalculateIsoForStoredResults(currentResults, {
        collectDebug: debugMode,
        analysisId: row.id
      });

      recordsProcessed += recalculated.recordsProcessed;
      manualBefore += recalculated.manualBefore;
      manualAfter += recalculated.manualAfter;

      let updateQuery = supabaseAdmin
        .from('analysis_history')
        .update({ results: recalculated.nextResults })
        .eq('id', row.id);
      if (shouldConstrainToRequester) {
        updateQuery = updateQuery.eq('user_id', requestedUserId || req.user.id);
      }
      const updateRes = await updateQuery;

      if (updateRes.error) {
        return returnSupabaseError(res, 'reprocess_iso_all_update', updateRes.error);
      }

      let persisted = true;
      let persistError = null;
      let postSaveValue = null;
      let postSaveMatchesExpected = null;
      const changedRecords = recalculated.debugRecords.filter((r) => r.changed);

      if (debugMode || ENABLE_REPROCESS_ISO_TRACE) {
        let verifyQuery = supabaseAdmin
          .from('analysis_history')
          .select('results')
          .eq('id', row.id);
        if (shouldConstrainToRequester) {
          verifyQuery = verifyQuery.eq('user_id', requestedUserId || req.user.id);
        }
        const verifySingle = await verifyQuery.single();
        if (verifySingle.error) {
          persisted = false;
          persistError = verifySingle.error?.message || 'verify_failed';
        } else {
          const persistedRecords = Array.isArray(verifySingle?.data?.results?.records) ? verifySingle.data.results.records : [];
          if (changedRecords.length > 0) {
            const firstChanged = changedRecords[0];
            const persistedRecord = persistedRecords[firstChanged.recordIndex] || {};
            postSaveValue = normalizeCellValue(persistedRecord?.relacionIso22000 || persistedRecord?.iso22000).trim() || null;
            postSaveMatchesExpected = postSaveValue === firstChanged.nextIso;
          } else {
            postSaveValue = null;
            postSaveMatchesExpected = true;
          }
        }
      }

      if (recalculated.changed) {
        updatedAnalyses += 1;
      }

      if (debugMode) {
        debug.push({
          analysisId: row.id,
          filename: row?.filename || null,
          status: row?.status || null,
          recordsPathRead,
          recordsPathWritten: 'results.records',
          recordsCount: recalculated.recordsProcessed,
          updatedRecordsCount: recalculated.debugRecords.filter((r) => r.changed).length,
          recordsProcessed: recalculated.recordsProcessed,
          manualBefore: recalculated.manualBefore,
          manualAfter: recalculated.manualAfter,
          changed: recalculated.changed,
          persisted,
          persistError,
          postSaveValue,
          postSaveMatchesExpected,
          records: recalculated.debugRecords
        });
      } else if (ENABLE_REPROCESS_ISO_TRACE) {
        console.log('[REPROCESS_ISO_ALL]', {
          analysisId: row.id,
          filename: row?.filename || null,
          status: row?.status || null,
          recordsPathRead,
          recordsPathWritten: 'results.records',
          recordsCount: recalculated.recordsProcessed,
          updatedRecordsCount: recalculated.debugRecords.filter((r) => r.changed).length,
          recordsProcessed: recalculated.recordsProcessed,
          manualBefore: recalculated.manualBefore,
          manualAfter: recalculated.manualAfter,
          changed: recalculated.changed,
          persisted,
          persistError,
          postSaveValue,
          postSaveMatchesExpected,
          sample: recalculated.debugRecords.slice(0, 3)
        });
      }
    }

    const response = {
      success: true,
      analysesFound,
      analysesProcessed,
      recordsProcessed,
      recordsProcessedTotal: recordsProcessed,
      manualBefore,
      manualAfter,
      updatedAnalyses
    };
    if (debugMode) {
      response.debug = debug;
      response.analysesDebug = debug;
    }

    return res.json(response);
  } catch (error) {
    console.error('Error reprocesando ISO global:', error);
    return res.status(500).json({ error: 'Error reprocesando ISO de todos los análisis' });
  }
}
