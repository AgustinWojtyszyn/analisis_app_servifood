import { getAccessToken } from './analysis';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function authorizedFetch(path, options = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesion activa');

  const hasBody = options.body !== undefined;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Error en la solicitud');
  return payload;
}

export function getCertifications() {
  return authorizedFetch('/certifications');
}

export function createCertification(payload) {
  return authorizedFetch('/certifications', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateCertification(id, payload) {
  return authorizedFetch(`/certifications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteCertification(id) {
  return authorizedFetch(`/certifications/${id}`, { method: 'DELETE' });
}

export function getCertificationNotificationPreview() {
  return authorizedFetch('/certifications/notification-preview');
}

export function sendCertificationTestNotification(id) {
  return authorizedFetch(`/certifications/${id}/send-test-notification`, {
    method: 'POST'
  });
}
