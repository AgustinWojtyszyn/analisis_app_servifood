import { normalizeCellValue, normalizeForMatch } from '../../../analyzeExcel/normalizers.js';

function hasExplicitOriginalValue(value = '') {
  const normalized = normalizeForMatch(normalizeCellValue(value || '').trim());
  if (!normalized) return false;
  return ![
    '-',
    'na',
    'n a',
    'nd',
    'n d',
    's d',
    's/d',
    'no aplica',
    'sin dato',
    'sin datos',
    'pendiente',
    'revisar manualmente',
    'revision manual',
    'area',
    'area sector',
    'area proceso',
    'clasificacion',
    'clasificacion del desvio',
    'clasificación del desvío',
    'tipo',
    'estado',
    'responsable'
  ].includes(normalized);
}

export {
  hasExplicitOriginalValue
};
