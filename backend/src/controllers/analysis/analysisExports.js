import * as XLSX from 'xlsx';
import { normalizeCellValue } from '../../services/analyzeExcel/normalizers.js';
import {
  normalizeStoredAnalysisResults,
  normalizeExportClassification,
  normalizeExportTipo,
  normalizeExportEstado,
  normalizeExportIso
} from '../analysisController.mappers.js';
import {
  returnSupabaseError,
  ensureSupabaseConfigured,
  isAdminUser
} from '../analysisController.utils.js';
import { getSupabaseAdmin } from './context.js';

export async function exportBulkAnalyses(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) {
      return res.status(400).json({ error: 'Debes enviar ids para exportar' });
    }

    const isAdmin = isAdminUser(req.user);
    let query = supabaseAdmin
      .from('analysis_history')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false });
    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) {
      return returnSupabaseError(res, 'export_bulk_fetch', error);
    }

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
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="analisis_bulk_${Date.now()}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error exportando análisis en lote:', error);
    return res.status(500).json({ error: 'Error exportando análisis en lote' });
  }
}
