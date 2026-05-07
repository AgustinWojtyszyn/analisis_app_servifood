import { normalizeCellValue, normalizeIncidentText, containsAny } from '../../../analyzeExcel/normalizers.js';

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
  const hasExplicitInternalContainment = includesAny(['antes de despacho', 'antes de entregar', 'deteccion interna', 'detección interna', 'dentro de planta']);
  const hasExternalComplaint = includesAny(['cliente reclama', 'reclamo del cliente', 'queja del cliente']);
  const hasExternalDeliveryImpact = includesAny(['no se envio', 'no se envió', 'no se envia', 'no se envía', 'no se enviaron', 'no se envian', 'no se envían', 'no se entrego', 'no se entregó', 'entrega incompleta', 'despacho incompleto', 'demora en entrega', 'demora de entrega', 'evento enviado en fecha incorrecta', 'fecha incorrecta', 'sale tarde', 'llega tarde', 'llegan tarde']) && includesAny(['cliente', 'entrega', 'despacho', 'envio', 'envío', 'enviaron', 'envian', 'envían', 'recorrido', 'movilidad', 'transporte']);
  const hasExternalThirdParty = includesAny(['proveedor', 'establecimiento externo', 'en establecimiento del cliente', 'sede externa']);
  const hasExternalDispatchMention = includesAny(['despacho', 'entrega', 'envio', 'envío', 'enviaron', 'envian', 'envían', 'recorrido', 'movilidad', 'transporte']) && !hasExplicitInternalContainment;
  if (hasExternalComplaint || hasExternalDeliveryImpact || hasExternalThirdParty || hasExternalDispatchMention) {
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

  return {
    scope: 'Interno',
    reason: 'Sin evidencia de cliente externo; se asume alcance interno operativo',
    confidence: 0.65
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
