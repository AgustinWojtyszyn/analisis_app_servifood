import { normalizeCellValue } from '../../analyzeExcel/normalizers.js';

const MANUAL_ISO_VALUE = 'Revisar manualmente';

function normalizeIsoValue(value = '') {
  const normalized = normalizeCellValue(value).trim();
  if (!normalized || normalized === '-') return MANUAL_ISO_VALUE;
  return normalized;
}

function normalizeIsoCompare(value = '') {
  return normalizeCellValue(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function readCanonicalIso(record = {}) {
  const canonical = normalizeCellValue(record?.relacionIso22000).trim();
  const legacy = normalizeCellValue(record?.iso22000).trim();
  const value = canonical || legacy || MANUAL_ISO_VALUE;
  return normalizeIsoValue(value);
}

function getIsoFieldState(record = {}) {
  const canonical = normalizeCellValue(record?.relacionIso22000).trim();
  const legacy = normalizeCellValue(record?.iso22000).trim();
  return {
    canonical,
    legacy,
    value: readCanonicalIso(record),
    source: canonical ? 'relacionIso22000' : (legacy ? 'iso22000' : 'default_manual'),
    divergent: Boolean(canonical && legacy && canonical !== legacy)
  };
}

function writeCanonicalIso(record = {}, value = '') {
  const iso = normalizeIsoValue(value);
  return {
    ...record,
    relacionIso22000: iso,
    // Transitional mirror for legacy consumers that still read iso22000.
    iso22000: iso
  };
}

function isIsoManualValue(value = '') {
  const normalized = normalizeIsoCompare(value);
  return normalized.includes('revisar manualmente') || normalized.includes('revision manual');
}

function isRecordIsoManual(record = {}) {
  return isIsoManualValue(readCanonicalIso(record));
}

export {
  MANUAL_ISO_VALUE,
  normalizeIsoValue,
  normalizeIsoCompare,
  readCanonicalIso,
  getIsoFieldState,
  writeCanonicalIso,
  isIsoManualValue,
  isRecordIsoManual
};
