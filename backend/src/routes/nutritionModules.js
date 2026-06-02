import express from 'express';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import multer from 'multer';
import { authenticateToken } from '../middlewares/auth.js';
import {
  STORAGE_BUCKET,
  upload,
  normalizeModuleType,
  canManageByRole,
  canViewByRole,
  normalizeRole,
  mapModuleRow,
  formatDateTime,
  sanitizeFilename,
  sanitizeStorageFileName,
  ensureAllowedFile,
  ensureStorageBucketExists
} from './nutritionModules/helpers.js';
import {
  isWorkerAuthorized,
  processPendingDocumentNotifications
} from './nutritionModules/notificationWorker.js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

async function resolveUserRole(user) {
  if (!supabaseAdmin || !user?.id) return normalizeRole(user?.role || 'user');

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo validar permisos');
  }

  if (profile?.is_active === false) {
    throw new Error('Usuario inactivo');
  }

  return normalizeRole(profile?.role || user?.role || 'user');
}

async function canAccessModule(role, moduleId) {
  if (!canViewByRole(role)) {
    return { allowed: false, row: null, reason: 'No autorizado para acceder a módulos nutricionales', status: 403 };
  }
  const { data, error } = await supabaseAdmin
    .from('nutrition_modules')
    .select('*')
    .eq('id', moduleId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Error consultando módulo');
  if (!data) return { allowed: false, row: null, reason: 'Módulo no encontrado', status: 404 };
  if (!canManageByRole(role) && data.status !== 'aprobado') {
    return { allowed: false, row: data, reason: 'No autorizado para acceder a este módulo', status: 403 };
  }
  return { allowed: true, row: data, reason: null, status: 200 };
}

router.get('/nutrition-modules', authenticateToken, async (req, res) => {
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
      .order('updated_at', { ascending: false });

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
});

router.get('/nutrition-modules/:id', authenticateToken, async (req, res) => {
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
});

router.post('/nutrition-modules', authenticateToken, async (req, res) => {
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
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno creando módulo nutricional'
    });
  }
});

router.post('/internal/nutrition-modules/process-notifications', async (req, res) => {
  try {
    console.info('[nutrition-modules-email] Internal worker endpoint hit');
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }
    const authorized = isWorkerAuthorized(req);
    console.info('[nutrition-modules-email] Internal worker auth check', { authorized });
    if (!authorized) {
      return res.status(401).json({ error: 'No autorizado para procesar notificaciones' });
    }

    const batchSize = Math.max(1, Math.min(100, Number(req.body?.batchSize || 20)));
    const { claimed, sent, failed } = await processPendingDocumentNotifications({
      supabaseAdmin,
      batchSize,
      source: 'internal-endpoint'
    });

    return res.json({
      success: true,
      claimed,
      sent,
      failed
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error interno procesando notificaciones' });
  }
});

router.put('/nutrition-modules/:id', authenticateToken, async (req, res) => {
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
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno actualizando módulo nutricional'
    });
  }
});

router.delete('/nutrition-modules/:id', authenticateToken, async (req, res) => {
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
});

router.get('/nutrition-modules/:id/export/excel', authenticateToken, async (req, res) => {
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
});

router.get('/nutrition-modules/:id/files', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    const moduleCheck = await canAccessModule(role, req.params.id);
    if (!moduleCheck.allowed) {
      return res.status(moduleCheck.status).json({ error: moduleCheck.reason });
    }

    const { data, error } = await supabaseAdmin
      .from('nutrition_module_files')
      .select('*')
      .eq('module_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando archivos adjuntos' });
    }

    return res.json((data || []).map((row) => ({
      id: row.id,
      moduleId: row.module_id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileType: row.file_type || null,
      fileSize: row.file_size || null,
      uploadedBy: row.uploaded_by || null,
      createdAt: row.created_at || null
    })));
  } catch (error) {
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno consultando archivos adjuntos'
    });
  }
});

router.post('/nutrition-modules/:id/files', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para cargar archivos' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ error: 'Debes adjuntar al menos un archivo' });
    }

    const moduleCheck = await canAccessModule(role, req.params.id);
    if (!moduleCheck.allowed) {
      return res.status(moduleCheck.status).json({ error: moduleCheck.reason });
    }

    for (const file of files) {
      const invalidReason = ensureAllowedFile(file);
      if (invalidReason) {
        return res.status(400).json({ error: `${file.originalname}: ${invalidReason}` });
      }
    }

    await ensureStorageBucketExists(supabaseAdmin);

    const createdRows = [];
    for (const file of files) {
      const safeName = sanitizeStorageFileName(file.originalname);
      const path = `${req.params.id}/${Date.now()}-${safeName}`;
      const uploadResult = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadResult.error) {
        return res.status(500).json({ error: uploadResult.error.message || `Error subiendo archivo ${file.originalname}` });
      }

      const { data, error } = await supabaseAdmin
        .from('nutrition_module_files')
        .insert({
          module_id: req.params.id,
          file_name: file.originalname,
          file_path: path,
          file_type: file.mimetype || null,
          file_size: file.size || null,
          uploaded_by: req.user.id
        })
        .select('*')
        .maybeSingle();

      if (error || !data) {
        await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([path]);
        return res.status(500).json({ error: error?.message || `Error guardando metadata de ${file.originalname}` });
      }

      createdRows.push({
        id: data.id,
        moduleId: data.module_id,
        fileName: data.file_name,
        filePath: data.file_path,
        fileType: data.file_type || null,
        fileSize: data.file_size || null,
        uploadedBy: data.uploaded_by || null,
        createdAt: data.created_at || null
      });
    }

    return res.status(201).json(createdRows);
  } catch (error) {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Cada archivo no puede superar 25 MB' });
    }
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno cargando archivos adjuntos'
    });
  }
});

router.delete('/nutrition-modules/files/:fileId', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }
    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para borrar archivos' });
    }

    const { data: fileRow, error: fileError } = await supabaseAdmin
      .from('nutrition_module_files')
      .select('*')
      .eq('id', req.params.fileId)
      .maybeSingle();

    if (fileError) {
      return res.status(500).json({ error: fileError.message || 'Error consultando archivo adjunto' });
    }
    if (!fileRow) {
      return res.status(404).json({ error: 'Archivo adjunto no encontrado' });
    }

    await ensureStorageBucketExists(supabaseAdmin);

    const removeStorage = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([fileRow.file_path]);

    if (removeStorage.error) {
      return res.status(500).json({ error: removeStorage.error.message || 'Error borrando archivo en storage' });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('nutrition_module_files')
      .delete()
      .eq('id', req.params.fileId);
    if (deleteError) {
      return res.status(500).json({ error: deleteError.message || 'Error borrando metadata de archivo' });
    }

    return res.json({ success: true, id: req.params.fileId });
  } catch (error) {
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno borrando archivo adjunto'
    });
  }
});

router.get('/nutrition-modules/files/:fileId/download', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canViewByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para descargar archivos adjuntos' });
    }
    const { data: fileRow, error: fileError } = await supabaseAdmin
      .from('nutrition_module_files')
      .select('*')
      .eq('id', req.params.fileId)
      .maybeSingle();

    if (fileError) {
      return res.status(500).json({ error: fileError.message || 'Error consultando archivo adjunto' });
    }
    if (!fileRow) {
      return res.status(404).json({ error: 'Archivo adjunto no encontrado' });
    }

    const moduleCheck = await canAccessModule(role, fileRow.module_id);
    if (!moduleCheck.allowed) {
      return res.status(moduleCheck.status).json({ error: moduleCheck.reason });
    }

    await ensureStorageBucketExists(supabaseAdmin);

    const downloadResult = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(fileRow.file_path);
    if (downloadResult.error || !downloadResult.data) {
      return res.status(500).json({ error: downloadResult.error?.message || 'Error descargando archivo adjunto' });
    }

    const arrayBuffer = await downloadResult.data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = sanitizeStorageFileName(fileRow.file_name || 'archivo');
    res.setHeader('Content-Type', fileRow.file_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno descargando archivo adjunto'
    });
  }
});

router.get('/nutrition-modules/:id/download', authenticateToken, async (req, res) => {
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
});

export default router;
