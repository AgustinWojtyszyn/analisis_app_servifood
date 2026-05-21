import nodemailer from 'nodemailer';

const DEFAULT_RECIPIENTS = [
  'direcciontecnicaservifood@gmail.com',
  'nutrisionservifood@yahoo.com',
  'vanesalegonzalez@gmail.com',
  'agustinwojtyszyn99@gmail.com'
];

let transporter = null;
let warnedMissingConfig = false;

function parseRecipients(value) {
  if (!value) return [...DEFAULT_RECIPIENTS];
  return String(value)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getRecipients() {
  const parsed = parseRecipients(process.env.DOCUMENTS_NOTIFICATION_RECIPIENTS);
  return Array.from(new Set(parsed));
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

export async function notifyNutritionModuleCreated({ title, moduleType, createdAt }) {
  const mailer = getTransporter();
  if (!mailer) return { attempted: false, reason: 'smtp_not_configured' };

  const recipients = getRecipients();
  if (!recipients.length) {
    return { attempted: false, reason: 'no_recipients' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = 'Nuevo documento cargado en Documentos SGC';
  const text = [
    'Se cargó un nuevo documento en Documentos SGC.',
    '',
    `Nombre: ${title || '-'}`,
    `Categoría: ${formatCategory(moduleType) || '-'}`,
    `Fecha de carga: ${formatDate(createdAt) || '-'}`,
    '',
    'Ingresá a la plataforma para visualizarlo.'
  ].join('\n');

  await mailer.sendMail({
    from,
    to: recipients.join(','),
    subject,
    text
  });

  return { attempted: true, recipientsCount: recipients.length };
}
