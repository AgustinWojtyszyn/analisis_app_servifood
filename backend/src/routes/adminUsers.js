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

async function getRemainingActiveAdmins(excludedId) {
  let query = supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true);

  if (excludedId) {
    query = query.neq('id', excludedId);
  }

  const { data, error } = await query;
  if (error) return { count: null, error };
  return { count: Array.isArray(data) ? data.length : 0, error: null };
}

async function canRemoveAdminAccess(profile) {
  if (String(profile?.role || '').toLowerCase() !== 'admin' || profile?.is_active === false) {
    return { allowed: true };
  }

  const remaining = await getRemainingActiveAdmins(profile.id);
  if (remaining.error) {
    return { allowed: false, error: remaining.error };
  }

  return { allowed: remaining.count > 0 };
}

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

    let authUsersById = null;
    try {
      const authResult = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (!authResult.error) {
        authUsersById = new Map((authResult.data?.users || []).map((user) => [user.id, user]));
      } else {
        console.warn('[admin.users] No se pudo enriquecer con datos de Auth:', authResult.error.message || authResult.error);
      }
    } catch (authError) {
      console.warn('[admin.users] Error consultando usuarios de Auth:', authError?.message || authError);
    }

    const enriched = (data || []).map((profile) => {
      const authUser = authUsersById?.get(profile.id) || null;
      return {
        ...profile,
        auth_user_exists: authUsersById ? Boolean(authUser) : null,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        email_confirmed_at: authUser?.email_confirmed_at || authUser?.confirmed_at || null
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error('[admin.users] Error consultando usuarios:', error);
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

    if (!id) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ error: 'Rol inválido. Usar: user, nutricionista o admin' });
    }
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'is_active debe ser boolean' });
    }

    const { data: currentProfile, error: currentError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, is_active, created_at')
      .eq('id', id)
      .maybeSingle();

    if (currentError) {
      return res.status(500).json({ error: currentError.message || 'No se pudo consultar el usuario' });
    }
    if (!currentProfile) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (id === req.user?.id && !isActive) {
      return res.status(400).json({ error: 'No podés desactivar tu propio usuario' });
    }

    const removesActiveAdmin = String(currentProfile.role || '').toLowerCase() === 'admin'
      && currentProfile.is_active !== false
      && (role !== 'admin' || !isActive);

    if (removesActiveAdmin) {
      const guard = await canRemoveAdminAccess(currentProfile);
      if (guard.error) {
        return res.status(500).json({ error: guard.error.message || 'No se pudo validar la cantidad de administradores' });
      }
      if (!guard.allowed) {
        return res.status(400).json({ error: 'Debe quedar al menos un administrador activo en la plataforma' });
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role, is_active: isActive })
      .eq('id', id)
      .select('id, email, full_name, role, is_active, created_at')
      .maybeSingle();

    if (updateError || !updated) {
      return res.status(500).json({ error: updateError?.message || 'No se pudo guardar el usuario' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('[admin.users] Error actualizando usuario:', error);
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
      return res.status(400).json({ error: 'No podés dar de baja tu propio usuario' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('id', id)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({ error: profileError.message || 'No se pudo consultar el usuario' });
    }
    if (!profile) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const guard = await canRemoveAdminAccess(profile);
    if (guard.error) {
      return res.status(500).json({ error: guard.error.message || 'No se pudo validar la cantidad de administradores' });
    }
    if (!guard.allowed) {
      return res.status(400).json({ error: 'Debe quedar al menos un administrador activo en la plataforma' });
    }

    // Se conserva el perfil para integridad referencial, pero queda inhabilitado.
    const { error: deactivateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: false, role: 'user' })
      .eq('id', id);

    if (deactivateError) {
      return res.status(500).json({ error: deactivateError.message || 'No se pudo desactivar el usuario' });
    }

    // Se elimina la cuenta de autenticación para impedir nuevos inicios de sesión.
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (deleteAuthError && !/not found|user not found/i.test(String(deleteAuthError.message || ''))) {
      return res.status(500).json({
        error: 'El perfil quedó desactivado, pero no se pudo eliminar la cuenta de autenticación. Recargá la gestión de usuarios.'
      });
    }

    return res.json({
      success: true,
      id,
      email: profile.email || null,
      message: 'Usuario dado de baja correctamente'
    });
  } catch (error) {
    console.error('[admin.users] Error dando de baja usuario:', error);
    return res.status(500).json({ error: 'Error interno dando de baja usuario' });
  }
});

export { canRemoveAdminAccess };
export default router;
