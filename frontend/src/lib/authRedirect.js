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

export function resolveAuthRedirectUrl() {
  const envMode = import.meta.env.MODE;
  const isProd = envMode === 'production';

  const customFromEnv = normalizeUrl(import.meta.env.VITE_CUSTOM_DOMAIN_URL);
  const renderFromEnv = normalizeUrl(import.meta.env.VITE_RENDER_URL);
  const publicFromEnv = normalizeUrl(import.meta.env.VITE_PUBLIC_SITE_URL);

  if (isProd) {
    const candidates = [
      customFromEnv,
      publicFromEnv,
      renderFromEnv,
      CUSTOM_DOMAIN,
      RENDER_DOMAIN
    ].filter(Boolean);

    const selected = candidates.find((origin) => !isLocalOrigin(origin));

    if (!selected) {
      console.warn('[auth] No valid production redirect URL found. Using custom domain fallback.');
      return CUSTOM_DOMAIN;
    }

    return selected;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}
