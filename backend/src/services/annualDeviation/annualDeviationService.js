import ExcelJS from 'exceljs';

const SHEET_TYPES = {
  ANNUAL: 'annual',
  QUALITY: 'quality',
  LOGISTICS: 'logistics'
};

const MONTHS = [
  ['enero', 1],
  ['febrero', 2],
  ['marzo', 3],
  ['abril', 4],
  ['mayo', 5],
  ['junio', 6],
  ['julio', 7],
  ['agosto', 8],
  ['septiembre', 9],
  ['setiembre', 9],
  ['octubre', 10],
  ['noviembre', 11],
  ['diciembre', 12]
];

const CANONICAL_LABELS = new Map([
  ['deposito', 'Depósito'],
  ['area fria', 'Área fría'],
  ['logistica', 'Logística'],
  ['calidad', 'Calidad'],
  ['interno', 'Interno'],
  ['internos', 'Interno'],
  ['externo', 'Externo'],
  ['externos', 'Externo']
]);

const FIELD_ALIASES = {
  dateMonth: ['fecha', 'mes', 'fecha mes', 'periodo', 'periodo mes'],
  areaSector: ['area', 'área', 'sector', 'area sector', 'área sector', 'sector area'],
  deviation: ['desvio detectado', 'desvío detectado', 'desvio', 'desvío', 'hallazgo', 'descripcion', 'descripción', 'detalle'],
  classification: ['clasificacion', 'clasificación', 'tipo de desvio', 'tipo de desvío', 'categoria', 'categoría'],
  sourceType: ['interno externo', 'interno/externo', 'origen', 'tipo', 'cliente interno externo'],
  immediateAction: ['accion inmediata', 'acción inmediata', 'acciones inmediatas', 'accion', 'acción'],
  correctiveAction: ['accion correctiva', 'acción correctiva', 'acciones correctivas', 'medida correctiva'],
  status: ['estado', 'status', 'situacion', 'situación'],
  observations: ['observacion', 'observación', 'observaciones', 'comentarios', 'comentario']
};

const SUMMARY_HEADER_KEYS = new Set([
  'cantidad',
  'cant',
  'count',
  'porcentaje',
  'porcentual',
  '%',
  'total',
  'totales'
]);

function stripAccents(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeKey(value = '') {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function cleanDisplayText(value = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const key = normalizeKey(text);
  if (CANONICAL_LABELS.has(key)) return CANONICAL_LABELS.get(key);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeSourceType(value = '') {
  const key = normalizeKey(value);
  if (!key) return '';
  if (/^\d+([,.]\d+)?%?$/.test(key)) return '';
  if (key === 'interno' || key === 'internos') return 'Interno';
  if (key === 'externo' || key === 'externos') return 'Externo';
  return '';
}

function normalizeCellValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if (value.text) return String(value.text).trim();
    if (value.richText) return value.richText.map((part) => part.text || '').join('').trim();
    if (value.result != null) return normalizeCellValue(value.result);
    if (value.hyperlink && value.text) return String(value.text).trim();
  }
  return String(value).trim();
}

function detectMonth(value = '') {
  const normalized = normalizeKey(value);
  if (!normalized) return null;
  for (const [name, number] of MONTHS) {
    if (normalized === name || normalized.includes(` ${name} `) || normalized.startsWith(`${name} `) || normalized.endsWith(` ${name}`)) {
      return { name: cleanDisplayText(name), number };
    }
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const number = date.getMonth() + 1;
    const monthName = MONTHS.find(([, n]) => n === number)?.[0] || '';
    return { name: cleanDisplayText(monthName), number };
  }
  return null;
}

function detectYear(values = []) {
  for (const value of values) {
    if (value instanceof Date && value.getFullYear() >= 2000) return value.getFullYear();
    const match = String(value || '').match(/\b(20\d{2}|19\d{2})\b/);
    if (match) return Number(match[1]);
    if (typeof value === 'string' && /[/-]/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime()) && date.getFullYear() >= 2000) return date.getFullYear();
    }
  }
  return null;
}

function resolveSheetType(sheetName = '') {
  const name = normalizeKey(sheetName);
  if (name.includes('calidad')) return SHEET_TYPES.QUALITY;
  if (name.includes('logistica')) return SHEET_TYPES.LOGISTICS;
  if (name.includes('anual') || name.includes('anuales') || name.includes('desvio')) return SHEET_TYPES.ANNUAL;
  return null;
}

function scoreHeader(values = []) {
  const normalized = values.map(normalizeKey);
  let score = 0;

  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    const weight = field === 'deviation' ? 4 : 2;
    const aliasKeys = aliases.map(normalizeKey);
    if (normalized.some((header) => aliasKeys.includes(header))) score += weight;
  });

  if (normalized.some((value) => value.includes('desvio'))) score += 2;
  if (normalized.some((value) => value.includes('area') || value.includes('sector'))) score += 1;
  if (normalized.some((value) => value.includes('fecha') || value === 'mes')) score += 1;
  if (normalized.some((value) => value.includes('clasificacion') || value.includes('categoria'))) score += 1;
  if (normalized.some((value) => value.includes('accion') || value.includes('estado') || value.includes('observacion'))) score += 1;

  const hasDeviation = normalized.some((value) => value.includes('desvio') || value.includes('hallazgo') || value.includes('descripcion'));
  const hasDetailContext = normalized.some((value) => (
    value.includes('area') ||
    value.includes('sector') ||
    value.includes('fecha') ||
    value === 'mes' ||
    value.includes('clasificacion') ||
    value.includes('categoria') ||
    value.includes('accion') ||
    value.includes('estado') ||
    value.includes('observacion')
  ));
  const summaryHeaders = normalized.filter((value) => SUMMARY_HEADER_KEYS.has(value) || value.includes('porcentaje'));
  if (hasDeviation && summaryHeaders.length && !hasDetailContext) score -= 8;
  if (summaryHeaders.length >= 2) score -= 4;

  return score;
}

function findHeaderRow(rows = []) {
  let best = { index: -1, score: 0 };
  rows.forEach((row, index) => {
    const score = scoreHeader(row.values);
    if (score > best.score) best = { index, score };
  });
  return best.score >= 2 ? best.index : 0;
}

function buildHeaderMap(headerValues = []) {
  const headers = headerValues.map((value, idx) => cleanDisplayText(value) || `Columna ${idx + 1}`);
  const normalizedHeaders = headers.map(normalizeKey);
  const canonicalIndexes = {};

  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    const aliasKeys = aliases.map(normalizeKey);
    const exactIndex = normalizedHeaders.findIndex((header) => aliasKeys.includes(header));
    if (exactIndex >= 0) {
      canonicalIndexes[field] = exactIndex;
      return;
    }
    const partialIndex = normalizedHeaders.findIndex((header) => aliasKeys.some((alias) => header.includes(alias) || alias.includes(header)));
    if (partialIndex >= 0) canonicalIndexes[field] = partialIndex;
  });

  return { headers, canonicalIndexes };
}

function rowLooksLikeMonthGroup(values = []) {
  const nonEmpty = values.filter(Boolean);
  if (nonEmpty.length !== 1 && nonEmpty.length !== 2) return null;
  return detectMonth(nonEmpty.join(' '));
}

function getValueByIndex(values, index) {
  return Number.isInteger(index) ? normalizeCellValue(values[index]) : '';
}

function parseWorksheet(worksheet, sheetType) {
  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = [];
    for (let col = 1; col <= Math.max(row.cellCount, worksheet.columnCount); col += 1) {
      values.push(normalizeCellValue(row.getCell(col).value));
    }
    if (values.some(Boolean)) rows.push({ rowNumber, values });
  });

  if (!rows.length) return { rows: [], columns: [], warnings: ['La hoja no tiene filas con datos.'] };

  const headerIndex = findHeaderRow(rows);
  const headerRow = rows[headerIndex];
  const { headers, canonicalIndexes } = buildHeaderMap(headerRow.values);
  const normalizedHeaders = headers.map(normalizeKey);
  const summaryHeaders = normalizedHeaders.filter((value) => SUMMARY_HEADER_KEYS.has(value) || value.includes('porcentaje'));
  const hasDetailContext = normalizedHeaders.some((value) => (
    value.includes('area') ||
    value.includes('sector') ||
    value.includes('fecha') ||
    value === 'mes' ||
    value.includes('clasificacion') ||
    value.includes('categoria') ||
    value.includes('accion') ||
    value.includes('estado') ||
    value.includes('observacion')
  ));
  const warnings = [];
  if (canonicalIndexes.deviation == null) warnings.push(`No se detectó una columna clara de desvío en la hoja "${worksheet.name}".`);
  if (canonicalIndexes.deviation != null && summaryHeaders.length >= 2 && !hasDetailContext) {
    return {
      rows: [],
      columns: headers,
      warnings: [`La hoja "${worksheet.name}" parece contener solo resumen agrupado; no se usa para filas de detalle.`],
      diagnostics: {
        sheetName: worksheet.name,
        sheetType,
        headerRow: headerRow.rowNumber,
        parsedRows: 0,
        ignored: true,
        ignoredReason: 'resumen_agrupado_sin_detalle'
      }
    };
  }

  let currentMonth = null;
  const parsedRows = [];

  rows.slice(headerIndex + 1).forEach((row) => {
    const compact = row.values.filter(Boolean);
    if (!compact.length) return;

    const monthGroup = rowLooksLikeMonthGroup(row.values);
    if (monthGroup) {
      currentMonth = monthGroup;
      return;
    }

    const original = {};
    headers.forEach((header, idx) => {
      original[header] = row.values[idx] || '';
    });

    const dateMonthValue = getValueByIndex(row.values, canonicalIndexes.dateMonth);
    const detectedMonth = detectMonth(dateMonthValue) || currentMonth;
    const year = detectYear([dateMonthValue, ...row.values]);
    const deviation = cleanDisplayText(getValueByIndex(row.values, canonicalIndexes.deviation));
    const areaSector = cleanDisplayText(getValueByIndex(row.values, canonicalIndexes.areaSector));
    const classification = cleanDisplayText(getValueByIndex(row.values, canonicalIndexes.classification));
    const sourceType = normalizeSourceType(getValueByIndex(row.values, canonicalIndexes.sourceType));

    const hasMeaningfulData = deviation || areaSector || classification || sourceType || compact.length >= 3;
    if (!hasMeaningfulData) return;

    parsedRows.push({
      sheetType,
      sheetName: worksheet.name,
      rowIndex: row.rowNumber,
      dateMonth: dateMonthValue || detectedMonth?.name || '',
      month: detectedMonth?.name || '',
      monthNumber: detectedMonth?.number || null,
      year,
      areaSector,
      areaSectorKey: normalizeKey(areaSector),
      deviation,
      deviationKey: normalizeKey(deviation),
      classification,
      classificationKey: normalizeKey(classification || (sheetType === SHEET_TYPES.QUALITY ? 'Calidad' : sheetType === SHEET_TYPES.LOGISTICS ? 'Logística' : '')),
      sourceType,
      sourceTypeKey: normalizeKey(sourceType),
      immediateAction: cleanDisplayText(getValueByIndex(row.values, canonicalIndexes.immediateAction)),
      correctiveAction: cleanDisplayText(getValueByIndex(row.values, canonicalIndexes.correctiveAction)),
      status: cleanDisplayText(getValueByIndex(row.values, canonicalIndexes.status)),
      observations: cleanDisplayText(getValueByIndex(row.values, canonicalIndexes.observations)),
      original
    });
  });

  return {
    rows: parsedRows,
    columns: headers,
    warnings,
    diagnostics: {
      sheetName: worksheet.name,
      sheetType,
      headerRow: headerRow.rowNumber,
      parsedRows: parsedRows.length,
      ignored: false
    }
  };
}

function countBy(rows = [], key, limit = null) {
  const counts = new Map();
  rows.forEach((row) => {
    const label = cleanDisplayText(row[key] || 'Sin especificar');
    const normalized = normalizeKey(label);
    if (!normalized) return;
    const existing = counts.get(normalized) || { key: normalized, name: label, value: 0 };
    existing.value += 1;
    counts.set(normalized, existing);
  });
  const result = [...counts.values()].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'));
  return limit ? result.slice(0, limit) : result;
}

function summarizeSheet(rows = []) {
  const total = rows.length;
  const deviations = countBy(rows, 'deviation');
  return {
    total,
    byDeviation: deviations.map((item) => ({
      ...item,
      percentage: total ? Number(((item.value * 100) / total).toFixed(2)) : 0
    })),
    topDeviations: deviations.slice(0, 10).map((item) => ({
      ...item,
      percentage: total ? Number(((item.value * 100) / total).toFixed(2)) : 0
    }))
  };
}

function countBySourceType(rows = []) {
  return countBy(
    rows
      .map((row) => ({ ...row, sourceType: normalizeSourceType(row.sourceType) }))
      .filter((row) => row.sourceType),
    'sourceType'
  );
}

function isClassification(row, expectedKey) {
  return normalizeKey(row?.classification || row?.sheetType || '') === expectedKey;
}

function getEffectiveRowsForType(allRows = [], sheetType) {
  const expectedKey = sheetType === SHEET_TYPES.QUALITY ? 'calidad' : 'logistica';
  const sheetRows = allRows.filter((row) => row.sheetType === sheetType);
  const annualClassifiedRows = allRows.filter((row) => (
    row.sheetType === SHEET_TYPES.ANNUAL && isClassification(row, expectedKey)
  ));

  const sourceRows = sheetRows.length > annualClassifiedRows.length ? sheetRows : annualClassifiedRows;
  const effectiveSource = sourceRows === sheetRows ? 'specific_sheet' : 'annual_classification';

  return sourceRows.map((row) => ({
    ...row,
    effectiveSheetType: sheetType,
    effectiveSource
  }));
}

function getMonthLabel(monthNumber) {
  const month = MONTHS.find(([, number]) => number === monthNumber)?.[0] || '';
  return month ? cleanDisplayText(month) : '';
}

function normalizeReferenceDate(referenceDate) {
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function determineExpectedPeriodEndMonth(rows = [], options = {}) {
  if (Number.isInteger(options.expectedPeriodEndMonth)) {
    return options.expectedPeriodEndMonth >= 1 && options.expectedPeriodEndMonth <= 12
      ? options.expectedPeriodEndMonth
      : null;
  }
  if (options.expectedPeriodEndMonth === null) return null;

  const referenceDate = normalizeReferenceDate(options.referenceDate);
  const workbookYear = detectWorkbookYear(rows, referenceDate);
  const referenceYear = referenceDate.getFullYear();
  const lastCompletedMonth = referenceDate.getMonth();

  if (workbookYear === referenceYear && lastCompletedMonth >= 1 && lastCompletedMonth <= 11) {
    return lastCompletedMonth;
  }
  return null;
}

function buildKpiRows(allRows = [], validThroughMonth = null) {
  const rows = [];
  const omittedRows = [];

  allRows.forEach((row) => {
    if (!row.monthNumber) {
      omittedRows.push({
        sheetName: row.sheetName,
        sheetType: row.sheetType,
        rowIndex: row.rowIndex,
        month: row.month || '',
        dateMonth: row.dateMonth || '',
        reason: 'sin_mes'
      });
      return;
    }
    if (validThroughMonth && row.monthNumber > validThroughMonth) {
      omittedRows.push({
        sheetName: row.sheetName,
        sheetType: row.sheetType,
        rowIndex: row.rowIndex,
        month: row.month || '',
        dateMonth: row.dateMonth || '',
        reason: 'fuera_del_periodo_esperado',
        validThroughMonth,
        validThroughMonthLabel: getMonthLabel(validThroughMonth)
      });
      return;
    }
    rows.push(row);
  });

  return { rows, omittedRows };
}

function buildOmittedRowWarnings(omittedRows = []) {
  return omittedRows.map((row) => {
    const location = `${row.sheetName || row.sheetType || 'Hoja'} fila ${row.rowIndex}`;
    const month = row.month || row.dateMonth || 'sin mes';
    if (row.reason === 'fuera_del_periodo_esperado') {
      return `Fila omitida de KPIs principales por estar fuera del período esperado hasta ${row.validThroughMonthLabel}: ${location}, mes ${month}.`;
    }
    return `Fila omitida de KPIs principales por no tener mes detectable: ${location}, fecha/mes ${month}.`;
  });
}

function buildSummary(allRows = [], options = {}) {
  const kpiRows = options.kpiRows || allRows;
  const annualRows = allRows.filter((row) => row.sheetType === SHEET_TYPES.ANNUAL);
  const kpiAnnualRows = kpiRows.filter((row) => row.sheetType === SHEET_TYPES.ANNUAL);
  const baseRows = annualRows.length ? kpiAnnualRows : kpiRows;
  const effectiveQualityRows = getEffectiveRowsForType(kpiRows, SHEET_TYPES.QUALITY);
  const effectiveLogisticsRows = getEffectiveRowsForType(kpiRows, SHEET_TYPES.LOGISTICS);
  const byMonth = countBy(baseRows, 'month')
    .map((item) => ({ ...item, monthNumber: baseRows.find((row) => normalizeKey(row.month) === item.key)?.monthNumber || 99 }))
    .sort((a, b) => a.monthNumber - b.monthNumber);

  return {
    total: baseRows.length,
    byMonth,
    byArea: countBy(baseRows, 'areaSector'),
    byClassification: countBy(baseRows, 'classification'),
    bySourceType: countBySourceType(baseRows),
    topAreas: countBy(baseRows, 'areaSector', 10),
    topDeviations: countBy(baseRows, 'deviation', 10),
    quality: {
      ...summarizeSheet(effectiveQualityRows),
      source: effectiveQualityRows[0]?.effectiveSource || 'specific_sheet',
      specificSheetTotal: kpiRows.filter((row) => row.sheetType === SHEET_TYPES.QUALITY).length,
      annualClassificationTotal: kpiRows.filter((row) => row.sheetType === SHEET_TYPES.ANNUAL && isClassification(row, 'calidad')).length
    },
    logistics: {
      ...summarizeSheet(effectiveLogisticsRows),
      source: effectiveLogisticsRows[0]?.effectiveSource || 'specific_sheet',
      specificSheetTotal: kpiRows.filter((row) => row.sheetType === SHEET_TYPES.LOGISTICS).length,
      annualClassificationTotal: kpiRows.filter((row) => row.sheetType === SHEET_TYPES.ANNUAL && isClassification(row, 'logistica')).length
    }
  };
}

function detectWorkbookYear(rows = [], fallbackDate = new Date()) {
  const years = rows.map((row) => row.year).filter((year) => Number.isInteger(year));
  if (years.length) {
    const counts = new Map();
    years.forEach((year) => counts.set(year, (counts.get(year) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return fallbackDate.getFullYear();
}

export async function parseAnnualDeviationWorkbook(fileBuffer, options = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const selectedSheets = {};
  workbook.worksheets.forEach((worksheet) => {
    const type = resolveSheetType(worksheet.name);
    if (type) {
      if (!selectedSheets[type]) selectedSheets[type] = [];
      selectedSheets[type].push(worksheet);
    }
  });

  const missing = Object.values(SHEET_TYPES).filter((type) => !selectedSheets[type]?.length);
  if (missing.length) {
    const error = new Error('El Excel anual no tiene las 3 hojas esperadas: anual, calidad y logística.');
    error.status = 400;
    error.details = { missing, sheetNames: workbook.worksheets.map((sheet) => sheet.name) };
    throw error;
  }

  const sheets = {};
  const allRows = [];
  const warnings = [];
  const sheetDiagnostics = [];

  Object.entries(selectedSheets).forEach(([type, worksheets]) => {
    const parsedSheets = worksheets.map((worksheet) => parseWorksheet(worksheet, type));
    sheets[type] = {
      name: worksheets.length === 1 ? worksheets[0].name : worksheets.map((sheet) => sheet.name),
      columns: parsedSheets[0]?.columns || [],
      rows: parsedSheets.flatMap((parsed) => parsed.rows)
    };
    parsedSheets.forEach((parsed) => {
      allRows.push(...parsed.rows);
      warnings.push(...parsed.warnings);
      sheetDiagnostics.push(parsed.diagnostics);
    });
  });

  const validThroughMonth = determineExpectedPeriodEndMonth(allRows, options);
  const { rows: kpiRows, omittedRows } = buildKpiRows(allRows, validThroughMonth);
  const summary = buildSummary(allRows, { kpiRows });
  const omittedRowWarnings = buildOmittedRowWarnings(omittedRows);
  return {
    year: detectWorkbookYear(allRows),
    validThroughMonth,
    sheetNames: Object.fromEntries(Object.entries(selectedSheets).map(([type, worksheets]) => [
      type,
      worksheets.length === 1 ? worksheets[0].name : worksheets.map((sheet) => sheet.name)
    ])),
    sheets,
    rows: kpiRows,
    kpiRows,
    summary,
    diagnostics: {
      sheets: sheetDiagnostics,
      kpi: {
        validThroughMonth,
        validThroughMonthLabel: getMonthLabel(validThroughMonth),
        rawParsedRows: allRows.length,
        processedRows: kpiRows.length,
        omittedRows
      }
    },
    warnings: [...warnings, ...omittedRowWarnings].filter(Boolean)
  };
}

export { SHEET_TYPES, normalizeKey, cleanDisplayText, normalizeSourceType, buildSummary, getEffectiveRowsForType };
