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

    req.user = {
      ...data.user,
      role: data.user.app_metadata?.role || 'user',
      isAdmin: String(data.user.app_metadata?.role || '').toLowerCase() === 'admin'
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
    const tokenRole = String(req.user?.role || '').toLowerCase();
    if (!userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', userId)
      .maybeSingle();

    // Estrategia de seguridad: fail-closed ante error real de DB/Supabase
    // para evitar bypass por fallback cuando no se pudo verificar el perfil.
    if (error) {
      console.error('[auth.requireAdmin] Error consultando profiles');
      return res.status(500).json({ error: 'No se pudo validar permisos de administrador' });
    }

    if (!profile) {
      if (tokenRole === 'admin') {
        console.warn(`[auth.requireAdmin] Perfil no encontrado para userId=${userId}, se permite por app_metadata.role=admin`);
        req.user.isAdmin = true;
        req.user.role = 'admin';
        return next();
      }
      return res.status(403).json({ error: 'Acceso solo para administradores' });
    }

    const profileRole = String(profile.role || '').toLowerCase();
    const isAdminByProfile = profileRole === 'admin';
    const isAdminByToken = tokenRole === 'admin';

    if (profile.is_active === false) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    if (!isAdminByProfile && !isAdminByToken) {
      return res.status(403).json({ error: 'Acceso solo para administradores' });
    }

    // Fuente final de permisos: perfil (si existe) con fallback al token.
    req.user.isAdmin = isAdminByProfile || isAdminByToken;
    if (isAdminByProfile) {
      req.user.role = 'admin';
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo validar permisos de administrador' });
  }
}
