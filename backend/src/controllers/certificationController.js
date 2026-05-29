import {
  listCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  getNotificationPreview
} from '../services/certificationService.js';

function handleError(res, error, fallbackMessage) {
  const status = Number(error?.status || 500);
  const message = error?.message || fallbackMessage;
  return res.status(status).json({ error: message });
}

export async function getCertifications(req, res) {
  try {
    const payload = await listCertifications();
    return res.json(payload);
  } catch (error) {
    return handleError(res, error, 'Error obteniendo certificaciones');
  }
}

export async function postCertification(req, res) {
  try {
    const payload = await createCertification(req.body || {}, req.user.id);
    return res.status(201).json(payload);
  } catch (error) {
    return handleError(res, error, 'Error creando certificación');
  }
}

export async function putCertification(req, res) {
  try {
    const payload = await updateCertification(req.params.id, req.body || {});
    return res.json(payload);
  } catch (error) {
    return handleError(res, error, 'Error actualizando certificación');
  }
}

export async function removeCertification(req, res) {
  try {
    const payload = await deleteCertification(req.params.id);
    return res.json(payload);
  } catch (error) {
    return handleError(res, error, 'Error eliminando certificación');
  }
}

export async function getCertificationNotificationPreview(req, res) {
  try {
    const payload = await getNotificationPreview();
    return res.json(payload);
  } catch (error) {
    return handleError(res, error, 'Error obteniendo preview de notificaciones');
  }
}
