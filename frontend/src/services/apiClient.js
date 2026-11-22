const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://phytoscan-sn.onrender.com/phytoscan/v1";
const CONFIG_STORAGE_KEY = 'phytoscan_octopus_config';
const ACCESS_TOKEN_KEY = 'phytoscan_access_token';
const REFRESH_TOKEN_KEY = 'phytoscan_refresh_token';
/** Émis quand le jeton est refusé et ne peut pas être renouvelé : l'application repasse en mode démo. */
export const SESSION_EXPIRED_EVENT = 'phytoscan:session-expired';

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
    // les deux écritures : le back accepte l'une ou l'autre selon la configuration de ses schémas
    body: JSON.stringify({ refreshToken, refresh_token: refreshToken })
  });
  if (!response.ok) return false;

  const storage = localStorage.getItem(REFRESH_TOKEN_KEY) ? localStorage : sessionStorage;
  const tokens = await response.json();
  storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  return true;
};

const request = async (path, options, retry = true, baseUrl = getConfiguredApiBaseUrl(), responseType = 'json') => {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Impossible de joindre l'API à ${baseUrl}. Vérifiez que le backend FastAPI est démarré et que CORS autorise le frontend.`);
  }
  if (response.status === 401 && retry && path !== '/auth/refresh' && await refreshAccessToken(baseUrl)) {
    return request(path, options, false, baseUrl, responseType);
  }
  // Un jeton était envoyé mais il est définitivement refusé : session perdue -> retour au mode démo.
  // (Sans cela, un vieux jeton ferait échouer TOUTES les requêtes, même celles de la démo.)
  if (response.status === 401 && token && !path.startsWith('/auth/')) {
    clearTokens();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
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
    // Le code HTTP permet aux écrans d'afficher un message localisé (ex. 429 : trop de requêtes).
    throw Object.assign(new Error(message), { status: response.status });
  }

  if (response.status === 204) return null;
  return responseType === 'blob' ? response.blob() : response.json();
};

export const apiRequest = (path, options = {}, baseUrl = getConfiguredApiBaseUrl()) => request(path, options, true, baseUrl);

/** Comme apiRequest, mais renvoie le corps sous forme de Blob (audio). */
export const apiBlobRequest = (path, options = {}, baseUrl = getConfiguredApiBaseUrl()) =>
  request(path, options, true, baseUrl, 'blob');

export const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export { API_BASE_URL };