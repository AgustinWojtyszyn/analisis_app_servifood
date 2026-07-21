import {
  normalizeCellValue,
  normalizeForMatch,
  containsAny,
  formatExcelDateLocal,
  isYesLike,
  isNoConformeLike,
  normalizeIncidentText
} from '../../analyzeExcel/normalizers.js';
import { esTextoAccion } from './actions.js';
import { normalizeCategory } from './categoryNormalization.js';

function splitHallazgos(textoBase) {
  const source = normalizeCellValue(textoBase).trim();
  if (!source) return [];

  const normalizedSource = source
    .replace(/\bfalta\s*;/gi, 'falta. ')
    .replace(/\r?\n/g, '. ')
    .replace(/;/g, '. ')
    .replace(/\.\s+/g, '.|')
    .replace(/\.\s*$/g, '');

  const parts = normalizedSource
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part.length > 6);

  if (parts.length <= 1) return source ? [source] : [];

  const unique = [];
  for (const part of parts) {
    if (!unique.some((existing) => normalizeForMatch(existing) === normalizeForMatch(part))) {
      unique.push(part);
    }
  }
  return unique;
}

function isGestionSgiaText(texto) {
  const normalized = normalizeForMatch(texto);
  return normalized === 'gestion sgia' || normalized.includes('gestion sgia');
}

function isTextoNoValidoHallazgo(texto) {
  const t = normalizeForMatch(texto || '');
  return !t || t === 'n a' || t === 'na' || t === 'n d' || t === '-';
}

function isInvalidDetectedFinding(texto) {
  const t = normalizeForMatch(texto || '');
  return !t || t === '-';
}

function hasUsefulFindingText(texto) {
  const t = normalizeForMatch(texto || '');
  if (!t) return false;
  if (['-', 'n a', 'na', 'n d', 'nd', 's d', 's/d'].includes(t)) return false;
  return true;
}

function excelSerialToDate(serialRaw) {
  const serial = Number(serialRaw);
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  if (Number.isNaN(dateInfo.getTime())) return null;
  return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate());
}

function extractYearFromIsoDate(value = '') {
  const m = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? Number(m[1]) : null;
}

function hasExplicitYearToken(rawValue = '') {
  const raw = normalizeCellValue(rawValue).trim();
  return /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(raw);
}

function parseFechaValue(rawValue = '', lastFecha = '', contextYear = null) {
  const raw = normalizeCellValue(rawValue).trim();
  if (!raw) return '';

  const fromDate = new Date(raw);
  if (!Number.isNaN(fromDate.getTime()) && /[a-z]/i.test(raw)) {
    return formatExcelDateLocal(fromDate);
  }

  if (/^\d{5,}(\.\d+)?$/.test(raw)) {
    const fromSerial = excelSerialToDate(raw);
    if (fromSerial) return formatExcelDateLocal(fromSerial);
  }

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(raw)) {
    const [y, m, d] = raw.split(/[-/]/).map((v) => Number(v));
    if (y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const dm = raw.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (dm) {
    const day = Number(dm[1]);
    const month = Number(dm[2]);
    let year = dm[3] ? Number(dm[3]) : null;
    if (year != null && year < 100) year += 2000;
    if (year == null) {
      year = extractYearFromIsoDate(lastFecha);
      if (year == null && Number.isInteger(contextYear)) year = contextYear;
    }
    if (year != null && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return raw;
}

function inferRawDateType(rawValue = '') {
  const raw = normalizeCellValue(rawValue).trim();
  if (!raw) return 'empty';
  if (/^\d{5,}(\.\d+)?$/.test(raw)) return 'excel_serial';
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(raw)) return 'iso_or_ymd';
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(raw)) return 'dmy_with_year';
  if (/^\d{1,2}[\/\-]\d{1,2}$/.test(raw)) return 'dmy_without_year';
  return 'text';
}

function isUsefulNonHallazgoValue(value) {
  const raw = normalizeCellValue(value || '').trim();
  const normalized = normalizeForMatch(raw);
  if (!normalized) return false;
  if (['-', 'n a', 'na', 'n d', 'nd', 's/d', 's d'].includes(normalized)) return false;
  return true;
}

function isGenericCategoryLabelAsArea(value = '') {
  const norm = normalizeForMatch(value || '');
  return ['logistica', 'logística', 'inocuidad', 'calidad', 'legal', 'desvio', 'desvios'].includes(norm);
}

function contieneArea(texto) {
  const t = normalizeForMatch(texto || '');
  if (!t) return false;

  return (
    t.includes('camara')
    || t.includes('heladera')
    || /\baf\b/.test(t)
    || /\bac\b/.test(t)
    || t.includes('deposito')
    || t.includes('pasillo')
    || t.includes('comedor')
    || t.includes('residuos')
    || t.includes('basura')
  );
}

function sanitizeHallazgo(hallazgo) {
  const value = normalizeCellValue(hallazgo || '').trim();
  if (!value || isTextoNoValidoHallazgo(value)) return 'Sin hallazgo detectado';
  if (isGestionSgiaText(value)) return 'Sin hallazgo detectado';
  const cleaned = value
    .replace(/\bcumplido\b/gi, '')
    .replace(/\bpendiente\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Sin hallazgo detectado';
}

function isRepeatedHeaderRow(rawRecord = {}) {
  const fecha = normalizeIncidentText(rawRecord.fecha || '');
  const hallazgo = normalizeIncidentText(rawRecord.hallazgoDetectado || '');
  const descripcion = normalizeIncidentText(rawRecord.descripcion || '');
  const actividad = normalizeIncidentText(rawRecord.actividadRealizada || '');
  const area = normalizeIncidentText(rawRecord.areaProceso || '');
  if (fecha === 'fecha') return true;
  if (hallazgo === 'descripcion del desvio' || hallazgo === 'descripción del desvío') return true;
  if (descripcion === 'descripcion del desvio' || descripcion === 'descripción del desvío') return true;
  if (actividad === 'actividad realizada' || area === 'area / proceso' || area === 'area / sector') return true;
  return false;
}

function getHallazgo(row, context = {}) {
  const nota = normalizeCellValue(context.notaTecnica || row?.['Nota técnica'] || '').trim();
  const actividad = normalizeCellValue(context.actividadRealizada || row?.['Actividad realizada'] || '').trim();
  const resultado = normalizeCellValue(context.resultado || row?.Resultado || '').trim();
  const desvio = normalizeCellValue(context.desvio || row?.['¿Desvío?'] || row?.['¿Desvio?'] || '').trim();
  const notaValida = nota && !isTextoNoValidoHallazgo(nota);
  const actividadValida = actividad && !isTextoNoValidoHallazgo(actividad);
  const notaTieneArea = contieneArea(nota);
  const actividadTieneArea = contieneArea(actividad);
  const esNcODetectado = isNoConformeLike(resultado) || isYesLike(desvio);
  const notaEsEstado = /\b(cumplido|pendiente)\b/i.test(nota);
  const actividadValidaNoAccion = actividadValida && !esTextoAccion(actividad) && !isGestionSgiaText(actividad);

  if (notaEsEstado && actividadValidaNoAccion) return actividad;
  if (actividadValida && actividadTieneArea && !isGestionSgiaText(actividad)) return actividad;
  if (notaValida && notaTieneArea && !isGestionSgiaText(nota)) return nota;
  if (esNcODetectado && actividadValida && !isGestionSgiaText(actividad)) return actividad;
  if (actividadValida && !esTextoAccion(actividad) && !isGestionSgiaText(actividad)) return actividad;
  if (notaValida && !esTextoAccion(nota) && !isGestionSgiaText(nota)) return nota;

  return 'Sin hallazgo detectado';
}

function getTextoHallazgo(_row, context = {}) {
  const hallazgoDirecto = normalizeCellValue(context.hallazgoDirecto || '').trim();
  if (hallazgoDirecto && !isTextoNoValidoHallazgo(hallazgoDirecto) && !isGestionSgiaText(hallazgoDirecto)) {
    return sanitizeHallazgo(hallazgoDirecto);
  }

  const hallazgo = sanitizeHallazgo(getHallazgo(_row, context));
  if (!hallazgo || isGestionSgiaText(hallazgo)) return 'Sin hallazgo detectado';
  const hallazgos = splitHallazgos(hallazgo);
  const joined = sanitizeHallazgo(hallazgos.join(' | ').trim());
  if (!joined || isGestionSgiaText(joined)) return 'Sin hallazgo detectado';
  return joined;
}

function isMissingFindingText(value) {
  const text = normalizeIncidentText(value);
  return !text || text === 'sin hallazgo detectado' || text === 'sin hallazgo';
}

function buildClassificationText({ areaProceso, actividadRealizada, hallazgoDetectado }) {
  const area = normalizeCellValue(areaProceso || '').trim();
  const actividad = normalizeCellValue(actividadRealizada || '').trim();
  const hallazgo = normalizeCellValue(hallazgoDetectado || '').trim();

  const hallazgoUtil = isMissingFindingText(hallazgo) ? '' : hallazgo;
  const base = [area, actividad, hallazgoUtil].filter(Boolean).join(' | ');
  return normalizeIncidentText(base);
}

function buildClassificationExplanation({
  resultadoClasificado,
  iso22000,
  areaEvidence,
  outcomeReason
}) {
  const areaReason = areaEvidence?.length
    ? `Área asignada por palabras clave: ${areaEvidence.slice(0, 3).join(', ')}.`
    : 'Área inferida por contexto operativo.';

  const outcome = outcomeReason
    ? `Resultado ${resultadoClasificado} por señal: ${outcomeReason}.`
    : `Resultado clasificado como ${resultadoClasificado}.`;

  return `${areaReason} ${outcome} ISO asociado: ${iso22000}.`.trim();
}

function classifyConfidence({ areaEvidenceCount, resultadoClasificado, classificationText, areaClasificada }) {
  const text = normalizeIncidentText(classificationText);
  if (!text || areaClasificada === 'Área no identificada' || resultadoClasificado === 'Revisar manualmente') return 'Baja';
  if (areaEvidenceCount >= 2 && (resultadoClasificado === 'No conforme' || resultadoClasificado === 'Oportunidad de mejora')) return 'Alta';
  if (areaEvidenceCount >= 1) return 'Media';
  return 'Baja';
}

function buildAnalysisText(record) {
  return normalizeForMatch([
    record.hallazgoDetectado,
    record.accionDetectada,
    record.descripcion,
    record.observaciones,
    record.tipoActividad,
    record.resultado,
    record.desvio,
    record.accion,
    record.accionInmediata,
    record.accionCorrectiva,
    record.numeroAccion,
    record.notaTecnica
  ].map(normalizeCellValue).join(' | '));
}

function normalizeClassificationForStats(value = '') {
  return normalizeCategory(value);
}

function normalizeScopeForStats(value = '') {
  const normalized = normalizeIncidentText(value);
  if (normalized === 'interno') return 'Interno';
  if (normalized === 'externo') return 'Externo';
  return normalizeCellValue(value).trim();
}

function applyActionFallbacks(rawRecord, { row, rowKeyMap, getRowValueByCandidatesFn }) {
  rawRecord.accionInmediata = rawRecord.accionInmediata || getRowValueByCandidatesFn(row, rowKeyMap, ['Acción inmediata', 'Accion inmediata']) || '';
  rawRecord.accionCorrectiva = rawRecord.accionCorrectiva || getRowValueByCandidatesFn(row, rowKeyMap, [
    'Acción Correctiva Propuesta',
    'Accion Correctiva Propuesta',
    'Acción correctiva propuesta',
    'Accion correctiva propuesta',
    'Acción correctiva',
    'Accion correctiva'
  ]) || '';
  return rawRecord;
}

function buildFinalRecordPayload({
  rawRecord,
  areaClasificadaFinal,
  resultadoClasificado,
  tipoDesvio,
  iso22000,
  categoriaDesvio,
  responsable,
  estadoAccion,
  alcanceDesvio,
  alcanceReason,
  alcanceConfidence,
  refinadoPorIA,
  explicacionClasificacion,
  confianza,
  analisisTexto,
  hasOriginalClassification,
  tipoDesvioOriginalRaw,
  accionInmediataRaw,
  accionCorrectivaRaw
}) {
  return {
    rawRowNumber: rawRecord.rawRowNumber,
    rawDesvioDetectado: rawRecord.rawDesvioDetectado,
    fecha: rawRecord.fecha || '',
    areaProceso: rawRecord.areaProceso || 'N/A',
    actividadRealizada: rawRecord.actividadRealizada || '',
    descripcion: rawRecord.descripcion || '',
    hallazgoDetectado: rawRecord.hallazgoDetectado || '',
    accionDetectada: rawRecord.accionDetectada || '',
    observaciones: rawRecord.observaciones || '',
    tipoActividad: rawRecord.tipoActividad || '',
    resultado: rawRecord.resultado || '',
    desvio: rawRecord.desvio || '',
    accion: rawRecord.accion || '',
    accionInmediata: rawRecord.accionInmediata || '',
    accionCorrectiva: rawRecord.accionCorrectiva || '',
    numeroAccion: rawRecord.numeroAccion || '',
    notaTecnica: rawRecord.notaTecnica || '',
    columnasOriginales: rawRecord.columnasOriginales || {},
    areaClasificada: areaClasificadaFinal,
    resultadoClasificado,
    tipoDesvio,
    iso22000,
    categoriaDesvio,
    responsable,
    estadoAccion,
    estadoAccionRaw: rawRecord.estadoAccionRaw,
    alcanceDesvio,
    alcanceReason,
    alcanceConfidence,
    refinadoPorIA,
    explicacionClasificacion,
    confianza,
    analisisTexto,
    classification_original: hasOriginalClassification ? tipoDesvioOriginalRaw : null,
    classification_normalized: normalizeClassificationForStats(hasOriginalClassification ? tipoDesvioOriginalRaw : categoriaDesvio),
    scope_original: null,
    scope_normalized: normalizeScopeForStats(alcanceDesvio),
    immediate_action: normalizeCellValue(accionInmediataRaw).trim(),
    corrective_action: normalizeCellValue(accionCorrectivaRaw).trim(),
    preserveOriginalClassification: hasOriginalClassification
  };
}

function resolveScopeMetadata({
  scopeOriginalRaw = '',
  row = {},
  rowKeyMap = {},
  getRowValueByCandidatesFn,
  normalizeScopeFn,
  classifyDeviationScopeFn,
  textForClassification = '',
  rawRecord = {},
  areaClasificadaFinal = '',
  detectedCompanyArea = ''
}) {
  const scopeFromSource = normalizeScopeFn(scopeOriginalRaw || getRowValueByCandidatesFn(row, rowKeyMap, ['Origen', 'origen']));
  const scopeClassified = classifyDeviationScopeFn({
    text: [textForClassification, rawRecord.hallazgoDetectado, rawRecord.descripcion, rawRecord.observaciones].filter(Boolean).join(' | '),
    detectedArea: areaClasificadaFinal,
    empresaDetectada: detectedCompanyArea || '',
    sectorDetectado: rawRecord.areaProceso || ''
  });
  const alcanceDesvio = scopeFromSource || scopeClassified.scope;
  const alcanceReason = scopeFromSource
    ? 'Alcance informado explícitamente en Excel origen'
    : scopeClassified.reason;
  const alcanceConfidence = scopeFromSource ? 0.99 : scopeClassified.confidence;

  return {
    scopeFromSource,
    scopeClassified,
    alcanceDesvio,
    alcanceReason,
    alcanceConfidence
  };
}

function applyOriginalClassificationOverride(finalRecord, { hasOriginalClassification, tipoDesvioOriginalRaw, tipoOriginal }) {
  if (!hasOriginalClassification) return finalRecord;

  const originalNorm = normalizeIncidentText(tipoDesvioOriginalRaw);
  const normalizedOriginalClassification = normalizeCategory(tipoDesvioOriginalRaw);
  finalRecord.categoriaDesvio = normalizedOriginalClassification;
  finalRecord.clasificacionDesvio = normalizedOriginalClassification;
  finalRecord.classification = tipoDesvioOriginalRaw;
  finalRecord.classification_normalized = normalizedOriginalClassification;
  finalRecord.tipoDesvio = tipoOriginal === 'NC' ? 'NC' : (tipoOriginal === 'OM' ? 'OM' : (tipoOriginal === 'OBS' ? 'OBS' : finalRecord.tipoDesvio));
  if (originalNorm === 'no conforme') {
    finalRecord.resultadoClasificado = 'No conforme';
  } else if (tipoOriginal === 'OM') {
    finalRecord.resultadoClasificado = 'Oportunidad de mejora';
  } else if (tipoOriginal === 'OBS') {
    finalRecord.resultadoClasificado = 'Observación';
  }
  return finalRecord;
}

function applyInocuidadHardPriority({
  finalRecord,
  hasOriginalClassification,
  tipoDesvioOriginalRaw
}) {
  const originalClassificationNorm = normalizeIncidentText(tipoDesvioOriginalRaw);
  const originalClassificationIsManualOrInvalid = (
    !originalClassificationNorm
    || originalClassificationNorm === 'revisar manualmente'
    || originalClassificationNorm === 'revision manual'
    || originalClassificationNorm === '-'
    || originalClassificationNorm === 'na'
    || originalClassificationNorm === 'n a'
  );
  const canApplyAutomaticSafetyPriority = !hasOriginalClassification || originalClassificationIsManualOrInvalid;

  const inocuidadHardPriorityText = normalizeIncidentText([
    finalRecord.hallazgoDetectado,
    finalRecord.descripcion,
    finalRecord.observaciones,
    finalRecord.actividadRealizada,
    finalRecord.immediate_action,
    finalRecord.corrective_action,
    finalRecord.accionInmediata,
    finalRecord.accionCorrectiva
  ].filter(Boolean).join(' | '));
  const hasInocuidadHardPriority = containsAny(inocuidadHardPriorityText, [
    'decomisa', 'decomiso', 'decomisar',
    'vida util', 'vida útil',
    'vencido', 'producto no apto', 'alimento no apto',
    'riesgo sanitario'
  ]);

  if (hasInocuidadHardPriority && canApplyAutomaticSafetyPriority) {
    finalRecord.categoriaDesvio = 'Desvío de Inocuidad';
    finalRecord.classification = 'Desvío de Inocuidad';
    finalRecord.clasificacionDesvio = 'Inocuidad';
    finalRecord.resultadoClasificado = 'No conforme';
    finalRecord.tipoDesvio = 'IN';
    finalRecord.iso22000 = '8.5 HACCP';
    finalRecord.relacionIso22000 = '8.5 HACCP';
  } else if (hasInocuidadHardPriority) {
    finalRecord.iso22000 = '8.5 HACCP';
    finalRecord.relacionIso22000 = '8.5 HACCP';
  }

  return {
    finalRecord,
    hasInocuidadHardPriority,
    canApplyAutomaticSafetyPriority
  };
}

export {
  splitHallazgos,
  isGestionSgiaText,
  isTextoNoValidoHallazgo,
  isInvalidDetectedFinding,
  hasUsefulFindingText,
  excelSerialToDate,
  extractYearFromIsoDate,
  hasExplicitYearToken,
  parseFechaValue,
  inferRawDateType,
  isUsefulNonHallazgoValue,
  isGenericCategoryLabelAsArea,
  contieneArea,
  sanitizeHallazgo,
  isRepeatedHeaderRow,
  getHallazgo,
  getTextoHallazgo,
  isMissingFindingText,
  buildClassificationText,
  buildClassificationExplanation,
  classifyConfidence,
  buildAnalysisText,
  normalizeClassificationForStats,
  normalizeScopeForStats,
  applyActionFallbacks,
  buildFinalRecordPayload,
  resolveScopeMetadata,
  applyOriginalClassificationOverride,
  applyInocuidadHardPriority
};
