const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/phytoscan/v1';
const CONFIG_STORAGE_KEY = 'phytoscan_octopus_config';
const ACCESS_TOKEN_KEY = 'phytoscan_access_token';
const REFRESH_TOKEN_KEY = 'phytoscan_refresh_token';

const getStorage = (key) => localStorage.getItem(key) || sessionStorage.getItem(key);
const getConfiguredApiBaseUrl = () => {
  try {
    const config = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || '{}');
    return config.baseUrl || API_BASE_URL;
  } catch {
    return API_BASE_URL;
  }
};

export const getAccessToken = () => getStorage(ACCESS_TOKEN_KEY);

export const saveTokenPair = (tokens, rememberMe = true) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  const otherStorage = rememberMe ? sessionStorage : localStorage;
  otherStorage.removeItem(ACCESS_TOKEN_KEY);
  otherStorage.removeItem(REFRESH_TOKEN_KEY);
  storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};

const refreshAccessToken = async (baseUrl) => {
  const refreshToken = getStorage(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;

  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  if (!response.ok) return false;

  const storage = localStorage.getItem(REFRESH_TOKEN_KEY) ? localStorage : sessionStorage;
  const tokens = await response.json();
  storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  return true;
};

const request = async (path, options, retry = true, baseUrl = getConfiguredApiBaseUrl()) => {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, { ...options, headers });
  if (response.status === 401 && retry && path !== '/auth/refresh' && await refreshAccessToken(baseUrl)) {
    return request(path, options, false, baseUrl);
  }

  if (!response.ok) {
    let message = `Erreur API (${response.status})`;
    try {
      const body = await response.json();
      const detail = body.detail;
      message = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(item => item.msg).filter(Boolean).join(' ')
          : message;
    } catch {
      // Keep the HTTP status message when the response is not JSON.
    }
    throw new Error(message);
  }

  return response.status === 204 ? null : response.json();
};

export const apiRequest = (path, options = {}, baseUrl = getConfiguredApiBaseUrl()) => request(path, options, true, baseUrl);

export const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export { API_BASE_URL };