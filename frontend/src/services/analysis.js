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

export async function getAnalysisHistory() {
  return await supabase
    .from('analysis_history')
    .select('*')
    .order('created_at', { ascending: false });
}

export async function deleteAnalysis(id) {
  return await supabase
    .from('analysis_history')
    .delete()
    .eq('id', id);
}

export async function getAnalysisById(id) {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('No hay sesion activa');
  }

  const response = await fetch(`${API_BASE_URL}/analysis/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'No se pudo obtener el analisis');
  }

  return payload;
}
