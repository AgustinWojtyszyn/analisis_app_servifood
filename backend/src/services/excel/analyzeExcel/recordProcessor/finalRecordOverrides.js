import { normalizeCellValue } from '../../../analyzeExcel/normalizers.js';
import { buildActions } from '../actions.js';
import {
  applyInocuidadHardPriority,
  applyOriginalClassificationOverride,
  normalizeScopeForStats
} from '../recordProcessor.utils.js';
import { getIsoFieldState } from '../isoFieldUtils.js';
import { hasExplicitOriginalValue } from './helpers.js';
import { normalizeCategory } from '../categoryNormalization.js';

function applyFinalRecordOverrides({
  finalRecord,
  hasOriginalClassification,
  classificationOriginalRaw,
  tipoOriginal,
  scopeOriginalRaw,
  accionInmediataRaw,
  accionCorrectivaRaw,
  estadoAccionRaw,
  responsableOriginalRaw,
  areaOriginalPreservable,
  iso22000OriginalRaw
}) {
  applyOriginalClassificationOverride(finalRecord, {
    hasOriginalClassification,
    tipoDesvioOriginalRaw: classificationOriginalRaw,
    tipoOriginal
  });

  applyInocuidadHardPriority({
    finalRecord,
    hasOriginalClassification,
    tipoDesvioOriginalRaw: classificationOriginalRaw
  });

  finalRecord.alcanceDesvio = scopeOriginalRaw || finalRecord.alcanceDesvio;
  finalRecord.scope_original = scopeOriginalRaw || null;
  finalRecord.scope_normalized = normalizeScopeForStats(finalRecord.alcanceDesvio);
  finalRecord.immediate_action = normalizeCellValue(accionInmediataRaw).trim();
  finalRecord.corrective_action = normalizeCellValue(accionCorrectivaRaw).trim();

  if (hasExplicitOriginalValue(estadoAccionRaw)) {
    finalRecord.estadoAccion = normalizeCellValue(estadoAccionRaw).trim();
    finalRecord.estadoAcciones = normalizeCellValue(estadoAccionRaw).trim();
  }
  if (hasExplicitOriginalValue(responsableOriginalRaw)) {
    finalRecord.responsable = normalizeCellValue(responsableOriginalRaw).trim();
  }
  if (hasExplicitOriginalValue(accionInmediataRaw)) {
    finalRecord.accionInmediata = normalizeCellValue(accionInmediataRaw).trim();
    finalRecord.immediate_action = normalizeCellValue(accionInmediataRaw).trim();
  }
  if (hasExplicitOriginalValue(accionCorrectivaRaw)) {
    finalRecord.accionCorrectiva = normalizeCellValue(accionCorrectivaRaw).trim();
    finalRecord.corrective_action = normalizeCellValue(accionCorrectivaRaw).trim();
  }
  if (areaOriginalPreservable) {
    finalRecord.areaClasificada = areaOriginalPreservable;
    finalRecord.areaSector = areaOriginalPreservable;
  }
  if (hasExplicitOriginalValue(scopeOriginalRaw)) {
    const scopeOriginal = normalizeCellValue(scopeOriginalRaw).trim();
    finalRecord.alcanceDesvio = scopeOriginal;
    finalRecord.scope_original = scopeOriginal;
    finalRecord.scope_normalized = normalizeScopeForStats(scopeOriginal);
  }
  if (hasExplicitOriginalValue(iso22000OriginalRaw)) {
    const isoOriginal = normalizeCellValue(iso22000OriginalRaw).trim();
    finalRecord.iso22000 = isoOriginal;
    finalRecord.relacionIso22000 = isoOriginal;
  }
  if (hasOriginalClassification) {
    const classificationOriginal = normalizeCellValue(classificationOriginalRaw).trim();
    const classificationNormalized = normalizeCategory(classificationOriginal);
    finalRecord.categoriaDesvio = classificationNormalized;
    finalRecord.clasificacionDesvio = classificationNormalized;
    finalRecord.classification = classificationOriginal;
    finalRecord.classification_original = classificationOriginal;
    finalRecord.classification_normalized = classificationNormalized;
    finalRecord.preserveOriginalClassification = true;
  }
  const isoFieldState = getIsoFieldState(finalRecord);
  const hasIsoForTraceability = Boolean(isoFieldState.canonical || isoFieldState.legacy);
  const isoForTraceability = hasIsoForTraceability ? isoFieldState.value : null;
  finalRecord.traceability = {
    areaSector: {
      valor_original_excel: areaOriginalPreservable || null,
      valor_final_usado: finalRecord.areaSector || finalRecord.areaClasificada || null,
      fuente_del_valor: areaOriginalPreservable ? 'excel' : 'heuristica'
    },
    clasificacion: {
      valor_original_excel: hasOriginalClassification ? normalizeCellValue(classificationOriginalRaw).trim() : null,
      valor_final_usado: finalRecord.clasificacionDesvio || finalRecord.categoriaDesvio || null,
      fuente_del_valor: hasOriginalClassification ? 'excel' : 'heuristica'
    },
    tipo: {
      valor_original_excel: hasExplicitOriginalValue(scopeOriginalRaw) ? normalizeCellValue(scopeOriginalRaw).trim() : null,
      valor_final_usado: finalRecord.scope_normalized || finalRecord.alcanceDesvio || null,
      fuente_del_valor: hasExplicitOriginalValue(scopeOriginalRaw) ? 'excel' : 'heuristica'
    },
    estado: {
      valor_original_excel: hasExplicitOriginalValue(estadoAccionRaw) ? normalizeCellValue(estadoAccionRaw).trim() : null,
      valor_final_usado: finalRecord.estadoAcciones || finalRecord.estadoAccion || null,
      fuente_del_valor: hasExplicitOriginalValue(estadoAccionRaw) ? 'excel' : 'heuristica'
    },
    relacionIso22000: {
      valor_original_excel: hasExplicitOriginalValue(iso22000OriginalRaw) ? normalizeCellValue(iso22000OriginalRaw).trim() : null,
      valor_final_usado: isoForTraceability,
      fuente_del_valor: hasExplicitOriginalValue(iso22000OriginalRaw) ? 'excel' : 'heuristica'
    },
    accionInmediata: {
      valor_original_excel: hasExplicitOriginalValue(accionInmediataRaw) ? normalizeCellValue(accionInmediataRaw).trim() : null,
      valor_final_usado: finalRecord.immediate_action || finalRecord.accionInmediata || null,
      fuente_del_valor: hasExplicitOriginalValue(accionInmediataRaw) ? 'excel' : 'heuristica'
    },
    accionCorrectiva: {
      valor_original_excel: hasExplicitOriginalValue(accionCorrectivaRaw) ? normalizeCellValue(accionCorrectivaRaw).trim() : null,
      valor_final_usado: finalRecord.corrective_action || finalRecord.accionCorrectiva || null,
      fuente_del_valor: hasExplicitOriginalValue(accionCorrectivaRaw) ? 'excel' : 'heuristica'
    },
    responsable: {
      valor_original_excel: hasExplicitOriginalValue(responsableOriginalRaw) ? normalizeCellValue(responsableOriginalRaw).trim() : null,
      valor_final_usado: finalRecord.responsable || null,
      fuente_del_valor: hasExplicitOriginalValue(responsableOriginalRaw) ? 'excel' : 'heuristica'
    }
  };

  // Ajuste final: la acción correctiva debe responder a la categoría final validada.
  if (!hasOriginalClassification && normalizeCellValue(finalRecord.resultadoClasificado).trim() === 'No conforme') {
    const finalActions = buildActions({
      resultadoClasificado: finalRecord.resultadoClasificado,
      text: [finalRecord.hallazgoDetectado, finalRecord.descripcion, finalRecord.observaciones, finalRecord.actividadRealizada].filter(Boolean).join(' | '),
      hallazgoDetectado: finalRecord.hallazgoDetectado,
      accionInmediataOriginal: finalRecord.accionInmediata,
      accionCorrectivaOriginal: finalRecord.accionCorrectiva,
      categoriaDesvio: finalRecord.categoriaDesvio,
      iso22000: finalRecord.iso22000
    });
    finalRecord.accionInmediata = finalActions.accionInmediata || finalRecord.accionInmediata;
    finalRecord.accionCorrectiva = finalActions.accionCorrectiva || finalRecord.accionCorrectiva;
  }
}

export {
  applyFinalRecordOverrides
};
