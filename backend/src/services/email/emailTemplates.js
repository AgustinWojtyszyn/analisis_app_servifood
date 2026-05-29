function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateEsAR(value = '') {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || '-';
  const [y, m, d] = raw.split('-').map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return raw;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function renderRows(rows = []) {
  return rows.map((row) => `
    <tr>
      <td style="padding:7px 0;vertical-align:top;width:42%;font-size:14px;line-height:1.5;color:#102E63;font-weight:700;">${escapeHtml(row.label)}</td>
      <td style="padding:7px 0;vertical-align:top;font-size:14px;line-height:1.5;color:#243653;">${escapeHtml(row.value)}</td>
    </tr>
  `).join('');
}

export function renderBaseEmailTemplate({
  headline = '',
  subtitle = 'App de análisis Servifood',
  intro = '',
  preheader = '',
  details = [],
  highlightText = '',
  ctaText = '',
  ctaUrl = '',
  logoUrl = '',
  logoOnBlueHeader = false,
  footerTitle = 'ServiFood Catering',
  footerSubtitle = 'Sistema de Gestión de Calidad',
  footer = 'Este aviso corresponde a la app de análisis de Servifood.'
}) {
  const safeHeadline = escapeHtml(headline);
  const safeSubtitle = escapeHtml(subtitle);
  const safeIntro = escapeHtml(intro).replace(/\n/g, '<br/>');
  const safePreheader = escapeHtml(preheader);
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
  const useBlueHeaderForLogo = Boolean(logoOnBlueHeader && hasLogo);

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#143B82;font-family:Arial,Helvetica,sans-serif;color:#1f2f4a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;font-size:1px;line-height:1px;">${safePreheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#143B82;background-image:linear-gradient(135deg,#0F3474 0%,#1F5DB8 100%);padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;">
            ${useBlueHeaderForLogo ? `<tr><td style="background:#123B7A;padding:22px 24px;text-align:center;"><img src="${escapeHtml(safeLogoUrl)}" alt="ServiFood" style="max-width:138px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;" /></td></tr>` : ''}
            <tr>
              <td style="padding:${useBlueHeaderForLogo ? '28px 34px 10px 34px' : '30px 34px 10px 34px'};text-align:center;">
                ${hasLogo && !useBlueHeaderForLogo ? `<img src="${escapeHtml(safeLogoUrl)}" alt="ServiFood" style="max-width:140px;height:auto;display:block;margin:0 auto 16px auto;border:0;outline:none;text-decoration:none;" />` : ''}
                <h1 style="margin:0 0 8px 0;font-size:29px;line-height:1.2;color:#082B63;font-weight:800;">${safeHeadline}</h1>
                <p style="margin:0 0 4px 0;font-size:15px;color:#3f567a;font-weight:600;">${safeSubtitle}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 34px 30px 34px;">
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#243653;">${safeIntro}</p>
                ${hasHighlight ? `<div style="margin:0 0 14px 0;"><span style="display:inline-block;background:#FFF1C2;color:#6B4300;border:1px solid #FFD56A;border-radius:999px;padding:7px 13px;font-size:13px;font-weight:700;">${safeHighlightText}</span></div>` : ''}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #DDE6F3;border-radius:14px;background:#F6F8FC;">
                  <tr><td style="padding:18px 18px;font-size:14px;line-height:1.6;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${renderRows(details)}</table></td></tr>
                </table>
                ${hasCta ? `<div style="margin-top:22px;text-align:center;"><a href="${escapeHtml(safeCtaUrl)}" style="display:inline-block;background:#082a4d;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:6px;">${safeCtaText}</a></div>` : ''}
                <div style="margin-top:18px;background:#EAF1FF;color:#123B7A;border-left:4px solid #1F5DB8;padding:13px 15px;border-radius:10px;">
                  <p style="margin:0;font-size:13px;line-height:1.45;">${safeFooter}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 22px 24px;background:#ffffff;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.45;color:#6B7A90;font-weight:700;">${safeFooterTitle}</p>
                <p style="margin:2px 0 0 0;font-size:12px;line-height:1.45;color:#6B7A90;">${safeFooterSubtitle}</p>
                <p style="margin:6px 0 0 0;font-size:12px;line-height:1.45;color:#6B7A90;">Este correo fue generado automáticamente por la App de análisis ServiFood.</p>
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
  const days = Number(triggerInfo?.daysUntilExpiration);
  const humanTrigger = days === 0 ? 'Vence hoy' : (days === 1 ? 'Vence mañana' : (days >= 2 && days <= 7 ? `Vence en ${days} días` : 'Próximo vencimiento'));
  const preheaderExpirationLabel = days === 0 ? 'hoy' : (days === 1 ? 'mañana' : (days >= 2 && days <= 7 ? `en ${days} días` : 'próximamente'));
  const certificationName = certification?.name || '-';
  const highlightText = days === 0 ? 'Vence hoy' : (days === 1 ? 'Vence mañana' : (days >= 2 && days <= 7 ? `Vence en ${days} días` : ''));
  return renderBaseEmailTemplate({
    headline: 'Certificación próxima a vencer',
    intro: 'Hola,\n\nEsta es una notificación de prueba del módulo de Certificaciones de ServiFood.\n\nDetectamos una certificación próxima a vencer y se generó este aviso interno para validar el funcionamiento del sistema de notificaciones.',
    preheader: `Certificación ${certificationName} vence ${preheaderExpirationLabel}. Aviso de prueba ServiFood.`,
    details: [
      { label: 'Certificación', value: certification?.name || '-' },
      { label: 'Módulo/Categoría', value: certification?.module || '-' },
      { label: 'Tipo', value: certification?.type || '-' },
      { label: 'Fecha de vencimiento', value: formatDateEsAR(certification?.expiration_date || '-') },
      { label: 'Días restantes', value: triggerInfo?.daysUntilExpiration ?? '-' },
      { label: 'Trigger detectado', value: humanTrigger }
    ],
    highlightText,
    ctaText: certificationsUrl ? 'Ver certificaciones' : '',
    ctaUrl: certificationsUrl || '',
    logoUrl: logoUrl || '',
    logoOnBlueHeader: true,
    footer: 'Este envío corresponde a una prueba controlada. Por ahora las notificaciones reales a usuarios no están activadas.'
  });
}

export function renderCertificationAutomaticPilotEmail({ certification, triggerInfo, certificationsUrl, logoUrl }) {
  const days = Number(triggerInfo?.daysUntilExpiration);
  const humanTrigger = days === 0 ? 'Vence hoy' : (days === 1 ? 'Vence mañana' : (days >= 2 && days <= 7 ? `Vence en ${days} días` : 'Próximo vencimiento'));
  const preheaderExpirationLabel = days === 0 ? 'hoy' : (days === 1 ? 'mañana' : (days >= 2 && days <= 7 ? `en ${days} días` : 'próximamente'));
  const certificationName = certification?.name || '-';
  const highlightText = days === 0 ? 'Vence hoy' : (days === 1 ? 'Vence mañana' : (days >= 2 && days <= 7 ? `Vence en ${days} días` : ''));

  return renderBaseEmailTemplate({
    headline: 'Certificación próxima a vencer',
    intro: 'Hola,\n\nEl sistema detectó automáticamente una certificación próxima a vencer.\n\nEste aviso corresponde al monitoreo automático de vencimientos del módulo de Certificaciones.',
    preheader: `Certificación ${certificationName} vence ${preheaderExpirationLabel}. Aviso automático piloto ServiFood.`,
    details: [
      { label: 'Certificación', value: certification?.name || '-' },
      { label: 'Módulo/Categoría', value: certification?.module || '-' },
      { label: 'Tipo', value: certification?.type || '-' },
      { label: 'Fecha de vencimiento', value: formatDateEsAR(certification?.expiration_date || '-') },
      { label: 'Días restantes', value: triggerInfo?.daysUntilExpiration ?? '-' },
      { label: 'Aviso', value: humanTrigger }
    ],
    highlightText,
    ctaText: certificationsUrl ? 'Ver certificaciones' : '',
    ctaUrl: certificationsUrl || '',
    logoUrl: logoUrl || '',
    logoOnBlueHeader: true,
    footer: 'Este envío corresponde a una automatización piloto. Por ahora las notificaciones automáticas solo se envían al correo configurado de prueba.'
  });
}
