import { normalizeCellValue, normalizeIncidentText, containsAny } from '../../../analyzeExcel/normalizers.js';
import { isExplicitNoFindingText } from './outcomeClassifier.js';
import { hasAnyIsoTerm, mergeCompositeIsoLabels } from './isoClassifier.js';

const CATEGORY = {
  INOCUIDAD: 'Desvío de Inocuidad',
  MANTENIMIENTO: 'Desvío de Mantenimiento',
  RRHH: 'Desvío de Recursos Humanos',
  LOGISTICA: 'Desvío de Logística',
  LEGAL: 'Desvío Legal',
  CALIDAD: 'Desvío de Calidad',
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
    return { area: CATEGORY.MANUAL, reason: 'Reclamo sin detalle técnico suficiente para clasificar', confidence: 0.4 };
  }

  const inocuidadSignals = [
    { hit: hasAny(['falta de coccion', 'falta de cocción', 'coccion', 'cocción', 'crudo', 'mal cocido', 'sin coccion', 'sin cocción']), reason: 'Riesgo por cocción insuficiente' },
    { hit: hasAny(['higiene', 'sucio', 'sucia', 'sin higiene', 'meson', 'mesones', 'platina', 'platinas', 'limpieza', 'desinfeccion', 'desinfección', 'sin sanitizar', 'sanitizacion', 'sanitización']), reason: 'Problema de higiene/limpieza' },
    { hit: hasAny(['contaminacion', 'contaminación', 'contaminacion cruzada', 'contaminación cruzada', 'pelo', 'cuerpo extrano', 'cuerpo extraño']), reason: 'Riesgo de contaminación' },
    { hit: hasAny(['sin etiquetar', 'sin rotular', 'mal rotulado', 'rotulado incorrecto', 'etiquetado']), reason: 'Falla de etiquetado/trazabilidad' },
    { hit: hasAny(['fuera de refrigeracion', 'fuera de refrigeración', 'sin refrigeracion', 'sin refrigeración', 'cadena de frio', 'cadena de frío']), reason: 'Riesgo por refrigeración/temperatura' },
    { hit: hasAny(['mal estado', 'oxidado', 'oxidada', 'picado', 'picada']) && !hasAny(['pasado de peso', 'gramaje', 'peso']), reason: 'Producto potencialmente no inocuo' },
    { hit: hasAny(['vencimiento ilegible', 'fecha de vencimiento ilegible', 'vencido', 'vencida']), reason: 'Problema de vencimiento/legibilidad' },
    { hit: hasAny(['bpm', 'prp', 'haccp', 'trazabilidad', 'manipulacion incorrecta', 'manipulación incorrecta']), reason: 'Incumplimiento de control de inocuidad' },
    { hit: tipo === 'NC' && containsAny(iso, ['8.2 prp', '8.5.2 trazabilidad', '8.7 control de salidas no conformes']), reason: 'NC vinculada a PRP/HACCP/trazabilidad' }
  ];

  const mantenimientoSignals = [
    { hit: hasAny(['se rompe', 'rotura', 'roto', 'rota', 'deja de funcionar', 'no funciona', 'falla tecnica', 'falla técnica']), reason: 'Rotura/falla de equipo' },
    { hit: hasAny(['batidora', 'batidor', 'horno', 'calefon', 'calefón', 'maquinaria', 'equipo', 'equipamiento']), reason: 'Incidente de mantenimiento en maquinaria/equipo' },
    { hit: hasAny(['movilidad rota', 'se rompe movilidad']) && !hasAny(['falta', 'faltante', 'no se envio', 'demora']), reason: 'Falla mecánica de movilidad' }
  ];

  const rrhhSignals = [
    { hit: hasAny(['se ausenta', 'ausencia', 'falta personal', 'faltas', 'licencia', 'sancion', 'sanción', 'llamado de atencion', 'llamado de atención']), reason: 'Incidente de personal/RRHH' },
    { hit: hasAny(['reorganizacion de personal', 'reorganización de personal', 'conflicto laboral', 'personal']) && hasAny(['ausente', 'ausencia', 'falta']), reason: 'Problema laboral de dotación' }
  ];

  const logisticaSignals = [
    { hit: hasAny(['faltante', 'falta de', 'faltan']) && hasAny(['pedido', 'producto', 'postre', 'aceite', 'almuerzo', 'despacho', 'entrega']), reason: 'Faltante logístico de producto/despacho' },
    { hit: hasAny(['no se envio', 'no se envió', 'no se enviaron', 'no se envia', 'no se envía', 'no trajo el pedido', 'pedido no entregado', 'no sale', 'no salio', 'no salió']), reason: 'Pedido no enviado/entregado' },
    { hit: hasAny(['entrega incompleta', 'error de despacho', 'despacho incompleto']), reason: 'Error en despacho/entrega' },
    { hit: hasAny(['tardanza', 'tardanzas', 'demora', 'llega tarde', 'salio tarde', 'salió tarde', 'sale tarde']), reason: 'Demora logística' },
    { hit: hasAny(['movilidad', 'segunda movilidad', 'distribucion', 'distribución', 'recorrido', 'transporte']) && !mantenimientoSignals.some((signal) => signal.hit), reason: 'Incidencia de distribución/transporte' },
    { hit: hasAny(['proveedor']) && hasAny(['no entrega', 'no trajo', 'faltante', 'pedido']), reason: 'Proveedor no entrega pedido' },
    { hit: hasAny(['celiaco', 'celiacos', 'sin tacc', 'dieta especial']) && hasAny(['no se envio', 'no se envió', 'faltante']), reason: 'No entrega de menú especial' }
  ];

  const legalSignals = [
    { hit: hasAny(['documentacion', 'documentación', 'permiso', 'habilitacion', 'habilitación', 'plataforma', 'credencial', 'regulatorio', 'cubre franco', 'libreta sanitaria']), reason: 'Incumplimiento documental/regulatorio' },
    { hit: hasAny(['no dejan ingresar', 'ingreso denegado', 'no pudo ingresar']) && hasAny(['documentacion', 'credencial', 'permiso', 'habilitacion', 'plataforma']), reason: 'Bloqueo de ingreso por documentación/permisos' }
  ];

  const calidadSignals = [
    { hit: hasAny(['sabor', 'insipido', 'insípido', 'presentacion', 'presentación', 'tamaño', 'tamano', 'chicas', 'chicos', 'grasa', 'quemado', 'quemada', 'queman', 'se queman']), reason: 'Afecta calidad percibida del producto' },
    { hit: hasAny(['frescura', 'fresco', 'fresca', 'no fresca', 'estado del alimento', 'manzanas chicas y verdes']), reason: 'Afecta características organolépticas del producto' },
    { hit: hasAny(['exceso de grasa', 'matambre', 'gramaje', 'peso']) && !hasAny(['fuera de refrigeracion', 'sin etiquetar', 'contaminacion']), reason: 'Desvío de calidad del alimento' }
  ];

  // Prioridad solicitada: Inocuidad > Mantenimiento > RRHH > Logística > Legales > Calidad
  const priority = [
    { category: CATEGORY.INOCUIDAD, signals: inocuidadSignals, confidence: 0.95 },
    { category: CATEGORY.MANTENIMIENTO, signals: mantenimientoSignals, confidence: 0.93 },
    { category: CATEGORY.RRHH, signals: rrhhSignals, confidence: 0.92 },
    { category: CATEGORY.LOGISTICA, signals: logisticaSignals, confidence: 0.91 },
    { category: CATEGORY.LEGAL, signals: legalSignals, confidence: 0.9 },
    { category: CATEGORY.CALIDAD, signals: calidadSignals, confidence: 0.88 }
  ];

  for (const group of priority) {
    const match = group.signals.find((signal) => signal.hit);
    if (match) {
      return { area: group.category, reason: match.reason, confidence: group.confidence };
    }
  }

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
  if (categoria === CATEGORY.LEGAL) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.LEGAL };
  if (categoria === CATEGORY.LOGISTICA) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.LOGISTICA };
  if (categoria === CATEGORY.INOCUIDAD) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.INOCUIDAD };
  if (categoria === CATEGORY.CALIDAD) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.CALIDAD };
  if (categoria === CATEGORY.MANTENIMIENTO) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.MANTENIMIENTO };
  if (categoria === CATEGORY.RRHH) return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: CATEGORY.RRHH };

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
