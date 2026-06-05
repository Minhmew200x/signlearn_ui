const ENV = import.meta.env || {};
const CONFIGURED_API_BASE_URL = (ENV.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const CONFIGURED_PROXY_TARGET = (ENV.VITE_PROXY_TARGET || '').trim().replace(/\/+$/, '');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

function shouldUseRelativeApiBase() {
  if (typeof window === 'undefined') return false;
  const { hostname, origin } = window.location;
  if (LOCAL_HOSTS.has(hostname)) return true;
  return /\.vercel\.app$/i.test(hostname) || /signlearn/i.test(origin);
}

export function getApiBaseUrl() {
  if (CONFIGURED_API_BASE_URL) return CONFIGURED_API_BASE_URL;
  if (shouldUseRelativeApiBase()) return '';
  if (isHttpUrl(CONFIGURED_PROXY_TARGET)) return CONFIGURED_PROXY_TARGET;
  return '';
}

export function getGoogleAuthUrl() {
  return (
    ENV.VITE_GOOGLE_AUTH_URL ||
    ENV.VITE_GOOGLE_OAUTH_START_URL ||
    (getApiBaseUrl() ? `${getApiBaseUrl()}/api/v1/auth/google/start` : '/api/v1/auth/google/start')
  );
}

export function getGoogleCallbackExchangeUrl() {
  return ENV.VITE_GOOGLE_CALLBACK_EXCHANGE_URL || ENV.VITE_GOOGLE_OAUTH_EXCHANGE_PATH || '';
}
