import nodemailer from 'nodemailer';
import { renderCertificationExpirationEmail, renderCertificationAutomaticPilotEmail } from './emailTemplates.js';

export const CERTIFICATION_TEST_EMAIL_RECIPIENT = 'agustinwojtyszyn99@gmail.com';

let transporter = null;
let warnedMissingConfig = false;

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
      console.warn('[certifications-email] SMTP incompleto', {
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

function resolveFrontendCertificationsUrl() {
  const frontendBase = String(process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  if (!frontendBase) return '';
  return `${frontendBase}/certificaciones`;
}

function resolveEmailLogoUrl() {
  return String(
    process.env.EMAIL_LOGO_URL
    || process.env.LOGO_URL
    || 'https://analisis.servifoodapp.site/servifood_logo_white_text_HQ.png'
  ).trim();
}

export async function sendCertificationExpirationTestEmail({ certification, triggerInfo, to }) {
  const recipient = String(to || '').trim().toLowerCase();
  if (recipient !== CERTIFICATION_TEST_EMAIL_RECIPIENT) {
    throw new Error('Destinatario no permitido para prueba controlada');
  }

  const transport = getTransporter();
  if (!transport) {
    throw new Error('Email sender no configurado. Faltan variables SMTP.');
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) {
    throw new Error('Email sender no configurado. Faltan variables SMTP.');
  }

  const subject = '[Prueba ServiFood] Certificación próxima a vencer';
  const certificationsUrl = resolveFrontendCertificationsUrl();
  const html = renderCertificationExpirationEmail({
    certification,
    triggerInfo,
    certificationsUrl,
    logoUrl: resolveEmailLogoUrl()
  });
  const text = [
    'Hola,',
    '',
    'Esta es una notificación de prueba del módulo de Certificaciones de ServiFood.',
    '',
    `Certificación: ${certification?.name || '-'}`,
    `Módulo/Categoría: ${certification?.module || '-'}`,
    `Tipo: ${certification?.type || '-'}`,
    `Fecha de vencimiento: ${certification?.expiration_date || '-'}`,
    `Días restantes: ${triggerInfo?.daysUntilExpiration ?? '-'}`,
    `Trigger detectado: ${triggerInfo?.triggerType || '-'}`,
    '',
    'Este envío corresponde a una prueba controlada.',
    'Por ahora las notificaciones reales a usuarios no están activadas.',
    certificationsUrl ? `\nVer certificaciones: ${certificationsUrl}` : ''
  ].join('\n');

  console.info('[certifications-email] Intento envío prueba', {
    certificationId: certification?.id || null,
    triggerType: triggerInfo?.triggerType || null,
    recipient
  });

  const info = await transport.sendMail({
    from,
    to: recipient,
    subject,
    text,
    html
  });

  return {
    provider: 'smtp-nodemailer',
    messageId: info?.messageId || null,
    accepted: Array.isArray(info?.accepted) ? info.accepted : [],
    rejected: Array.isArray(info?.rejected) ? info.rejected : []
  };
}

export async function sendCertificationExpirationPilotEmail({ certification, triggerInfo, to }) {
  const recipient = String(to || '').trim().toLowerCase();
  if (recipient !== CERTIFICATION_TEST_EMAIL_RECIPIENT) {
    throw new Error('Destinatario no permitido para automatización piloto');
  }

  const transport = getTransporter();
  if (!transport) {
    throw new Error('Email sender no configurado. Faltan variables SMTP.');
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) {
    throw new Error('Email sender no configurado. Faltan variables SMTP.');
  }

  const subject = '[Piloto ServiFood] Certificación próxima a vencer';
  const certificationsUrl = resolveFrontendCertificationsUrl();
  const html = renderCertificationAutomaticPilotEmail({
    certification,
    triggerInfo,
    certificationsUrl,
    logoUrl: resolveEmailLogoUrl()
  });
  const humanTrigger = triggerInfo?.triggerType === 'one_day_before'
    ? 'Vence mañana'
    : (triggerInfo?.triggerType === 'seven_days_before' ? 'Vence en 7 días' : 'Próximo vencimiento');
  const text = [
    'Hola,',
    '',
    'El sistema detectó automáticamente una certificación próxima a vencer.',
    '',
    'Este aviso corresponde al monitoreo automático de vencimientos del módulo de Certificaciones.',
    '',
    `Certificación: ${certification?.name || '-'}`,
    `Módulo/Categoría: ${certification?.module || '-'}`,
    `Tipo: ${certification?.type || '-'}`,
    `Fecha de vencimiento: ${certification?.expiration_date || '-'}`,
    `Días restantes: ${triggerInfo?.daysUntilExpiration ?? '-'}`,
    `Aviso: ${humanTrigger}`,
    '',
    'Este envío corresponde a una automatización piloto.',
    'Por ahora las notificaciones automáticas solo se envían al correo configurado de prueba.',
    certificationsUrl ? `\nVer certificaciones: ${certificationsUrl}` : ''
  ].join('\n');

  console.info('[certifications-email] Intento envío automático piloto', {
    certificationId: certification?.id || null,
    triggerType: triggerInfo?.triggerType || null,
    recipient
  });

  const info = await transport.sendMail({
    from,
    to: recipient,
    subject,
    text,
    html
  });

  return {
    provider: 'smtp-nodemailer',
    messageId: info?.messageId || null,
    accepted: Array.isArray(info?.accepted) ? info.accepted : [],
    rejected: Array.isArray(info?.rejected) ? info.rejected : []
  };
}
