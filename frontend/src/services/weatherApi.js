// Météo gratuite via Open-Meteo (https://open-meteo.com) : aucune clé API.
// Usage non commercial gratuit (jusqu'à 10 000 appels/jour) ; données sous licence CC BY 4.0 : citer la source.
const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const LOCATION_KEY = 'phytoscan_location';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min : évite de rappeler l'API à chaque écran
const DEVICE_LOCATION_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
const HORIZON_HOURS = 48;

// Position utilisée si la géolocalisation est refusée (région de Thiès).
// Modifiable dans .env : VITE_DEFAULT_LAT, VITE_DEFAULT_LON, VITE_DEFAULT_LOCATION_LABEL.
export const DEFAULT_LOCATION = {
  latitude: Number(import.meta.env?.VITE_DEFAULT_LAT) || 14.79,
  longitude: Number(import.meta.env?.VITE_DEFAULT_LON) || -16.93,
  label: import.meta.env?.VITE_DEFAULT_LOCATION_LABEL || 'Thiès (position par défaut)',
};

const readJson = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};
const writeJson = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
};

/** Enregistre une position choisie manuellement { latitude, longitude, label }. */
export const saveManualLocation = (location) =>
  writeJson(LOCATION_KEY, { ...location, source: 'manual', savedAt: Date.now() });

export const clearSavedLocation = () => {
  try { localStorage.removeItem(LOCATION_KEY); } catch { /* ignore */ }
};

const getDeviceLocation = () => new Promise((resolve) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      label: 'Votre position',
      source: 'device',
      savedAt: Date.now(),
    }),
    () => resolve(null),
    { enableHighAccuracy: false, timeout: 6000, maximumAge: 60 * 60 * 1000 },
  );
});

/** Position manuelle > position de l'appareil (mémorisée 24 h) > position par défaut. */
export async function resolveLocation() {
  const saved = readJson(LOCATION_KEY);
  if (saved?.source === 'manual') return saved;
  if (saved?.source === 'device' && Date.now() - saved.savedAt < DEVICE_LOCATION_TTL_MS) return saved;
  const device = await getDeviceLocation();
  if (device) {
    writeJson(LOCATION_KEY, device);
    return device;
  }
  return { ...DEFAULT_LOCATION, source: 'default' };
}

/** Transforme la réponse Open-Meteo en objet simple utilisé par l'application. Fonction pure (testable). */
export function normalizeOpenMeteo(json, location) {
  const current = json?.current;
  if (!current || current.temperature_2m == null || current.relative_humidity_2m == null) {
    throw new Error('Réponse météo incomplète.');
  }
  const times = json.hourly?.time || [];
  const temps = json.hourly?.temperature_2m || [];
  const hums = json.hourly?.relative_humidity_2m || [];
  // Les heures sont dans le fuseau local (timezone=auto) : la comparaison de texte ISO suffit.
  const currentHour = `${String(current.time).slice(0, 13)}:00`;
  const start = Math.max(0, times.findIndex((t) => t >= currentHour));
  const hourly = times.slice(start, start + HORIZON_HOURS).map((time, i) => ({
    time,
    temperature: temps[start + i],
    humidity: hums[start + i],
  }));

  return {
    location: { latitude: location.latitude, longitude: location.longitude, label: location.label },
    observedAt: current.time,
    fetchedAt: new Date().toISOString(),
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    precipitation: current.precipitation ?? 0,
    windSpeed: current.wind_speed_10m ?? null,
    today: {
      min: json.daily?.temperature_2m_min?.[0] ?? null,
      max: json.daily?.temperature_2m_max?.[0] ?? null,
      rain: json.daily?.precipitation_sum?.[0] ?? 0,
    },
    hourly,
    source: 'Open-Meteo',
    stale: false,
  };
}

/** Récupère la météo (cache 30 min). En cas de panne réseau, renvoie la dernière météo connue (stale: true). */
export async function fetchWeather(location, { force = false } = {}) {
  const cacheKey = `phytoscan_weather_${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}`;
  const cached = readJson(cacheKey);
  if (!force && cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return { ...cached.data, location: { ...cached.data.location, label: location.label }, stale: false };
  }

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m',
    hourly: 'temperature_2m,relative_humidity_2m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    forecast_days: '3',
    timezone: 'auto',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Service météo indisponible (erreur ${response.status}).`);
    const data = normalizeOpenMeteo(await response.json(), location);
    writeJson(cacheKey, { savedAt: Date.now(), data });
    return data;
  } catch (error) {
    if (cached) return { ...cached.data, stale: true };
    throw new Error(error.name === 'AbortError'
      ? 'Le service météo met trop de temps à répondre.'
      : (error.message || 'Impossible de récupérer la météo. Vérifiez la connexion.'));
  } finally {
    clearTimeout(timer);
  }
}
