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
import { normalizeCategory } from './categoryNormalization.js';

function ensureSingleArea(areaClasificada = '') {
  const normalized = normalizeCellValue(areaClasificada).split('/').map((part) => part.trim()).filter(Boolean);
  if (normalized.length <= 1) return normalized[0] || 'Área no identificada';
  return normalized[0];
}

function normalizeCategoriaPermitida(categoria = '') {
  return normalizeCategory(categoria);
}

function normalizeTipoPermitido(tipo = '', alcance = '', hallazgo = '') {
  const tipoNorm = normalizeIncidentText(tipo);
  if (tipoNorm === 'interno' || tipoNorm === 'externo') return tipoNorm === 'interno' ? 'Interno' : 'Externo';

  const alcanceNorm = normalizeIncidentText(alcance);
  if (alcanceNorm === 'interno' || alcanceNorm === 'externo') return alcanceNorm === 'interno' ? 'Interno' : 'Externo';

  const hallazgoNorm = normalizeIncidentText(hallazgo);
  if (hallazgoNorm.includes('reclamo') || hallazgoNorm.includes('cliente')) return 'Externo';
  return 'Interno';
}

function normalizeEstadoPermitido(estado = '', fecha = '', estadoOriginal = '') {
  const explicitOriginal = normalizeCellValue(estadoOriginal).trim();
  if (!explicitOriginal) return 'No informado';

  const value = normalizeIncidentText(explicitOriginal);
  if (value === 'abierto' || value === 'abierta') return 'Abierto';
  if (value === 'cerrado' || value === 'cerrada' || value === 'finalizado' || value === 'finalizada') return 'Cerrado';
  return explicitOriginal;
}

function validateFinalRecord(record = {}) {
  const validated = { ...record };
  const preserveOriginalClassification = Boolean(validated.preserveOriginalClassification);
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

  if (!preserveOriginalClassification && !explicitNoFinding && normalizedRule) {
    validated.resultadoClasificado = normalizedRule.resultadoClasificado;
    validated.tipoDesvio = normalizedRule.tipoDesvio;
    validated.iso22000 = normalizedRule.iso22000;
  } else if (!preserveOriginalClassification && !explicitNoFinding && priorityOperationalRule) {
    validated.resultadoClasificado = priorityOperationalRule.resultadoClasificado;
    validated.tipoDesvio = priorityOperationalRule.tipoDesvio;
    validated.iso22000 = priorityOperationalRule.iso22000;
  } else if (!preserveOriginalClassification && !explicitNoFinding && technicalControlRule) {
    validated.resultadoClasificado = technicalControlRule.resultadoClasificado;
    validated.tipoDesvio = technicalControlRule.tipoDesvio;
    validated.iso22000 = technicalControlRule.iso22000;
  }

  validated.areaClasificada = ensureSingleArea(validated.areaClasificada);
  if (!preserveOriginalClassification && !explicitNoFinding) {
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

  if (!preserveOriginalClassification && !validated.categoriaDesvio) {
    validated.categoriaDesvio = classifyCategoriaDesvio({
      hallazgoDetectado: validated.hallazgoDetectado,
      actividadRealizada: validated.actividadRealizada,
      resultadoClasificado: validated.resultadoClasificado,
      tipoDesvio: validated.tipoDesvio,
      iso22000: validated.iso22000
    });
  }

  if (!preserveOriginalClassification) {
    const triad = normalizeToTriadClassification({
      categoriaDesvio: validated.categoriaDesvio,
      resultadoClasificado: validated.resultadoClasificado,
      tipoDesvio: validated.tipoDesvio
    });
    validated.resultadoClasificado = triad.resultadoClasificado;
    validated.tipoDesvio = triad.tipoDesvio;
    validated.categoriaDesvio = triad.categoriaDesvio || validated.categoriaDesvio;
    validated.tipoDesvio = mapTipoFromCategoria(validated.categoriaDesvio, validated.tipoDesvio);
  }

  if (
    !preserveOriginalClassification
    &&
    validated.resultadoClasificado !== 'Conforme'
    && (!normalizeCellValue(validated.tipoDesvio).trim() || normalizeCellValue(validated.tipoDesvio).trim() === '-')
  ) {
    validated.tipoDesvio = mapTipoFromCategoria(validated.categoriaDesvio, 'NC') || 'NC';
  }

  const isoNorm = normalizeIncidentText(validated.iso22000 || '');
  if (!isoNorm || isoNorm === 'revisar manualmente') {
    const categoriaNorm = normalizeIncidentText(validated.categoriaDesvio || '');
    if (categoriaNorm === 'desvio de inocuidad') validated.iso22000 = '8.5.1 Control operacional';
    if (categoriaNorm === 'desvio de logistica') validated.iso22000 = '8.5.1 Control operacional';
    if (categoriaNorm === 'desvio de calidad') validated.iso22000 = '8.5.1 Control operacional';
    if (categoriaNorm === 'desvio legal') validated.iso22000 = '7.5 Información documentada';
  }

  const normalizedOutcome = normalizeFinalOutcomeAndType({
    resultadoClasificado: validated.resultadoClasificado,
    tipoDesvio: validated.tipoDesvio
  });
  validated.resultadoClasificado = normalizedOutcome.resultadoClasificado;
  validated.tipoDesvio = normalizedOutcome.tipoDesvio;

  if (
    !preserveOriginalClassification
    &&
    normalizeIncidentText(validated.categoriaDesvio || '').startsWith('desvio')
    && normalizeIncidentText(validated.resultadoClasificado || '') === 'conforme'
  ) {
    validated.resultadoClasificado = 'No conforme';
    validated.tipoDesvio = mapTipoFromCategoria(validated.categoriaDesvio, validated.tipoDesvio || 'NC') || 'NC';
  }

  // Normalización al nuevo esquema de desvíos (no destructiva).
  validated.areaSector = normalizeCellValue(validated.areaClasificada || validated.areaProceso).trim();
  validated.desvioDetectado = normalizeCellValue(validated.hallazgoDetectado).trim();
  validated.clasificacionDesvio = normalizeCategoriaPermitida(validated.categoriaDesvio || validated.classification_original);
  validated.tipoDesvioOrigen = normalizeTipoPermitido(validated.tipoDesvio, validated.alcanceDesvio || validated.scope_normalized, validated.hallazgoDetectado);
  validated.relacionIso22000 = normalizeCellValue(validated.iso22000).trim();
  validated.estadoAcciones = normalizeEstadoPermitido(validated.estadoAccion, validated.fecha, validated.estadoAccionRaw);

  // Mantener compatibilidad con consumidores actuales sin alterar métricas legacy.
  validated.estadoAccion = validated.estadoAcciones;

  return validated;
}

export {
  ensureSingleArea,
  validateFinalRecord
};
