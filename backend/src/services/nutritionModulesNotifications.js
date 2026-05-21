import nodemailer from 'nodemailer';

export const FIXED_RECIPIENTS = [
  'direcciontecnicaservifood@gmail.com',
  'nutrisionservifood@yahoo.com',
  'vanesalegonzalez@gmail.com',
  'agustinwojtyszyn99@gmail.com'
];

let transporter = null;
let warnedMissingConfig = false;
const EXPECTED_SMTP_HOST = 'smtp.resend.com';
const EXPECTED_SMTP_PORT = 587;
const EXPECTED_SMTP_USER = 'resend';
const EXPECTED_SMTP_FROM = 'soporte@servifoodapp.site';

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
      console.warn('[nutrition-modules-email] SMTP no configurado. Se omiten notificaciones de Documentos SGC.', {
        hasHost: !!host,
        hasPort: Number.isFinite(port),
        hasUser: !!user,
        hasPass: !!pass
      });
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

function validateSmtpConfigurationOrThrow({ host, port, user, from }) {
  const issues = [];
  if (!host || host === 'null' || host === 'undefined') issues.push('SMTP_HOST faltante');
  if (!Number.isFinite(port)) issues.push('SMTP_PORT inválido');
  if (!user || user === 'null' || user === 'undefined') issues.push('SMTP_USER faltante');
  if (!from || from === 'null' || from === 'undefined') issues.push('SMTP_FROM faltante');

  if (host !== EXPECTED_SMTP_HOST) {
    issues.push(`SMTP_HOST inesperado: "${host}" (esperado "${EXPECTED_SMTP_HOST}")`);
  }
  if (port !== EXPECTED_SMTP_PORT) {
    issues.push(`SMTP_PORT inesperado: "${port}" (esperado "${EXPECTED_SMTP_PORT}")`);
  }
  if (user !== EXPECTED_SMTP_USER) {
    issues.push(`SMTP_USER inesperado: "${user}" (esperado "${EXPECTED_SMTP_USER}")`);
  }
  if (from !== EXPECTED_SMTP_FROM) {
    issues.push(`SMTP_FROM inesperado: "${from}" (esperado "${EXPECTED_SMTP_FROM}")`);
  }

  if (issues.length) {
    throw new Error(`[nutrition-modules-email] Configuración SMTP inválida: ${issues.join(' | ')}`);
  }
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
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const provider = 'smtp-nodemailer';

  validateSmtpConfigurationOrThrow({ host, port, user, from });

  console.info('[nutrition-modules-email] SMTP pre-send config', {
    notificationId: notification?.id || null,
    documentId: notification?.document_id || null,
    SMTP_HOST: host,
    SMTP_PORT: port,
    SMTP_USER: user,
    SMTP_FROM: from,
    recipients,
    provider
  });

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

  const verifyResult = await mailer.verify();
  console.info('[nutrition-modules-email] SMTP transport.verify() OK', {
    notificationId: notification?.id || null,
    verifyResult
  });

  console.info('[nutrition-modules-email] Ejecutando sendMail', {
    notificationId: notification?.id || null,
    subject,
    from,
    to: recipients
  });

  const info = await mailer.sendMail({
    from,
    to: recipients.join(','),
    subject,
    text
  });

  const accepted = Array.isArray(info?.accepted) ? info.accepted : [];
  const rejected = Array.isArray(info?.rejected) ? info.rejected : [];
  const acceptedNormalized = accepted.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
  const recipientsNormalized = recipients.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
  const missingAccepted = recipientsNormalized.filter((email) => !acceptedNormalized.includes(email));
  const messageId = info?.messageId ? String(info.messageId) : '';
  const response = info?.response ? String(info.response) : '';

  console.info('[nutrition-modules-email] Respuesta proveedor SMTP (completa)', {
    notificationId: notification?.id || null,
    rawInfo: info
  });

  console.info('[nutrition-modules-email] Respuesta proveedor SMTP (normalizada)', {
    notificationId: notification?.id || null,
    accepted,
    rejected,
    response: response || null,
    messageId: messageId || null
  });

  if (!accepted.length) {
    throw new Error('SMTP sin destinatarios aceptados (accepted vacío)');
  }
  if (rejected.length) {
    throw new Error(`SMTP rechazó destinatarios: ${rejected.join(', ')}`);
  }
  if (missingAccepted.length) {
    throw new Error(`SMTP no confirmó aceptación para todos los destinatarios: faltan ${missingAccepted.join(', ')}`);
  }
  if (!messageId) {
    throw new Error('SMTP no devolvió messageId');
  }

  return {
    attempted: true,
    recipientsCount: recipients.length,
    provider,
    accepted,
    rejected,
    response: response || null,
    messageId
  };
}
