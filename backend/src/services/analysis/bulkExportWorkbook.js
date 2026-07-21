import ExcelJS from 'exceljs';
import {
  normalizeStoredAnalysisResults,
  normalizeExportClassification,
  normalizeExportTipo,
  normalizeExportEstado,
  normalizeExportIso
} from '../../controllers/analysisController.mappers.js';
import { normalizeCellValue } from '../analyzeExcel/normalizers.js';
import { safeExcelCell } from '../../utils/safeExcelCell.js';

const BULK_EXPORT_SHEET_NAME = 'Analisis';
const BULK_EXPORT_HEADERS = [
  'analysisId',
  'filename',
  'processedAt',
  'Fecha',
  'Área/Sector',
  'Desvío detectado',
  'Clasificación del desvío',
  'Tipo de desvío',
  'Relación ISO 22000',
  'Estado de acciones',
  'Acción inmediata',
  'Acción correctiva'
];

function buildBulkExportRows(data = []) {
  const rows = [];
  for (const item of data || []) {
    const normalized = normalizeStoredAnalysisResults(item.results || {});
    const records = Array.isArray(normalized?.records) ? normalized.records : [];
    const processedAt = normalizeCellValue(normalized?.summary?.processedAt || item.created_at).trim();
    for (const record of records) {
      rows.push({
        analysisId: item.id,
        filename: item.filename || '',
        processedAt,
        Fecha: normalizeCellValue(record.fecha),
        'Área/Sector': normalizeCellValue(record.areaSector || record.areaClasificada),
        'Desvío detectado': normalizeCellValue(record.desvioDetectado || record.hallazgoDetectado),
        'Clasificación del desvío': normalizeExportClassification(record),
        'Tipo de desvío': normalizeExportTipo(record),
        'Relación ISO 22000': normalizeExportIso(record),
        'Estado de acciones': normalizeExportEstado(record),
        'Acción inmediata': normalizeCellValue(record.immediate_action || record.accionInmediata),
        'Acción correctiva': normalizeCellValue(record.corrective_action || record.accionCorrectiva)
      });
    }
  }
  return rows;
}

function appendJsonRowsToWorksheet(worksheet, rows = [], headers = BULK_EXPORT_HEADERS) {
  if (!rows.length) return;
  worksheet.addRow(headers.map(safeExcelCell));
  for (const row of rows) {
    worksheet.addRow(headers.map((header) => safeExcelCell(row[header] ?? '')));
  }
}

async function writeWorkbookBuffer(workbook) {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function buildBulkExportWorkbookBuffer(data = []) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(BULK_EXPORT_SHEET_NAME);
  appendJsonRowsToWorksheet(worksheet, buildBulkExportRows(data));
  return writeWorkbookBuffer(workbook);
}

export {
  BULK_EXPORT_HEADERS,
  BULK_EXPORT_SHEET_NAME,
  appendJsonRowsToWorksheet,
  buildBulkExportRows,
  buildBulkExportWorkbookBuffer
};
