import { normalizeCellValue, normalizeIncidentText } from '../../analyzeExcel/normalizers.js';
import {
  isExplicitNoFindingText,
  classifyNormalizedRule,
  classifyPriorityOperationalRule,
  classifyTechnicalControlRule,
  normalizeFinalOutcomeAndType
} from './classifiers/outcomeClassifier.js';
import { resolveIsoWithContextFallback, mergeCompositeIsoLabels } from './classifiers/isoClassifier.js';
import {
  applyGovernanceTypeAndCategory,
  classifyCategoriaDesvio,
  normalizeToTriadClassification,
  mapTipoFromCategoria
} from './classifiers/categoryClassifier.js';

function ensureSingleArea(areaClasificada = '') {
  const normalized = normalizeCellValue(areaClasificada).split('/').map((part) => part.trim()).filter(Boolean);
  if (normalized.length <= 1) return normalized[0] || 'Área no identificada';
  return normalized[0];
}

function validateFinalRecord(record = {}) {
  const validated = { ...record };
  const hallazgo = normalizeIncidentText(validated.hallazgoDetectado || '');
  const normalizedRule = classifyNormalizedRule([
    validated.hallazgoDetectado,
    validated.actividadRealizada
  ].join(' | '));
  const priorityOperationalRule = classifyPriorityOperationalRule([
    validated.hallazgoDetectado,
    validated.actividadRealizada
  ].join(' | '));
  const technicalControlRule = classifyTechnicalControlRule([
    validated.hallazgoDetectado,
    validated.actividadRealizada
  ].join(' | '));

  const explicitNoFinding = isExplicitNoFindingText(hallazgo);
  if (explicitNoFinding) {
    validated.resultadoClasificado = 'Conforme';
    validated.tipoDesvio = '-';
    validated.iso22000 = '-';
    validated.estadoAccion = 'sin_accion';
    validated.responsable = 'Responsable a definir';
    validated.accionInmediata = '';
    validated.accionCorrectiva = '';
    validated.areaClasificada = 'Área no identificada';
  }

  if (!explicitNoFinding && normalizedRule) {
    validated.resultadoClasificado = normalizedRule.resultadoClasificado;
    validated.tipoDesvio = normalizedRule.tipoDesvio;
    validated.iso22000 = normalizedRule.iso22000;
  } else if (!explicitNoFinding && priorityOperationalRule) {
    validated.resultadoClasificado = priorityOperationalRule.resultadoClasificado;
    validated.tipoDesvio = priorityOperationalRule.tipoDesvio;
    validated.iso22000 = priorityOperationalRule.iso22000;
  } else if (!explicitNoFinding && technicalControlRule) {
    validated.resultadoClasificado = technicalControlRule.resultadoClasificado;
    validated.tipoDesvio = technicalControlRule.tipoDesvio;
    validated.iso22000 = technicalControlRule.iso22000;
  }

  validated.areaClasificada = ensureSingleArea(validated.areaClasificada);
  if (!explicitNoFinding) {
    validated.iso22000 = resolveIsoWithContextFallback({
      iso22000: validated.iso22000,
      hallazgoDetectado: validated.hallazgoDetectado,
      actividadRealizada: validated.actividadRealizada,
      areaClasificada: validated.areaClasificada,
      resultadoClasificado: validated.resultadoClasificado
    });
    validated.iso22000 = mergeCompositeIsoLabels({
      iso22000: validated.iso22000,
      hallazgoDetectado: validated.hallazgoDetectado,
      actividadRealizada: validated.actividadRealizada,
      areaClasificada: validated.areaClasificada
    });
    const governanceAdjusted = applyGovernanceTypeAndCategory({
      hallazgoDetectado: validated.hallazgoDetectado,
      actividadRealizada: validated.actividadRealizada,
      areaClasificada: validated.areaClasificada,
      resultadoClasificado: validated.resultadoClasificado,
      tipoDesvio: validated.tipoDesvio,
      iso22000: validated.iso22000,
      categoriaDesvio: validated.categoriaDesvio || ''
    });
    validated.resultadoClasificado = governanceAdjusted.resultadoClasificado;
    validated.tipoDesvio = governanceAdjusted.tipoDesvio;
    validated.iso22000 = governanceAdjusted.iso22000;
    validated.categoriaDesvio = governanceAdjusted.categoriaDesvio || validated.categoriaDesvio;
  }

  if (!validated.categoriaDesvio) {
    validated.categoriaDesvio = classifyCategoriaDesvio({
      hallazgoDetectado: validated.hallazgoDetectado,
      actividadRealizada: validated.actividadRealizada,
      resultadoClasificado: validated.resultadoClasificado,
      tipoDesvio: validated.tipoDesvio,
      iso22000: validated.iso22000
    });
  }

  const triad = normalizeToTriadClassification({
    categoriaDesvio: validated.categoriaDesvio,
    resultadoClasificado: validated.resultadoClasificado,
    tipoDesvio: validated.tipoDesvio
  });
  validated.resultadoClasificado = triad.resultadoClasificado;
  validated.tipoDesvio = triad.tipoDesvio;
  validated.categoriaDesvio = triad.categoriaDesvio || validated.categoriaDesvio;
  validated.tipoDesvio = mapTipoFromCategoria(validated.categoriaDesvio, validated.tipoDesvio);

  const normalizedOutcome = normalizeFinalOutcomeAndType({
    resultadoClasificado: validated.resultadoClasificado,
    tipoDesvio: validated.tipoDesvio
  });
  validated.resultadoClasificado = normalizedOutcome.resultadoClasificado;
  validated.tipoDesvio = normalizedOutcome.tipoDesvio;

  return validated;
}

export {
  ensureSingleArea,
  validateFinalRecord
};
