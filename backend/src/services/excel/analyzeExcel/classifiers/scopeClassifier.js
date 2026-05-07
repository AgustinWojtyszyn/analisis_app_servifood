import { normalizeCellValue, normalizeIncidentText, containsAny } from '../../../analyzeExcel/normalizers.js';

const CLIENT_COMPANY_SIGNALS = [
  'cliente',
  'adium',
  'monteverde',
  'easy',
  'la laja',
  'callia',
  'comeca',
  'scop',
  'clorox',
  'calidra',
  'los berros',
  'placo',
  'saint gobain',
  'grupo comeca',
  'bodegas callia'
];

function classifyDeviationScope({
  text = '',
  detectedArea = '',
  empresaDetectada = '',
  sectorDetectado = ''
} = {}) {
  const normalizedText = normalizeIncidentText([
    text,
    detectedArea,
    empresaDetectada,
    sectorDetectado
  ].filter(Boolean).join(' | '));

  const includesAny = (terms) => containsAny(normalizedText, terms);
  const hasCompanyMention = includesAny(CLIENT_COMPANY_SIGNALS) || Boolean(normalizeCellValue(empresaDetectada).trim());
  const hasGenericClaim = includesAny(['reclamo de', 'reclama', 'cliente reclama', 'gerente reclama']);
  const hasServiceNotDelivered = includesAny([
    'no se envio a',
    'no se envió a',
    'no se enviaron a',
    'falto comida para',
    'faltó comida para',
    'falta de coccion reclamada por',
    'falta de cocción reclamada por'
  ]);
  const hasLogisticsImpact = includesAny([
    'despacho',
    'entrega',
    'envio',
    'envío',
    'enviaron',
    'envian',
    'envían',
    'recorrido',
    'movilidad',
    'transporte',
    'demora',
    'tardanza',
    'sale tarde',
    'llega tarde',
    'llegan tarde',
    'no sale',
    'no salen',
    'evento enviado en fecha incorrecta',
    'fecha incorrecta',
    'faltante'
  ]);
  const hasSensitiveDietRisk = includesAny([
    'celiaco',
    'celiacos',
    'sin tacc',
    'dieta especial',
    'menu diferenciado',
    'menú diferenciado'
  ]) && includesAny([
    'entrego incorrecto',
    'entregó incorrecto',
    'contaminacion cruzada',
    'contaminación cruzada',
    'no apto',
    'mal rotulado',
    'rotulado incorrecto',
    'riesgo'
  ]);
  const hasExplicitInternalContainment = includesAny(['antes de despacho', 'antes de entregar', 'deteccion interna', 'detección interna', 'dentro de planta']);
  const hasExternalComplaint = includesAny(['cliente reclama', 'reclamo del cliente', 'queja del cliente']) || hasGenericClaim;
  const hasExternalDeliveryImpact = includesAny(['no se envio', 'no se envió', 'no se envia', 'no se envía', 'no se enviaron', 'no se envian', 'no se envían', 'no se entrego', 'no se entregó', 'entrega incompleta', 'despacho incompleto', 'demora en entrega', 'demora de entrega', 'evento enviado en fecha incorrecta', 'fecha incorrecta', 'sale tarde', 'llega tarde', 'llegan tarde']) && includesAny(['cliente', 'entrega', 'despacho', 'envio', 'envío', 'enviaron', 'envian', 'envían', 'recorrido', 'movilidad', 'transporte']);
  const hasExternalThirdParty = includesAny(['proveedor', 'establecimiento externo', 'en establecimiento del cliente', 'sede externa']);
  const hasExternalByCompanyAndImpact = hasCompanyMention && (hasLogisticsImpact || hasExternalComplaint || hasServiceNotDelivered);
  if ((hasExternalComplaint || hasExternalDeliveryImpact || hasExternalThirdParty || hasServiceNotDelivered || hasExternalByCompanyAndImpact || (hasCompanyMention && hasSensitiveDietRisk)) && !hasExplicitInternalContainment) {
    return {
      scope: 'Externo',
      reason: 'El desvío impacta al cliente, la entrega/despacho o un tercero externo',
      confidence: 0.95
    };
  }

  if (includesAny(['cliente', 'establecimiento', 'sede externa']) && includesAny(['no pudo ingresar', 'ingreso denegado', 'credencial', 'permiso', 'habilitacion', 'habilitación'])) {
    return {
      scope: 'Externo',
      reason: 'El incidente ocurre al interactuar con establecimiento/cliente externo',
      confidence: 0.93
    };
  }

  const internalSignals = [
    'planta',
    'cocina',
    'deposito',
    'area caliente',
    'area fria',
    'camara',
    'heladera',
    'lavadero',
    'bacha',
    'sifon',
    'batidor',
    'equipamiento',
    'infraestructura',
    'elaboracion',
    'higiene',
    'limpieza',
    'bpm',
    'poes',
    'personal',
    'proceso interno',
    'antes de despacho',
    'antes de entregar',
    'deteccion interna',
    'detección interna'
  ];
  if (includesAny(internalSignals)) {
    return {
      scope: 'Interno',
      reason: 'El desvío se detecta dentro de planta/proceso/equipo interno',
      confidence: 0.88
    };
  }

  if (!hasCompanyMention && hasLogisticsImpact) {
    return {
      scope: 'Interno',
      reason: 'Incidencia operativa logística interna sin cliente/empresa afectada explícita',
      confidence: 0.8
    };
  }

  return {
    scope: 'Revisar manualmente',
    reason: 'Sin señales suficientes para determinar alcance interno/externo con confianza',
    confidence: 0.45
  };
}

function normalizeScope(scopeValue = '') {
  const value = normalizeCellValue(scopeValue).trim().toLowerCase();
  if (value === 'externo') return 'Externo';
  if (value === 'interno') return 'Interno';
  return '';
}

export {
  classifyDeviationScope,
  normalizeScope
};
