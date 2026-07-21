import { normalizeCellValue, normalizeIncidentText, containsAny } from '../../../analyzeExcel/normalizers.js';
import { isExplicitNoFindingText } from './outcomeClassifier.js';
import { hasAnyIsoTerm, mergeCompositeIsoLabels } from './isoClassifier.js';
import { classifyDeviation } from './deviationClassifier.js';
import { CANONICAL, normalizeCategory } from '../categoryNormalization.js';

const CATEGORY = {
  INOCUIDAD: 'Desvío de Inocuidad',
  MANTENIMIENTO: 'Desvío de Mantenimiento',
  RRHH: 'Desvío de Recursos Humanos',
  LOGISTICA: 'Desvío de Logística',
  LEGAL: 'Desvío Legal',
  CALIDAD: 'Desvío de Calidad',
  PROCEDIMIENTO: CANONICAL.PROCEDIMIENTO,
  MEDIO_AMBIENTE: CANONICAL.MEDIO_AMBIENTE,
  MANUAL: 'Revisar manualmente'
};

function classifyDeviationAreaDetailed({
  textoCompleto = '',
  accionInmediata = '',
  accionCorrectiva = '',
  descripcion = '',
  observaciones = '',
  hallazgoDetectado = '',
  actividadRealizada = '',
  resultadoClasificado = '',
  tipoDesvio = ''
} = {}) {
  const text = normalizeIncidentText([
    textoCompleto,
    accionInmediata,
    accionCorrectiva,
    descripcion,
    observaciones,
    hallazgoDetectado,
    actividadRealizada
  ].filter(Boolean).join(' | '));

  const hasAny = (terms) => containsAny(text, terms);
  const inocuidadHardPriorityTerms = [
    'decomisa', 'decomiso', 'decomisar',
    'vida util', 'vida útil', 'fuera de vida util', 'fuera de vida útil',
    'vencido', 'producto no apto', 'alimento no apto',
    'riesgo sanitario', 'riesgo para el consumidor'
  ];
  const resultado = normalizeCellValue(resultadoClasificado).trim();
  const tipo = normalizeCellValue(tipoDesvio).trim();

  if (!text || isExplicitNoFindingText(text) || resultado === 'Conforme') {
    return { area: 'Conforme', reason: 'Sin evidencia de desvío en el texto normalizado', confidence: 0.8 };
  }

  if (hasAny(['reclamo de']) && !hasAny([
    'falta', 'faltante', 'demora', 'tardanza', 'no se envio', 'no se envió', 'no se enviaron', 'coccion', 'cocción', 'sanitizar', 'mal estado', 'picada', 'picado', 'oxidada', 'oxidado', 'gramaje', 'peso', 'documentacion', 'permiso', 'credencial'
  ])) {
    return { area: CATEGORY.MANUAL, reason: 'Reclamo sin detalle técnico suficiente para clasificar', confidence: 0.4 };
  }

  if (hasAny(inocuidadHardPriorityTerms)) {
    return { area: CATEGORY.INOCUIDAD, reason: 'Prioridad sanitaria explícita (decomiso/vida útil/no apto/riesgo)', confidence: 0.96 };
  }

  const result = classifyDeviation(
    text,
    '',
    normalizeCellValue(accionInmediata),
    normalizeCellValue(accionCorrectiva),
    ''
  );
  if (result.clasificacion === 'Inocuidad') return { area: CATEGORY.INOCUIDAD, reason: `Reglas: ${result.matchedRules.join(', ')}`, confidence: result.confidence };
  if (result.clasificacion === 'Mantenimiento') return { area: CATEGORY.MANTENIMIENTO, reason: `Reglas: ${result.matchedRules.join(', ')}`, confidence: result.confidence };
  if (result.clasificacion === 'Recursos Humanos') return { area: CATEGORY.RRHH, reason: `Reglas: ${result.matchedRules.join(', ')}`, confidence: result.confidence };
  if (result.clasificacion === 'Logística') return { area: CATEGORY.LOGISTICA, reason: `Reglas: ${result.matchedRules.join(', ')}`, confidence: result.confidence };
  if (result.clasificacion === 'Legales') return { area: CATEGORY.LEGAL, reason: `Reglas: ${result.matchedRules.join(', ')}`, confidence: result.confidence };
  if (result.clasificacion === 'Calidad') return { area: CATEGORY.CALIDAD, reason: `Reglas: ${result.matchedRules.join(', ')}`, confidence: result.confidence };

  if (['NC', 'OBS', 'OM'].includes(tipo) || resultado === 'No conforme' || resultado === 'Observación' || resultado === 'Oportunidad de mejora') {
    return { area: CATEGORY.MANUAL, reason: 'Desvío sin contexto concluyente; requiere revisión manual', confidence: 0.45 };
  }

  return { area: CATEGORY.MANUAL, reason: 'Sin señales contextuales suficientes para clasificar', confidence: 0.45 };
}

function classifyCategoriaDesvio({
  textoCompleto = '',
  accionInmediata = '',
  accionCorrectiva = '',
  descripcion = '',
  observaciones = '',
  hallazgoDetectado = '',
  actividadRealizada = '',
  resultadoClasificado = '',
  tipoDesvio = ''
} = {}) {
  return classifyDeviationAreaDetailed({
    textoCompleto,
    accionInmediata,
    accionCorrectiva,
    descripcion,
    observaciones,
    hallazgoDetectado,
    actividadRealizada,
    resultadoClasificado,
    tipoDesvio
  }).area;
}

function normalizeToTriadClassification({ categoriaDesvio = '', resultadoClasificado = '', tipoDesvio = '' }) {
  const categoria = normalizeCellValue(categoriaDesvio).trim();
  const normalizedCategory = normalizeCategory(categoria);
  if (categoria === CATEGORY.LEGAL) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.LEGAL };
  if (categoria === CATEGORY.LOGISTICA) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.LOGISTICA };
  if (categoria === CATEGORY.INOCUIDAD) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.INOCUIDAD };
  if (categoria === CATEGORY.CALIDAD) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.CALIDAD };
  if (categoria === CATEGORY.MANTENIMIENTO) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.MANTENIMIENTO };
  if (categoria === CATEGORY.RRHH) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.RRHH };
  if (normalizedCategory === CANONICAL.PROCEDIMIENTO) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CANONICAL.PROCEDIMIENTO };
  if (normalizedCategory === CANONICAL.MEDIO_AMBIENTE) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CANONICAL.MEDIO_AMBIENTE };

  const tipo = normalizeCellValue(tipoDesvio).trim();
  if (['NC', 'OBS', 'OM'].includes(tipo)) return { resultadoClasificado, tipoDesvio: tipo, categoriaDesvio: CATEGORY.MANUAL };
  if (tipo === '-') return { resultadoClasificado, tipoDesvio: '-', categoriaDesvio: categoria || 'Conforme' };

  return { resultadoClasificado, tipoDesvio, categoriaDesvio: categoria || CATEGORY.MANUAL };
}

function mapTipoFromCategoria(categoriaDesvio = '', fallbackTipo = '') {
  const categoria = normalizeCellValue(categoriaDesvio).trim();
  if (categoria === CATEGORY.INOCUIDAD) return 'IN';
  if (categoria === CATEGORY.LEGAL) return 'LE';
  if (categoria === CATEGORY.LOGISTICA) return 'LGT';
  if (categoria === CATEGORY.CALIDAD) return 'CAL';
  if (categoria === CATEGORY.MANTENIMIENTO) return 'MNT';
  if (categoria === CATEGORY.RRHH) return 'RRHH';
  const normalizedCategory = normalizeCategory(categoria);
  if (normalizedCategory === CANONICAL.PROCEDIMIENTO || normalizedCategory === CANONICAL.MEDIO_AMBIENTE) return 'NC';
  return normalizeCellValue(fallbackTipo).trim();
}

function hasStrongNcIndicatorForGovernance(text = '') {
  return hasAnyIsoTerm(text, [
    'falta', 'faltante', 'ausencia', 'ausente', 'inexistente', 'sin', 'vencido', 'vencida', 'no presenta', 'incumple', 'incumplimiento', 'obligatorio', 'requerido', 'critico', 'critica'
  ]);
}

function hasOmIndicatorForGovernance(text = '') {
  return hasAnyIsoTerm(text, [
    'oportunidad de mejora', 'mejorar', 'mejora', 'desactualizado', 'desactualizada', 'actualizar', 'reforzar', 'revisar', 'optimizar', 'sugerencia'
  ]);
}

function applyGovernanceTypeAndCategory({
  hallazgoDetectado = '',
  actividadRealizada = '',
  areaClasificada = '',
  resultadoClasificado = '',
  tipoDesvio = '',
  iso22000 = '',
  categoriaDesvio = ''
}) {
  const text = normalizeIncidentText([hallazgoDetectado, actividadRealizada, areaClasificada].filter(Boolean).join(' | '));
  if (!text || isExplicitNoFindingText(text)) return { resultadoClasificado, tipoDesvio, iso22000, categoriaDesvio };

  const hasCompetenciaLegal = hasAnyIsoTerm(text, [
    'carnet de manipulador', 'carne de manipulador', 'manipulador de alimentos', 'carnet sanitario', 'libreta sanitaria', 'carnet vencido', 'carnet faltante', 'sin carnet', 'no presenta carnet', 'personal sin carnet'
  ]);

  const hasGovernanceSignal = hasCompetenciaLegal || hasAnyIsoTerm(text, [
    'capacitacion', 'capacitaciones', 'procedimiento documentado', 'falta de registros', 'documentacion desactualizada', 'informacion documentada'
  ]);

  if (!hasGovernanceSignal) return { resultadoClasificado, tipoDesvio, iso22000, categoriaDesvio };

  let nextTipo = tipoDesvio;
  let nextResultado = resultadoClasificado;
  let nextCategoria = categoriaDesvio;

  const strongNc = hasStrongNcIndicatorForGovernance(text);
  const omSignal = hasOmIndicatorForGovernance(text);

  if (nextTipo !== 'NC') {
    if (hasCompetenciaLegal || strongNc) {
      nextTipo = 'NC';
      nextResultado = 'No conforme';
    } else if (omSignal) {
      nextTipo = 'OM';
      nextResultado = 'Oportunidad de mejora';
    }
  }

  if (hasCompetenciaLegal) nextCategoria = CATEGORY.LEGAL;

  const nextIso = mergeCompositeIsoLabels({
    iso22000,
    hallazgoDetectado,
    actividadRealizada,
    areaClasificada
  });

  return {
    resultadoClasificado: nextResultado,
    tipoDesvio: nextTipo,
    iso22000: nextIso,
    categoriaDesvio: nextCategoria
  };
}

export {
  classifyDeviationAreaDetailed,
  classifyCategoriaDesvio,
  normalizeToTriadClassification,
  mapTipoFromCategoria,
  hasStrongNcIndicatorForGovernance,
  hasOmIndicatorForGovernance,
  applyGovernanceTypeAndCategory
};
