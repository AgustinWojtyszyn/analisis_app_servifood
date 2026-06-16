import { normalizeIncidentText, containsAny } from '../../../analyzeExcel/normalizers.js';

const CATEGORY = {
  INOCUIDAD: 'Inocuidad',
  MANTENIMIENTO: 'Mantenimiento',
  RRHH: 'Recursos Humanos',
  LOGISTICA: 'Logística',
  LEGALES: 'Legales',
  CALIDAD: 'Calidad',
  MANUAL: 'Revisar manualmente'
};

const CLASSIFIER_BUILD_TS = '2026-05-11T00:00:00Z';
if (process.env.DEVIATION_CLASSIFIER_DEBUG === '1') {
  console.log('[CLASSIFIER ACTIVE]', {
    module: 'deviationClassifier.js',
    buildTs: CLASSIFIER_BUILD_TS,
    loadedAt: new Date().toISOString(),
    pid: process.pid
  });
}

function buildText({ text = '', area = '', immediateAction = '', correctiveAction = '', iso = '' } = {}) {
  return normalizeIncidentText([text, area, immediateAction, correctiveAction, iso].filter(Boolean).join(' | '));
}

export function classifyDeviation(text = '', area = '', immediateAction = '', correctiveAction = '', iso = '') {
  const combined = buildText({ text, area, immediateAction, correctiveAction, iso });
  const debugEnabled = process.env.DEVIATION_CLASSIFIER_DEBUG === '1';
  const hasAny = (terms) => containsAny(combined, terms);
  const countMatches = (terms = []) => terms.filter((term) => hasAny([term])).length;

  const logisticTerms = [
    'segunda movilidad', 'movilidad', 'despacho', 'entrega', 'entregar', 'envio', 'envío', 'enviar',
    'falta producto', 'falta postre', 'falta bebidas', 'falta mercaderia', 'falta mercadería',
    'demora', 'demoras', 'tardanza', 'tardanzas', 'recorrido', 'reposicion', 'reposición',
    'faltante', 'transporte', 'chofer', 'camion', 'camión', 'no llega a tiempo', 'entrega tarde',
    'logistica', 'logística', 'cucharitas descartables', 'no llegan', 'no se envia fruta', 'no se envía fruta'
  ];
  const logisticBoostPhrases = [
    'segunda movilidad',
    'control de despacho',
    'no se envia',
    'no se enviaron',
    'falta de envio',
    'falta de envío',
    'entrega tarde',
    'llega tarde',
    'falta producto',
    'falta postre',
    'falta aceite',
    'movilidad inmediata',
    'demora del camion',
    'demora del camión',
    'recorrido',
    'redistribucion',
    'redistribución'
  ];
  const qualityTerms = [
    'carne rigida', 'carne rígida', 'falta dorado', 'poco cocido', 'sobre cocido', 'textura', 'sabor',
    'consistencia', 'presentacion', 'presentación', 'producto duro', 'comida fria', 'comida fría',
    'producto quemado', 'producto seco', 'mala calidad', 'calidad del producto', 'aspecto del producto', 'producto visualmente malo',
    'problema visual', 'presentacion del producto', 'presentación del producto', 'aspecto visual', 'fruta pasada de madurez'
  ];
  const qualityVisualTerms = [
    'tomates picados', 'tomate picado', 'picados', 'picado', 'picada', 'apariencia no fresca', 'fruta pasada', 'madurez', 'fresco', 'fresca', 'oxidado', 'oxidada', 'aspecto del producto'
  ];
  const qualityPriorityTerms = [
    'tomates picados', 'tomate picado', 'picados', 'picado', 'picada',
    'apariencia no fresca', 'no tiene apariencia de fresco', 'no parece fresco', 'aspecto no fresco',
    'aspecto del producto', 'producto visualmente malo', 'textura', 'sabor',
    'mala presentacion', 'mala presentación', 'presentacion', 'presentación', 'presentacion deficiente', 'presentación deficiente', 'frescura', 'frescura visual',
    'cantidad incorrecta', 'cantidad insuficiente', 'cantidad excesiva',
    'unidades incorrectas', 'unidades de mas', 'unidades de más', 'unidades de menos',
    'porciones de mas', 'porciones de más', 'porciones de menos', 'pasadas en unidades',
    'gramaje', 'gramaje incorrecto',
    'armado incorrecto de viandas', 'armado incorrecto', 'error de emplatado',
    'no respetar la receta', 'no se respeta la receta', 'receta incorrecta',
    'preparacion incorrecta', 'preparación incorrecta', 'ingredientes incorrectos',
    'incumplimiento de receta', 'error de preparacion', 'error de preparación',
    'error de armado', 'incumplimiento de especificacion del producto final',
    'problema de presentacion', 'problema de presentación',
    'incumplimiento de especificacion', 'incumplimiento de especificación',
    'exceso de componentes', 'falta de componentes'
  ];
  const inocuidadStrongTerms = [
    'higiene', 'desinfeccion', 'desinfección', 'refrigeracion', 'refrigeración', 'sin etiquetar',
    'contaminacion', 'contaminación', 'bpm', 'prp', 'haccp', 'trazabilidad', 'fuera de refrigeracion', 'fuera de refrigeración',
    'bichos', 'insectos', 'gusanos'
  ];
  const inocuidadCriticalTerms = [
    'higiene', 'sucio', 'sucia', 'suciedad', 'contaminacion', 'contaminación',
    'refrigeracion', 'refrigeración', 'fuera de temperatura', 'fuera de refrigeracion', 'fuera de refrigeración',
    'sin etiquetar', 'trazabilidad', 'bpm', 'prp', 'haccp', 'desinfeccion', 'desinfección',
    'bichos', 'insectos', 'gusanos', 'vencido', 'vencida', 'vencimiento',
    'podrido', 'podrida', 'no apto', 'producto no apto', 'alimento no apto',
    'vida util vencida', 'vida útil vencida', 'vida util', 'vida útil', 'fuera de vida util', 'fuera de vida útil',
    'decomiso', 'decomisa', 'decomisar', 'riesgo sanitario',
    'riesgo para el consumidor', 'peligro alimentario'
  ];
  const rrhhPriorityTerms = [
    'no asiste', 'no asistio', 'no asistió', 'ausencia', 'ausenta', 'falta personal', 'falta el personal',
    'llamado de atencion', 'llamado de atención', 'sancion', 'sanción', 'suspension', 'suspensión',
    'tardanza del personal', 'personal llega tarde', 'personal de lavadero'
  ];

  // Tuning final: scoring acumulativo real para Logística/Calidad.
  const logisticHits = countMatches(logisticTerms);
  const logisticBoostHits = countMatches(logisticBoostPhrases);
  const qualityHits = countMatches(qualityTerms);
  const qualityVisualHits = countMatches(qualityVisualTerms);
  const qualityPriorityHits = countMatches(qualityPriorityTerms);
  const inocuidadStrongHits = countMatches(inocuidadStrongTerms);
  const inocuidadCriticalHits = countMatches(inocuidadCriticalTerms);
  const rrhhPriorityHits = countMatches(rrhhPriorityTerms);

  const logisticsScore = (logisticHits * 1.4) + (logisticBoostHits * 4.0);
  const qualityScore = (qualityHits * 1.7) + (qualityVisualHits * 3.0);
  const scoring = {
    logisticsScore,
    qualityScore,
    inocuidadStrongHits,
    inocuidadCriticalHits,
    qualityPriorityHits,
    rrhhPriorityHits,
    logisticHits,
    logisticBoostHits,
    qualityHits,
    qualityVisualHits
  };

  if (rrhhPriorityHits >= 1) {
    return {
      clasificacion: CATEGORY.RRHH,
      confidence: 0.93,
      matchedRules: rrhhPriorityTerms.filter((k) => hasAny([k]))
    };
  }

  // Prioridad semántica: calidad perceptual/comercial por encima de inocuidad,
  // salvo que haya señal sanitaria crítica explícita.
  if (qualityPriorityHits >= 1 && inocuidadCriticalHits === 0) {
    const matched = [
      ...qualityPriorityTerms.filter((k) => hasAny([k])),
      ...qualityTerms.filter((k) => hasAny([k])),
      ...qualityVisualTerms.filter((k) => hasAny([k]))
    ];
    return { clasificacion: CATEGORY.CALIDAD, confidence: 0.9, matchedRules: [...new Set(matched)] };
  }

  if (logisticsScore >= 5 && inocuidadStrongHits === 0) {
    const matched = [
      ...logisticTerms.filter((k) => hasAny([k])),
      ...logisticBoostPhrases.filter((k) => hasAny([k]))
    ];
    return { clasificacion: CATEGORY.LOGISTICA, confidence: 0.9, matchedRules: [...new Set(matched)] };
  }
  if (qualityScore >= 4 && inocuidadStrongHits === 0 && inocuidadCriticalHits === 0) {
    const matched = [
      ...qualityTerms.filter((k) => hasAny([k])),
      ...qualityVisualTerms.filter((k) => hasAny([k]))
    ];
    return { clasificacion: CATEGORY.CALIDAD, confidence: 0.86, matchedRules: [...new Set(matched)] };
  }
  if (qualityVisualHits >= 1 && inocuidadStrongHits === 0 && inocuidadCriticalHits === 0) {
    return {
      clasificacion: CATEGORY.CALIDAD,
      confidence: 0.84,
      matchedRules: qualityVisualTerms.filter((k) => hasAny([k]))
    };
  }

  const rules = [
    {
      category: CATEGORY.INOCUIDAD,
      confidence: 0.95,
      entries: [
        ['higiene', 'limpiar', 'limpieza', 'desinfectar', 'desinfeccion', 'desinfección', 'sucio', 'sucia', 'sucias', 'sucios', 'platina', 'platinas', 'meson', 'mesón', 'mesones'],
        ['contaminacion', 'contaminación', 'refrigeracion', 'refrigeración', 'fuera de refrigeracion', 'fuera de refrigeración', 'sin etiquetar', 'etiqueta', 'etiquetado', 'pelo', 'bichos', 'insectos', 'gusanos'],
        ['vencimiento', 'vencido', 'vencida', 'podrido', 'podrida', 'no apto', 'producto no apto', 'alimento no apto', 'vida util', 'vida útil', 'fuera de vida util', 'fuera de vida útil', 'vida util vencida', 'vida útil vencida', 'riesgo sanitario', 'riesgo para el consumidor', 'peligro alimentario', 'trazabilidad', 'bpm', 'manipulacion', 'manipulación', 'decomisa', 'decomiso', 'decomisar', 'haccp', 'prp'],
        ['coccion', 'cocción', 'crudo', 'sin sanitizar', 'sanitizacion', 'sanitización', 'contaminado', 'alergenos', 'alérgenos']
      ]
    },
    {
      category: CATEGORY.MANTENIMIENTO,
      confidence: 0.93,
      entries: [
        ['rompe', 'roto', 'rota', 'deja de funcionar', 'no funciona', 'falla', 'averia', 'avería'],
        ['batidora', 'horno', 'calefon', 'calefón', 'maquina', 'máquina', 'maquinaria', 'equipo', 'mantenimiento'],
        ['movilidad dañada', 'movilidad rota', 'se rompe una movilidad', 'se rompe movilidad']
      ]
    },
    {
      category: CATEGORY.RRHH,
      confidence: 0.92,
      entries: [
        ['ausenta', 'ausencia', 'falta personal', 'falta el personal', 'personal de lavadero'],
        ['llamado de atencion', 'llamado de atención', 'sancion', 'sanción', 'responsable', 'reorganiza personal', 'conflicto laboral']
      ]
    },
    {
      category: CATEGORY.LOGISTICA,
      confidence: 0.82,
      entries: [
        ['falta de entrega', 'faltaron', 'falta aceite', 'falta de aceite', 'falta aceite de oliva', 'falta postre', 'falta producto', 'falta de bebidas', 'no hay frutas', 'sin stock', 'stock'],
        ['no se envia', 'no se envía', 'no se envio', 'no se envió', 'no trajo pedido', 'no trajo el pedido'],
        ['segunda movilidad', 'despacho', 'entrega', 'tardanza', 'tardanzas', 'movilidad', 'recorrido', 'distribucion', 'distribución', 'enviar', 'se envía', 'sale tarde', 'llega tarde'],
        ['no sale', 'no salio', 'no salió'],
        ['sale una movilidad', 'enviar nuevamente', 'no se enviaron', 'falta bebidas', 'falta mercaderia', 'falta mercadería', 'demora del camion', 'demora del camión', 'entrega tarde', 'no llega a tiempo', 'control de despacho', 'reposicion', 'reposición', 'faltante', 'envio', 'envío', 'entregar', 'demoras', 'redistribucion', 'redistribución', 'transporte', 'chofer', 'camion', 'camión']
      ]
    },
    {
      category: CATEGORY.LEGALES,
      confidence: 0.9,
      entries: [
        ['documentacion', 'documentación', 'plataformas', 'actualizacion en plataformas', 'actualización en plataformas', 'credencial', 'cubre franco'],
        ['habilitacion', 'habilitación', 'permiso', 'ingreso autorizado', 'autorizacion de ingreso', 'autorización de ingreso', 'legal', 'no dejan entrar', 'no pudo ingresar']
      ]
    },
    {
      category: CATEGORY.CALIDAD,
      confidence: 0.86,
      entries: [
        ['no fresco', 'no fresca', 'no estaba fresca', 'fresca', 'chicas y verdes', 'exceso de grasa', 'mal estado'],
        ['sabor', 'textura', 'presentacion', 'presentación', 'producto pasado', 'fruta pasada', 'calidad del producto', 'quemado', 'quemada', 'se queman', 'pasadas de peso', 'gramaje', 'peso'],
        ['carne rigida', 'carne rígida', 'rigida', 'rígida', 'falta dorado', 'poco cocido', 'sobre cocido', 'consistencia', 'producto duro', 'comida fria', 'comida fría', 'producto quemado', 'producto seco', 'mala calidad', 'aspecto del producto', 'mal sabor']
      ]
    }
  ];

  const matchedRules = [];
  for (const group of rules) {
    for (const entry of group.entries) {
      if (hasAny(entry)) {
        matchedRules.push(...entry.filter((kw) => hasAny([kw])));
        if (debugEnabled) {
          console.log('[deviation-classifier]', {
            text,
            area,
            immediateAction,
            correctiveAction,
            iso,
            normalizedText: combined,
            scoring,
            matchedRules: [...new Set(matchedRules)],
            clasificacion: group.category,
            confidence: group.confidence
          });
        }
        return {
          clasificacion: group.category,
          confidence: group.confidence,
          matchedRules: [...new Set(matchedRules)]
        };
      }
    }
  }

  // Ajuste incremental de sensibilidad: si hay señales múltiples de logística o calidad,
  // evita caer en revisión manual aunque no haya match de frase exacta de un bloque.
  if ((logisticHits + logisticBoostHits) >= 2 && (logisticHits + logisticBoostHits) >= qualityHits) {
    const matched = [
      ...logisticTerms.filter((k) => hasAny([k])),
      ...logisticBoostPhrases.filter((k) => hasAny([k]))
    ];
    const boostedConfidence = logisticBoostHits >= 1 ? 0.9 : 0.84;
    return { clasificacion: CATEGORY.LOGISTICA, confidence: boostedConfidence, matchedRules: [...new Set(matched)] };
  }
  if (qualityHits >= 2) {
    return { clasificacion: CATEGORY.CALIDAD, confidence: 0.82, matchedRules: qualityTerms.filter((k) => hasAny([k])) };
  }

  if (debugEnabled) {
    console.log('[deviation-classifier]', {
      text,
      area,
      immediateAction,
      correctiveAction,
      iso,
      normalizedText: combined,
      scoring,
      matchedRules: [],
      clasificacion: CATEGORY.MANUAL,
      confidence: 0.45
    });
  }
  return {
    clasificacion: CATEGORY.MANUAL,
    confidence: 0.45,
    matchedRules: []
  };
}

export { CATEGORY };
