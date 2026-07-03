import { getAccessToken } from './analysis';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function authorizedFetch(path, options = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesion activa');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (options.blob) {
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Error en la solicitud');
    }
    return response.blob();
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Error en la solicitud');
  return payload;
}

export async function uploadAnnualDeviationExcel(file, onProgress) {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesion activa');

  const formData = new FormData();
  formData.append('excel', file);

  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/analysis/annual/upload-excel`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    };
    xhr.onload = () => {
      const payload = JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
      else reject(new Error(payload.error || 'No se pudo cargar el Excel anual'));
    };
    xhr.onerror = () => reject(new Error('Error de red durante la carga'));
    xhr.send(formData);
  });
}

export async function getAnnualDeviationUploads(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return await authorizedFetch(`/analysis/annual/uploads${query.toString() ? `?${query}` : ''}`);
}

export async function getAnnualDeviationUpload(id) {
  return await authorizedFetch(`/analysis/annual/${id}`);
}

export async function exportAnnualDeviationExcel(id) {
  const blob = await authorizedFetch(`/analysis/annual/${id}/export/excel`, { blob: true });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analisis_anual_${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
