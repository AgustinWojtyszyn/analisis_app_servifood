import { safeExcelCell } from './safeExcelCell.js';

const ANALYSIS_RESULTS_EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ANALYSIS_RESULTS_SHEET_NAME = 'Resultados';

async function loadExcelJs() {
  const module = await import('exceljs');
  return module.default || module;
}

async function buildAnalysisResultsWorkbookBuffer({ headers = [], rows = [] } = {}) {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(ANALYSIS_RESULTS_SHEET_NAME);
  sheet.addRow(headers.map(safeExcelCell));
  rows.forEach((row) => {
    sheet.addRow(headers.map((header) => safeExcelCell(row[header] ?? '')));
  });
  return workbook.xlsx.writeBuffer();
}

async function downloadAnalysisResultsWorkbook({ headers = [], rows = [], fileName = 'analisis_todos.xlsx' } = {}) {
  const buffer = await buildAnalysisResultsWorkbookBuffer({ headers, rows });
  const blob = new Blob([buffer], { type: ANALYSIS_RESULTS_EXCEL_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export {
  ANALYSIS_RESULTS_EXCEL_MIME_TYPE,
  ANALYSIS_RESULTS_SHEET_NAME,
  buildAnalysisResultsWorkbookBuffer,
  downloadAnalysisResultsWorkbook
};
