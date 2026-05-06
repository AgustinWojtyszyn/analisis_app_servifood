import { normalizeCellValue } from '../../analyzeExcel/normalizers.js';

const COMPANY_AREA_CANONICALS = [
  'Adium (Monteverde)',
  'Aes Sarmiento',
  'Aes Ullum',
  'Argentilemon',
  'Baez Laspiur',
  'Bodegas Callia',
  'CAPS Bermejo',
  'Caps Tamberia',
  'CARF',
  'CCP (Calidra)',
  'Centro Por La Vida',
  'Ceramica San Lorenzo',
  'Clorox',
  'Easy (Better)',
  'Ferva',
  'Genneia',
  'Greif',
  'Grupo Comeca',
  'Hosp Valle Fertil',
  'Hospital Barreal',
  'Hospital Calingasta',
  'Hospital mental (Zonda)',
  'Hospital Pocito',
  'Hospital Sarmiento',
  'Igarreta',
  'La Segunda Seguros',
  'Los Berros',
  'Micro Hospital Berros',
  'Molinos',
  'Padre Bueno',
  'Proviser Sarmiento',
  'Proviser Ullum',
  'Saint Gobain (Placo)',
  'ServiFood',
  'Vicunha'
];

function normalizeCompanyText(text) {
  return normalizeCellValue(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const COMPANY_DETECTION_RULES = [
  { canonical: 'Adium (Monteverde)', aliases: ['adium monteverde', 'adium', 'monteverde'] },
  { canonical: 'Aes Sarmiento', aliases: ['aes sarmiento'] },
  { canonical: 'Aes Ullum', aliases: ['aes ullum'] },
  { canonical: 'Argentilemon', aliases: ['argentilemon'] },
  { canonical: 'Baez Laspiur', aliases: ['baez laspiur'] },
  { canonical: 'Bodegas Callia', aliases: ['bodegas callia', 'callia'] },
  { canonical: 'CAPS Bermejo', aliases: ['caps bermejo'] },
  { canonical: 'Caps Tamberia', aliases: ['caps tamberia'] },
  { canonical: 'CARF', aliases: ['carf'] },
  { canonical: 'CCP (Calidra)', aliases: ['ccp calidra', 'calidra', 'ccp'] },
  { canonical: 'Centro Por La Vida', aliases: ['centro por la vida'] },
  { canonical: 'Ceramica San Lorenzo', aliases: ['ceramica san lorenzo'] },
  { canonical: 'Clorox', aliases: ['clorox'] },
  { canonical: 'Easy (Better)', aliases: ['easy better', 'easy', 'better'] },
  { canonical: 'Ferva', aliases: ['ferva'] },
  { canonical: 'Genneia', aliases: ['genneia'] },
  { canonical: 'Greif', aliases: ['greif'] },
  { canonical: 'Grupo Comeca', aliases: ['grupo comeca', 'comeca'] },
  { canonical: 'Hosp Valle Fertil', aliases: ['hosp valle fertil', 'hospital valle fertil', 'valle fertil'] },
  { canonical: 'Hospital Barreal', aliases: ['hospital barreal', 'barreal'] },
  { canonical: 'Hospital Calingasta', aliases: ['hospital calingasta', 'calingasta'] },
  {
    canonical: 'Hospital mental (Zonda)',
    aliases: [
      { value: 'hospital mental zonda' },
      { value: 'hospital mental' },
      { value: 'zonda', requiresAny: ['hospital', 'mental'] }
    ]
  },
  { canonical: 'Hospital Pocito', aliases: ['hospital pocito', 'pocito'] },
  { canonical: 'Hospital Sarmiento', aliases: ['hospital sarmiento'] },
  { canonical: 'Igarreta', aliases: ['igarreta'] },
  { canonical: 'La Segunda Seguros', aliases: ['la segunda seguros', 'la segunda'] },
  { canonical: 'Los Berros', aliases: ['los berros'] },
  { canonical: 'Micro Hospital Berros', aliases: ['micro hospital berros'] },
  { canonical: 'Molinos', aliases: ['molinos'] },
  { canonical: 'Padre Bueno', aliases: ['padre bueno'] },
  { canonical: 'Proviser Sarmiento', aliases: ['proviser sarmiento'] },
  { canonical: 'Proviser Ullum', aliases: ['proviser ullum'] },
  { canonical: 'Saint Gobain (Placo)', aliases: ['saint gobain placo', 'saint gobain', 'placo'] },
  { canonical: 'ServiFood', aliases: ['servifood'] },
  { canonical: 'Vicunha', aliases: ['vicunha'] }
];

function hasWholeAliasMatch(normalizedText, aliasNorm) {
  return new RegExp(`(^| )${aliasNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(normalizedText);
}

function detectCompanyAreaFromText(text) {
  const normalizedText = normalizeCompanyText(text);
  if (!normalizedText) return '';

  const matches = [];

  for (const rule of COMPANY_DETECTION_RULES) {
    for (const aliasRaw of rule.aliases) {
      const aliasConfig = typeof aliasRaw === 'string' ? { value: aliasRaw } : aliasRaw;
      const aliasNorm = normalizeCompanyText(aliasConfig.value);
      if (!aliasNorm) continue;
      if (!hasWholeAliasMatch(normalizedText, aliasNorm)) continue;

      if (aliasConfig.requiresAny?.length) {
        const hasContext = aliasConfig.requiresAny.some((ctx) => hasWholeAliasMatch(normalizedText, normalizeCompanyText(ctx)));
        if (!hasContext) continue;
      }

      matches.push({
        canonical: rule.canonical,
        alias: aliasNorm,
        score: aliasNorm.length
      });
    }
  }

  if (!matches.length) return '';

  matches.sort((a, b) => b.score - a.score);
  const selected = matches[0].canonical;
  if (selected === 'ServiFood') return '';
  return selected;
}

function collectTextValues(payload) {
  const values = [];
  const push = (value) => {
    const text = normalizeCellValue(value || '').trim();
    if (text) values.push(text);
  };

  const candidateFields = [
    'hallazgo',
    'hallazgoDetectado',
    'descripcion',
    'observaciones',
    'actividadRealizada',
    'areaProceso',
    'cliente',
    'empresa',
    'sede',
    'unidad',
    'textForClassification'
  ];

  candidateFields.forEach((field) => push(payload?.[field]));

  const raw = payload?.rawRecord || {};
  const final = payload?.finalRecord || {};
  Object.keys(raw).forEach((key) => {
    const keyNorm = normalizeCompanyText(key);
    if (/(hallazgo|descripcion|observ|cliente|empresa|sede|unidad|area|proceso|actividad|coment|nota|texto|detalle)/.test(keyNorm)) {
      push(raw[key]);
    }
  });
  Object.keys(final).forEach((key) => {
    const keyNorm = normalizeCompanyText(key);
    if (/(hallazgo|descripcion|observ|cliente|empresa|sede|unidad|area|proceso|actividad|coment|nota|texto|detalle)/.test(keyNorm)) {
      push(final[key]);
    }
  });

  return values.join(' | ');
}

function detectCompanyAreaFromRecord(payload = {}) {
  const joinedText = collectTextValues(payload);
  const detected = detectCompanyAreaFromText(joinedText);
  if (!detected) return '';
  return detected;
}

export {
  COMPANY_AREA_CANONICALS,
  normalizeCompanyText,
  detectCompanyAreaFromText,
  detectCompanyAreaFromRecord
};
