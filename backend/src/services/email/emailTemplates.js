function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderRows(rows = []) {
  return rows
    .map((row) => `<div><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}</div>`)
    .join('');
}

export function renderBaseEmailTemplate({
  headline = '',
  subtitle = 'App de análisis Servifood',
  intro = '',
  details = [],
  ctaText = '',
  ctaUrl = '',
  footer = 'Este aviso corresponde a la app de análisis de Servifood.'
}) {
  const safeHeadline = escapeHtml(headline);
  const safeSubtitle = escapeHtml(subtitle);
  const safeIntro = escapeHtml(intro).replace(/\n/g, '<br/>');
  const safeFooter = escapeHtml(footer);
  const safeCtaText = escapeHtml(ctaText);
  const safeCtaUrl = String(ctaUrl || '').trim();
  const hasCta = Boolean(safeCtaText && safeCtaUrl);

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#dde7f5;font-family:Arial,Helvetica,sans-serif;color:#1f2f4a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#dde7f5;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#082a4d;padding:20px 24px;text-align:center;">
                <h1 style="margin:0 0 6px 0;font-size:24px;line-height:1.2;color:#ffffff;">${safeHeadline}</h1>
                <p style="margin:0;font-size:14px;color:#c5d8ef;">${safeSubtitle}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">${safeIntro}</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #cad9ec;border-radius:8px;background:#f3f8ff;">
                  <tr><td style="padding:14px 16px;font-size:14px;line-height:1.6;">${renderRows(details)}</td></tr>
                </table>
                ${hasCta ? `<div style="margin-top:22px;text-align:center;"><a href="${escapeHtml(safeCtaUrl)}" style="display:inline-block;background:#082a4d;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:6px;">${safeCtaText}</a></div>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#f4f7fc;border-top:1px solid #e2eaf7;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#5b6f8b;">${safeFooter}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderNewSgcModuleEmail({ title, category, uploadedAt, platformUrl }) {
  return renderBaseEmailTemplate({
    headline: 'Nuevo documento cargado',
    intro: 'Se cargó un nuevo documento en Documentos SGC.',
    details: [
      { label: 'Nombre', value: title || '-' },
      { label: 'Categoría', value: category || '-' },
      { label: 'Fecha de carga', value: uploadedAt || '-' }
    ],
    ctaText: platformUrl ? 'Ver documento en la plataforma' : '',
    ctaUrl: platformUrl || ''
  });
}

export function renderCertificationExpirationEmail({ certification, triggerInfo, certificationsUrl }) {
  return renderBaseEmailTemplate({
    headline: 'Certificación próxima a vencer',
    intro: 'Hola,\n\nEsta es una notificación de prueba del módulo de Certificaciones de ServiFood.\n\nDetectamos una certificación próxima a vencer y se generó este aviso interno para validar el funcionamiento del sistema de notificaciones.',
    details: [
      { label: 'Certificación', value: certification?.name || '-' },
      { label: 'Módulo/Categoría', value: certification?.module || '-' },
      { label: 'Tipo', value: certification?.type || '-' },
      { label: 'Fecha de vencimiento', value: certification?.expiration_date || '-' },
      { label: 'Días restantes', value: triggerInfo?.daysUntilExpiration ?? '-' },
      { label: 'Trigger detectado', value: triggerInfo?.triggerType || '-' }
    ],
    ctaText: certificationsUrl ? 'Ver certificaciones' : '',
    ctaUrl: certificationsUrl || '',
    footer: 'Este envío corresponde a una prueba controlada. Por ahora las notificaciones reales a usuarios no están activadas.'
  });
}
