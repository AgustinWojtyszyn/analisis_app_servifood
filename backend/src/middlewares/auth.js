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
      role: data.user.app_metadata?.role || 'user'
    };

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}

/**
 * Middleware para verificar rol de administrador
 */
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
  }
  next();
}
