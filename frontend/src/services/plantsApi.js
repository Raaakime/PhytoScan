import { apiRequest } from './apiClient';

export const listPlants = (language = 'fr') =>
  apiRequest(`/plants?lang=${encodeURIComponent(language)}`);

export const createPlant = (plant) =>
  apiRequest('/plants?lang=fr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plant)
  });


  export async function deletePlant(plantId) {
  return apiRequest(`/plants/${plantId}`, {
    method: 'DELETE',
  });
}

export async function updatePlant(plantId, plantData) {
  const res = await apiRequest(`/plants/${encodeURIComponent(plantId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(plantData),
  });
  return res?.plant || res;
}





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
