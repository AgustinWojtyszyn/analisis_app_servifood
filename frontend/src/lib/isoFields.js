export const MANUAL_ISO_VALUE = 'Revisar manualmente';

export function readCanonicalIso(record = {}) {
  const canonical = String(record?.relacionIso22000 || '').trim();
  const legacy = String(record?.iso22000 || '').trim();
  return canonical || legacy || MANUAL_ISO_VALUE;
}

export function normalizeIsoCompare(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isIsoManualValue(value = '') {
  const normalized = normalizeIsoCompare(value);
  return normalized.includes('revisar manualmente') || normalized.includes('revision manual');
}
