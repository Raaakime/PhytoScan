// Service de communication avec le back PhytoScan (plantes, carnet de santé).
// Le scan et l'assistant restent dans octopusApi.js ; ce fichier gère les données de l'exploitation.
//
// Principe : l'adresse du serveur et la clé viennent de la même configuration que la modale Octopus
// (localStorage). En mode « Simulation », ces fonctions ne sont pas utilisées (voir isLiveMode()).

import { getOctopusConfig } from "./octopusApi";

/** Vrai si l'application doit parler au vrai back (mode « API Backend Octopus Live »). */
export const isLiveMode = () => {
  const config = getOctopusConfig();
  return !config.useMock && !!config.baseUrl;
};

/**
 * Appel générique vers l'API. Ajoute automatiquement la langue (?lang=) et le jeton s'il existe.
 * Lève une Error avec le message du serveur si la réponse n'est pas un succès.
 */
async function request(path, { method = "GET", body, lang = "fr" } = {}) {
  const config = getOctopusConfig();
  const url = new URL(`${config.baseUrl.replace(/\/$/, "")}${path}`);
  url.searchParams.set("lang", lang);

  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      // FastAPI renvoie une chaîne (erreur métier) ou une liste (erreur de validation)
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch { /* corps non JSON : on garde statusText */ }
    throw new Error(`API ${response.status} : ${detail}`);
  }
  return response.status === 204 ? null : response.json();
}

/** Liste des plantes de l'exploitation (même structure que INITIAL_PLANTS). */
export const fetchPlants = (lang = "fr") => request("/plants", { lang });

/** Crée une culture. `plant` = { name, species, variety, plot }. Renvoie la fiche complète créée. */
export const createPlant = (plant, lang = "fr") =>
  request("/plants", { method: "POST", body: plant, lang });

/**
 * Enregistre un diagnostic dans le carnet de santé d'une plante.
 * `payload` = { diseaseName, confidence, date } (exactement ce que ScanScreen envoie).
 * Renvoie la plante mise à jour (statut, score de santé et historique recalculés par le back).
 */
export const saveDiagnostic = (plantId, payload, lang = "fr") =>
  request(`/plants/${plantId}/diagnostics`, { method: "POST", body: payload, lang });

/** Alertes calculées par le serveur (disponible pour d'autres usages ; l'écran utilise buildAlerts en local). */
export const fetchAlerts = (lang = "fr") => request("/alerts", { lang });
