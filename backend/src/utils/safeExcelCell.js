const FORMULA_INJECTION_PREFIX_PATTERN = /^[\s\u0000-\u001F\u007F]*[=+\-@]/;

export function safeExcelCell(value) {
  if (typeof value !== 'string') return value;
  return FORMULA_INJECTION_PREFIX_PATTERN.test(value) ? `'${value}` : value;
}
