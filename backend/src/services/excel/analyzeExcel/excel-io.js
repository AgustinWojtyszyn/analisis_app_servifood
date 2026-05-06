import ExcelJS from 'exceljs';
import { normalizeCellValue, normalizeForMatch } from '../../analyzeExcel/normalizers.js';

function scoreWorksheetForDescriptions(sheet) {
  let longTextCells = 0;
  let totalTextLength = 0;
  let checked = 0;

  const maxRowsToScan = Math.min(sheet.rowCount || 0, 120);
  for (let r = 1; r <= maxRowsToScan; r += 1) {
    const rowValues = sheet.getRow(r).values || [];
    for (let c = 1; c < rowValues.length; c += 1) {
      const text = normalizeCellValue(rowValues[c]).trim();
      if (!text) continue;
      if (text.length > 20) {
        longTextCells += 1;
        totalTextLength += text.length;
      }
      checked += 1;
    }
  }

  return {
    longTextCells,
    totalTextLength,
    checked
  };
}

function detectHeaderRowIndex(sheet) {
  const maxRows = Math.min(sheet.rowCount || 0, 20);
  let bestRow = 1;
  let bestScore = -1;

  const headerSignalRegex = /(fecha|area|proceso|actividad|descripcion|desvio|desvío|observacion|observación|hallazgo|detalle|comentario|nota|accion|acción|resultado|tipo)/i;

  for (let r = 1; r <= maxRows; r += 1) {
    const rowValues = sheet.getRow(r).values || [];
    const cells = rowValues
      .slice(1)
      .map((value) => normalizeCellValue(value).trim())
      .filter(Boolean);

    if (cells.length === 0) continue;

    let score = 0;
    score += cells.length;
    score += cells.filter((cell) => headerSignalRegex.test(normalizeForMatch(cell))).length * 8;
    score += cells.filter((cell) => cell.length <= 40).length;

    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }

  return bestRow;
}

function selectBestWorksheet(workbook) {
  const sheets = workbook.worksheets || [];
  if (sheets.length === 0) return null;
  if (sheets.length === 1) return sheets[0];

  const headerSignalRegex = /(descripcion|desvio|desvío|observacion|observación|hallazgo|detalle|comentario|nota|accion|acción|resultado|tipo)/i;

  const ranked = sheets
    .map((sheet) => {
      const score = scoreWorksheetForDescriptions(sheet);
      const headerRowIndex = detectHeaderRowIndex(sheet);
      const headerValues = sheet.getRow(headerRowIndex).values || [];
      const headerMatchCount = headerValues
        .slice(1)
        .map((h) => normalizeCellValue(h))
        .filter((h) => headerSignalRegex.test(normalizeForMatch(h)))
        .length;

      return { sheet, score, headerRowIndex, headerMatchCount };
    })
    .sort((a, b) => {
      if (b.headerMatchCount !== a.headerMatchCount) {
        return b.headerMatchCount - a.headerMatchCount;
      }
      if (b.score.longTextCells !== a.score.longTextCells) {
        return b.score.longTextCells - a.score.longTextCells;
      }
      return b.score.totalTextLength - a.score.totalTextLength;
    });

  const chosen = ranked[0]?.sheet || sheets[0];
  return chosen;
}

function detectHeaders(headerRow) {
  const headers = {};
  const headerValues = headerRow || [];

  const mapping = {
    fecha: ['fecha', 'date', 'fecha de registro', 'fecha del evento'],
    areaProceso: ['area', 'area / proceso', 'area/proceso', 'proceso', 'sector', 'departamento'],
    actividadRealizada: ['actividad realizada', 'actividad realizada / descripcion', 'actividad realizada / descripción'],
    descripcion: ['descripcion del desvio', 'descripcion desvio', 'descripcion', 'detalle del desvio', 'detalle desvio', 'hallazgo'],
    observaciones: ['observaciones', 'observacion', 'comentario', 'comentarios'],
    tipoActividad: ['tipo de actividad', 'tipo actividad', 'clasificacion', 'classification'],
    resultado: ['resultado', 'estado', 'resultado obtenido'],
    desvio: ['desvio', 'desvio?', 'desvio ?', '¿desvio?', '¿desvio ?', 'hay desvio', 'no conformidad'],
    accion: ['accion', 'accion?', 'accion ?', '¿accion?', '¿accion ?', 'plan de accion'],
    accionInmediata: ['accion inmediata', 'acción inmediata'],
    accionCorrectiva: ['accion correctiva', 'acción correctiva'],
    numeroAccion: ['n accion', 'n° accion', 'nro accion', 'numero accion', 'id accion'],
    notaTecnica: ['nota tecnica', 'nota', 'detalle tecnico']
  };

  const scoreHeaderMatch = (headerValue, aliasValue) => {
    if (headerValue === aliasValue) return 100;
    if (headerValue.startsWith(`${aliasValue} `) || headerValue.startsWith(`${aliasValue} /`) || headerValue.startsWith(`${aliasValue} (`)) return 80;
    if (headerValue.includes(aliasValue)) return 40;
    return 0;
  };

  for (const [key, aliases] of Object.entries(mapping)) {
    let bestIndex = undefined;
    let bestScore = 0;

    for (let i = 0; i < headerValues.length; i += 1) {
      const headerValue = normalizeForMatch(headerValues[i] || '');
      for (const alias of aliases) {
        const aliasNorm = normalizeForMatch(alias);
        const score = scoreHeaderMatch(headerValue, aliasNorm);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
    }

    if (Number.isInteger(bestIndex)) {
      headers[key] = bestIndex;
    }
  }

  return headers;
}

async function loadExcelParsingContext(fileBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  if (workbook.worksheets.length === 0) {
    throw new Error('El archivo Excel no contiene hojas');
  }

  const sheet = selectBestWorksheet(workbook);
  if (!sheet) {
    throw new Error('No se pudo seleccionar una hoja valida para analizar');
  }

  const headerRowIndex = detectHeaderRowIndex(sheet);
  const headerValues = sheet.getRow(headerRowIndex).values || [];
  const rows = [];
  const headerIndexes = detectHeaders(headerValues);

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return;
    rows.push(row.values);
  });

  if (rows.length === 0) {
    throw new Error('El archivo Excel no contiene registros (solo encabezados)');
  }

  return {
    sheet,
    headerRowIndex,
    headerValues,
    headerIndexes,
    rows
  };
}

function createFillDownState() {
  return {
    fecha: '',
    areaProceso: '',
    actividadRealizada: '',
    tipoActividad: '',
    responsableOriginal: '',
    iso22000Original: '',
    tipoDesvioOriginal: ''
  };
}

export {
  detectHeaders,
  loadExcelParsingContext,
  createFillDownState
};
