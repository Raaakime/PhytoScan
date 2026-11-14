import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import climateRules from '../data/regles_climat_phytoscan.json'; // copiez le fichier dans src/data/ (ou adaptez ce chemin)
import { fetchWeather, resolveLocation } from '../services/weatherApi';
import { buildAssistantContext, evaluateFarmRisks, weatherTips } from '../services/climateRisk';

const REFRESH_MS = 30 * 60 * 1000;

/**
 * Météo réelle + risques sanitaires par plante.
 * @param plants liste des plantes (id, name, species) ; les risques sont recalculés quand elle change.
 */
export function useClimateRisks(plants = []) {
  const [state, setState] = useState({ status: 'loading', weather: null, error: '' });
  const aliveRef = useRef(true);

  const load = useCallback(async (force = false) => {
    try {
      const location = await resolveLocation();
      const weather = await fetchWeather(location, { force });
      if (aliveRef.current) setState({ status: 'ready', weather, error: '' });
    } catch (error) {
      if (aliveRef.current) {
        setState((prev) => ({ status: 'error', weather: prev.weather, error: error.message }));
      }
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    load();
    const timer = setInterval(() => load(), REFRESH_MS);
    return () => {
      aliveRef.current = false;
      clearInterval(timer);
    };
  }, [load]);

  const farm = useMemo(
    () => (state.weather ? evaluateFarmRisks(plants, state.weather, climateRules) : { risks: [], uncovered: [] }),
    [plants, state.weather],
  );
  const tips = useMemo(() => weatherTips(state.weather), [state.weather]);
  const context = useMemo(() => buildAssistantContext(state.weather, farm), [state.weather, farm]);

  return {
    status: state.status,
    error: state.error,
    weather: state.weather,
    risks: farm.risks,
    uncovered: farm.uncovered,
    tips,
    context, // à passer à askOctopusAssistant(query, lang, context)
    refresh: () => load(true),
  };
}
