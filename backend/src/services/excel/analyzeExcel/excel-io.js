import ExcelJS from 'exceljs';
import { normalizeCellValue, normalizeForMatch } from '../../analyzeExcel/normalizers.js';

const DEVIATION_HEADER_ALIASES = [
  'desvio detectado',
  'desvío detectado',
  'desviacion detectada',
  'desviación detectada',
  'hallazgo detectado',
  'hallazgo',
  'descripcion del desvio',
  'descripción del desvío',
  'descripcion',
  'detalle del desvio'
];

function normalizeHeaderKey(value = '') {
  return normalizeCellValue(value)
    .replace(/\r?\n/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  const maxRows = Math.min(sheet.rowCount || 0, 40);
  const CORE_ALIASES = {
    fecha: ['fecha', 'fecha del desvio', 'fecha de registro'],
    area: ['area / sector', 'area / proceso', 'area', 'sector'],
    desvio: DEVIATION_HEADER_ALIASES
  };

  // Fast-path: primer row que luce inequívocamente como cabecera de desvíos.
  for (let r = 1; r <= maxRows; r += 1) {
    const rowValues = sheet.getRow(r).values || [];
    const cells = rowValues.slice(1).map((value) => normalizeHeaderKey(value)).filter(Boolean);
    if (!cells.length) continue;
    const hasFecha = CORE_ALIASES.fecha.some((a) => cells.some((c) => c === a || c.startsWith(a)));
    const hasArea = CORE_ALIASES.area.some((a) => cells.some((c) => c === a || c.startsWith(a)));
    const hasDesvio = CORE_ALIASES.desvio.some((a) => cells.some((c) => c === a || c.startsWith(a)));
    if (hasDesvio && (hasFecha || hasArea)) return r;
  }

  let bestRow = 1;
  let bestScore = -1;

  const headerSignalRegex = /(fecha|area|proceso|actividad|descripcion|desvio|desviacion|observacion|hallazgo|detalle|comentario|nota|accion|resultado|tipo|sector|estado)/i;

  for (let r = 1; r <= maxRows; r += 1) {
    const rowValues = sheet.getRow(r).values || [];
    const cells = rowValues
      .slice(1)
      .map((value) => normalizeHeaderKey(value))
      .filter(Boolean);

    if (cells.length === 0) continue;

    let score = 0;
    score += cells.length;
    score += cells.filter((cell) => headerSignalRegex.test(cell)).length * 8;
    score += cells.filter((cell) => DEVIATION_HEADER_ALIASES.includes(cell)).length * 50;
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
  if (sheets.length === 0) return { chosen: null, ranking: [] };
  if (sheets.length === 1) {
    const only = sheets[0];
    return {
      chosen: only,
      ranking: [
        {
          rank: 1,
          sheetName: only?.name || '',
          rowsAfterHeader: Math.max(0, (only?.rowCount || 0) - 1),
          detectedHeaderRow: 1,
          headerMatchCount: 0,
          deviationHeaderCount: 0,
          longTextCells: 0,
          totalScore: 0
        }
      ]
    };
  }

  const headerSignalRegex = /(descripcion|desvio|desviacion|observacion|hallazgo|detalle|comentario|nota|accion|resultado|tipo|sector|fecha)/i;

  const ranked = sheets
    .map((sheet) => {
      const score = scoreWorksheetForDescriptions(sheet);
      const headerRowIndex = detectHeaderRowIndex(sheet);
      const headerValues = sheet.getRow(headerRowIndex).values || [];
      const headerCells = headerValues
        .slice(1)
        .map((h) => normalizeHeaderKey(h))
        .filter(Boolean);
      const headerMatchCount = headerCells.filter((h) => headerSignalRegex.test(h)).length;
      const deviationHeaderCount = headerCells.filter((h) => DEVIATION_HEADER_ALIASES.includes(h)).length;
      const rowsAfterHeader = Math.max(0, (sheet.rowCount || 0) - headerRowIndex);

      return {
        sheet,
        score,
        headerRowIndex,
        headerMatchCount,
        deviationHeaderCount,
        rowsAfterHeader,
        totalScore:
          (deviationHeaderCount * 1000)
          + (headerMatchCount * 50)
          + (score.longTextCells * 3)
          + Math.min(rowsAfterHeader, 300)
      };
    })
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.deviationHeaderCount !== a.deviationHeaderCount) return b.deviationHeaderCount - a.deviationHeaderCount;
      if (b.headerMatchCount !== a.headerMatchCount) return b.headerMatchCount - a.headerMatchCount;
      if (b.score.longTextCells !== a.score.longTextCells) return b.score.longTextCells - a.score.longTextCells;
      return b.score.totalTextLength - a.score.totalTextLength;
    });

  return {
    chosen: ranked[0]?.sheet || sheets[0],
    ranking: ranked.map((item, idx) => ({
      rank: idx + 1,
      sheetName: item.sheet?.name || '',
      rowsAfterHeader: item.rowsAfterHeader,
      detectedHeaderRow: item.headerRowIndex,
      headerMatchCount: item.headerMatchCount,
      deviationHeaderCount: item.deviationHeaderCount,
      longTextCells: item.score.longTextCells,
      totalScore: item.totalScore
    }))
  };
}

function detectHeaders(headerRow) {
  const headers = {};
  const headerValues = headerRow || [];

  const mapping = {
    fecha: ['fecha', 'date', 'fecha de registro', 'fecha del evento'],
    areaProceso: ['area', 'area / proceso', 'area/proceso', 'proceso', 'sector', 'departamento'],
    hallazgoDetectado: DEVIATION_HEADER_ALIASES,
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
      const headerValue = normalizeHeaderKey(headerValues[i] || '');
      for (const alias of aliases) {
        const aliasNorm = normalizeHeaderKey(alias);
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

  const sheetSelection = selectBestWorksheet(workbook);
  const sheet = sheetSelection?.chosen;
  if (!sheet) {
    throw new Error('No se pudo seleccionar una hoja valida para analizar');
  }

  const headerRowIndex = detectHeaderRowIndex(sheet);
  const headerValues = sheet.getRow(headerRowIndex).values || [];
  const rows = [];
  const headerIndexes = detectHeaders(headerValues);

  const maxCols = Math.max(1, headerValues.length - 1);
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return;
    const resolvedValues = [];
    for (let c = 1; c <= maxCols; c += 1) {
      const cell = sheet.getCell(rowNumber, c);
      resolvedValues[c] = normalizeCellValue(cell?.value);
    }
    rows.push(resolvedValues);
  });

  if (rows.length === 0) {
    throw new Error('El archivo Excel no contiene registros (solo encabezados)');
  }

  return {
    sheet,
    headerRowIndex,
    headerValues,
    headerIndexes,
    rows,
    diagnostics: {
      workbookSheets: (workbook.worksheets || []).map((ws) => ({
        name: ws.name,
        rowCount: ws.rowCount || 0
      })),
      workbookMeta: {
        created: workbook?.created ? normalizeCellValue(workbook.created) : '',
        modified: workbook?.modified ? normalizeCellValue(workbook.modified) : '',
        creator: workbook?.creator || '',
        lastModifiedBy: workbook?.lastModifiedBy || ''
      },
      worksheetSelected: sheet.name,
      worksheetRanking: sheetSelection?.ranking || [],
      detectedHeaderRow: headerRowIndex,
      detectedHeaders: headerIndexes,
      deviationColumnIndex: headerIndexes.hallazgoDetectado ?? null
    }
  };
}

function createFillDownState() {
  return {
    fecha: '',
    contextYear: null,
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
