const REQUIRED_COLUMNS = {
  month: ['mes'],
  claim: ['reclamo'],
  hazardType: ['tipo de peligro', 'tipo peligro'],
  area: ['area', 'área']
};

const OPTIONAL_COLUMNS = {
  year: ['año', 'anio'],
  date: ['fecha', 'fecha del reclamo', 'fecha de reclamo'],
  severity: ['severidad'],
  probableCause: ['causa probable'],
  client: ['cliente'],
  status: ['estado']
};

const MONTH_ORDER = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
];

const MONTH_LABELS = {
  enero: 'Enero',
  febrero: 'Febrero',
  marzo: 'Marzo',
  abril: 'Abril',
  mayo: 'Mayo',
  junio: 'Junio',
  julio: 'Julio',
  agosto: 'Agosto',
  septiembre: 'Septiembre',
  octubre: 'Octubre',
  noviembre: 'Noviembre',
  diciembre: 'Diciembre'
};

export const MINIMUM_CUSTOMER_NC_COLUMNS = 'Mes, Reclamo, Tipo de peligro y Area';
export const MAX_CUSTOMER_NC_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_CUSTOMER_NC_FILE_SIZE_MB = MAX_CUSTOMER_NC_FILE_SIZE_BYTES / (1024 * 1024);
export const MAX_CUSTOMER_NC_SHEETS = 20;
export const MAX_CUSTOMER_NC_ROWS = 10000;
export const MAX_CUSTOMER_NC_CELLS = 200000;

const CUSTOMER_NC_ALLOWED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream'
]);

export function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDisplayText(value, fallback = 'Sin especificar') {
  const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  const lower = cleaned.toLocaleLowerCase('es-AR');
  return lower.replace(/(^|\s|\/|-)([a-záéíóúñ])/g, (match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase('es-AR')}`);
}

export function normalizeArea(value) {
  const key = normalizeKey(value);
  if (!key) return 'Sin especificar';
  if (key === 'area caliente') return 'Área caliente';
  if (key === 'area fria') return 'Área fría';
  return normalizeDisplayText(value);
}

export function normalizeMonth(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return MONTH_LABELS[MONTH_ORDER[value.getMonth()]] || 'Sin especificar';
  }
  const key = normalizeKey(value);
  if (!key) return 'Sin especificar';
  const matched = MONTH_ORDER.find((month) => key === month || key.startsWith(`${month} `));
  return matched ? MONTH_LABELS[matched] : normalizeDisplayText(value);
}

export function normalizeStatus(value) {
  const key = normalizeKey(value);
  if (!key) return 'Sin especificar';
  if (key.includes('cerrad')) return 'Cerrado';
  if (key.includes('abiert')) return 'Abierto';
  return normalizeDisplayText(value);
}

export function normalizeGeneric(value) {
  return normalizeDisplayText(value);
}

function cellValueToPlain(value) {
  if (value == null) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if ('result' in value) return cellValueToPlain(value.result);
    if ('text' in value) return cellValueToPlain(value.text);
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('');
    if ('hyperlink' in value && 'text' in value) return cellValueToPlain(value.text);
  }
  return String(value).trim();
}

function findColumnIndex(headerMap, aliases) {
  return aliases.map((alias) => headerMap.get(normalizeKey(alias))).find((index) => Number.isInteger(index));
}

function extractYearFromDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getFullYear();
  const raw = String(value ?? '').trim();
  const matched = raw.match(/\b(20\d{2}|19\d{2})\b/);
  return matched ? Number(matched[1]) : null;
}

function extractMonthFromDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return normalizeMonth(value);
  return null;
}

function readCell(row, index) {
  if (!Number.isInteger(index)) return '';
  return cellValueToPlain(row.getCell(index).value);
}

export function detectCustomerNcHeaderRow(worksheet) {
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const headerMap = new Map();
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = normalizeKey(cellValueToPlain(cell.value));
      if (key) headerMap.set(key, colNumber);
    });

    const columns = Object.fromEntries(
      Object.entries(REQUIRED_COLUMNS).map(([field, aliases]) => [field, findColumnIndex(headerMap, aliases)])
    );

    if (Object.values(columns).every(Number.isInteger)) {
      const optionalColumns = Object.fromEntries(
        Object.entries(OPTIONAL_COLUMNS).map(([field, aliases]) => [field, findColumnIndex(headerMap, aliases)])
      );
      return { rowNumber, columns: { ...columns, ...optionalColumns } };
    }
  }
  return null;
}

export function detectCustomerNcHeaderRowFromRows(rows) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const headerMap = new Map();
    (rows[rowIndex] || []).forEach((value, columnIndex) => {
      const key = normalizeKey(cellValueToPlain(value));
      if (key) headerMap.set(key, columnIndex);
    });

    const columns = Object.fromEntries(
      Object.entries(REQUIRED_COLUMNS).map(([field, aliases]) => [field, findColumnIndex(headerMap, aliases)])
    );

    if (Object.values(columns).every(Number.isInteger)) {
      const optionalColumns = Object.fromEntries(
        Object.entries(OPTIONAL_COLUMNS).map(([field, aliases]) => [field, findColumnIndex(headerMap, aliases)])
      );
      return { rowIndex, columns: { ...columns, ...optionalColumns } };
    }
  }
  return null;
}

export function buildCustomerNcRecord(row, columns, sourceFileName, importedAt) {
  const dateValue = readCell(row, columns.date);
  const yearFromDate = extractYearFromDate(dateValue);
  const yearRaw = readCell(row, columns.year);
  const year = yearFromDate || extractYearFromDate(yearRaw);
  const monthFromDate = extractMonthFromDate(dateValue);

  return {
    month: monthFromDate || normalizeMonth(readCell(row, columns.month)),
    year,
    claim: normalizeGeneric(readCell(row, columns.claim)),
    hazardType: normalizeGeneric(readCell(row, columns.hazardType)),
    severity: Number.isInteger(columns.severity) ? normalizeGeneric(readCell(row, columns.severity)) : null,
    probableCause: Number.isInteger(columns.probableCause) ? normalizeGeneric(readCell(row, columns.probableCause)) : null,
    area: normalizeArea(readCell(row, columns.area)),
    client: Number.isInteger(columns.client) ? normalizeGeneric(readCell(row, columns.client)) : null,
    status: Number.isInteger(columns.status) ? normalizeStatus(readCell(row, columns.status)) : null,
    sourceFileName,
    importedAt
  };
}

function readRawCell(row, index) {
  if (!Number.isInteger(index)) return '';
  return cellValueToPlain(row[index]);
}

export function buildCustomerNcRecordFromRawRow(row, columns, sourceFileName, importedAt) {
  const dateValue = readRawCell(row, columns.date);
  const yearFromDate = extractYearFromDate(dateValue);
  const yearRaw = readRawCell(row, columns.year);
  const year = yearFromDate || extractYearFromDate(yearRaw);
  const monthFromDate = extractMonthFromDate(dateValue);

  return {
    month: monthFromDate || normalizeMonth(readRawCell(row, columns.month)),
    year,
    claim: normalizeGeneric(readRawCell(row, columns.claim)),
    hazardType: normalizeGeneric(readRawCell(row, columns.hazardType)),
    severity: Number.isInteger(columns.severity) ? normalizeGeneric(readRawCell(row, columns.severity)) : null,
    probableCause: Number.isInteger(columns.probableCause) ? normalizeGeneric(readRawCell(row, columns.probableCause)) : null,
    area: normalizeArea(readRawCell(row, columns.area)),
    client: Number.isInteger(columns.client) ? normalizeGeneric(readRawCell(row, columns.client)) : null,
    status: Number.isInteger(columns.status) ? normalizeStatus(readRawCell(row, columns.status)) : null,
    sourceFileName,
    importedAt
  };
}

export function isEmptyCustomerNcRecord(record) {
  return [record.month, record.claim, record.hazardType, record.area]
    .every((value) => normalizeKey(value) === 'sin especificar' || !normalizeKey(value));
}

export function getCustomerNcWarnings(columns) {
  const missingOptional = ['severity', 'client', 'status']
    .filter((field) => !Number.isInteger(columns[field]));
  const warnings = [];

  if (missingOptional.length > 0) {
    warnings.push('El archivo no contiene algunas columnas opcionales como Severidad, Cliente o Estado. Algunos indicadores no estarán disponibles.');
  }

  if (!Number.isInteger(columns.year) && !Number.isInteger(columns.date)) {
    warnings.push('Este archivo no contiene año ni fecha exacta. Si se cargan datos de distintos años, los meses iguales podrían mezclarse.');
  }

  return warnings;
}

function isCustomerNcExcelFilename(fileName = '') {
  return String(fileName || '').toLowerCase().endsWith('.xlsx');
}

function isCustomerNcExcelMime(mimeType = '') {
  const mime = String(mimeType || '').toLowerCase().trim();
  return !mime || CUSTOMER_NC_ALLOWED_MIME_TYPES.has(mime);
}

function validateCustomerNcFile(file) {
  const name = String(file?.name || '').trim();
  const size = Number(file?.size || 0);

  if (!file) {
    throw new Error('Seleccioná un archivo Excel .xlsx.');
  }
  if (!isCustomerNcExcelFilename(name)) {
    throw new Error('Formato inválido. Seleccioná un archivo Excel .xlsx.');
  }
  if (!isCustomerNcExcelMime(file.type)) {
    throw new Error('Tipo de archivo inválido. Seleccioná un Excel .xlsx válido.');
  }
  if (size <= 0) {
    throw new Error('El archivo Excel está vacío.');
  }
  if (size > MAX_CUSTOMER_NC_FILE_SIZE_BYTES) {
    throw new Error(`El archivo supera el máximo permitido de ${MAX_CUSTOMER_NC_FILE_SIZE_MB} MB.`);
  }
}

async function loadExcelJs() {
  const module = await import('exceljs');
  return module.default || module;
}

function worksheetToRows(worksheet) {
  const rowCount = Number(worksheet?.rowCount || 0);
  const columnCount = Number(worksheet?.columnCount || 0);
  if (rowCount > MAX_CUSTOMER_NC_ROWS) {
    throw new Error(`El archivo supera el máximo permitido de ${MAX_CUSTOMER_NC_ROWS} filas en la hoja procesada.`);
  }
  if (rowCount * columnCount > MAX_CUSTOMER_NC_CELLS) {
    throw new Error(`El archivo supera el máximo permitido de ${MAX_CUSTOMER_NC_CELLS} celdas en la hoja procesada.`);
  }

  const rows = [];
  for (let rowNumber = 1; rowNumber <= rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = [];
    for (let columnNumber = 1; columnNumber <= columnCount; columnNumber += 1) {
      values.push(cellValueToPlain(row.getCell(columnNumber).value));
    }
    rows.push(values);
  }
  return rows;
}

export async function parseCustomerNonconformitiesWorkbook(file) {
  validateCustomerNcFile(file);
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new Error('El archivo Excel está dañado o no puede procesarse.');
  }

  const worksheets = workbook.worksheets || [];
  if (worksheets.length > MAX_CUSTOMER_NC_SHEETS) {
    throw new Error(`El archivo supera el máximo permitido de ${MAX_CUSTOMER_NC_SHEETS} hojas.`);
  }

  const sheetNames = worksheets.map((worksheet) => worksheet.name);
  const sheetName = sheetNames.includes('KPI 1 - Reclamos Mes')
    ? 'KPI 1 - Reclamos Mes'
    : sheetNames[0];
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    throw new Error(`No se encontraron hojas para analizar. El archivo debe incluir al menos: ${MINIMUM_CUSTOMER_NC_COLUMNS}.`);
  }

  const rows = worksheetToRows(worksheet);
  const detected = detectCustomerNcHeaderRowFromRows(rows);
  if (!detected) {
    throw new Error(`No se encontraron las columnas necesarias para analizar no conformidades de clientes. El archivo debe incluir al menos: ${MINIMUM_CUSTOMER_NC_COLUMNS}.`);
  }

  const importedAt = new Date().toISOString();
  const records = [];
  for (let rowIndex = detected.rowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const record = buildCustomerNcRecordFromRawRow(rows[rowIndex] || [], detected.columns, file.name, importedAt);
    if (!isEmptyCustomerNcRecord(record)) {
      records.push(record);
    }
  }

  return {
    records,
    warnings: getCustomerNcWarnings(detected.columns),
    headerRowNumber: detected.rowIndex + 1,
    worksheetName: sheetName
  };
}

export function sortMonthData(data) {
  return [...data].sort((a, b) => {
    const aIndex = MONTH_ORDER.indexOf(normalizeKey(a.name));
    const bIndex = MONTH_ORDER.indexOf(normalizeKey(b.name));
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return String(a.name).localeCompare(String(b.name), 'es');
  });
}

export function countBy(records, field) {
  const map = new Map();
  records.forEach((record) => {
    const value = record[field] || 'Sin especificar';
    map.set(value, (map.get(value) || 0) + 1);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'));
}

export function uniqueValues(records, field) {
  return [...new Set(records.map((record) => record[field]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));
}
