const CONFIGURED_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const CONFIGURED_PROXY_TARGET = (import.meta.env.VITE_PROXY_TARGET || '').trim().replace(/\/+$/, '');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

function shouldUseRelativeApiBase() {
  if (typeof window === 'undefined') return false;
  return LOCAL_HOSTS.has(window.location.hostname);
}

export function getApiBaseUrl() {
  if (CONFIGURED_API_BASE_URL) return CONFIGURED_API_BASE_URL;
  if (shouldUseRelativeApiBase()) return '';
  if (isHttpUrl(CONFIGURED_PROXY_TARGET)) return CONFIGURED_PROXY_TARGET;
  return '';
}

export function getGoogleAuthUrl() {
  return (
    import.meta.env.VITE_GOOGLE_AUTH_URL ||
    import.meta.env.VITE_GOOGLE_OAUTH_START_URL ||
    (getApiBaseUrl() ? `${getApiBaseUrl()}/api/v1/auth/google/login` : '/api/v1/auth/google/login')
  );
}

export function getGoogleCallbackExchangeUrl() {
  return (
    import.meta.env.VITE_GOOGLE_CALLBACK_EXCHANGE_URL ||
    import.meta.env.VITE_GOOGLE_OAUTH_EXCHANGE_PATH ||
    ''
  );
}
