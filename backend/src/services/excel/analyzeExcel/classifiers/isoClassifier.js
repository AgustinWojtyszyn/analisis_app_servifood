import { normalizeCellValue, normalizeIncidentText, containsAny } from '../../../analyzeExcel/normalizers.js';
import {
  classifyNormalizedRule,
  classifyPriorityOperationalRule,
  classifyTechnicalControlRule,
  isExplicitNoFindingText
} from './outcomeClassifier.js';

const ISO_RULES = [
  {
    requirement: '8.5 Control de peligros / HACCP / OPRP / PCC',
    keywords: ['haccp', 'oprp', 'pcc', 'peligro', 'limite critico', 'punto critico', 'inocuidad', 'temperatura']
  },
  {
    requirement: '8.9 Control de no conformidades de producto/proceso',
    keywords: ['no conformidad', 'desvio', 'producto en mal estado', 'rechazo', 'segregacion', 'bloqueo de lote']
  },
  {
    requirement: '9.1 Seguimiento, medicion, analisis y evaluacion',
    keywords: ['seguimiento', 'medicion', 'indicador', 'analisis', 'evaluacion', 'control']
  },
  {
    requirement: '9.2 Auditoria interna',
    keywords: ['auditoria interna', 'auditoria', 'hallazgo de auditoria']
  },
  {
    requirement: '10.2 No conformidad y accion correctiva',
    keywords: ['accion correctiva', 'ac', 'correccion', 'causa raiz', 'plan de accion', 'cerrar accion']
  },
  {
    requirement: '7.2 Competencia / capacitacion',
    keywords: ['capacitacion', 'entrenamiento', 'competencia', 'induccion']
  },
  {
    requirement: '7.5 Informacion documentada',
    keywords: ['registro', 'documentacion', 'procedimiento', 'instructivo', 'formulario', 'completar registro']
  },
  {
    requirement: '8.2 Programas prerrequisito / POES / BPM',
    keywords: ['poes', 'bpm', 'limpieza', 'higiene', 'desinfeccion', 'prerrequisito']
  },
  {
    requirement: '8.4 Control de proveedores externos',
    keywords: ['proveedor', 'externo', 'homologacion', 'evaluacion de proveedor', 'materia prima']
  }
];

const HACCP_SAFETY_TERMS = [
  'decomiso', 'decomisa', 'decomisar', 'vida util', 'vida útil', 'fuera de vida util', 'fuera de vida útil', 'vencido', 'vencida', 'vencimiento',
  'contaminacion', 'contaminación', 'bichos', 'plagas', 'insectos', 'gusanos',
  'podrido', 'podrida', 'no apto', 'producto no apto', 'alimento no apto',
  'fuera de temperatura', 'temperatura insegura',
  'riesgo sanitario', 'riesgo para el consumidor', 'peligro alimentario'
];

const PRP_HYGIENE_TERMS = [
  'falta de higiene', 'higiene', 'suciedad', 'sucio', 'sucia', 'desinfeccion deficiente',
  'desinfección deficiente', 'desinfeccion', 'desinfección', 'limpieza', 'sin limpiar'
];

const OPERATIONAL_QUALITY_TERMS = [
  'apariencia no fresca', 'no tiene apariencia de fresco', 'no parece fresco', 'aspecto no fresco',
  'aspecto visual', 'producto visualmente malo', 'frescura visual', 'madurez visual',
  'presentacion', 'presentación', 'presentacion deficiente', 'presentación deficiente',
  'textura', 'sabor',
  'no respetar receta', 'receta incorrecta', 'incumplimiento de receta',
  'unidades de mas', 'unidades de más', 'unidades de menos',
  'porciones de mas', 'porciones de más', 'porciones de menos',
  'gramaje', 'gramaje incorrecto', 'error de emplatado', 'incumplimiento de especificacion', 'incumplimiento de especificación'
];

const OPERATIONAL_COOKING_TERMS = [
  'coccion', 'cocción', 'proceso de coccion', 'proceso de cocción',
  'carne dura', 'carne rigida', 'carne rígida', 'horno',
  'temperatura de coccion', 'temperatura de cocción'
];

const OPERATIONAL_PLANNING_TERMS = [
  'demora', 'demoras', 'tarde', 'entrega tarde', 'entregas tarde',
  'faltante de personal', 'falta de personal', 'reubicacion de personal', 'reubicación de personal',
  're organizar al personal', 're organizar personal', 'reorganizar al personal', 'reorganizar personal',
  'prioridades operativas', 'prioridad operativa',
  'definir prioridades', 'prioridades para evitar reclamos',
  'planificacion de menu', 'planificación de menú', 'planificacion del menu', 'planificación del menú',
  'se planifica la semana', 'planifica la semana',
  'falta de variedad de postres', 'variedad de postres',
  'envio repetido de postres', 'envío repetido de postres', 'postre toda la semana',
  'refrigerio salio tarde', 'refrigerio salio', 'refrigerio salió tarde',
  'menu toda la semana', 'menú toda la semana'
];

const DEFAULT_ISO_CATALOG = [
  '8.4 Control de procesos, productos o servicios provistos externamente',
  ...ISO_RULES.map((rule) => rule.requirement),
  '8.1 Planificación y control operacional',
  '8.2 PRP',
  '8.5 HACCP',
  '8.5.1 Control operacional',
  '7.1 Recursos',
  '7.2 Competencia',
  '7.5 Información documentada',
  '9.2 Auditoría interna',
  '10.2 Acción correctiva',
  'Revisar manualmente'
];

function extractIsoCatalogText(entry = {}) {
  if (typeof entry === 'string' || typeof entry === 'number') return normalizeCellValue(entry).trim();
  if (!entry || typeof entry !== 'object') return '';
  const code = normalizeCellValue(
    entry.code
      || entry.codigo
      || entry.clause
      || entry.clausula
      || entry.iso
      || entry.requirementCode
  ).trim();
  const description = normalizeCellValue(
    entry.description
      || entry.descripcion
      || entry.name
      || entry.nombre
      || entry.title
      || entry.titulo
      || entry.requirement
      || entry.requisito
      || entry.label
  ).trim();
  return [code, description].filter(Boolean).join(' ').trim();
}

function getIsoClauseCode(value = '') {
  const text = normalizeCellValue(value).trim();
  const match = text.match(/^(\d+(?:\.\d+){0,2})(?!\.\d)\b/);
  return match ? match[1] : '';
}

function findIsoCatalogEntry(clauseCode = '', isoCatalog = DEFAULT_ISO_CATALOG) {
  const expected = normalizeCellValue(clauseCode).trim();
  if (!expected) return null;
  const entries = Array.isArray(isoCatalog) ? isoCatalog : DEFAULT_ISO_CATALOG;
  for (const entry of entries) {
    const text = extractIsoCatalogText(entry);
    if (!text) continue;
    if (getIsoClauseCode(text) === expected) return text;
  }
  return null;
}

function isIsoClauseAvailable(clauseCode = '', isoCatalog = DEFAULT_ISO_CATALOG) {
  return Boolean(findIsoCatalogEntry(clauseCode, isoCatalog));
}

function selectIsoClauseFromCatalog({ preferredClause, fallbackClause, isoCatalog = DEFAULT_ISO_CATALOG } = {}) {
  const preferred = findIsoCatalogEntry(preferredClause, isoCatalog);
  if (preferred) {
    return {
      iso: preferred,
      selectedClause: preferredClause,
      fallbackUsed: false,
      fallbackReason: null
    };
  }

  const fallback = findIsoCatalogEntry(fallbackClause, isoCatalog);
  if (fallback) {
    return {
      iso: fallback,
      selectedClause: fallbackClause,
      fallbackUsed: true,
      fallbackReason: `${preferredClause}_not_available_in_active_catalog`
    };
  }

  return {
    iso: 'Revisar manualmente',
    selectedClause: null,
    fallbackUsed: true,
    fallbackReason: `${preferredClause}_and_${fallbackClause}_not_available_in_active_catalog`
  };
}

function detectSupplierFruitIsoSignal({
  descripcionDetectada = '',
  actividadRealizada = '',
  areaClasificada = '',
  extraText = ''
} = {}) {
  const text = normalizeIncidentText([descripcionDetectada, actividadRealizada, areaClasificada, extraText].filter(Boolean).join(' | '));
  if (!text) return { matched: false, signals: [] };

  const hasAny = (terms = []) => terms.some((term) => text.includes(normalizeIncidentText(term)));
  const supplierSignals = [];
  const fruitSignals = [];
  const defectSignals = [];

  if (hasAny(['proveedor', 'proveedores', 'reclamo al proveedor', 'reclamo proveedor', 'devuelve al proveedor', 'devolucion al proveedor', 'devolución al proveedor'])) {
    supplierSignals.push('supplier');
  }
  if (hasAny(['recepcion', 'recepción', 'control de proveedor', 'control proveedor', 'producto recibido', 'pedido recibido', 'mercaderia', 'mercadería', 'materia prima', 'insumo'])) {
    supplierSignals.push('receiving_or_input');
  }
  if (hasAny(['fruta', 'frutas'])) fruitSignals.push('fruit');
  if (hasAny(['manzana', 'manzanas'])) fruitSignals.push('apple');
  if (hasAny(['verde', 'verdes'])) defectSignals.push('green');
  if (hasAny(['chica', 'chicas', 'chico', 'chicos', 'calibre', 'tamaño', 'tamano', 'pequeña', 'pequeñas', 'pequena', 'pequenas'])) {
    defectSignals.push('size_or_caliber');
  }
  if (hasAny(['decomiso', 'decomisa', 'decomisar', 'fuera de refrigeracion', 'fuera de refrigeración', 'temperatura critica', 'temperatura crítica', 'contaminacion interna', 'contaminación interna'])) {
    return { matched: false, signals: ['critical_internal_safety'] };
  }

  // Priority: supplier/receiving + fruit/apple, or explicit apple + quality defect.
  // This sits before generic quality/operational 8.5.1 rules, while critical safety signals above block it.
  const supplierWithFruit = supplierSignals.length > 0 && fruitSignals.length > 0;
  const appleWithDefect = fruitSignals.includes('apple') && defectSignals.length > 0;
  const matched = supplierWithFruit || appleWithDefect;
  return {
    matched,
    signals: [...new Set([...supplierSignals, ...fruitSignals, ...defectSignals])]
  };
}

function resolveSupplierFruitIsoRule(input = {}, options = {}) {
  const detected = detectSupplierFruitIsoSignal(input);
  if (!detected.matched) return null;
  const selected = selectIsoClauseFromCatalog({
    preferredClause: '8.4',
    fallbackClause: '8.5.1',
    isoCatalog: options.isoCatalog
  });
  return {
    iso: selected.iso,
    matchedRule: 'supplier_fruit_iso',
    decisionReason: selected.fallbackUsed
      ? selected.fallbackReason
      : 'supplier_fruit_business_rule',
    supplierFruitSignals: detected.signals,
    preferredClause: '8.4',
    selectedClause: selected.selectedClause,
    fallbackUsed: selected.fallbackUsed,
    fallbackReason: selected.fallbackReason
  };
}

function classifyIso22000FromDescription(
  { descripcionDetectada, actividadRealizada, areaClasificada, resultadoClasificado, isoCatalog = DEFAULT_ISO_CATALOG }
) {
  const text = normalizeIncidentText([descripcionDetectada, actividadRealizada, areaClasificada].join(' | '));
  if (!text) return 'Revisar manualmente';

  const supplierFruitRule = resolveSupplierFruitIsoRule({ descripcionDetectada, actividadRealizada, areaClasificada }, { isoCatalog });
  if (supplierFruitRule) return supplierFruitRule.iso;

  const normalizedRule = classifyNormalizedRule(text);
  if (normalizedRule) return normalizedRule.iso22000;

  const priorityOperationalRule = classifyPriorityOperationalRule(text);
  if (priorityOperationalRule) return priorityOperationalRule.iso22000;

  const technicalControlRule = classifyTechnicalControlRule(text);
  if (technicalControlRule) return technicalControlRule.iso22000;

  if (containsAny(text, OPERATIONAL_COOKING_TERMS)) return '8.5.1 Control operacional';
  if (containsAny(text, OPERATIONAL_PLANNING_TERMS)) return '8.1 Planificación y control operacional';

  if (containsAny(text, HACCP_SAFETY_TERMS)) return '8.5 HACCP';
  if (containsAny(text, PRP_HYGIENE_TERMS)) return '8.2 PRP';
  if (containsAny(text, OPERATIONAL_QUALITY_TERMS)) return '8.5.1 Control operacional';

  if (containsAny(text, ['capacitacion', 'curso', 'formacion'])) return '7.2 Competencia / capacitación';
  if (containsAny(text, ['drive', 'documentacion', 'documentación', 'respaldo', 'informacion disponible', 'información disponible'])) return '7.5 Información documentada';
  if (containsAny(text, ['falta de personal', 'falto personal', 'faltó personal', 'ausencia de personal', 'sin personal'])) return '7.1 Recursos';
  if (containsAny(text, ['mal estado', 'ensalada', 'ensaladas', 'tomate'])) return '8.5 Control de peligros / HACCP / OPRP / PCC';
  if (containsAny(text, ['agua caliente', 'bachas', 'sanitiza', 'sanitizacion'])) return '8.2 Programas prerrequisito / POES / BPM';
  if (containsAny(text, ['equipo fallando', 'robocoupe fallando', 'no funciona equipo'])) return '7.1 Recursos';
  if (containsAny(text, ['cebos', 'plagas', 'exterior'])) return '8.2 Programas prerrequisito / POES / BPM';
  if (containsAny(text, ['no conformidad', 'accion correctiva'])) return '10.2 No conformidad y accion correctiva';
  if (containsAny(text, ['auditoria'])) return '9.2 Auditoría interna';
  if (isExplicitNoFindingText(text)) return '-';
  if (containsAny(text, ['registro', 'planilla', 'documentacion', 'drive'])) return '7.5 Información documentada';
  if (containsAny(text, ['proveedor', 'proveedores'])) return '8.4 Control de procesos, productos y servicios externos';
  if (containsAny(text, ['epp', 'recursos'])) return '7.1 Recursos';
  if (containsAny(text, ['limpieza', 'poes', 'bpm', 'plagas'])) return '8.2 Programas prerrequisito / POES / BPM';
  if (containsAny(text, ['camara', 'temperatura', 'conservacion'])) return '8.5 Control de peligros / HACCP / OPRP / PCC';
  if (resultadoClasificado === 'No conforme') return 'Revisar manualmente';
  return 'Revisar manualmente';
}

const COMPOSITE_ISO_ORDER = [
  '7.2 Competencia',
  '7.3 Toma de conciencia',
  '7.5 Información documentada',
  'CAA Art. 21',
  '8.5.2 Trazabilidad',
  '8.2 PRP Limpieza',
  '8.2 PRP Manejo residuos',
  '8.7 Control de salidas no conformes',
  '8.5.1 Control operacional'
];

function splitIsoLabels(value = '') {
  return normalizeCellValue(value)
    .split(/\s\/\s/)
    .map((part) => normalizeCellValue(part).trim())
    .filter(Boolean);
}

function canonicalizeIsoLabel(label = '') {
  const raw = normalizeCellValue(label).trim();
  const norm = normalizeIncidentText(raw);
  if (!norm) return '';
  if (norm === 'capacitacion' || norm === 'revisar manualmente' || norm === 'poes' || norm === 'bpm') return '';
  if (norm === 'requisito legal' || norm === 'documentacion legal') return '';
  if (norm.includes('7.2 competencia')) return '7.2 Competencia';
  if (norm.includes('7.3 toma de conciencia')) return '7.3 Toma de conciencia';
  if (norm.includes('7.5 informacion documentada')) return '7.5 Información documentada';
  if (norm.includes('caa art 21')) return 'CAA Art. 21';
  if (norm.includes('8.2 programas prerrequisito')) return '';
  return raw;
}

function hasAnyIsoTerm(text, terms = []) {
  return terms.some((term) => text.includes(normalizeIncidentText(term)));
}

function detectCompositeIsoFromText(text = '') {
  const normalized = normalizeIncidentText(text);
  if (!normalized || isExplicitNoFindingText(normalized)) return [];

  const detected = new Set();

  const hasCompetenciaLegal = hasAnyIsoTerm(normalized, [
    'carnet de manipulador', 'carne de manipulador', 'manipulador de alimentos', 'carnet sanitario', 'libreta sanitaria', 'carnet vencido', 'carnet faltante', 'sin carnet', 'no presenta carnet', 'personal sin carnet'
  ]);
  if (hasCompetenciaLegal) {
    detected.add('7.2 Competencia');
    detected.add('CAA Art. 21');
  }

  const hasConcienciaCapacitacion = hasAnyIsoTerm(normalized, [
    'capacitacion', 'capacitaciones', 'personal no capacitado', 'falta de capacitacion', 'capacitacion vencida', 'capacitacion desactualizada', 'bpm', 'buenas practicas de manufactura', 'poe', 'poes', 'procedimiento operativo estandarizado', 'toma de conciencia', 'induccion', 'entrenamiento'
  ]);
  if (hasConcienciaCapacitacion) {
    detected.add('7.3 Toma de conciencia');
    detected.add('7.2 Competencia');
  }

  const hasInformacionDocumentada = hasAnyIsoTerm(normalized, [
    'procedimiento documentado', 'falta procedimiento', 'falta de procedimiento', 'procedimiento inexistente', 'procedimiento desactualizado', 'documentacion desactualizada', 'informacion documentada', 'registros incompletos', 'registros ausentes', 'falta de registros', 'control de versiones', 'version desactualizada', 'documento sin actualizar', 'planilla incompleta', 'evidencia documental', 'sin evidencia documental'
  ]);
  if (hasInformacionDocumentada) detected.add('7.5 Información documentada');

  if (hasAnyIsoTerm(normalized, [
    'falta de rotulo', 'falta rotulo', 'rotulacion', 'rotulacion en general', 'sin rotular', 'alimento sin rotular', 'alimentos sin rotular', 'producto sin rotular', 'identificacion', 'identificar'
  ])) detected.add('8.5.2 Trazabilidad');

  if (hasAnyIsoTerm(normalized, [
    'suciedad', 'sucio', 'sucia', 'sucios', 'sucias', 'limpio', 'limpia', 'limpios', 'limpias', 'limpieza', 'restos de alimentos', 'piso sucio', 'instalaciones sucias', 'sector sucio'
  ])) detected.add('8.2 PRP Limpieza');

  if (hasAnyIsoTerm(normalized, [
    'residuos', 'basura', 'sector residuos', 'cesto', 'cestos', 'contenedor', 'contenedores'
  ])) detected.add('8.2 PRP Manejo residuos');

  if (hasAnyIsoTerm(normalized, [
    'producto no conforme', 'producto nc', 'carteleria de producto no conforme', 'identificacion de producto no conforme'
  ])) detected.add('8.7 Control de salidas no conformes');

  if (hasAnyIsoTerm(normalized, [
    'faltante de menu', 'faltaron menu', 'faltante de viandas', 'error de entrega', 'cantidad incorrecta', 'entrega incompleta'
  ])) detected.add('8.5.1 Control operacional');

  if (normalized.includes('faltaron') && normalized.includes('menu')) detected.add('8.5.1 Control operacional');

  return COMPOSITE_ISO_ORDER.filter((iso) => detected.has(iso));
}

function mergeCompositeIsoLabels(
  { iso22000 = '', hallazgoDetectado = '', actividadRealizada = '', areaClasificada = '' }
) {
  const text = normalizeIncidentText([hallazgoDetectado, actividadRealizada, areaClasificada].filter(Boolean).join(' | '));
  if (!text || isExplicitNoFindingText(text)) {
    return normalizeCellValue(iso22000).trim() || 'Revisar manualmente';
  }

  const existingLabels = splitIsoLabels(iso22000).map(canonicalizeIsoLabel).filter(Boolean);
  const detectedLabels = detectCompositeIsoFromText(text);
  if (detectedLabels.length === 0) return normalizeCellValue(iso22000).trim() || 'Revisar manualmente';

  const existingNormMap = new Map();
  existingLabels.forEach((label) => {
    const norm = normalizeIncidentText(canonicalizeIsoLabel(label));
    if (!existingNormMap.has(norm)) existingNormMap.set(norm, label);
  });

  const preferredNormSet = new Set(COMPOSITE_ISO_ORDER.map((label) => normalizeIncidentText(label)));
  const result = [];
  const pushUnique = (label) => {
    const norm = normalizeIncidentText(label);
    if (!norm) return;
    if (result.some((item) => normalizeIncidentText(item) === norm)) return;
    result.push(label);
  };

  existingLabels
    .filter((label) => !preferredNormSet.has(normalizeIncidentText(label)))
    .forEach(pushUnique);

  COMPOSITE_ISO_ORDER.forEach((preferredIso) => {
    const preferredNorm = normalizeIncidentText(preferredIso);
    const presentInExisting = existingNormMap.has(preferredNorm);
    const presentInDetected = detectedLabels.some((iso) => normalizeIncidentText(iso) === preferredNorm);
    if (presentInExisting || presentInDetected) pushUnique(preferredIso);
  });

  if (result.length === 0) return normalizeCellValue(iso22000).trim() || 'Revisar manualmente';
  return result.join(' / ');
}

function resolveIsoWithContextFallback({ iso22000, hallazgoDetectado, actividadRealizada, areaClasificada, resultadoClasificado }) {
  const text = normalizeIncidentText([hallazgoDetectado, actividadRealizada, areaClasificada].join(' | '));
  if (containsAny(text, HACCP_SAFETY_TERMS)) return '8.5 HACCP';
  if (normalizeCellValue(iso22000).trim() === '-') return '-';
  if (normalizeIncidentText(iso22000) && normalizeIncidentText(iso22000) !== 'revisar manualmente') return iso22000;
  if (!text) return 'Revisar manualmente';
  if (containsAny(text, OPERATIONAL_COOKING_TERMS)) return '8.5.1 Control operacional';
  if (containsAny(text, OPERATIONAL_PLANNING_TERMS)) return '8.1 Planificación y control operacional';
  if (containsAny(text, PRP_HYGIENE_TERMS)) return '8.2 PRP';
  if (containsAny(text, OPERATIONAL_QUALITY_TERMS)) return '8.5.1 Control operacional';
  if (containsAny(text, ['capacitacion', 'curso', 'formacion'])) return '7.2 Competencia / capacitación';
  if (containsAny(text, ['drive', 'documentacion', 'documentación', 'respaldo', 'informacion disponible', 'información disponible', 'registro', 'planilla'])) {
    return '7.5 Información documentada';
  }
  if (containsAny(text, ['falta de personal', 'falto personal', 'faltó personal', 'ausencia de personal', 'sin personal'])) return '7.1 Recursos';
  if (containsAny(text, ['equipo fallando', 'robocoupe fallando', 'no funciona equipo', 'no funciona', 'fallando'])) return '7.1 Recursos';
  if (containsAny(text, ['sucio', 'suciedad', 'sin limpiar', 'limpieza', 'agua caliente', 'bachas', 'sanitiza', 'sanitizacion', 'plagas', 'cebos', 'cucarachas'])) {
    return '8.2 Programas prerrequisito / POES / BPM';
  }
  return 'Revisar manualmente';
}

export {
  ISO_RULES,
  COMPOSITE_ISO_ORDER,
  DEFAULT_ISO_CATALOG,
  extractIsoCatalogText,
  getIsoClauseCode,
  findIsoCatalogEntry,
  isIsoClauseAvailable,
  selectIsoClauseFromCatalog,
  detectSupplierFruitIsoSignal,
  resolveSupplierFruitIsoRule,
  classifyIso22000FromDescription,
  splitIsoLabels,
  canonicalizeIsoLabel,
  hasAnyIsoTerm,
  detectCompositeIsoFromText,
  mergeCompositeIsoLabels,
  resolveIsoWithContextFallback
};
