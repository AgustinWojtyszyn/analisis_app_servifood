import {
  normalizeCellValue,
  normalizeForMatch,
  buildRowObjectFromExcel,
  buildNormalizedRowKeyMap,
  getRowValueByCandidates
} from '../../../analyzeExcel/normalizers.js';
import { getTextoAccion } from '../actions.js';
import { isExplicitNoFindingText } from '../classifiers/outcomeClassifier.js';
import {
  extractYearFromIsoDate,
  hasExplicitYearToken,
  parseFechaValue,
  isUsefulNonHallazgoValue,
  isGenericCategoryLabelAsArea,
  isInvalidDetectedFinding,
  hasUsefulFindingText,
  sanitizeHallazgo
} from '../recordProcessor.utils.js';

function extractInitialRecordFields({
  rowValues,
  headerValues,
  headerIndexes,
  fillDownState
}) {
  const getValue = (headerIndex) => {
    const indexToUse = Number.isInteger(headerIndex) ? headerIndex : null;
    return indexToUse == null ? '' : rowValues?.[indexToUse];
  };

  const row = buildRowObjectFromExcel(headerValues, rowValues);
  const rowKeyMap = buildNormalizedRowKeyMap(row);
  const accionDetectada = getTextoAccion(row);

  const actividadRealizadaRaw = getRowValueByCandidates(row, rowKeyMap, [
    'Actividad realizada',
    'Actividad realizada / Descripción',
    'Actividad realizada / Descripcion'
  ]) || normalizeCellValue(getValue(headerIndexes.actividadRealizada));

  const tipoActividadRaw = getRowValueByCandidates(row, rowKeyMap, [
    'Tipo de actividad',
    'Tipo actividad'
  ]) || normalizeCellValue(getValue(headerIndexes.tipoActividad));

  const areaProcesoRaw = getRowValueByCandidates(row, rowKeyMap, [
    'Área / Proceso',
    'Area / Proceso',
    'Área / Sector',
    'Area / Sector',
    'Área/Proceso',
    'Area/Proceso',
    'Sector',
    'Area'
  ]) || normalizeCellValue(getValue(headerIndexes.areaProceso));

  const resultadoRaw = getRowValueByCandidates(row, rowKeyMap, [
    'Resultado'
  ]) || normalizeCellValue(getValue(headerIndexes.resultado));

  const desvioRaw = getRowValueByCandidates(row, rowKeyMap, [
    '¿Desvío?',
    '¿Desvio?',
    'Desvío',
    'Desvio'
  ]) || normalizeCellValue(getValue(headerIndexes.desvio));

  const accionRaw = getRowValueByCandidates(row, rowKeyMap, [
    '¿Acción?',
    '¿Accion?',
    'Acción',
    'Accion'
  ]) || normalizeCellValue(getValue(headerIndexes.accion));

  const numeroAccionRaw = getRowValueByCandidates(row, rowKeyMap, [
    'N° Acción',
    'N° Accion',
    'Nro Acción',
    'Nro Accion',
    'Numero accion'
  ]) || normalizeCellValue(getValue(headerIndexes.numeroAccion));

  const notaTecnicaRaw = getRowValueByCandidates(row, rowKeyMap, [
    'Nota técnica',
    'Nota tecnica'
  ]) || normalizeCellValue(getValue(headerIndexes.notaTecnica));

  const fechaRaw = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, [
    'Fecha',
    'Fecha del desvío',
    'Fecha del desvio',
    'Fecha de registro'
  ]) || getValue(headerIndexes.fecha)).trim();

  const responsableOriginalRaw = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, ['Responsable', 'Responsable asignado']) || '').trim();
  const iso22000OriginalRaw = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, [
    'ISO 22000',
    'Iso 22000',
    'ISO',
    'Clausula ISO',
    'Cláusula ISO'
  ]) || '').trim();
  const classificationOriginalRaw = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, [
    'Clasificacion del desvio',
    'Clasificación del desvío',
    'Clasificacion del desvío',
    'Clasificación del desvio',
    'Clasificación',
    'Clasificacion',
    'Categoría',
    'Categoria',
    'Categoría del desvío',
    'Categoria del desvio',
    'Resultado clasificado'
  ]) || '').trim();
  const tipoDesvioOriginalRaw = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, [
    'Tipo desvio',
    'Tipo desvío',
    'Tipo'
  ]) || '').trim();
  const scopeOriginalRaw = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, [
    'Desvío interno/externo',
    'Desvio interno/externo',
    'Desvío externo/ Interno',
    'Desvio externo/ Interno',
    'Desvío externo / Interno',
    'Desvio externo / Interno',
    'Desvio externo/interno'
  ]) || '').trim();

  const desvioDetectadoOriginal = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, [
    'Desvío detectado',
    'Desvio detectado',
    'Hallazgo detectado'
  ]) || getValue(headerIndexes.hallazgoDetectado) || '').trim();
  const areaOriginal = normalizeCellValue(areaProcesoRaw).trim();
  const descripcionRaw = getRowValueByCandidates(row, rowKeyMap, [
    'Descripción',
    'Descripcion',
    'Descripción del desvío',
    'Descripcion del desvio',
    'Detalle del desvío',
    'Detalle del desvio'
  ]) || normalizeCellValue(getValue(headerIndexes.descripcion));
  const observacionesRaw = getRowValueByCandidates(row, rowKeyMap, [
    'Observaciones',
    'Observación',
    'Observacion'
  ]) || normalizeCellValue(getValue(headerIndexes.observaciones));
  const accionInmediataRaw = getRowValueByCandidates(row, rowKeyMap, [
    'Acción inmediata',
    'Accion inmediata'
  ]) || normalizeCellValue(getValue(headerIndexes.accionInmediata));
  const accionCorrectivaRaw = getRowValueByCandidates(row, rowKeyMap, [
    'Acción Correctiva Propuesta',
    'Accion Correctiva Propuesta',
    'Acción correctiva propuesta',
    'Accion correctiva propuesta',
    'Acción correctiva',
    'Accion correctiva'
  ]) || normalizeCellValue(getValue(headerIndexes.accionCorrectiva));
  const estadoAccionRaw = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, [
    'Estado',
    'Estado acción',
    'Estado accion',
    'Status',
    'Estado de acción',
    'Estado de accion'
  ]) || '').trim();
  const hallazgoRawText = normalizeCellValue(desvioDetectadoOriginal).trim();
  const noFindingSignal = isExplicitNoFindingText(hallazgoRawText);
  const hallazgoVacioOInvalido = isInvalidDetectedFinding(hallazgoRawText);
  const hallazgoSanitizado = sanitizeHallazgo(hallazgoRawText);
  const becameNoFindingAfterSanitize = normalizeForMatch(hallazgoSanitizado) === normalizeForMatch('Sin hallazgo detectado') && !noFindingSignal;

  const hasSupportData = [
    fechaRaw,
    areaProcesoRaw,
    responsableOriginalRaw,
    descripcionRaw,
    observacionesRaw,
    accionRaw,
    accionInmediataRaw,
    accionCorrectivaRaw,
    notaTecnicaRaw,
    numeroAccionRaw
  ].some((value) => isUsefulNonHallazgoValue(value));
  const shouldDiscardByEmptyHallazgo = hallazgoVacioOInvalido || becameNoFindingAfterSanitize;
  const shouldDiscardAsEmptyRow = !noFindingSignal && !hasSupportData && hallazgoVacioOInvalido;

  const fechaParsed = parseFechaValue(fechaRaw, fillDownState.fecha, fillDownState.contextYear);
  let fecha = fechaParsed || fillDownState.fecha;
  const parsedYear = extractYearFromIsoDate(fecha);
  const hasExplicitYear = hasExplicitYearToken(fechaRaw);
  if (
    fecha
    && Number.isInteger(fillDownState.contextYear)
    && Number.isInteger(parsedYear)
    && !hasExplicitYear
    && parsedYear !== fillDownState.contextYear
  ) {
    const [, mm = '', dd = ''] = String(fecha).match(/^\d{4}-(\d{2})-(\d{2})$/) || [];
    if (mm && dd) {
      fecha = `${String(fillDownState.contextYear).padStart(4, '0')}-${mm}-${dd}`;
    }
  }
  const areaProcesoRawNormalized = normalizeCellValue(areaProcesoRaw).trim();
  const canInheritAreaFromFillDown = fillDownState.areaProceso && !isGenericCategoryLabelAsArea(fillDownState.areaProceso);
  const areaProceso = areaProcesoRawNormalized || (canInheritAreaFromFillDown ? fillDownState.areaProceso : '');
  const actividadRealizada = normalizeCellValue(actividadRealizadaRaw).trim() || fillDownState.actividadRealizada;
  const tipoActividad = normalizeCellValue(tipoActividadRaw).trim() || fillDownState.tipoActividad;
  const resultado = normalizeCellValue(resultadoRaw).trim();
  const desvio = normalizeCellValue(desvioRaw).trim();
  const accion = normalizeCellValue(accionRaw).trim();
  const numeroAccion = normalizeCellValue(numeroAccionRaw).trim();
  const notaTecnica = normalizeCellValue(notaTecnicaRaw).trim();
  const responsableOriginal = responsableOriginalRaw || fillDownState.responsableOriginal;
  const iso22000Original = iso22000OriginalRaw || fillDownState.iso22000Original;
  const classificationOriginal = classificationOriginalRaw || fillDownState.classificationOriginal;
  const tipoDesvioOriginal = tipoDesvioOriginalRaw || fillDownState.tipoDesvioOriginal;

  if (fecha && normalizeForMatch(fecha) !== 'fecha') {
    fillDownState.fecha = fecha;
    const y = extractYearFromIsoDate(fecha);
    if (Number.isInteger(y)) fillDownState.contextYear = y;
  }
  if (
    areaProcesoRawNormalized
    && !['area', 'area sector', 'area proceso'].includes(normalizeForMatch(areaProcesoRawNormalized))
    && !isGenericCategoryLabelAsArea(areaProcesoRawNormalized)
  ) {
    fillDownState.areaProceso = areaProcesoRawNormalized;
  }
  if (actividadRealizada && normalizeForMatch(actividadRealizada) !== 'actividad realizada') fillDownState.actividadRealizada = actividadRealizada;
  if (tipoActividad && normalizeForMatch(tipoActividad) !== 'tipo de actividad') fillDownState.tipoActividad = tipoActividad;
  if (responsableOriginal) fillDownState.responsableOriginal = responsableOriginal;
  if (iso22000Original) fillDownState.iso22000Original = iso22000Original;
  if (classificationOriginal) fillDownState.classificationOriginal = classificationOriginal;
  if (tipoDesvioOriginal) fillDownState.tipoDesvioOriginal = tipoDesvioOriginal;

  const hasRealRowSignal = hasUsefulFindingText(desvioDetectadoOriginal);
  const invalidDetectedFinding = !hasUsefulFindingText(desvioDetectadoOriginal);

  return {
    row,
    rowKeyMap,
    getValue,
    accionDetectada,
    actividadRealizadaRaw,
    tipoActividadRaw,
    areaProcesoRaw,
    resultadoRaw,
    desvioRaw,
    accionRaw,
    numeroAccionRaw,
    notaTecnicaRaw,
    fechaRaw,
    responsableOriginalRaw,
    iso22000OriginalRaw,
    classificationOriginalRaw,
    tipoDesvioOriginalRaw,
    scopeOriginalRaw,
    desvioDetectadoOriginal,
    areaOriginal,
    descripcionRaw,
    observacionesRaw,
    accionInmediataRaw,
    accionCorrectivaRaw,
    estadoAccionRaw,
    hallazgoRawText,
    noFindingSignal,
    hallazgoVacioOInvalido,
    hallazgoSanitizado,
    becameNoFindingAfterSanitize,
    hasSupportData,
    shouldDiscardByEmptyHallazgo,
    shouldDiscardAsEmptyRow,
    fecha,
    areaProcesoRawNormalized,
    areaProceso,
    actividadRealizada,
    tipoActividad,
    resultado,
    desvio,
    accion,
    numeroAccion,
    notaTecnica,
    responsableOriginal,
    iso22000Original,
    classificationOriginal,
    tipoDesvioOriginal,
    hasRealRowSignal,
    invalidDetectedFinding
  };
}

export {
  extractInitialRecordFields
};
