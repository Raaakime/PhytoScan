import { apiRequest } from './apiClient';

export const listPlants = (language = 'fr') =>
  apiRequest(`/plants?lang=${encodeURIComponent(language)}`);

export const createPlant = (plant) =>
  apiRequest('/plants?lang=fr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plant)
  });

export const savePlantDiagnostic = (plantId, diagnostic) =>
  apiRequest(`/plants/${encodeURIComponent(plantId)}/diagnostics?lang=fr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      diseaseName: diagnostic.diseaseName,
      confidence: diagnostic.confidence,
      date: diagnostic.date
    })
  });
