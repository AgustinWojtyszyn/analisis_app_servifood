import { normalizeCellValue, normalizeIncidentText, containsAny } from '../../../analyzeExcel/normalizers.js';

const EXTERNAL_ENTITIES = [
  'aes',
  'la laja',
  'adium',
  'easy',
  'scop',
  'callia',
  'clorox',
  'calidra',
  'los berros',
  'monteverde',
  'comeca',
  'placo',
  'bodegas callia',
  'saint gobain',
  'grupo comeca',
  'hospital',
  'caps',
  'cliente'
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
  const hasExternalEntity = EXTERNAL_ENTITIES.some((entity) => normalizedText.includes(entity));
  if (hasExternalEntity) {
    return {
      scope: 'Externo',
      reason: 'Se detecta cliente/empresa/sede externa en el desvío',
      confidence: 0.95
    };
  }

  const internalSignals = [
    'planta',
    'cocina',
    'deposito',
    'despacho',
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
    'personal'
  ];
  if (includesAny(internalSignals)) {
    return {
      scope: 'Interno',
      reason: 'El desvío impacta proceso, sector o equipamiento interno',
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
