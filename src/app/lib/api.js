import { getApiBaseUrl } from './runtimeConfig.js';

const API_BASE_URL = getApiBaseUrl();

function normalizePath(path) {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return path;
  return `/${path}`;
}

export function buildApiUrl(path, query) {
  const normalizedPath = normalizePath(path);
  const hasAbsoluteBase = /^https?:\/\//i.test(API_BASE_URL);
  const hasAbsolutePath = /^https?:\/\//i.test(normalizedPath);

  let url;
  if (hasAbsolutePath) {
    url = new URL(normalizedPath);
  } else if (hasAbsoluteBase) {
    url = new URL(`${API_BASE_URL}${normalizedPath}`);
  } else {
    url = new URL(normalizedPath, window.location.origin);
  }

  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  if (hasAbsolutePath || hasAbsoluteBase) return url.toString();
  return `${url.pathname}${url.search}`;
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function extractApiMessage(payload, fallbackMessage) {
  if (!payload) return fallbackMessage;
  if (typeof payload === 'string') return payload;
  if (typeof payload.detail === 'string') return payload.detail;
  if (Array.isArray(payload.detail)) {
    const details = payload
      .detail
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        if (typeof item.msg === 'string') return item.msg;
        if (typeof item.message === 'string') return item.message;
        return null;
      })
      .filter(Boolean);
    if (details.length) return details.join('; ');
  }
  return fallbackMessage;
}

export async function apiRequest(path, { method = 'GET', accessToken, body, query, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(buildApiUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    throw new ApiError('Không tải được dữ liệu từ máy chủ.', 0, error);
  }

  const rawText = await response.text();
  let payload = null;
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    throw new ApiError(extractApiMessage(payload, `API lỗi ${response.status}`), response.status, payload);
  }

  return payload;
}

export function parseResponseText(rawText) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

export function assertListResponseShape(payload, name) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items)) {
    throw new ApiError(`${name} sai schema: thiếu trường items dạng mảng.`, 500, payload);
  }
  return payload.items;
}
