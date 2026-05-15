import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

const VALID_STATUSES = new Set(['borrador', 'publicado', 'archivado']);

function normalizeStatus(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!VALID_STATUSES.has(v)) return null;
  return v;
}

function canManageByRole(role) {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'nutricionista';
}

async function resolveUserRole(user) {
  if (!supabaseAdmin || !user?.id) return String(user?.role || 'user').toLowerCase();

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

  return String(profile?.role || user?.role || 'user').toLowerCase();
}

function mapModuleRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    content: row.content || '',
    status: row.status || 'borrador',
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    publishedAt: row.published_at || null
  };
}

router.get('/nutrition-modules', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    let query = supabaseAdmin
      .from('nutrition_modules')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!canManageByRole(role)) {
      query = query.eq('status', 'publicado');
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando módulos nutricionales' });
    }

    return res.json((data || []).map(mapModuleRow));
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

    if (!canManageByRole(role) && data.status !== 'publicado') {
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
    const status = normalizeStatus(req.body?.status) || 'borrador';

    if (!title) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }

    const nowIso = new Date().toISOString();
    const payload = {
      title,
      description,
      content,
      status,
      created_by: req.user.id,
      published_at: status === 'publicado' ? nowIso : null
    };

    const { data, error } = await supabaseAdmin
      .from('nutrition_modules')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Error creando módulo nutricional' });
    }

    return res.status(201).json(mapModuleRow(data));
  } catch (error) {
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno creando módulo nutricional'
    });
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
    const status = normalizeStatus(req.body?.status) || 'borrador';

    if (!title) {
      return res.status(400).json({ error: 'El título es obligatorio' });
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
      published_at: status === 'publicado' ? (existing.published_at || nowIso) : null,
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

router.patch('/nutrition-modules/:id/status', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para cambiar estado de módulos' });
    }

    const { id } = req.params;
    const status = normalizeStatus(req.body?.status);
    if (!status) {
      return res.status(400).json({ error: 'Estado inválido. Usar: borrador, publicado, archivado' });
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
      status,
      updated_at: nowIso,
      published_at: status === 'publicado' ? (existing.published_at || nowIso) : null
    };

    const { data, error } = await supabaseAdmin
      .from('nutrition_modules')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Error actualizando estado del módulo' });
    }

    return res.json(mapModuleRow(data));
  } catch (error) {
    return res.status(error.message === 'Usuario inactivo' ? 403 : 500).json({
      error: error.message === 'Usuario inactivo'
        ? 'Usuario inactivo'
        : 'Error interno actualizando estado del módulo'
    });
  }
});

router.get('/nutrition-modules/:id/download', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const role = await resolveUserRole(req.user);
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
    if (!canManageByRole(role) && data.status !== 'publicado') {
      return res.status(403).json({ error: 'No autorizado para descargar este módulo' });
    }

    const safeTitle = String(data.title || 'modulo_nutricional')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'modulo_nutricional';

    const lines = [
      `Título: ${data.title || ''}`,
      `Descripción: ${data.description || ''}`,
      `Estado: ${data.status || ''}`,
      `Publicado: ${data.published_at || ''}`,
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
