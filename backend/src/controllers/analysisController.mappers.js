import { normalizeCellValue } from '../services/analyzeExcel/normalizers.js';
import { classifyDeviation } from '../services/excel/analyzeExcel/classifiers/deviationClassifier.js';
import { normalizeCategory, CANONICAL } from '../services/excel/analyzeExcel/categoryNormalization.js';

const ENABLE_REPROCESS_CLASSIFICATION_TRACE = process.env.REPROCESS_CLASSIFICATION_TRACE === '1';
const ENABLE_CLASSIFICATION_FLOW_TRACE = process.env.CLASSIFICATION_FLOW_TRACE === '1';

function isManualCategoryOverride(record = {}) {
  return Boolean(record?.classification_manual || record?.clasificacionManual || record?.manualOverride);
}

function normalizeModernCategory(category = '') {
  return normalizeCategory(category);
}

function normalizeCompare(value = '') {
  return normalizeCellValue(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hasExcelClassificationSource(record = {}) {
  return Boolean(
    record?.preserveOriginalClassification
    && normalizeCellValue(record?.classification_original).trim()
  );
}

function resolveSummaryCategoryKey(record = {}) {
  if (hasExcelClassificationSource(record)) {
    return normalizeCellValue(record.classification_original).trim();
  }
  return normalizeModernCategory(record?.clasificacionDesvio || record?.classification_normalized || record?.categoriaDesvio);
}

function normalizeExportClassification(record = {}) {
  const raw = normalizeCellValue(
    record.clasificacionDesvio
      || record.categoriaDesvio
      || record.classification_normalized
      || record.classification_original
  ).trim();
  return normalizeCategory(raw);
}

function normalizeExportTipo(record = {}) {
  const raw = normalizeCellValue(
    record.tipoDesvioOrigen
      || record.scope_normalized
      || record.scope_original
      || record.alcanceDesvio
  ).trim().toLowerCase();
  return raw === 'externo' ? 'Externo' : 'Interno';
}

function normalizeExportEstado(record = {}) {
  const rawValue = normalizeCellValue(record.estadoAcciones || record.estadoAccion).trim();
  if (!rawValue) return 'No informado';
  const raw = rawValue.toLowerCase();
  if (raw === 'cerrado' || raw === 'cerrada') return 'Cerrado';
  if (raw === 'abierto' || raw === 'abierta') return 'Abierto';
  if (raw === 'no informado') return 'No informado';
  return rawValue;
}

function normalizeExportIso(record = {}) {
  const raw = normalizeCellValue(record.relacionIso22000 || record.iso22000).trim();
  if (!raw || raw === '-') return '';

  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (normalized.includes('revisar manualmente') || normalized.includes('revision manual')) return 'Revisar manualmente';

  const codes = Array.from(normalized.matchAll(/\b\d+(?:\.\d+){0,2}\b/g)).map((m) => m[0]);
  if (codes.length === 0) return raw;

  const uniqueCodes = [...new Set(codes)];
  const selectPreferredCode = () => {
    if (uniqueCodes.includes('8.5.1')) return '8.5.1';
    if (uniqueCodes.includes('8.5.2')) return '8.5.2';
    if (uniqueCodes.some((c) => c.startsWith('8.5'))) return '8.5';
    if (uniqueCodes.some((c) => c.startsWith('8.2'))) return '8.2';
    if (uniqueCodes.includes('7.1')) return '7.1';
    if (uniqueCodes.includes('7.2')) return '7.2';
    if (uniqueCodes.includes('7.5')) return '7.5';
    if (uniqueCodes.includes('9.2')) return '9.2';
    if (uniqueCodes.includes('10.2')) return '10.2';
    return uniqueCodes[0];
  };

  const code = selectPreferredCode();

  const canonicalByCode = {
    '8.2': '8.2 PRP',
    '8.5': '8.5 HACCP',
    '8.5.1': '8.5.1 Control operacional',
    '8.5.2': '8.5.2 Trazabilidad',
    '7.1': '7.1 Recursos',
    '7.2': '7.2 Competencia',
    '7.5': '7.5 Información documentada',
    '9.2': '9.2 Auditoría interna',
    '10.2': '10.2 Acción correctiva'
  };

  return canonicalByCode[code] || code;
}

function reclassifyStoredRecord(record = {}) {
  if (isManualCategoryOverride(record)) return record;
  if (hasExcelClassificationSource(record)) return record;
  if (normalizeCellValue(record?.classification_original).trim() && normalizeCellValue(record?.clasificacionDesvio).trim()) return record;

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
  const classified = classifyDeviation(baseText, area, immediateAction, correctiveAction, '');
  const mapNewToLegacy = {
    Inocuidad: CANONICAL.INOCUIDAD,
    'Mantenimiento': CANONICAL.MANTENIMIENTO,
    'Recursos Humanos': CANONICAL.RRHH,
    'Logística': CANONICAL.LOGISTICA,
    Legales: CANONICAL.LEGALES,
    Calidad: CANONICAL.CALIDAD,
    'Revisar manualmente': CANONICAL.MANUAL
  };
  const categoria = mapNewToLegacy[classified.clasificacion] || CANONICAL.MANUAL;
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
    const key = resolveSummaryCategoryKey(record);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(byCategoria);
  const sumBy = (predicate) => entries.reduce((acc, [name, value]) => acc + (predicate(name) ? Number(value || 0) : 0), 0);
  const isExact = (name, expected) => normalizeCompare(name) === normalizeCompare(expected);

  const totalInocuidad = sumBy((name) => isExact(name, CANONICAL.INOCUIDAD) || isExact(name, 'Desvío de Inocuidad'));
  const totalLogistica = sumBy((name) => isExact(name, CANONICAL.LOGISTICA) || isExact(name, 'Desvío de Logística'));
  const totalCalidad = sumBy((name) => isExact(name, CANONICAL.CALIDAD) || isExact(name, 'Desvío de Calidad'));
  const totalLegal = sumBy((name) => isExact(name, CANONICAL.LEGALES) || isExact(name, 'Legal') || isExact(name, 'Desvío Legal'));
  const totalMantenimiento = sumBy((name) => isExact(name, CANONICAL.MANTENIMIENTO) || isExact(name, 'Desvío de Mantenimiento'));
  const totalRRHH = sumBy((name) => isExact(name, CANONICAL.RRHH) || isExact(name, 'Desvío de Recursos Humanos'));
  const totalRevisionManual = sumBy((name) => isExact(name, CANONICAL.MANUAL));

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

function mapAnalysisRowToApi(row) {
  const normalizedResults = normalizeStoredAnalysisResults(row.results || {});
  const summary = normalizedResults?.summary || null;
  const processedAt = summary?.processedAt || row.created_at;
  const payload = {
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
  if (ENABLE_CLASSIFICATION_FLOW_TRACE) {
    const sample = (payload.records || []).slice(0, 5).map((r) => ({
      row: r?.rawRowNumber ?? null,
      clasificacionDesvio: r?.clasificacionDesvio ?? null,
      classification_normalized: r?.classification_normalized ?? null,
      categoriaDesvio: r?.categoriaDesvio ?? null,
      classification_original: r?.classification_original ?? null
    }));
    console.log('[API PAYLOAD CLASSIFICATION]', {
      analysisId: payload.id,
      totalRecords: payload.totalRecords,
      summaryTotalLogistica: payload.summary?.totalLogistica ?? null,
      sample
    });
  }
  return payload;
}

export {
  mapAnalysisRowToApi,
  normalizeStoredAnalysisResults,
  normalizeExportClassification,
  normalizeExportTipo,
  normalizeExportEstado,
  normalizeExportIso
};
