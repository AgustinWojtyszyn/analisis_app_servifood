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

function readFilenameFromDisposition(contentDisposition) {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const simpleMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
  return simpleMatch?.[1] || null;
}

export async function getNutritionModules() {
  return await authorizedFetch('/nutrition-modules');
}

export async function getNutritionModuleById(id) {
  return await authorizedFetch(`/nutrition-modules/${id}`);
}

export async function createNutritionModule(payload) {
  return await authorizedFetch('/nutrition-modules', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateNutritionModule(id, payload) {
  return await authorizedFetch(`/nutrition-modules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function updateNutritionModuleStatus(id, status) {
  return await authorizedFetch(`/nutrition-modules/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function downloadNutritionModule(id) {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesion activa');

  const response = await fetch(`${API_BASE_URL}/nutrition-modules/${id}/download`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Error descargando módulo');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const contentDisposition = response.headers.get('Content-Disposition');
  link.download = readFilenameFromDisposition(contentDisposition) || `modulo_nutricional_${id}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { success: true };
}
