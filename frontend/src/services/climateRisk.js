// Moteur de risques climatiques : compare la météo réelle (Open-Meteo) aux règles de
// regles_climat_phytoscan.json (plage de température et d'humidité favorable à chaque maladie).
// Fonctions pures : aucune dépendance à React ni au réseau.

// Seuils ajustables. Horizon : 48 prochaines heures (24 valeurs horaires = 1 jour).
export const RISK_THRESHOLDS = {
  horizonHours: 48,
  highHours: 30,       // au moins 30 h favorables sur 48 h -> risque élevé
  persistentHours: 24, // conditions réunies maintenant ET sur au moins la moitié des 48 h -> risque élevé
  minHours: 6,         // au moins 6 h favorables (ou conditions réunies maintenant) -> risque modéré
};
export const TIP_THRESHOLDS = { heat: 35, humid: 85, rainDay: 5 };

export const normalizeText = (value) =>
  String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// « Aubergine (Solanum melongena) » -> « Aubergine »
const commonName = (species) => String(species ?? '').split('(')[0].trim();

const isHealthyRule = (key, rule) => /healthy$/i.test(key) || /^sain/.test(normalizeText(rule.maladie));
// Maladies peu liées à la météo (plages très larges, ex. virus de la mosaïque) : ignorées, sinon toujours « à risque ».
const isWeatherIndependent = (rule) =>
  (rule.humidite_max - rule.humidite_min) >= 70 && (rule.temp_max - rule.temp_min) >= 12;

const fits = (temperature, humidity, rule) =>
  temperature != null && humidity != null &&
  temperature >= rule.temp_min && temperature <= rule.temp_max &&
  humidity >= rule.humidite_min && humidity <= rule.humidite_max;

const LEVEL_RANK = { high: 2, moderate: 1 };

/** Règles de maladies liées à la météo pour une culture donnée (ex. « Tomate »). */
export function rulesForCulture(rules, culture) {
  const wanted = normalizeText(culture);
  return Object.entries(rules || {}).filter(([key, rule]) =>
    normalizeText(rule.culture) === wanted && !isHealthyRule(key, rule) && !isWeatherIndependent(rule));
}

/** Risques d'une plante pour les 48 prochaines heures. */
export function evaluatePlantRisks(plant, weather, rules) {
  const T = RISK_THRESHOLDS;
  const horizon = (weather?.hourly || []).slice(0, T.horizonHours);
  const nowTemp = weather?.temperature;
  const nowHum = weather?.humidity;
  const risks = [];

  for (const [key, rule] of rulesForCulture(rules, commonName(plant.species))) {
    const nowFits = fits(nowTemp, nowHum, rule);
    const hours = horizon.filter((h) => fits(h.temperature, h.humidity, rule)).length;

    let level = null;
    if (hours >= T.highHours || (nowFits && hours >= T.persistentHours)) level = 'high';
    else if (hours >= T.minHours || nowFits) level = 'moderate';
    if (!level) continue;

    const range = `${rule.temp_min}–${rule.temp_max} °C, ${rule.humidite_min}–${rule.humidite_max} % d'humidité`;
    risks.push({
      plantId: plant.id,
      plantName: plant.name,
      culture: rule.culture,
      ruleKey: key,
      disease: rule.maladie,
      level,
      nowFits,
      hours,
      trigger: rule.condition_critique,
      summary: nowFits
        ? `Les conditions actuelles (${Math.round(nowTemp)} °C, ${Math.round(nowHum)} %) correspondent à celles qui favorisent cette maladie (${range}).`
        : `Des conditions favorables (${range}) sont attendues environ ${hours} h sur les ${T.horizonHours} prochaines heures.`,
    });
  }
  return risks;
}

/** Risques de toute l'exploitation, triés (élevé d'abord), + plantes sans règle climatique. */
export function evaluateFarmRisks(plants, weather, rules) {
  const risks = [];
  const uncovered = [];
  for (const plant of plants || []) {
    if (!rulesForCulture(rules, commonName(plant.species)).length) {
      uncovered.push(plant.name);
      continue;
    }
    risks.push(...evaluatePlantRisks(plant, weather, rules));
  }
  risks.sort((a, b) => (LEVEL_RANK[b.level] - LEVEL_RANK[a.level]) || (b.hours - a.hours));
  return { risks, uncovered };
}

/** Conseils généraux déduits des chiffres du jour (remplace l'ancien texte fixe). */
export function weatherTips(weather) {
  if (!weather) return [];
  const tips = [];
  const { temperature, humidity, precipitation, today } = weather;
  if (temperature >= TIP_THRESHOLDS.heat) {
    tips.push({ level: 'warning', text: `Forte chaleur (${Math.round(temperature)} °C) : arrosez tôt le matin ou en fin de journée, directement au pied.` });
  }
  if (humidity >= TIP_THRESHOLDS.humid) {
    tips.push({ level: 'warning', text: `Humidité élevée (${Math.round(humidity)} %) : aérez les cultures et évitez de mouiller le feuillage.` });
  }
  if (precipitation > 0 || (today?.rain ?? 0) >= TIP_THRESHOLDS.rainDay) {
    const mm = Math.max(precipitation || 0, today?.rain || 0);
    tips.push({ level: 'info', text: `Pluie (${mm.toFixed(1)} mm) : reportez l'arrosage et surveillez l'apparition de maladies fongiques.` });
  }
  return tips;
}

/** Contexte envoyé à l'assistant (champ `context`, qui doit être un objet et non un tableau). */
export function buildAssistantContext(weather, farm) {
  if (!weather) return {};
  return {
    weather: {
      temperature: weather.temperature,
      humidity: weather.humidity,
      precipitation: weather.precipitation,
      windSpeed: weather.windSpeed,
      today: weather.today,
      location: weather.location?.label,
      observedAt: weather.observedAt,
    },
    risks: (farm?.risks || []).slice(0, 6).map((r) => ({
      plant: r.plantName, disease: r.disease, level: r.level, hours: r.hours,
    })),
  };
}
