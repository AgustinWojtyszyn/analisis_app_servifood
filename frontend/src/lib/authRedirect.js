const CUSTOM_DOMAIN = 'https://analisis.servifoodapp.site';
const RENDER_DOMAIN = 'https://analisis-app-servifood.onrender.com';

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin) {
  return origin === 'http://localhost:3000' || origin === 'http://localhost:5173';
}

function isBlockedProductionOrigin(origin) {
  return origin === CUSTOM_DOMAIN;
}

export function resolveAuthRedirectUrl() {
  const envMode = import.meta.env.MODE;
  const isProd = envMode === 'production';

  const customFromEnv = normalizeUrl(import.meta.env.VITE_CUSTOM_DOMAIN_URL);
  const renderFromEnv = normalizeUrl(import.meta.env.VITE_RENDER_URL);
  const publicFromEnv = normalizeUrl(import.meta.env.VITE_PUBLIC_SITE_URL);

  if (isProd) {
    const candidates = [
      publicFromEnv,
      renderFromEnv,
      RENDER_DOMAIN
    ].filter(Boolean).filter((origin) => !isBlockedProductionOrigin(origin));

    const selected = candidates.find((origin) => !isLocalOrigin(origin) && !isBlockedProductionOrigin(origin));

    if (!selected) {
      console.warn('[auth] No valid production redirect URL found. Using Render fallback.');
      return RENDER_DOMAIN;
    }

    return selected;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}
