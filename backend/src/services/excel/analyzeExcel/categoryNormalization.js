import { normalizeCellValue, normalizeForMatch } from '../../analyzeExcel/normalizers.js';

const CANONICAL = {
  INOCUIDAD: 'Inocuidad',
  LOGISTICA: 'Logística',
  CALIDAD: 'Calidad',
  LEGALES: 'Legales',
  MANTENIMIENTO: 'Mantenimiento',
  RRHH: 'Recursos Humanos',
  MANUAL: 'Revisar manualmente'
};

function normalizeCategory(category = '') {
  const raw = normalizeForMatch(normalizeCellValue(category).trim());
  if (!raw) return CANONICAL.MANUAL;

  if (raw.includes('inocuidad')) return CANONICAL.INOCUIDAD;
  if (raw.includes('logistica')) return CANONICAL.LOGISTICA;
  if (raw.includes('calidad')) return CANONICAL.CALIDAD;
  if (raw.includes('legal')) return CANONICAL.LEGALES;
  if (raw.includes('mantenimiento')) return CANONICAL.MANTENIMIENTO;
  if (raw.includes('recursos humanos') || raw.includes('rrhh') || raw.includes('personal')) return CANONICAL.RRHH;
  if (raw.includes('revisar manualmente') || raw.includes('revision manual') || raw.includes('revisión manual')) return CANONICAL.MANUAL;

  return CANONICAL.MANUAL;
}

export {
  CANONICAL,
  normalizeCategory
};
