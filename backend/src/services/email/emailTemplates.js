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
  highlightText = '',
  ctaText = '',
  ctaUrl = '',
  logoUrl = '',
  footerTitle = 'ServiFood Catering',
  footerSubtitle = 'Sistema de Gestión de Calidad',
  footer = 'Este aviso corresponde a la app de análisis de Servifood.'
}) {
  const safeHeadline = escapeHtml(headline);
  const safeSubtitle = escapeHtml(subtitle);
  const safeIntro = escapeHtml(intro).replace(/\n/g, '<br/>');
  const safeFooter = escapeHtml(footer);
  const safeFooterTitle = escapeHtml(footerTitle);
  const safeFooterSubtitle = escapeHtml(footerSubtitle);
  const safeCtaText = escapeHtml(ctaText);
  const safeCtaUrl = String(ctaUrl || '').trim();
  const safeLogoUrl = String(logoUrl || '').trim();
  const safeHighlightText = escapeHtml(highlightText);
  const hasCta = Boolean(safeCtaText && safeCtaUrl);
  const hasLogo = Boolean(safeLogoUrl);
  const hasHighlight = Boolean(safeHighlightText);

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#143B82;font-family:Arial,Helvetica,sans-serif;color:#1f2f4a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#143B82;background-image:linear-gradient(135deg,#0F3474 0%,#1F5DB8 100%);padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 30px 8px 30px;text-align:center;">
                ${hasLogo ? `<img src="${escapeHtml(safeLogoUrl)}" alt="ServiFood" style="max-width:140px;height:auto;display:block;margin:0 auto 16px auto;border:0;outline:none;text-decoration:none;" />` : ''}
                <h1 style="margin:0 0 6px 0;font-size:28px;line-height:1.2;color:#082B63;">${safeHeadline}</h1>
                <p style="margin:0;font-size:14px;color:#4f6382;">${safeSubtitle}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 30px 28px 30px;">
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">${safeIntro}</p>
                ${hasHighlight ? `<div style="margin:0 0 14px 0;"><span style="display:inline-block;background:#FFE8A3;color:#7A4B00;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;">${safeHighlightText}</span></div>` : ''}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d9e2f2;border-radius:12px;background:#F4F7FB;">
                  <tr><td style="padding:14px 16px;font-size:14px;line-height:1.6;">${renderRows(details)}</td></tr>
                </table>
                ${hasCta ? `<div style="margin-top:22px;text-align:center;"><a href="${escapeHtml(safeCtaUrl)}" style="display:inline-block;background:#082a4d;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:6px;">${safeCtaText}</a></div>` : ''}
                <div style="margin-top:18px;background:#EAF1FF;color:#123B7A;border-left:4px solid #1F5DB8;padding:12px 14px;border-radius:10px;">
                  <p style="margin:0;font-size:13px;line-height:1.5;">${safeFooter}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px 20px 24px;background:#ffffff;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.4;color:#6a7f9f;font-weight:700;">${safeFooterTitle}</p>
                <p style="margin:2px 0 0 0;font-size:12px;line-height:1.4;color:#6a7f9f;">${safeFooterSubtitle}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderNewSgcModuleEmail({ title, category, uploadedAt, platformUrl, logoUrl }) {
  return renderBaseEmailTemplate({
    headline: 'Nuevo documento cargado',
    intro: 'Se cargó un nuevo documento en Documentos SGC.',
    details: [
      { label: 'Nombre', value: title || '-' },
      { label: 'Categoría', value: category || '-' },
      { label: 'Fecha de carga', value: uploadedAt || '-' }
    ],
    ctaText: platformUrl ? 'Ver documento en la plataforma' : '',
    ctaUrl: platformUrl || '',
    logoUrl: logoUrl || '',
    footer: 'Este aviso corresponde a la app de análisis de ServiFood.'
  });
}

export function renderCertificationExpirationEmail({ certification, triggerInfo, certificationsUrl, logoUrl }) {
  const highlightText = triggerInfo?.daysUntilExpiration === 1
    ? 'Vence mañana'
    : (triggerInfo?.daysUntilExpiration === 7 ? 'Vence en 7 días' : '');
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
    highlightText,
    ctaText: certificationsUrl ? 'Ver certificaciones' : '',
    ctaUrl: certificationsUrl || '',
    logoUrl: logoUrl || '',
    footer: 'Este envío corresponde a una prueba controlada. Por ahora las notificaciones reales a usuarios no están activadas.'
  });
}
