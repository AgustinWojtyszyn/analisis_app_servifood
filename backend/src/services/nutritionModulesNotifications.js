import nodemailer from 'nodemailer';
import { renderNewSgcModuleEmail } from './email/emailTemplates.js';

export const FIXED_RECIPIENTS = [
  'direcciontecnicaservifood@gmail.com',
  'nutrisionservifood@yahoo.com',
  'vanesalegonzalez@gmail.com',
  'agustinwojtyszyn99@gmail.com'
];

let transporter = null;
let warnedMissingConfig = false;
let createTransport = (options) => nodemailer.createTransport(options);
const EXPECTED_SMTP_HOST = 'smtp.resend.com';
const EXPECTED_SMTP_PORT = 587;
const EXPECTED_SMTP_USER = 'resend';
const EXPECTED_SMTP_FROM = 'soporte@servifoodapp.site';
const documentNotificationDebugEnabled = process.env.DOCUMENTS_NOTIFICATIONS_DEBUG === '1' || process.env.NODE_ENV !== 'production';

function sanitizeErrorMessage(error) {
  const raw = String(error?.message || error || 'unknown_error');
  return raw
    .replace(/smtp_(host|port|user|pass|from)\s*[:=]\s*[^|,\n]+/gi, 'smtp_$1=[redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(bearer|token|authorization)\b[^\s]*/gi, '[redacted-token]')
    .slice(0, 300);
}

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

  if (documentNotificationDebugEnabled) {
    console.info('[nutrition-modules-email] Destinatarios validados (whitelist fija)', {
      recipientsCount: actual.length
    });
  }
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

  transporter = createTransport({
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

export function formatArgentinaDateTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return String(value || '');
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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

function resolveEmailLogoUrl() {
  return String(
    process.env.EMAIL_LOGO_URL
    || process.env.LOGO_URL
    || 'https://analisis.servifoodapp.site/servifood_logo_white_text_HQ.png'
  ).trim();
}

export async function sendDocumentCreatedEmailNotification(notification) {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('SMTP no configurado: transporter no disponible');
  }

  const recipients = toRecipientArray(notification?.recipients);
  assertFixedRecipientsOrThrow(recipients);
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const provider = 'smtp-nodemailer';

  validateSmtpConfigurationOrThrow({ host, port, user, from });

  if (documentNotificationDebugEnabled) {
    console.info('[nutrition-modules-email] SMTP send start', {
      type: 'document_created',
      provider,
      recipientsCount: recipients.length
    });
  }

  const subject = 'Nuevo documento cargado en Documentos SGC';
  const platformUrl = 'https://analisis.servifoodapp.site/modulos-nutricionales';
  const safeTitle = notification?.title || '-';
  const safeCategory = formatCategory(notification?.module_type) || '-';
  const safeDate = formatArgentinaDateTime(notification?.document_created_at || notification?.created_at) || '-';
  const text = [
    'Se cargó un nuevo documento en Documentos SGC.',
    '',
    `Nombre: ${notification?.title || '-'}`,
    `Categoría: ${formatCategory(notification?.module_type) || '-'}`,
    `Fecha de carga: ${formatArgentinaDateTime(notification?.document_created_at || notification?.created_at) || '-'}`,
    '',
    'Podés verlo ingresando a:',
    platformUrl
  ].join('\n');
  const html = renderNewSgcModuleEmail({
    title: safeTitle,
    category: safeCategory,
    uploadedAt: safeDate,
    platformUrl,
    logoUrl: resolveEmailLogoUrl()
  });

  await transporter.verify();
  if (documentNotificationDebugEnabled) {
    console.info('[nutrition-modules-email] SMTP verify ok', {
      type: 'document_created',
      provider
    });
  }

  const info = await transporter.sendMail({
    from,
    to: recipients.join(','),
    subject,
    text,
    html
  });

  const accepted = Array.isArray(info?.accepted) ? info.accepted : [];
  const rejected = Array.isArray(info?.rejected) ? info.rejected : [];
  const acceptedNormalized = accepted.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
  const recipientsNormalized = recipients.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
  const missingAccepted = recipientsNormalized.filter((email) => !acceptedNormalized.includes(email));
  const unexpectedAccepted = acceptedNormalized.filter((email) => !recipientsNormalized.includes(email));
  const messageId = info?.messageId ? String(info.messageId) : '';
  const response = info?.response ? String(info.response) : '';
  const envelope = info?.envelope || null;

  if (documentNotificationDebugEnabled) {
    console.info('[nutrition-modules-email] SMTP send result', {
      type: 'document_created',
      provider,
      recipientsCount: recipients.length,
      acceptedCount: accepted.length,
      rejectedCount: rejected.length,
      messageId: messageId || null
    });
  }

  if (!accepted.length) {
    throw new Error('SMTP sin destinatarios aceptados (accepted vacío)');
  }
  if (rejected.length) {
    throw new Error('SMTP rechazó destinatarios');
  }
  if (missingAccepted.length) {
    throw new Error('SMTP no confirmó aceptación para todos los destinatarios');
  }
  if (unexpectedAccepted.length) {
    throw new Error('SMTP devolvió destinatarios aceptados inesperados');
  }
  if (!messageId) {
    throw new Error('SMTP no devolvió messageId');
  }

  const providerResponse = {
    accepted,
    rejected,
    response: response || null,
    envelope,
    messageId
  };

  return {
    attempted: true,
    recipientsCount: recipients.length,
    provider,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    response: response || null,
    messageId,
    providerMessageId: messageId,
    providerResponse
  };
}

export { sanitizeErrorMessage };

export function __setNutritionModulesEmailTransportFactoryForTests(factory) {
  createTransport = factory;
  transporter = null;
  warnedMissingConfig = false;
}

export function __resetNutritionModulesEmailServiceForTests() {
  createTransport = (options) => nodemailer.createTransport(options);
  transporter = null;
  warnedMissingConfig = false;
}
