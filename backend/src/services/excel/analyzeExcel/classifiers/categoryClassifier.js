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
  if (hasAny(['reclamo de']) && !hasAny([
    'falta', 'faltante', 'demora', 'tardanza', 'no se envio', 'no se envió', 'no se enviaron', 'coccion', 'cocción', 'sanitizar', 'mal estado', 'picada', 'picado', 'oxidada', 'oxidado', 'gramaje', 'peso', 'documentacion', 'permiso', 'credencial'
  ])) {
    return { area: 'Revisar manualmente', reason: 'Reclamo sin detalle técnico suficiente para clasificar', confidence: 0.4 };
  }

  const legalSignals = [
    { hit: hasAny(['documentacion', 'documental', 'registro administrativo', 'requisito administrativo']), reason: 'Incumplimiento documental o administrativo' },
    { hit: hasAny(['no pudo ingresar', 'ingreso denegado', 'acceso denegado', 'ingreso bloqueado']) && hasAny(['establecimiento', 'cliente', 'plataforma', 'credencial', 'permiso', 'habilitacion']), reason: 'Bloqueo de ingreso por requisitos administrativos' },
    { hit: hasAny(['plataforma', 'credencial', 'cubre franco', 'permiso', 'habilitacion', 'habilitación']), reason: 'Incumplimiento de plataforma/credenciales/habilitaciones' },
    { hit: hasAny(['contrato', 'contractual', 'libreta sanitaria', 'certificado', 'art vigente']), reason: 'Incumplimiento contractual o documental legal' }
  ];

  const inocuidadSignals = [
    { hit: hasAny(['falta de coccion', 'falta de cocción', 'coccion', 'cocción', 'crudo', 'mal cocido', 'sin coccion', 'sin cocción']), reason: 'Riesgo directo por cocción insuficiente' },
    { hit: hasAny(['pelo en alimento', 'pelo', 'cuerpo extrano', 'cuerpo extraño', 'contaminacion fisica', 'contaminación física']), reason: 'Contaminación física en alimento' },
    { hit: hasAny(['contaminacion cruzada', 'contaminación cruzada', 'alergeno', 'alergenos', 'sin tacc', 'celiaco', 'celiacos']) && hasAny(['contaminado', 'mezclado', 'mal rotulado', 'sin rotular', 'no apto']), reason: 'Riesgo por contaminación cruzada/alérgenos' },
    { hit: hasAny(['sin sanitizar', 'falta de sanitizacion', 'falta de sanitización', 'desinfeccion incompleta', 'desinfección incompleta']), reason: 'Alimento o insumo sin sanitizar' },
    { hit: (hasAny(['mal estado', 'oxidado', 'oxidada', 'picado', 'picada', 'no inocuo']) || (hasAny(['pasado', 'pasada']) && hasAny(['alimento', 'producto', 'fruta', 'materia prima']))) && !hasAny(['pasado de peso', 'pasadas de peso', 'gramaje', 'peso']), reason: 'Producto potencialmente no inocuo' },
    { hit: hasAny(['temperatura peligrosa', 'fuera de rango', 'cadena de frio', 'cadena de frío', 'temperatura de conservacion']) && hasAny(['producto', 'alimento', 'materia prima', 'comprometido', 'comprometida']), reason: 'Temperatura peligrosa con producto comprometido' },
    { hit: hasAny(['camara no funciona', 'cámara no funciona', 'cadena de frio', 'cadena de frío']) && hasAny(['conservacion', 'conservación', 'producto', 'alimento', 'materia prima']), reason: 'Falla de frío con impacto en conservación/inocuidad' }
  ];

  const logisticaSignals = [
    { hit: hasAny(['despacho', 'entrega', 'horario', 'recorrido', 'movilidad', 'transporte']), reason: 'Incidencia de despacho/entrega/transporte' },
    { hit: hasAny(['no se envio', 'no se envió', 'no se envia', 'no se envía', 'no se enviaron', 'no se envian', 'no se envían', 'comida no enviada', 'producto no salio', 'producto no salió', 'no salieron productos', 'no sale', 'no salen', 'limonada no enviada', 'fruta no enviada', 'guarniciones no enviadas']), reason: 'Producto no enviado o no despachado' },
    { hit: hasAny(['demora', 'tardanza', 'llega tarde', 'llegaron tarde', 'sale tarde', 'salen tarde', 'evento enviado en fecha incorrecta', 'fecha incorrecta', 'salio 26', 'salio 27', 'salió 26', 'salió 27']), reason: 'Demora o programación incorrecta de entrega' },
    { hit: hasAny(['faltante', 'faltan cajones', 'falta de cajones', 'faltan platinas', 'falta de platinas']), reason: 'Faltantes logísticos para despacho' },
    { hit: hasAny(['materia prima faltante', 'falta de materia prima', 'sin stock', 'falta de stock']) && hasAny(['impide enviar', 'no se envio', 'no se envia', 'despacho', 'entrega']), reason: 'Falta de materia prima que bloquea envío' },
    { hit: hasAny(['falta de aceite', 'aceite faltante', 'falta aceite', 'reclama aceite', 'aceite de oliva']), reason: 'Faltante de insumo para envío o producción' },
    { hit: hasAny(['personal llega tarde']) && hasAny(['despacho', 'entrega', 'envio', 'envío']), reason: 'Demora operativa de personal con impacto logístico' },
    { hit: hasAny(['reclamo']) && hasAny(['entrega', 'despacho', 'faltante', 'demora', 'tardanza', 'aceite', 'no se envio', 'no se envia']), reason: 'Reclamo por incidencia logística' }
  ];

  const calidadSignals = [
    { hit: hasAny(['incumplimiento de especificacion', 'incumplimiento de especificación', 'especificacion', 'especificación', 'presentacion', 'presentación']), reason: 'Incumplimiento de especificación/presentación' },
    { hit: hasAny(['gramaje', 'peso', 'pasadas de peso', 'pasado de peso']), reason: 'Desvío de gramaje o peso' },
    { hit: hasAny(['quemado', 'quemada', 'queman', 'oxidado', 'oxidada', 'picado', 'picada', 'pasado', 'pasada']) && !hasAny(['alimento no inocuo', 'contaminacion', 'contaminación']), reason: 'Defecto de calidad del producto' },
    { hit: hasAny(['equipo roto', 'camara no funciona', 'cámara no funciona', 'batidor roto', 'se rompe el batidor', 'sifon roto', 'sifón roto', 'se rompe sifon', 'se rompe sifón', 'bacha rota', 'mantenimiento']) && !inocuidadSignals.some((signal) => signal.hit), reason: 'Falla de equipo/mantenimiento sin riesgo claro de inocuidad' }
  ];

  const priority = [
    { category: 'Desvío Legal', signals: legalSignals, confidence: 0.94 },
    { category: 'Desvío de Inocuidad', signals: inocuidadSignals, confidence: 0.95 },
    { category: 'Desvío de Logística', signals: logisticaSignals, confidence: 0.92 },
    { category: 'Desvío de Calidad', signals: calidadSignals, confidence: 0.9 }
  ];

  for (const group of priority) {
    const match = group.signals.find((signal) => signal.hit);
    if (match) {
      return { area: group.category, reason: match.reason, confidence: group.confidence };
    }
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
    return { area: 'Revisar manualmente', reason: 'Desvío sin contexto concluyente; requiere análisis manual', confidence: 0.45 };
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
