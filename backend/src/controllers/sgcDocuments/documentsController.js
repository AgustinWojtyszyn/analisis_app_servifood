import ExcelJS from 'exceljs';
import {
  normalizeModuleType,
  canManageByRole,
  canViewByRole,
  mapModuleRow,
  formatDateTime,
  sanitizeFilename
} from '../../routes/nutritionModules/helpers.js';
import { processPendingDocumentNotifications } from '../../routes/nutritionModules/notificationWorker.js';
import { resolveUserRole, supabaseAdmin } from './context.js';

async function validateFolderId(folderId) {
  if (!folderId) return null;
  const { data, error } = await supabaseAdmin
    .from('sgc_document_folders')
    .select('id, status')
    .eq('id', folderId)
    .maybeSingle();
  if (error) {
    const err = new Error(error.message || 'Error validando carpeta');
    err.statusCode = 500;
    throw err;
  }
  if (!data || data.status === 'archivado') {
    const err = new Error('La carpeta seleccionada no existe o está archivada');
    err.statusCode = 400;
    throw err;
  }
  return data.id;
}

async function getNextDocumentSortOrder(folderId) {
  let query = supabaseAdmin
    .from('nutrition_modules')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  query = folderId ? query.eq('folder_id', folderId) : query.is('folder_id', null);

  const { data, error } = await query;
  if (error) {
    const err = new Error(error.message || 'Error calculando orden del documento');
    err.statusCode = 500;
    throw err;
  }
  return Number(data?.[0]?.sort_order ?? -1) + 1;
}

export async function listDocuments(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canViewByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para acceder a módulos nutricionales' });
    }
    let query = supabaseAdmin
      .from('nutrition_modules')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true })
      .order('id', { ascending: true });

    if (!canManageByRole(role)) {
      query = query.eq('status', 'aprobado');
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando módulos nutricionales' });
    }

    const rows = data || [];
    const moduleIds = rows.map((row) => row.id);
    let fileCountMap = new Map();
    if (moduleIds.length) {
      const { data: filesData, error: filesError } = await supabaseAdmin
        .from('nutrition_module_files')
        .select('module_id')
        .in('module_id', moduleIds);
      if (!filesError && Array.isArray(filesData)) {
        fileCountMap = filesData.reduce((acc, row) => {
          const key = row.module_id;
          if (!key) return acc;
          acc.set(key, (acc.get(key) || 0) + 1);
          return acc;
        }, new Map());
      }
    }

    return res.json(rows.map((row) => ({
      ...mapModuleRow(row),
      filesCount: fileCountMap.get(row.id) || 0
    })));
  } catch (error) {
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno consultando módulos nutricionales'
    });
  }
}

export async function getDocument(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canViewByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para acceder a módulos nutricionales' });
    }
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('nutrition_modules')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando módulo nutricional' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }

    if (!canManageByRole(role) && data.status !== 'aprobado') {
      return res.status(403).json({ error: 'No autorizado para ver este módulo' });
    }

    return res.json(mapModuleRow(data));
  } catch (error) {
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno consultando módulo nutricional'
    });
  }
}

export async function createDocument(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para crear módulos' });
    }

    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const content = String(req.body?.content || '').trim();
    const status = 'aprobado';
    const moduleType = normalizeModuleType(req.body?.moduleType || req.body?.module_type);
    const folderId = await validateFolderId(req.body?.folderId || req.body?.folder_id || null);

    if (!title) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }
    if (!moduleType) {
      return res.status(400).json({ error: 'El apartado es obligatorio. Usar: procedimiento, registro o estrategias' });
    }

    const nowIso = new Date().toISOString();
    const payload = {
      title,
      description,
      content,
      status,
      module_type: moduleType,
      folder_id: folderId,
      sort_order: await getNextDocumentSortOrder(folderId),
      created_by: req.user.id,
      published_at: status === 'aprobado' ? nowIso : null
    };

    const { data, error } = await supabaseAdmin
      .from('nutrition_modules')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Error creando módulo nutricional' });
    }

    console.info('[nutrition-modules-email] Documento creado', {
      documentId: data.id,
      title: data.title,
      moduleType: data.module_type,
      createdAt: data.created_at
    });

    const { data: queuedNotification, error: queueError } = await supabaseAdmin
      .from('document_email_notifications')
      .select('id, status, recipients')
      .eq('document_id', data.id)
      .maybeSingle();

    if (queueError) {
      console.error('[nutrition-modules-email] Error validando cola post-create', {
        documentId: data.id,
        error: queueError.message || queueError
      });
    } else {
      console.info('[nutrition-modules-email] Notificación encolada', {
        documentId: data.id,
        notificationId: queuedNotification?.id || null,
        status: queuedNotification?.status || null,
        recipientsCount: Array.isArray(queuedNotification?.recipients) ? queuedNotification.recipients.length : 0
      });
    }

    processPendingDocumentNotifications({ supabaseAdmin, batchSize: 10, source: 'post-create' })
      .then((result) => {
        console.info('[nutrition-modules-email] Worker post-create resultado', {
          documentId: data.id,
          ...result
        });
      })
      .catch((workerError) => {
        console.error('[nutrition-modules-email] Worker post-create falló', {
          documentId: data.id,
          error: workerError.message || workerError
        });
      });

    return res.status(201).json(mapModuleRow(data));
  } catch (error) {
    return res.status(error.statusCode || (error.message === 'Usuario inactivo' ? 403 : 500)).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : error.message || 'Error interno creando módulo nutricional'
    });
  }
}

export async function updateDocument(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para editar módulos' });
    }

    const { id } = req.params;
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const content = String(req.body?.content || '').trim();
    const status = 'aprobado';
    const moduleType = normalizeModuleType(req.body?.moduleType || req.body?.module_type);
    const hasFolder = Object.prototype.hasOwnProperty.call(req.body || {}, 'folderId')
      || Object.prototype.hasOwnProperty.call(req.body || {}, 'folder_id');
    const folderId = hasFolder ? await validateFolderId(req.body?.folderId ?? req.body?.folder_id ?? null) : undefined;

    if (!title) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }
    if (!moduleType) {
      return res.status(400).json({ error: 'El apartado es obligatorio. Usar: procedimiento, registro o estrategias' });
    }

    const nowIso = new Date().toISOString();
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('nutrition_modules')
      .select('id, published_at')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ error: existingError.message || 'Error consultando módulo nutricional' });
    }

    if (!existing) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }

    const payload = {
      title,
      description,
      content,
      status,
      module_type: moduleType,
      ...(hasFolder ? { folder_id: folderId } : {}),
      published_at: status === 'aprobado' ? (existing.published_at || nowIso) : null,
      updated_at: nowIso
    };

    const { data, error } = await supabaseAdmin
      .from('nutrition_modules')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Error actualizando módulo nutricional' });
    }

    return res.json(mapModuleRow(data));
  } catch (error) {
    return res.status(error.statusCode || (error.message === 'Usuario inactivo' ? 403 : 500)).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : error.message || 'Error interno actualizando módulo nutricional'
    });
  }
}

export async function moveDocument(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para mover documentos' });
    }

    const folderId = await validateFolderId(req.body?.folderId ?? req.body?.folder_id ?? null);
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('nutrition_modules')
      .select('id, folder_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ error: existingError.message || 'Error consultando documento' });
    }
    if (!existing) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const payload = {
      folder_id: folderId,
      updated_at: new Date().toISOString()
    };
    if ((existing.folder_id || null) !== (folderId || null)) {
      payload.sort_order = await getNextDocumentSortOrder(folderId);
    }

    const { data, error } = await supabaseAdmin
      .from('nutrition_modules')
      .update(payload)
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message || 'Error moviendo documento' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    return res.json(mapModuleRow(data));
  } catch (error) {
    return res.status(error.statusCode || (error.message === 'Usuario inactivo' ? 403 : 500)).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : error.message || 'Error interno moviendo documento'
    });
  }
}

export async function deleteDocument(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para eliminar módulos' });
    }

    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('nutrition_modules')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message || 'Error eliminando módulo' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }

    return res.json({ success: true, id });
  } catch (error) {
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno eliminando módulo'
    });
  }
}

export async function exportDocumentExcel(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canViewByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para exportar módulos nutricionales' });
    }
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('nutrition_modules')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message || 'Error exportando módulo a Excel' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }
    if (!canManageByRole(role) && data.status !== 'aprobado') {
      return res.status(403).json({ error: 'No autorizado para exportar este módulo' });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Documento SGC');
    sheet.columns = [
      { header: 'Título', key: 'titulo', width: 36 },
      { header: 'Descripción', key: 'descripcion', width: 44 },
      { header: 'Contenido', key: 'contenido', width: 72 },
      { header: 'Fecha de creación', key: 'createdAt', width: 24 },
      { header: 'Fecha de actualización', key: 'updatedAt', width: 24 },
      { header: 'Fecha de aprobación', key: 'publishedAt', width: 24 }
    ];

    sheet.addRow({
      titulo: data.title || '',
      descripcion: data.description || '',
      contenido: data.content || '',
      createdAt: formatDateTime(data.created_at),
      updatedAt: formatDateTime(data.updated_at),
      publishedAt: formatDateTime(data.published_at)
    });

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const safeTitle = sanitizeFilename(data.title);
    const fileName = `${safeTitle}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno exportando módulo a Excel'
    });
  }
}

export async function downloadDocument(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canViewByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para descargar módulos nutricionales' });
    }
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('nutrition_modules')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message || 'Error descargando módulo' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }
    if (!canManageByRole(role) && data.status !== 'aprobado') {
      return res.status(403).json({ error: 'No autorizado para descargar este módulo' });
    }

    const safeTitle = sanitizeFilename(data.title);

    const lines = [
      `Título: ${data.title || ''}`,
      `Apartado: ${data.module_type || ''}`,
      `Descripción: ${data.description || ''}`,
      `Aprobado: ${data.published_at || ''}`,
      '',
      'Contenido:',
      data.content || ''
    ];

    const text = lines.join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.txt"`);
    return res.send(text);
  } catch (error) {
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno descargando módulo'
    });
  }
}
