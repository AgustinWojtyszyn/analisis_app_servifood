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

function normalizeKeywords(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.keywords)) return parsed.keywords;
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function parseRuleMetadata(rawKeywords) {
  if (Array.isArray(rawKeywords)) return { keywords: rawKeywords };

  if (typeof rawKeywords === 'string') {
    try {
      const parsed = JSON.parse(rawKeywords);
      if (Array.isArray(parsed)) return { keywords: parsed };
      if (parsed && typeof parsed === 'object') {
        return {
          keywords: normalizeKeywords(parsed.keywords),
          origen: parsed.origen,
          accion_inmediata: parsed.accion_inmediata,
          accion_correctiva: parsed.accion_correctiva,
          peso: parsed.peso
        };
      }
    } catch {
      return { keywords: normalizeKeywords(rawKeywords) };
    }
  }

  return { keywords: [] };
}

async function getRulesForAnalysis({ prisma, defaultRules }) {
  try {
    const dbRules = await prisma.businessRule.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' }
    });

    if (!dbRules.length) return defaultRules;

    return dbRules.map((rule) => {
      const metadata = parseRuleMetadata(rule.keywords);
      return {
        id: rule.id,
        nombre: rule.name,
        categoria: rule.category,
        origen: metadata.origen || 'interno',
        gravedad: rule.severity,
        keywords: normalizeKeywords(metadata.keywords),
        accion_inmediata: metadata.accion_inmediata || rule.suggestedAction || 'aviso',
        accion_correctiva: metadata.accion_correctiva || '',
        peso: metadata.peso
      };
    });
  } catch {
    return defaultRules;
  }
}

function isValidExcelFilename(filename = '') {
  const lower = String(filename).toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xls');
}

async function insertAnalysisHistory({ supabaseAdmin, userId, filename, resultPayload, status = 'active' }) {
  let insertResult = await supabaseAdmin
    .from('analysis_history')
    .insert({
      user_id: userId,
      filename,
      status,
      results: resultPayload
    })
    .select()
    .single();

  if (insertResult.error && isStatusColumnMissing(insertResult.error)) {
    insertResult = await supabaseAdmin
      .from('analysis_history')
      .insert({
        user_id: userId,
        filename,
        results: resultPayload
      })
      .select()
      .single();
  }

  return insertResult;
}

async function processExcelFile({
  file,
  userId,
  analyzeExcel,
  prisma,
  defaultRules,
  supabaseAdmin,
  mapAnalysisRowToApi
}) {
  if (!file) {
    throw new Error('Excel file is required');
  }

  const filename = file.originalname;
  if (!isValidExcelFilename(filename)) {
    throw new Error('Solo se aceptan archivos .xlsx o .xls');
  }

  const activeRules = await getRulesForAnalysis({ prisma, defaultRules });
  const analysisResult = await analyzeExcel(file.buffer, activeRules, null, {
    filename,
    uploadedAt: new Date().toISOString()
  });
  if (!analysisResult.success) {
    throw new Error(analysisResult.error || 'Error procesando archivo');
  }

  const processingTimestamp = new Date().toISOString();
  const records = analysisResult.records || [];

  const resultPayload = {
    totalRecords: records.length,
    summary: {
      ...analysisResult.summary,
      totalRecords: records.length,
      processedAt: processingTimestamp
    },
    records,
    cases: analysisResult.cases || [],
    ...(analysisResult.diagnostics ? { diagnostics: analysisResult.diagnostics } : {})
  };

  const insertResult = await insertAnalysisHistory({
    supabaseAdmin,
    userId,
    filename,
    resultPayload,
    status: 'archived'
  });

  if (insertResult.error) {
    throw new Error(insertResult.error.message || 'Error guardando análisis');
  }

  return mapAnalysisRowToApi(insertResult.data);
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
  resolveHistorySort,
  normalizeKeywords,
  parseRuleMetadata,
  getRulesForAnalysis,
  isValidExcelFilename,
  insertAnalysisHistory,
  processExcelFile
};
