const COMMON_TEXT_FIXES = [
  { from: /\bmercaderis\b/g, to: 'mercaderia' },
  { from: /\bvedura\b/g, to: 'verdura' },
  { from: /\bminmutos\b/g, to: 'minutos' },
  { from: /\bsanitiza\b/g, to: 'sanitizacion' },
  { from: /\brobocoupe\b/g, to: 'equipo maquina de proceso' }
];

function normalizeCellValue(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  if (Array.isArray(value)) {
    return value.map(normalizeCellValue).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText
        .map((part) => normalizeCellValue(part?.text))
        .filter(Boolean)
        .join('');
    }

    if (typeof value.text === 'string') {
      return value.text;
    }

    if (value.result != null) {
      return normalizeCellValue(value.result);
    }
  }

  return String(value);
}

function normalizeForMatch(value) {
  return normalizeCellValue(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsAny(text, keywords = []) {
  return keywords.some((keyword) => text.includes(normalizeForMatch(keyword)));
}

function parseBooleanLike(value) {
  const text = normalizeForMatch(value);
  if (!text) return null;

  const truthy = ['si', 'sí', 's', 'yes', 'y', 'true', '1', 'x'];
  const falsy = ['no', 'n', 'false', '0'];

  if (truthy.includes(text)) return true;
  if (falsy.includes(text)) return false;
  return null;
}

function isYesLike(value) {
  return parseBooleanLike(value) === true;
}

function isNoLike(value) {
  return parseBooleanLike(value) === false;
}

function isConformeLike(value) {
  const text = normalizeForMatch(value);
  return text === 'conforme';
}

function isNoConformeLike(value) {
  const text = normalizeForMatch(value);
  return text === 'no conforme' || text.includes('no conforme');
}

function normalizeHeaderKey(value, index) {
  const raw = normalizeCellValue(value).trim();
  if (!raw) return `__EMPTY_${index}`;
  return raw.replace(/\s+/g, ' ').trim();
}

function buildRowObjectFromExcel(headerValues, rowValues) {
  const row = {};
  const maxLength = Math.max(headerValues.length, rowValues.length);

  for (let i = 1; i < maxLength; i += 1) {
    const keyBase = normalizeHeaderKey(headerValues[i], i);
    let key = keyBase;
    let suffix = 1;
    while (Object.prototype.hasOwnProperty.call(row, key)) {
      key = `${keyBase}_${suffix}`;
      suffix += 1;
    }
    row[key] = normalizeCellValue(rowValues[i]);
  }

  return row;
}

function buildNormalizedRowKeyMap(row) {
  const keyMap = new Map();
  Object.keys(row || {}).forEach((key) => {
    const norm = normalizeForMatch(key);
    if (!keyMap.has(norm)) keyMap.set(norm, key);
  });
  return keyMap;
}

function getRowValueByCandidates(row, keyMap, candidates = []) {
  for (const candidate of candidates) {
    const norm = normalizeForMatch(candidate);
    const directKey = keyMap.get(norm);
    if (directKey) return normalizeCellValue(row[directKey]);
  }

  // Soporta casos con títulos extendidos, por ejemplo "Actividad realizada (detalle)"
  for (const candidate of candidates) {
    const norm = normalizeForMatch(candidate);
    const partialKey = [...keyMap.keys()].find((existing) => existing.startsWith(norm));
    if (partialKey) {
      const originalKey = keyMap.get(partialKey);
      return normalizeCellValue(row[originalKey]);
    }
  }

  return '';
}

function normalizeIncidentText(value) {
  let text = normalizeForMatch(value || '');
  if (!text) return '';
  text = ` ${text} `;
  COMMON_TEXT_FIXES.forEach((fix) => {
    text = text.replace(fix.from, fix.to);
  });
  return text.replace(/\s+/g, ' ').trim();
}

export {
  normalizeCellValue,
  normalizeForMatch,
  containsAny,
  parseBooleanLike,
  isYesLike,
  isNoLike,
  isConformeLike,
  isNoConformeLike,
  normalizeHeaderKey,
  buildRowObjectFromExcel,
  buildNormalizedRowKeyMap,
  getRowValueByCandidates,
  normalizeIncidentText
};
