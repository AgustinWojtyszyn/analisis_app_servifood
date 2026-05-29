export function sendServerError(res, message) {
  return res.status(500).json({ error: message });
}

export function sendBadRequest(res, message) {
  return res.status(400).json({ error: message });
}

export function sendNotFound(res, message) {
  return res.status(404).json({ error: message });
}

export function sendConflict(res, body) {
  return res.status(409).json(body);
}

export function sendOk(res, body) {
  return res.status(200).json(body);
}
