import { getAccessToken } from './analysis';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function authorizedFetch(path, options = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesion activa');

  const hasBody = options.body !== undefined;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Error en la solicitud');
  }

  return payload;
}

export async function getAdminUsers() {
  return await authorizedFetch('/admin/users');
}

export async function updateAdminUser(id, payload) {
  return await authorizedFetch(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminUser(id) {
  return await authorizedFetch(`/admin/users/${id}`, {
    method: 'DELETE'
  });
}
