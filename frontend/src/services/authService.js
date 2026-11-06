// Authentification : inscription, connexion, session et renouvellement automatique du jeton.
//
// La session (jetons + profil) est conservée dans le localStorage pour survivre au rechargement de la page.
// Limite connue : un localStorage est lisible par tout script de la page (risque XSS). Acceptable pour
// cette étape ; pour la production, privilégier des cookies HttpOnly (évolution à faire côté back et front).

import { getOctopusConfig } from "./octopusApi";

const SESSION_KEY = "phytoscan_auth_session";
/** Événement émis à chaque changement de session (connexion, déconnexion, jeton expiré). */
export const SESSION_EVENT = "phytoscan:session-changed";

const notify = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EVENT));
};

// ---------------------------------------------------------------- session
export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
};
const saveSession = (session) => localStorage.setItem(SESSION_KEY, JSON.stringify(session));
const clearSession = () => localStorage.removeItem(SESSION_KEY);

export const getAccessToken = () => getSession()?.accessToken || null;
/** Profil de l'utilisateur connecté ({ id, email, fullName, preferredLang, role }) ou null. */
export const getCurrentUser = () => getSession()?.user || null;

// ---------------------------------------------------------------- utilitaires HTTP
const baseUrl = () => getOctopusConfig().baseUrl.replace(/\/$/, "");

/** fetch avec un message d'erreur clair si le serveur est injoignable. */
async function call(path, init) {
  try {
    return await fetch(`${baseUrl()}${path}`, init);
  } catch {
    throw new Error("Impossible de joindre le serveur PhytoScan. Vérifiez qu'il est lancé et que l'adresse est correcte.");
  }
}

/** Transforme une réponse d'erreur du back en message lisible. */
async function readError(response) {
  if (response.status === 422) {
    return "Données invalides : vérifiez l'e-mail et choisissez un mot de passe de 8 caractères minimum.";
  }
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail; // messages métier du back (en français)
  } catch { /* corps non JSON */ }
  return `Erreur serveur (${response.status}).`;
}

// ---------------------------------------------------------------- inscription / connexion
/** Crée un compte. Ne connecte pas : appeler ensuite login(). */
export async function register({ email, password, fullName, preferredLang = "fr" }) {
  const response = await call("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password, fullName: fullName?.trim() || null, preferredLang })
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

/** Connecte l'utilisateur, récupère son profil et enregistre la session. */
export async function login(email, password) {
  // Le back utilise le formulaire OAuth2 standard : le champ s'appelle "username" mais contient l'e-mail
  const response = await call("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email.trim(), password })
  });
  if (!response.ok) throw new Error(await readError(response));
  const tokens = await response.json();

  const meResponse = await call("/auth/me", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!meResponse.ok) throw new Error(await readError(meResponse));
  const user = await meResponse.json();

  saveSession({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token, user });
  notify();
  return user;
}

/** Déconnecte l'utilisateur (efface la session locale). */
export function logout() {
  clearSession();
  notify();
}

/** Demande au serveur s'il impose la connexion (AUTH_REQUIRED). */
export async function checkAuthRequired() {
  const response = await call("/health");
  if (!response.ok) return false;
  return (await response.json()).authRequired === true;
}

// ---------------------------------------------------------------- renouvellement du jeton
let refreshInFlight = null; // évite plusieurs renouvellements simultanés

/** Renvoie "ok" (nouveaux jetons enregistrés), "invalid" (refus du serveur) ou "error" (réseau). */
async function refreshTokens() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const session = getSession();
      if (!session?.refreshToken) return "invalid";
      try {
        const response = await fetch(`${baseUrl()}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: session.refreshToken })
        });
        if (response.status === 401) return "invalid";
        if (!response.ok) return "error";
        const tokens = await response.json();
        saveSession({ ...session, accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
        return "ok";
      } catch {
        return "error";
      }
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

/**
 * fetch authentifié : ajoute le jeton de l'utilisateur connecté (à défaut, la « clé d'API » de la modale Octopus).
 * Si le serveur répond 401 et qu'une session existe, renouvelle le jeton UNE fois puis rejoue la requête.
 * Si le renouvellement est refusé, la session est effacée (l'application affichera la connexion).
 */
export async function authFetch(url, options = {}) {
  const send = () => {
    const token = getAccessToken() || getOctopusConfig().apiKey;
    return fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
  };

  let response = await send();
  if (response.status === 401 && getSession()?.refreshToken) {
    const outcome = await refreshTokens();
    if (outcome === "ok") {
      response = await send();
    } else if (outcome === "invalid") {
      clearSession();
      notify();
    }
  }
  return response;
}
