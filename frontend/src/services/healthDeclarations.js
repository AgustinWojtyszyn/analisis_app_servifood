import { getAccessToken } from './analysis';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function authFetch(path, options = {}) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No hay sesion activa');
  }

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

export async function getTodayHealthDeclaration() {
  return await authFetch('/health-declarations/today');
}

export async function submitHealthDeclaration(body) {
  return await authFetch('/health-declarations', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function getMyHealthDeclarations() {
  return await authFetch('/health-declarations/me');
}

export async function getAdminHealthDeclarations() {
  return await authFetch('/health-declarations/admin');
}

export async function deleteHealthDeclarationById(id) {
  return await authFetch(`/health-declarations/${id}`, {
    method: 'DELETE'
  });
}

export async function exportHealthDeclarations() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No hay sesion activa');
  }

  const response = await fetch(`${API_BASE_URL}/health-declarations/export`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Error exportando declaraciones');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `health_declarations_${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function getActiveHealthPolicy() {
  return await authFetch('/health-policies/active');
}
