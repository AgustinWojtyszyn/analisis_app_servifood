import { supabase } from '../lib/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export async function uploadExcel(file, onProgress) {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('No hay sesion activa');
  }

  const formData = new FormData();
  formData.append('excel', file);

  const xhrResult = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/upload-excel`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        const progress = Math.round((event.loaded * 100) / event.total);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parsed);
        } else {
          reject(new Error(parsed.error || 'Error cargando archivo'));
        }
      } catch {
        reject(new Error('Respuesta invalida del servidor'));
      }
    };

    xhr.onerror = () => reject(new Error('Error de red durante el upload'));
    xhr.send(formData);
  });

  return xhrResult;
}

export async function uploadMultipleAnalysis(files) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No hay sesion activa');
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${API_BASE_URL}/analysis/upload-multiple`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Error en carga múltiple');
  }

  return payload;
}

async function authorizedFetch(path, options = {}) {
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

export async function getAnalysisHistory(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const data = await authorizedFetch(`/analysis/history${query.toString() ? `?${query.toString()}` : ''}`);
  return { data, error: null };
}

export async function getActiveAnalysis() {
  return await authorizedFetch('/analysis/user/active');
}

export async function deleteAnalysis(id) {
  try {
    await authorizedFetch(`/analysis/${id}`, { method: 'DELETE' });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function deleteAnalysesBulk(ids = []) {
  return await authorizedFetch('/analysis/bulk', {
    method: 'DELETE',
    body: JSON.stringify({ ids })
  });
}

export async function deleteAllAnalyses(confirmText = 'BORRAR') {
  return await authorizedFetch('/analysis/all', {
    method: 'DELETE',
    body: JSON.stringify({ confirmText })
  });
}

export async function exportAnalysesBulk(ids = []) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No hay sesion activa');
  }

  const response = await fetch(`${API_BASE_URL}/analysis/export/bulk`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ids })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Error exportando en lote');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analisis_bulk_${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { success: true };
}

export async function deleteActiveAnalysis() {
  return await authorizedFetch('/analysis/user/active', { method: 'DELETE' });
}

export async function updateAnalysisStatus(id, status) {
  return await authorizedFetch(`/analysis/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function archiveAnalysis(id) {
  return await authorizedFetch(`/analysis/${id}/archive`, {
    method: 'PATCH'
  });
}

export async function getAnalysisById(id) {
  return await authorizedFetch(`/analysis/${id}`);
}
