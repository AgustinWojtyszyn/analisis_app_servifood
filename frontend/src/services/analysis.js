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
      } catch (error) {
        reject(new Error('Respuesta invalida del servidor'));
      }
    };

    xhr.onerror = () => reject(new Error('Error de red durante el upload'));
    xhr.send(formData);
  });

  return xhrResult;
}

async function authorizedFetch(path, options = {}) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No hay sesion activa');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Error en la solicitud');
  }

  return payload;
}

export async function getAnalysisHistory() {
  const data = await authorizedFetch('/analysis/user/history');
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

export async function deleteActiveAnalysis() {
  return await authorizedFetch('/analysis/user/active', { method: 'DELETE' });
}

export async function updateAnalysisStatus(id, status) {
  return await authorizedFetch(`/analysis/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function getAnalysisById(id) {
  return await authorizedFetch(`/analysis/${id}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
