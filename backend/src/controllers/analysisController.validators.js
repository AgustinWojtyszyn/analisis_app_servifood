const STATUS_VALUES = new Set(['active', 'exported', 'archived']);

export function hasSingleExcelFile(file) {
  return Boolean(file);
}

export function hasMultipleExcelFiles(files) {
  return Array.isArray(files) && files.length > 0;
}

export function hasValidBulkLimit(files, max = 10) {
  return Array.isArray(files) && files.length <= max;
}

export function hasIds(ids) {
  return Array.isArray(ids) && ids.length > 0;
}

export function hasDeleteAllConfirmation(confirmText = '') {
  return confirmText === 'BORRAR';
}

export function isValidAnalysisStatus(status) {
  return STATUS_VALUES.has(status);
}
