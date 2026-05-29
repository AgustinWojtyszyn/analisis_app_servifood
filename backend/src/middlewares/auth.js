import '../config/env.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

/**
 * Middleware para verificar token JWT de Supabase
 */
export async function authenticateToken(req, res, next) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = data.user.id;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({ error: 'No se pudo validar estado de usuario' });
    }

    if (!profile) {
      return res.status(403).json({ error: 'Perfil de usuario no encontrado' });
    }

    if (profile.is_active === false) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    const profileRole = String(profile.role || '').toLowerCase() || 'user';

    req.user = {
      ...data.user,
      role: profileRole,
      isAdmin: profileRole === 'admin',
      profile
    };

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}

/**
 * Middleware para verificar rol de administrador
 */
export async function requireAdmin(req, res, next) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    let profile = req.user?.profile || null;
    let error = null;

    if (!profile) {
      const profileResult = await supabaseAdmin
        .from('profiles')
        .select('role, is_active')
        .eq('id', userId)
        .maybeSingle();
      profile = profileResult.data;
      error = profileResult.error;
    }

    // Estrategia de seguridad: fail-closed ante error real de DB/Supabase
    // para evitar bypass por fallback cuando no se pudo verificar el perfil.
    if (error) {
      console.error('[auth.requireAdmin] Error consultando profiles');
      return res.status(500).json({ error: 'No se pudo validar permisos de administrador' });
    }

    if (!profile) {
      return res.status(403).json({ error: 'Perfil de usuario no encontrado' });
    }

    const profileRole = String(profile.role || '').toLowerCase();
    const isAdminByProfile = profileRole === 'admin';

    if (profile.is_active === false) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    // Si hay perfil, el rol del perfil es la fuente de verdad.
    if (!isAdminByProfile) {
      return res.status(403).json({ error: 'Acceso solo para administradores' });
    }

    req.user.isAdmin = true;
    req.user.role = 'admin';
    req.user.profile = profile;

    next();
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo validar permisos de administrador' });
  }
}

export async function requireAdminOrNutritionist(req, res, next) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    let profile = req.user?.profile || null;
    let error = null;
    if (!profile) {
      const profileResult = await supabaseAdmin
        .from('profiles')
        .select('role, is_active')
        .eq('id', userId)
        .maybeSingle();
      profile = profileResult.data;
      error = profileResult.error;
    }

    if (error) {
      console.error('[auth.requireAdminOrNutritionist] Error consultando profiles');
      return res.status(500).json({ error: 'No se pudo validar permisos' });
    }

    if (!profile) {
      return res.status(403).json({ error: 'Perfil de usuario no encontrado' });
    }

    if (profile.is_active === false) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    const role = String(profile.role || '').toLowerCase();
    const allowed = role === 'admin' || role === 'nutricionista';
    if (!allowed) {
      return res.status(403).json({ error: 'Acceso solo para administradores y nutricionistas' });
    }

    req.user.role = role;
    req.user.isAdmin = role === 'admin';
    req.user.profile = profile;
    return next();
  } catch {
    return res.status(500).json({ error: 'No se pudo validar permisos' });
  }
}
