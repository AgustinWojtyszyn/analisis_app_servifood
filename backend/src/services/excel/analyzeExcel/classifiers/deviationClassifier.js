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
      confidence: 0.91,
      entries: [
        ['falta de entrega', 'faltaron', 'falta aceite', 'falta de aceite', 'falta aceite de oliva', 'falta postre', 'falta producto'],
        ['no se envia', 'no se envía', 'no se envio', 'no se envió', 'no trajo pedido', 'no trajo el pedido'],
        ['segunda movilidad', 'despacho', 'entrega', 'tardanza', 'tardanzas', 'movilidad', 'recorrido', 'distribucion', 'distribución', 'enviar', 'se envía', 'sale tarde', 'llega tarde'],
        ['no sale', 'no salio', 'no salió']
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
      confidence: 0.88,
      entries: [
        ['no fresco', 'no fresca', 'no estaba fresca', 'fresca', 'chicas y verdes', 'exceso de grasa', 'mal estado'],
        ['sabor', 'textura', 'presentacion', 'presentación', 'producto pasado', 'fruta pasada', 'calidad del producto', 'quemado', 'quemada', 'se queman', 'pasadas de peso', 'gramaje', 'peso']
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
