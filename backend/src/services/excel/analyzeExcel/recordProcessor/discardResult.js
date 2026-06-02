import { normalizeCellValue, normalizeForMatch } from '../../../analyzeExcel/normalizers.js';
import { sanitizeHallazgo } from '../recordProcessor.utils.js';

function buildDiscardedRowResult({
  index,
  enableFillDownTrace,
  shouldDiscardByEmptyHallazgo,
  becameNoFindingAfterSanitize,
  shouldDiscardAsEmptyRow,
  hasRealRowSignal,
  noFindingSignal,
  hallazgoRawText,
  desvioDetectadoOriginal,
  areaOriginal,
  tipoDesvioOriginalRaw,
  fechaRaw,
  areaProcesoRaw,
  responsableOriginalRaw,
  descripcionRaw,
  observacionesRaw,
  accionRaw,
  notaTecnicaRaw
}) {
  const discardedReason = shouldDiscardByEmptyHallazgo
    ? (becameNoFindingAfterSanitize ? 'desvio_detectado_no_util_post_sanitize' : 'desvio_detectado_vacio')
    : (shouldDiscardAsEmptyRow
      ? 'fila_vacia_incompleta'
      : (!hasRealRowSignal ? 'sin_senales_reales' : 'desvio_detectado_invalido'));
  if (enableFillDownTrace) {
    console.log('[fill-down-discarded]', {
      index: index + 1,
      motivo: discardedReason,
      desvioDetectadoOriginal,
      areaOriginal,
      tipoDesvioOriginal: tipoDesvioOriginalRaw
    });
  }

  return {
    skipped: true,
    discardedReason,
    noFindingSignal,
    incrementNoFindingAntes: noFindingSignal || normalizeForMatch(sanitizeHallazgo(hallazgoRawText)) === normalizeForMatch('Sin hallazgo detectado'),
    incrementConformesExplicitosReales: noFindingSignal,
    discardedByEmptyHallazgoPayload: shouldDiscardByEmptyHallazgo
      ? {
        fila: index + 1,
        fecha: normalizeCellValue(fechaRaw).trim() || '-',
        area: normalizeCellValue(areaProcesoRaw).trim() || '-',
        desvioDetectado: hallazgoRawText || '-',
        responsable: normalizeCellValue(responsableOriginalRaw).trim() || '-',
        descripcion: normalizeCellValue(descripcionRaw).trim() || '-',
        observaciones: normalizeCellValue(observacionesRaw).trim() || '-'
      }
      : null,
    discardedEmptyRowPayload: shouldDiscardAsEmptyRow
      ? {
        fila: index + 1,
        fecha: normalizeCellValue(fechaRaw).trim() || '-',
        area: normalizeCellValue(areaProcesoRaw).trim() || '-',
        hallazgo: hallazgoRawText || '-',
        responsable: normalizeCellValue(responsableOriginalRaw).trim() || '-',
        descripcion: normalizeCellValue(descripcionRaw).trim() || '-',
        observaciones: normalizeCellValue(observacionesRaw).trim() || '-',
        accion: normalizeCellValue(accionRaw).trim() || '-',
        notaTecnica: normalizeCellValue(notaTecnicaRaw).trim() || '-'
      }
      : null
  };
}

export {
  buildDiscardedRowResult
};
