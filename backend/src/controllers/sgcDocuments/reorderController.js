import {
  canManageByRole
} from '../../routes/nutritionModules/helpers.js';
import { resolveUserRole, supabaseAdmin } from './context.js';

function normalizeItemType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'folder' || normalized === 'document') return normalized;
  return null;
}

function normalizeParentFolderId(value) {
  const raw = String(value || '').trim();
  return raw || null;
}

function normalizeOrderedIds(value) {
  if (!Array.isArray(value)) return null;
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

export async function reorderSgcItems(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para reordenar Documentos SGC' });
    }

    const type = normalizeItemType(req.body?.type);
    const parentFolderId = normalizeParentFolderId(req.body?.parentFolderId ?? req.body?.folderId ?? req.body?.parent_folder_id);
    const orderedIds = normalizeOrderedIds(req.body?.orderedIds ?? req.body?.ordered_ids);

    if (!type) {
      return res.status(400).json({ error: 'Tipo de elemento inválido' });
    }
    if (!orderedIds) {
      return res.status(400).json({ error: 'La lista ordenada es obligatoria' });
    }
    if (new Set(orderedIds).size !== orderedIds.length) {
      return res.status(400).json({ error: 'La lista contiene IDs duplicados' });
    }

    const { data, error } = await supabaseAdmin.rpc('reorder_sgc_items', {
      p_item_type: type,
      p_parent_folder_id: parentFolderId,
      p_ordered_ids: orderedIds
    });

    if (error) {
      return res.status(400).json({ error: error.message || 'No se pudo guardar el orden' });
    }

    return res.json(data || { success: true, type, parentFolderId, count: orderedIds.length });
  } catch (error) {
    return res.status(error.statusCode || (error.message === 'Usuario inactivo' ? 403 : 500)).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : error.message || 'Error interno reordenando Documentos SGC'
    });
  }
}
