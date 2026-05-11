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

function buildText({ text = '', area = '', immediateAction = '', correctiveAction = '', iso = '' } = {}) {
  return normalizeIncidentText([text, area, immediateAction, correctiveAction, iso].filter(Boolean).join(' | '));
}

export function classifyDeviation(text = '', area = '', immediateAction = '', correctiveAction = '', iso = '') {
  const combined = buildText({ text, area, immediateAction, correctiveAction, iso });
  const debugEnabled = process.env.DEVIATION_CLASSIFIER_DEBUG === '1';
  const hasAny = (terms) => containsAny(combined, terms);
  const countMatches = (terms = []) => terms.filter((term) => hasAny([term])).length;

  const rules = [
    {
      category: CATEGORY.INOCUIDAD,
      confidence: 0.95,
      entries: [
        ['higiene', 'limpiar', 'limpieza', 'desinfectar', 'desinfeccion', 'desinfección', 'sucio', 'sucia', 'sucias', 'sucios', 'platina', 'platinas', 'meson', 'mesón', 'mesones'],
        ['contaminacion', 'contaminación', 'refrigeracion', 'refrigeración', 'fuera de refrigeracion', 'fuera de refrigeración', 'sin etiquetar', 'etiqueta', 'etiquetado', 'pelo'],
        ['vencimiento', 'trazabilidad', 'bpm', 'manipulacion', 'manipulación', 'decomisa', 'decomiso', 'haccp', 'prp', 'oxidado', 'oxidada', 'picado', 'picada'],
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
      confidence: 0.89,
      entries: [
        ['falta de entrega', 'faltaron', 'falta aceite', 'falta de aceite', 'falta aceite de oliva', 'falta postre', 'falta producto', 'falta de bebidas'],
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
  const logisticTerms = [
    'segunda movilidad', 'movilidad', 'despacho', 'entrega', 'entregar', 'envio', 'envío', 'enviar',
    'falta producto', 'falta postre', 'falta bebidas', 'falta mercaderia', 'falta mercadería',
    'demora', 'demoras', 'tardanza', 'tardanzas', 'recorrido', 'reposicion', 'reposición',
    'faltante', 'transporte', 'chofer', 'camion', 'camión', 'no llega a tiempo', 'entrega tarde'
  ];
  const qualityTerms = [
    'carne rigida', 'carne rígida', 'falta dorado', 'poco cocido', 'sobre cocido', 'textura', 'sabor',
    'consistencia', 'presentacion', 'presentación', 'producto duro', 'comida fria', 'comida fría',
    'producto quemado', 'producto seco', 'mala calidad', 'calidad del producto', 'aspecto del producto'
  ];
  const logisticHits = countMatches(logisticTerms);
  const qualityHits = countMatches(qualityTerms);
  if (logisticHits >= 2 && logisticHits >= qualityHits) {
    return { clasificacion: CATEGORY.LOGISTICA, confidence: 0.84, matchedRules: logisticTerms.filter((k) => hasAny([k])) };
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
