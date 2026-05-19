import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

const VALID_ROLES = new Set(['user', 'nutricionista', 'admin']);

router.get('/admin/users', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message || 'No se pudieron cargar los usuarios' });
    }

    return res.json(data || []);
  } catch {
    return res.status(500).json({ error: 'Error interno consultando usuarios' });
  }
});

router.patch('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { id } = req.params;
    const role = String(req.body?.role || '').trim().toLowerCase();
    const isActive = req.body?.is_active;

    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ error: 'Rol inválido. Usar: user, nutricionista o admin' });
    }
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'is_active debe ser boolean' });
    }

    if (id === req.user?.id && !isActive) {
      return res.status(400).json({ error: 'No podés desactivar tu propio usuario' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role, is_active: isActive })
      .eq('id', id)
      .select('id, role, is_active')
      .maybeSingle();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'No se pudo guardar el usuario' });
    }

    return res.json(data);
  } catch {
    return res.status(500).json({ error: 'Error interno actualizando usuario' });
  }
});

router.delete('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    if (id === req.user?.id) {
      return res.status(400).json({ error: 'No podés eliminar tu propio usuario' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .eq('id', id)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({ error: profileError.message || 'No se pudo consultar el usuario' });
    }
    if (!profile) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Eliminación limpia: conservar perfil para integridad referencial, pero inhabilitado.
    const { error: deactivateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: false, role: 'user' })
      .eq('id', id);

    if (deactivateError) {
      return res.status(500).json({ error: deactivateError.message || 'No se pudo desactivar el usuario' });
    }

    // Borra cuenta de autenticación para impedir nuevos inicios de sesión.
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (deleteAuthError && !/not found|user not found/i.test(String(deleteAuthError.message || ''))) {
      return res.status(500).json({ error: deleteAuthError.message || 'No se pudo eliminar la cuenta de autenticación' });
    }

    return res.json({
      success: true,
      id,
      email: profile.email || null,
      message: 'Usuario desactivado y cuenta de autenticación eliminada'
    });
  } catch {
    return res.status(500).json({ error: 'Error interno eliminando usuario' });
  }
});

export default router;
