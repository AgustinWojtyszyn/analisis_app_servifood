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

export async function deleteNutritionModule(id) {
  return await authorizedFetch(`/nutrition-modules/${id}`, {
    method: 'DELETE'
  });
}

export async function exportNutritionModuleExcel(id) {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesion activa');

  const response = await fetch(`${API_BASE_URL}/nutrition-modules/${id}/export/excel`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Error exportando documento a Excel');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const contentDisposition = response.headers.get('Content-Disposition');
  link.download = readFilenameFromDisposition(contentDisposition) || `documento_sgc_${id}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { success: true };
}

export async function getNutritionModuleFiles(moduleId) {
  return await authorizedFetch(`/nutrition-modules/${moduleId}/files`);
}

export async function uploadNutritionModuleFiles(moduleId, files = []) {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesion activa');
  if (!files.length) return [];

  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${API_BASE_URL}/nutrition-modules/${moduleId}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Error cargando archivos adjuntos');
  }
  return payload;
}

export async function deleteNutritionModuleFile(fileId) {
  return await authorizedFetch(`/nutrition-modules/files/${fileId}`, {
    method: 'DELETE'
  });
}

export async function downloadNutritionModuleFile(fileId) {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesion activa');

  const response = await fetch(`${API_BASE_URL}/nutrition-modules/files/${fileId}/download`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Error descargando archivo adjunto');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const contentDisposition = response.headers.get('Content-Disposition');
  link.download = readFilenameFromDisposition(contentDisposition) || `adjunto_${fileId}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { success: true };
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
    throw new Error(payload.error || 'Error descargando documento');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const contentDisposition = response.headers.get('Content-Disposition');
  link.download = readFilenameFromDisposition(contentDisposition) || `documento_sgc_${id}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { success: true };
}
