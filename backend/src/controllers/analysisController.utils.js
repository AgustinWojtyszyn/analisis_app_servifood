function buildBatchUploadResponse(results = []) {
  const normalized = Array.isArray(results) ? results : [];
  const successful = normalized.filter((r) => r.success);
  const failed = normalized.filter((r) => !r.success);
  return {
    success: failed.length === 0,
    totalFiles: normalized.length,
    successfulFiles: successful.length,
    failedFiles: failed.length,
    results: normalized,
    errors: failed.map((f) => ({
      fileName: f.fileName || f.filename,
      message: f.error || 'Error procesando archivo',
      stage: f.stage || 'processing',
      diagnostics: f.diagnostics || null
    }))
  };
}

function returnSupabaseError(res, context, error, fallbackMessage = 'Error en Supabase') {
  const details = {
    message: error?.message || fallbackMessage,
    code: error?.code || null,
    details: error?.details || null,
    hint: error?.hint || null
  };
  console.error(`[Supabase:${context}]`, details);
  return res.status(500).json({ error: details.message });
}

function isStatusColumnMissing(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('status') && (
    message.includes('does not exist') ||
    message.includes('column') ||
    message.includes('schema cache')
  );
}

function isUpdatedAtColumnMissing(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('updated_at') && (
    message.includes('does not exist') ||
    message.includes('has no field') ||
    message.includes('record "new"') ||
    message.includes('record "old"') ||
    message.includes('column')
  );
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseNonNegativeInt(value) {
  if (value === '' || value == null) return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function parseDateStart(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function parseDateEnd(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function escapeIlike(value) {
  return String(value ?? '').replace(/[%_,]/g, ' ').trim();
}

function resolveHistorySort(query = {}) {
  const sortBy = String(query.sortBy || '').trim();
  const sortOrder = String(query.sortOrder || '').trim().toLowerCase();
  const legacySort = String(query.sort || '').trim().toLowerCase();

  const allowedSortBy = new Map([
    ['created_at', 'created_at'],
    ['filename', 'filename'],
    ['status', 'status'],
    ['totalrecords', 'results->totalRecords'],
    ['totalnc', 'results->summary->totalNC']
  ]);

  if (sortBy) {
    const normalized = sortBy.toLowerCase();
    const column = allowedSortBy.get(normalized);
    if (column) {
      return {
        column,
        ascending: sortOrder === 'asc'
      };
    }
  }

  switch (legacySort) {
    case 'date_asc':
      return { column: 'created_at', ascending: true };
    case 'name_asc':
      return { column: 'filename', ascending: true };
    case 'name_desc':
      return { column: 'filename', ascending: false };
    case 'records_asc':
      return { column: 'results->totalRecords', ascending: true };
    case 'records_desc':
      return { column: 'results->totalRecords', ascending: false };
    case 'nc_asc':
      return { column: 'results->summary->totalNC', ascending: true };
    case 'nc_desc':
      return { column: 'results->summary->totalNC', ascending: false };
    case 'date_desc':
    default:
      return { column: 'created_at', ascending: false };
  }
}

export {
  buildBatchUploadResponse,
  returnSupabaseError,
  isStatusColumnMissing,
  isUpdatedAtColumnMissing,
  parsePositiveInt,
  parseNonNegativeInt,
  parseDateStart,
  parseDateEnd,
  escapeIlike,
  resolveHistorySort
};
