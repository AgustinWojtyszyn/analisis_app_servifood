import multer from 'multer';
import {
  STORAGE_BUCKET,
  canManageByRole,
  canViewByRole,
  sanitizeStorageFileName,
  ensureAllowedFile,
  ensureStorageBucketExists
} from '../../routes/nutritionModules/helpers.js';
import { canAccessModule, resolveUserRole, supabaseAdmin } from './context.js';

export async function listAttachments(req, res) {
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
}

export async function uploadAttachments(req, res) {
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
}

export async function deleteAttachment(req, res) {
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
}

export async function downloadAttachment(req, res) {
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
}
