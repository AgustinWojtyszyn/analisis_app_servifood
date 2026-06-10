import {
  canManageByRole,
  canViewByRole,
  mapFolderRow
} from '../../routes/nutritionModules/helpers.js';
import { resolveUserRole, supabaseAdmin } from './context.js';

function normalizeNullableUuid(value) {
  const raw = String(value || '').trim();
  return raw || null;
}

async function assertParentFolder(parentId, currentFolderId = null) {
  if (!parentId) return null;
  if (currentFolderId && parentId === currentFolderId) {
    const error = new Error('No se puede mover una carpeta dentro de sí misma');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabaseAdmin
    .from('sgc_document_folders')
    .select('id, parent_id, status')
    .eq('id', parentId)
    .maybeSingle();

  if (error) {
    const err = new Error(error.message || 'Error validando carpeta destino');
    err.statusCode = 500;
    throw err;
  }
  if (!data || data.status === 'archivado') {
    const err = new Error('La carpeta destino no existe o está archivada');
    err.statusCode = 400;
    throw err;
  }

  if (!currentFolderId) return data;

  let cursor = data;
  const visited = new Set();
  while (cursor?.parent_id) {
    if (cursor.parent_id === currentFolderId) {
      const err = new Error('No se puede mover una carpeta dentro de una subcarpeta propia');
      err.statusCode = 400;
      throw err;
    }
    if (visited.has(cursor.parent_id)) {
      const err = new Error('Se detectó una jerarquía inválida de carpetas');
      err.statusCode = 400;
      throw err;
    }
    visited.add(cursor.parent_id);
    const { data: parent, error: parentError } = await supabaseAdmin
      .from('sgc_document_folders')
      .select('id, parent_id, status')
      .eq('id', cursor.parent_id)
      .maybeSingle();
    if (parentError) {
      const err = new Error(parentError.message || 'Error validando jerarquía');
      err.statusCode = 500;
      throw err;
    }
    cursor = parent;
  }

  return data;
}

async function getNextFolderSortOrder(parentId) {
  let query = supabaseAdmin
    .from('sgc_document_folders')
    .select('sort_order')
    .neq('status', 'archivado')
    .order('sort_order', { ascending: false })
    .limit(1);

  query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null);

  const { data, error } = await query;
  if (error) {
    const err = new Error(error.message || 'Error calculando orden de carpeta');
    err.statusCode = 500;
    throw err;
  }
  return Number(data?.[0]?.sort_order ?? -1) + 1;
}

async function ensureFolderIsEmpty(folderId) {
  const [{ count: childCount, error: childError }, { count: documentCount, error: documentError }] = await Promise.all([
    supabaseAdmin
      .from('sgc_document_folders')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', folderId)
      .neq('status', 'archivado'),
    supabaseAdmin
      .from('nutrition_modules')
      .select('id', { count: 'exact', head: true })
      .eq('folder_id', folderId)
  ]);

  if (childError || documentError) {
    const err = new Error(childError?.message || documentError?.message || 'Error validando contenido de carpeta');
    err.statusCode = 500;
    throw err;
  }

  if (Number(childCount || 0) > 0 || Number(documentCount || 0) > 0) {
    const err = new Error('La carpeta contiene subcarpetas o documentos. Mové o archivá el contenido antes de eliminarla.');
    err.statusCode = 409;
    throw err;
  }
}

export async function listFolders(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canViewByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para acceder a carpetas SGC' });
    }

    let query = supabaseAdmin
      .from('sgc_document_folders')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .order('id', { ascending: true });

    if (req.query?.includeArchived !== 'true') {
      query = query.neq('status', 'archivado');
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando carpetas SGC' });
    }

    return res.json((data || []).map(mapFolderRow));
  } catch (error) {
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo' ? 'Usuario inactivo' : 'Error interno consultando carpetas SGC'
    });
  }
}

export async function createFolder(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para crear carpetas' });
    }

    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const parentId = normalizeNullableUuid(req.body?.parentId || req.body?.parent_id);
    if (!name) {
      return res.status(400).json({ error: 'El nombre de la carpeta es obligatorio' });
    }
    await assertParentFolder(parentId);

    const { data, error } = await supabaseAdmin
      .from('sgc_document_folders')
      .insert({
        name,
        description,
        parent_id: parentId,
        sort_order: await getNextFolderSortOrder(parentId),
        created_by: req.user.id,
        status: 'activo'
      })
      .select('*')
      .maybeSingle();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Error creando carpeta SGC' });
    }

    return res.status(201).json(mapFolderRow(data));
  } catch (error) {
    return res.status(error.statusCode || (error.message === 'Usuario inactivo' ? 403 : 500)).json({
      error: error.message === 'Usuario inactivo' ? 'Usuario inactivo' : error.message || 'Error interno creando carpeta SGC'
    });
  }
}

export async function updateFolder(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para editar carpetas' });
    }

    const { id } = req.params;
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const parentId = normalizeNullableUuid(req.body?.parentId ?? req.body?.parent_id);
    const status = String(req.body?.status || 'activo').trim().toLowerCase();
    if (!name) {
      return res.status(400).json({ error: 'El nombre de la carpeta es obligatorio' });
    }
    if (!['activo', 'archivado'].includes(status)) {
      return res.status(400).json({ error: 'Estado de carpeta inválido' });
    }
    if (status === 'archivado') {
      await ensureFolderIsEmpty(id);
    }
    await assertParentFolder(parentId, id);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('sgc_document_folders')
      .select('id, parent_id')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ error: existingError.message || 'Error consultando carpeta SGC' });
    }
    if (!existing) {
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    }

    const payload = {
      name,
      description,
      parent_id: parentId,
      status,
      updated_at: new Date().toISOString()
    };
    if ((existing.parent_id || null) !== (parentId || null)) {
      payload.sort_order = await getNextFolderSortOrder(parentId);
    }

    const { data, error } = await supabaseAdmin
      .from('sgc_document_folders')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message || 'Error actualizando carpeta SGC' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    }

    return res.json(mapFolderRow(data));
  } catch (error) {
    return res.status(error.statusCode || (error.message === 'Usuario inactivo' ? 403 : 500)).json({
      error: error.message === 'Usuario inactivo' ? 'Usuario inactivo' : error.message || 'Error interno actualizando carpeta SGC'
    });
  }
}

export async function deleteFolder(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para eliminar carpetas' });
    }

    const { id } = req.params;
    await ensureFolderIsEmpty(id);
    const { data, error } = await supabaseAdmin
      .from('sgc_document_folders')
      .update({ status: 'archivado', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message || 'Error archivando carpeta SGC' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    }

    return res.json({ success: true, id });
  } catch (error) {
    return res.status(error.statusCode || (error.message === 'Usuario inactivo' ? 403 : 500)).json({
      error: error.message === 'Usuario inactivo' ? 'Usuario inactivo' : error.message || 'Error interno eliminando carpeta SGC'
    });
  }
}
