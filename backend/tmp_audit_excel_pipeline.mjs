import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { analyzeExcel } from './src/services/analyzeExcel.js';
import { normalizeCellValue, normalizeForMatch } from './src/services/analyzeExcel/normalizers.js';
import { detectHeaders } from './src/services/analyzeExcel.js';

function useful(text) {
  const t = normalizeForMatch(text || '');
  if (!t) return false;
  return !['-', 'na', 'n a', 'nd', 'n d', 's d', 's/d'].includes(t);
}

function detectHeaderRowIndex(sheet) {
  const maxRows = Math.min(sheet.rowCount || 0, 20);
  let bestRow = 1;
  let bestScore = -1;
  const re = /(fecha|area|proceso|actividad|descripcion|desvio|desvío|observacion|hallazgo|detalle|comentario|nota|accion|resultado|tipo)/i;
  for (let r = 1; r <= maxRows; r += 1) {
    const vals = sheet.getRow(r).values || [];
    const cells = vals.slice(1).map((v) => normalizeCellValue(v).trim()).filter(Boolean);
    if (!cells.length) continue;
    let score = cells.length;
    score += cells.filter((c) => re.test(normalizeForMatch(c))).length * 8;
    score += cells.filter((c) => c.length <= 40).length;
    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }
  return bestRow;
}

function getHeaderAt(values, idx) {
  if (!Number.isInteger(idx)) return null;
  return normalizeCellValue(values[idx] || '').trim() || null;
}

function scoreWorksheetForDescriptions(sheet) {
  let longTextCells = 0;
  let totalTextLength = 0;
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
    }
  }
  return { longTextCells, totalTextLength };
}

function selectBestWorksheetName(workbook) {
  const sheets = workbook.worksheets || [];
  if (sheets.length === 0) return null;
  if (sheets.length === 1) return sheets[0].name;

  const re = /(descripcion|desvio|desvío|observacion|observación|hallazgo|detalle|comentario|nota|accion|acción|resultado|tipo)/i;
  const ranked = sheets
    .map((sheet) => {
      const score = scoreWorksheetForDescriptions(sheet);
      const headerRowIndex = detectHeaderRowIndex(sheet);
      const headerValues = sheet.getRow(headerRowIndex).values || [];
      const headerMatchCount = headerValues
        .slice(1)
        .map((h) => normalizeCellValue(h))
        .filter((h) => re.test(normalizeForMatch(h)))
        .length;
      return { sheet, score, headerMatchCount };
    })
    .sort((a, b) => {
      if (b.headerMatchCount !== a.headerMatchCount) return b.headerMatchCount - a.headerMatchCount;
      if (b.score.longTextCells !== a.score.longTextCells) return b.score.longTextCells - a.score.longTextCells;
      return b.score.totalTextLength - a.score.totalTextLength;
    });
  return ranked[0]?.sheet?.name || sheets[0].name;
}

async function audit(filePath) {
  const abs = path.resolve(filePath);
  const buf = await fs.readFile(abs);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const sheets = [];
  for (const ws of wb.worksheets) {
    const headerRowIndex = detectHeaderRowIndex(ws);
    const headerValues = ws.getRow(headerRowIndex).values || [];
    const detected = detectHeaders(headerValues);

    const hallazgoIndexCandidates = [
      detected.hallazgoDetectado,
      detected.descripcion,
      detected.actividadRealizada
    ].filter(Number.isInteger);

    const hallazgoIndex = hallazgoIndexCandidates[0];

    let physicalRowsAfterHeader = 0;
    let rowsWithUsefulDeviationText = 0;
    const sampleRows = [];

    ws.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIndex) return;
      physicalRowsAfterHeader += 1;
      const vals = row.values || [];
      const dev = Number.isInteger(hallazgoIndex) ? normalizeCellValue(vals[hallazgoIndex]).trim() : '';
      if (useful(dev)) {
        rowsWithUsefulDeviationText += 1;
        if (sampleRows.length < 8) {
          sampleRows.push({ rowNumber, dev });
        }
      }
    });

    sheets.push({
      name: ws.name,
      rowCount: ws.rowCount,
      headerRowIndex,
      headerDetected: detected,
      mappedHeaderNames: {
        hallazgoDetectado: getHeaderAt(headerValues, detected.hallazgoDetectado),
        descripcion: getHeaderAt(headerValues, detected.descripcion),
        actividadRealizada: getHeaderAt(headerValues, detected.actividadRealizada),
        fecha: getHeaderAt(headerValues, detected.fecha),
        areaProceso: getHeaderAt(headerValues, detected.areaProceso)
      },
      hallazgoColumnUsedForAudit: getHeaderAt(headerValues, hallazgoIndex),
      physicalRowsAfterHeader,
      rowsWithUsefulDeviationText,
      sampleRows
    });
  }

  const analysis = await analyzeExcel(buf, {});

  const records = analysis?.records || [];
  const summary = analysis?.summary || {};

  const dateIssues = records
    .filter((r) => /2026-12-/.test(String(r.fecha || '')))
    .slice(0, 12)
    .map((r) => ({ row: r.rawRowNumber, fecha: r.fecha, hallazgo: r.hallazgoDetectado }));

  return {
    file: abs,
    sheets,
    selectedByBackendHeuristic: selectBestWorksheetName(wb),
    backend: {
      success: analysis?.success,
      totalRecords: records.length,
      totalDesvios: summary?.totalDesvios,
      totalFilasLeidas: summary?.excelAudit?.totalFilasLeidas,
      filasDescartadasDesvioVacio: summary?.excelAudit?.filasDescartadasDesvioVacio,
      ejemplosFilasDescartadas: summary?.excelAudit?.ejemplosFilasDescartadas || [],
      totalNoFindingAntes: summary?.noFindingAudit?.totalNoFindingAntes,
      recordsSentToFrontend: records.length,
      sampleRecords: records.slice(0, 10).map((r) => ({
        row: r.rawRowNumber,
        fecha: r.fecha,
        hallazgo: r.hallazgoDetectado,
        categoria: r.categoriaDesvio
      })),
      dateIssues2026December: dateIssues
    }
  };
}

const input = process.argv[2];
if (!input) {
  console.error('Uso: node backend/tmp_audit_excel_pipeline.mjs <archivo.xlsx>');
  process.exit(1);
}

const out = await audit(input);
console.log(JSON.stringify(out, null, 2));
