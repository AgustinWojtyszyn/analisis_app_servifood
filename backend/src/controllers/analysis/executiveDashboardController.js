import { getSupabaseAdmin } from './context.js';
import { ensureSupabaseConfigured } from '../analysisController.utils.js';
import { loadExecutiveDashboard } from '../../services/dashboard/executiveDashboard.js';

export async function getExecutiveDashboard(req, res) {
  const db = getSupabaseAdmin();
  if (!ensureSupabaseConfigured(res, db)) return;
  try {
    res.setHeader('Cache-Control', 'no-store');
    return res.json(await loadExecutiveDashboard(db));
  } catch {
    return res.status(500).json({ error: 'No se pudo obtener el dashboard ejecutivo' });
  }
}
