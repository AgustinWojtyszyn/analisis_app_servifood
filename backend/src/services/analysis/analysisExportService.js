import * as XLSX from 'xlsx';
import {
  normalizeStoredAnalysisResults,
  normalizeExportClassification,
  normalizeExportTipo,
  normalizeExportEstado,
  normalizeExportIso
} from '../../controllers/analysisController.mappers.js';
import { normalizeCellValue } from '../analyzeExcel/normalizers.js';

export function buildBulkExportWorkbook(data = []) {
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
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Analisis');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
