import nodemailer from 'nodemailer';

export const FIXED_RECIPIENTS = [
  'direcciontecnicaservifood@gmail.com',
  'nutrisionservifood@yahoo.com',
  'vanesalegonzalez@gmail.com',
  'agustinwojtyszyn99@gmail.com'
];

let transporter = null;
let warnedMissingConfig = false;

function normalizeEmailList(list) {
  return Array.from(new Set((list || []).map((item) => String(item).trim().toLowerCase()).filter(Boolean))).sort();
}

export function assertFixedRecipientsOrThrow(recipients) {
  const expected = normalizeEmailList(FIXED_RECIPIENTS);
  const actual = normalizeEmailList(recipients);

  const isExactMatch = expected.length === actual.length && expected.every((email, index) => email === actual[index]);

  if (!isExactMatch) {
    throw new Error(`Lista de destinatarios inválida. Esperados: ${expected.join(', ')}. Recibidos: ${actual.join(', ')}`);
  }

  console.info('[nutrition-modules-email] Destinatarios validados (whitelist fija):', actual.join(', '));
}

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = toBoolean(process.env.SMTP_SECURE, port === 465);

  if (!host || !Number.isFinite(port) || !user || !pass) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn('[nutrition-modules-email] SMTP no configurado. Se omiten notificaciones de Documentos SGC.');
    }
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  return transporter;
}

function formatDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return String(value || '');
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function formatCategory(moduleType) {
  const normalized = String(moduleType || '').trim().toLowerCase();
  if (normalized === 'procedimiento') return 'Procedimientos';
  if (normalized === 'registro') return 'Registros';
  if (normalized === 'estrategias') return 'Estrategias';
  return moduleType || '';
}

function toRecipientArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function sendDocumentCreatedEmailNotification(notification) {
  const mailer = getTransporter();
  if (!mailer) return { attempted: false, reason: 'smtp_not_configured' };

  const recipients = toRecipientArray(notification?.recipients);
  assertFixedRecipientsOrThrow(recipients);

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = 'Nuevo documento cargado en Documentos SGC';
  const text = [
    'Se cargó un nuevo documento en Documentos SGC.',
    '',
    `Nombre: ${notification?.title || '-'}`,
    `Categoría: ${formatCategory(notification?.module_type) || '-'}`,
    `Fecha de carga: ${formatDate(notification?.document_created_at || notification?.created_at) || '-'}`,
    '',
    'Podés verlo ingresando a:',
    'https://analisis.servifoodapp.site/modulos-nutricionales'
  ].join('\n');

  await mailer.sendMail({
    from,
    to: recipients.join(','),
    subject,
    text
  });

  return { attempted: true, recipientsCount: recipients.length };
}
