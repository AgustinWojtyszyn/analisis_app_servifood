import { normalizeCellValue, normalizeIncidentText, containsAny } from '../../../analyzeExcel/normalizers.js';
import { isExplicitNoFindingText } from './outcomeClassifier.js';
import { hasAnyIsoTerm, mergeCompositeIsoLabels } from './isoClassifier.js';

function classifyDeviationAreaDetailed({
  textoCompleto = '',
  accionInmediata = '',
  accionCorrectiva = '',
  descripcion = '',
  observaciones = '',
  hallazgoDetectado = '',
  actividadRealizada = '',
  resultadoClasificado = '',
  tipoDesvio = '',
  iso22000 = ''
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
  const resultado = normalizeCellValue(resultadoClasificado).trim();
  const iso = normalizeIncidentText(iso22000 || '');
  const tipo = normalizeCellValue(tipoDesvio).trim();

  if (!text || isExplicitNoFindingText(text) || resultado === 'Conforme') {
    return { area: 'Conforme', reason: 'Sin evidencia de desvío en el texto normalizado', confidence: 0.8 };
  }

  const inocuidadSignals = [
    { hit: hasAny(['fruta sin sanitizar', 'sin sanitizar', 'falta de sanitizacion', 'falta sanitizacion']), reason: 'Riesgo alimentario por falta de sanitización' },
    { hit: hasAny(['mal estado', 'deteriorada', 'deteriorado', 'pasada', 'pasado', 'oxidada', 'oxidado', 'fruta picada', 'naranja picada', 'naranjas picadas']), reason: 'Alimento en mal estado con riesgo sanitario potencial' },
    { hit: hasAny(['falta de coccion', 'crudo', 'mal cocido', 'temperatura insuficiente', 'sin coccion']), reason: 'Riesgo sanitario por cocción insuficiente' },
    { hit: hasAny(['camara', 'cadena de frio', 'refrigeracion', 'temperatura de conservacion', 'frio']) && hasAny(['no funciona', 'fuera de rango', 'falla', 'sin']), reason: 'Riesgo de inocuidad por falla en conservación en frío' },
    { hit: hasAny(['pelo', 'plastico', 'metal', 'suciedad', 'cuerpo extrano', 'cuerpo extraño']), reason: 'Contaminación física detectada en alimento' },
    { hit: hasAny(['bpm', 'higiene', 'limpieza', 'sanitizacion', 'desinfeccion']), reason: 'Incumplimiento de prácticas de higiene/inocuidad' },
    { hit: hasAny(['alergeno', 'alergenos', 'celiaco', 'celiacos', 'sin tacc', 'dieta especial', 'menu sin tacc']), reason: 'Incumplimiento de requerimientos de alérgenos o dieta especial' }
  ];
  const inocuidadMatch = inocuidadSignals.find((signal) => signal.hit);

  const logisticaSignals = [
    { hit: hasAny(['no se envio', 'no se enviaron', 'no se envian', 'falto enviar', 'no sale', 'sale tarde', 'llego tarde', 'llegan tarde']), reason: 'Incidencia de envío/entrega operativa' },
    { hit: hasAny(['despacho', 'recorrido', 'segunda movilidad']), reason: 'Incidencia de despacho o recorrido logístico' },
    { hit: hasAny(['falta de materia prima', 'materia prima faltante', 'falta de stock', 'sin stock']), reason: 'Falta de disponibilidad de insumos/stock' },
    { hit: hasAny(['faltan cajones', 'faltan platinas', 'cajones para despacho', 'platinas para despacho']), reason: 'Faltante de elementos para despacho' },
    { hit: hasAny(['evento programado', 'fecha incorrecta', 'salio 26 12', 'salio 27 12']), reason: 'Error operativo de programación de evento' },
    { hit: hasAny(['personal llega tarde', 'personal de area caliente llega tarde', 'deposito cerrado por tardanza', 'sale tarde', 'cerrado por tardanza']), reason: 'Demora operativa de personal o depósito' },
    { hit: hasAny(['falta de aceite de oliva', 'reclama aceite de oliva', 'falta aceite de oliva']), reason: 'Faltante de insumo para entrega/producción' },
    { hit: hasAny(['reclamo']) && hasAny(['callia', 'easy', 'adium', 'scop', 'comeca', 'clorox']), reason: 'Reclamo operativo de cliente/servicio' }
  ];
  const logisticaMatch = logisticaSignals.find((signal) => signal.hit);

  const legalSignals = [
    { hit: hasAny(['documentacion vencida', 'documentacion faltante', 'plataforma desactualizada']), reason: 'Incumplimiento documental o de plataforma' },
    { hit: hasAny(['no pudo ingresar', 'ingreso denegado']) && hasAny(['documentacion', 'plataforma', 'credencial']), reason: 'Ingreso bloqueado por incumplimiento documental' },
    { hit: hasAny(['habilitacion', 'permiso', 'ingreso no autorizado', 'credencial', 'cubre franco no pudo ingresar', 'no pudo ingresar']), reason: 'Incumplimiento de habilitación/ingreso' },
    { hit: hasAny(['seguro art', 'art vigente', 'certificado', 'libreta sanitaria', 'documentacion laboral', 'documentacion contractual']), reason: 'Incumplimiento legal/laboral documental' }
  ];
  const legalMatch = legalSignals.find((signal) => signal.hit);

  const calidadSignals = [
    { hit: hasAny(['gramaje', 'peso', 'tamano', 'tamaño', 'dorado', 'aspecto', 'presentacion', 'organoleptica']), reason: 'Desvío de especificación de producto sin riesgo sanitario explícito' },
    { hit: hasAny(['producto quemado', 'se queman', 'queman en el establecimiento', 'receta', 'emplatado']), reason: 'Desvío de calidad de elaboración/presentación' }
  ];
  const calidadMatch = calidadSignals.find((signal) => signal.hit);

  // Desempates obligatorios: prioridad por riesgo de inocuidad.
  if (hasAny(['materia prima en mal estado'])) {
    return { area: 'Desvío de Inocuidad', reason: 'Materia prima en mal estado con riesgo alimentario', confidence: 0.97 };
  }
  if (hasAny(['materia prima faltante', 'falta de materia prima', 'falta de stock', 'sin stock'])) {
    return { area: 'Desvío de Logística', reason: 'Falta de materia prima/stock (incidencia operativa)', confidence: 0.95 };
  }
  if (hasAny(['no se envio fruta', 'no se enviaron fruta', 'no se enviaron frutas', 'falta envio fruta'])) {
    return { area: 'Desvío de Logística', reason: 'No envío de fruta (problema de entrega)', confidence: 0.94 };
  }
  if (hasAny(['fruta']) && hasAny(['sin sanitizar', 'picada', 'pasada', 'oxidada', 'mal estado'])) {
    return { area: 'Desvío de Inocuidad', reason: 'Riesgo alimentario en fruta lista para consumo', confidence: 0.98 };
  }
  if (hasAny(['pasadas de peso', 'pasado de peso', 'excede gramaje', 'exceder gramaje', 'gramaje solicitado', 'viandas pasadas de peso'])) {
    return { area: 'Desvío de Calidad', reason: 'Desvío de gramaje/peso de especificación', confidence: 0.95 };
  }
  if (hasAny(['se rompe sifon de bacha', 'sifon de bacha'])) {
    return { area: 'Desvío de Inocuidad', reason: 'Falla de infraestructura que afecta higiene/POES', confidence: 0.9 };
  }
  if (hasAny(['se rompe el batidor', 'batidor roto', 'equipo roto'])) {
    return { area: 'Desvío de Logística', reason: 'Falla de equipamiento con impacto operativo', confidence: 0.88 };
  }

  if (inocuidadMatch) {
    return { area: 'Desvío de Inocuidad', reason: inocuidadMatch.reason, confidence: 0.95 };
  }
  if (legalMatch) {
    return { area: 'Desvío Legal', reason: legalMatch.reason, confidence: 0.93 };
  }
  if (logisticaMatch) {
    return { area: 'Desvío de Logística', reason: logisticaMatch.reason, confidence: 0.92 };
  }
  if (calidadMatch) {
    return { area: 'Desvío de Calidad', reason: calidadMatch.reason, confidence: 0.9 };
  }

  if (tipo === 'NC' && containsAny(iso, [
    '8.2 prp limpieza',
    '8.2 prp higiene',
    '8.2 prp identificacion',
    '8.2 prp identificación',
    '8.2 prp manejo residuos',
    '8.5.2 trazabilidad',
    '8.7 control de salidas no conformes'
  ])) return { area: 'Desvío de Inocuidad', reason: 'No conformidad en controles PRP/trazabilidad de inocuidad', confidence: 0.86 };

  if (tipo === 'NC' && iso.includes('8.5.1 control operacional') && hasAny([
    'temperatura', 'registro', 'control sanitario', 'inocuidad', 'heladera', 'camara', 'cámara', 'freezer'
  ])) return { area: 'Desvío de Inocuidad', reason: 'No conformidad operacional vinculada a control sanitario', confidence: 0.84 };

  if (['NC', 'OBS', 'OM'].includes(tipo) || resultado === 'No conforme' || resultado === 'Observación' || resultado === 'Oportunidad de mejora') {
    return { area: 'Desvío de Inocuidad', reason: 'Fallback conservador por desvío sin contexto concluyente', confidence: 0.6 };
  }

  return { area: 'Revisar manualmente', reason: 'Sin señales contextuales suficientes para clasificar', confidence: 0.45 };
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
  tipoDesvio = '',
  iso22000 = ''
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
    tipoDesvio,
    iso22000
  }).area;
}

function normalizeToTriadClassification({ categoriaDesvio = '', resultadoClasificado = '', tipoDesvio = '' }) {
  const categoria = normalizeCellValue(categoriaDesvio).trim();
  if (categoria === 'Desvío Legal') return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: 'Desvío Legal' };
  if (categoria === 'Desvío de Logística') return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: 'Desvío de Logística' };
  if (categoria === 'Desvío de Inocuidad') return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: 'Desvío de Inocuidad' };
  if (categoria === 'Desvío de Calidad') return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: 'Desvío de Calidad' };

  const tipo = normalizeCellValue(tipoDesvio).trim();
  if (['NC', 'OBS', 'OM'].includes(tipo)) return { resultadoClasificado, tipoDesvio: tipo, categoriaDesvio: 'Desvío de Inocuidad' };
  if (tipo === '-') return { resultadoClasificado, tipoDesvio: '-', categoriaDesvio: categoria || 'Conforme' };

  return { resultadoClasificado, tipoDesvio, categoriaDesvio };
}

function mapTipoFromCategoria(categoriaDesvio = '', fallbackTipo = '') {
  const categoria = normalizeCellValue(categoriaDesvio).trim();
  if (categoria === 'Desvío de Inocuidad') return 'IN';
  if (categoria === 'Desvío Legal') return 'LE';
  if (categoria === 'Desvío de Logística') return 'LGT';
  if (categoria === 'Desvío de Calidad') return 'CAL';
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
  const hasConcienciaCapacitacion = hasAnyIsoTerm(text, [
    'capacitacion', 'capacitaciones', 'personal no capacitado', 'falta de capacitacion', 'capacitacion vencida', 'capacitacion desactualizada', 'bpm', 'buenas practicas de manufactura', 'poe', 'poes', 'procedimiento operativo estandarizado', 'toma de conciencia', 'induccion', 'entrenamiento'
  ]);
  const hasInformacionDocumentada = hasAnyIsoTerm(text, [
    'procedimiento documentado', 'falta procedimiento', 'falta de procedimiento', 'procedimiento inexistente', 'procedimiento desactualizado', 'documentacion desactualizada', 'informacion documentada', 'registros incompletos', 'registros ausentes', 'falta de registros', 'control de versiones', 'version desactualizada', 'documento sin actualizar', 'planilla incompleta', 'evidencia documental', 'sin evidencia documental'
  ]);

  const hasGovernanceSignal = hasCompetenciaLegal || hasConcienciaCapacitacion || hasInformacionDocumentada;
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
    } else if (hasConcienciaCapacitacion || hasInformacionDocumentada || omSignal) {
      nextTipo = 'OM';
      nextResultado = 'Oportunidad de mejora';
    }
  }

  if (hasCompetenciaLegal) nextCategoria = 'Desvío Legal';

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
