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

function classifyIso22000FromDescription(
  { descripcionDetectada, actividadRealizada, areaClasificada, resultadoClasificado }
) {
  const text = normalizeIncidentText([descripcionDetectada, actividadRealizada, areaClasificada].join(' | '));
  if (!text) return 'Revisar manualmente';

  const normalizedRule = classifyNormalizedRule(text);
  if (normalizedRule) return normalizedRule.iso22000;

  const priorityOperationalRule = classifyPriorityOperationalRule(text);
  if (priorityOperationalRule) return priorityOperationalRule.iso22000;

  const technicalControlRule = classifyTechnicalControlRule(text);
  if (technicalControlRule) return technicalControlRule.iso22000;

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
  if (normalizeCellValue(iso22000).trim() === '-') return '-';
  if (normalizeIncidentText(iso22000) && normalizeIncidentText(iso22000) !== 'revisar manualmente') return iso22000;
  const text = normalizeIncidentText([hallazgoDetectado, actividadRealizada, areaClasificada].join(' | '));
  if (!text) return 'Revisar manualmente';
  if (containsAny(text, ['capacitacion', 'curso', 'formacion'])) return '7.2 Competencia / capacitación';
  if (containsAny(text, ['drive', 'documentacion', 'documentación', 'respaldo', 'informacion disponible', 'información disponible', 'registro', 'planilla'])) {
    return '7.5 Información documentada';
  }
  if (containsAny(text, ['falta de personal', 'falto personal', 'faltó personal', 'ausencia de personal', 'sin personal'])) return '7.1 Recursos';
  if (containsAny(text, ['equipo fallando', 'robocoupe fallando', 'no funciona equipo', 'no funciona', 'fallando'])) return '7.1 Recursos';
  if (containsAny(text, ['mal estado', 'ensalada', 'ensaladas', 'tomate'])) return '8.5 Control de peligros / HACCP / OPRP / PCC';
  if (containsAny(text, ['sucio', 'suciedad', 'sin limpiar', 'limpieza', 'agua caliente', 'bachas', 'sanitiza', 'sanitizacion', 'plagas', 'cebos', 'cucarachas'])) {
    return '8.2 Programas prerrequisito / POES / BPM';
  }
  return 'Revisar manualmente';
}

export {
  ISO_RULES,
  COMPOSITE_ISO_ORDER,
  classifyIso22000FromDescription,
  splitIsoLabels,
  canonicalizeIsoLabel,
  hasAnyIsoTerm,
  detectCompositeIsoFromText,
  mergeCompositeIsoLabels,
  resolveIsoWithContextFallback
};
