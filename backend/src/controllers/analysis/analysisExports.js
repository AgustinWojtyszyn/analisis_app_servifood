import {
  returnSupabaseError,
  ensureSupabaseConfigured,
  isAdminUser
} from '../analysisController.utils.js';
import { getSupabaseAdmin } from './context.js';
import { buildBulkExportWorkbookBuffer } from '../../services/analysis/bulkExportWorkbook.js';

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

    const buffer = await buildBulkExportWorkbookBuffer(data || []);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="analisis_bulk_${Date.now()}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error exportando análisis en lote:', error);
    return res.status(500).json({ error: 'Error exportando análisis en lote' });
  }
}
