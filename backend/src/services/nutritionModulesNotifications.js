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

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

  console.log('VERIFY SMTP...');
  console.log('SMTP_HOST usado', host);
  console.log('SMTP_PORT usado', port);
  console.log('SMTP_USER usado', user);
  console.log('SMTP_FROM usado', from);
  console.log('Destinatarios finales', recipients);
  console.log('Subject', 'Nuevo documento cargado en Documentos SGC');
  console.log('Provider SMTP', provider);

  const subject = 'Nuevo documento cargado en Documentos SGC';
  const platformUrl = 'https://analisis.servifoodapp.site/modulos-nutricionales';
  const logoUrl = String(process.env.LOGO_URL || 'https://analisis.servifoodapp.site/logo-servifood.png').trim();
  const safeTitle = escapeHtml(notification?.title || '-');
  const safeCategory = escapeHtml(formatCategory(notification?.module_type) || '-');
  const safeDate = escapeHtml(formatDate(notification?.document_created_at || notification?.created_at) || '-');
  const text = [
    'Se cargó un nuevo documento en Documentos SGC.',
    '',
    `Nombre: ${notification?.title || '-'}`,
    `Categoría: ${formatCategory(notification?.module_type) || '-'}`,
    `Fecha de carga: ${formatDate(notification?.document_created_at || notification?.created_at) || '-'}`,
    '',
    'Podés verlo ingresando a:',
    platformUrl
  ].join('\n');
  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#eef3f8;font-family:Arial,Helvetica,sans-serif;color:#1f2f4a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#0b5ed7;padding:20px 24px;text-align:center;">
                <img src="${escapeHtml(logoUrl)}" alt="Servifood" style="max-width:180px;height:auto;display:inline-block;border:0;outline:none;text-decoration:none;" />
                <h1 style="margin:14px 0 6px 0;font-size:24px;line-height:1.2;color:#ffffff;">Nuevo documento cargado</h1>
                <p style="margin:0;font-size:14px;color:#dce9ff;">App de análisis Servifood</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">Se cargó un nuevo documento en <strong>Documentos SGC</strong>.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dce6f5;border-radius:8px;background:#f8fbff;">
                  <tr><td style="padding:14px 16px;font-size:14px;line-height:1.6;">
                    <div><strong>Nombre:</strong> ${safeTitle}</div>
                    <div><strong>Categoría:</strong> ${safeCategory}</div>
                    <div><strong>Fecha de carga:</strong> ${safeDate}</div>
                  </td></tr>
                </table>
                <div style="margin-top:22px;text-align:center;">
                  <a href="${platformUrl}" style="display:inline-block;background:#0b5ed7;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:6px;">Ver documento en la plataforma</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#f4f7fc;border-top:1px solid #e2eaf7;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#5b6f8b;">Este aviso corresponde a la app de análisis de Servifood.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const verifyResult = await transporter.verify();
  console.log('SMTP OK');
  console.log('VERIFY RESULT', verifyResult);

  console.log('Ejecutando sendMail');

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

  console.log('RAW INFO', info);
  console.log('MESSAGE ID', messageId || null);
  console.log('ACCEPTED', accepted);
  console.log('REJECTED', rejected);
  console.log('RESPONSE', response || null);

  if (!accepted.length) {
    throw new Error('SMTP sin destinatarios aceptados (accepted vacío)');
  }
  if (rejected.length) {
    throw new Error(`SMTP rechazó destinatarios: ${rejected.join(', ')}`);
  }
  if (missingAccepted.length) {
    throw new Error(`SMTP no confirmó aceptación para todos los destinatarios: faltan ${missingAccepted.join(', ')}`);
  }
  if (unexpectedAccepted.length) {
    throw new Error(`SMTP devolvió destinatarios aceptados inesperados: ${unexpectedAccepted.join(', ')}`);
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
    accepted,
    rejected,
    response: response || null,
    messageId,
    providerMessageId: messageId,
    providerResponse
  };
}
