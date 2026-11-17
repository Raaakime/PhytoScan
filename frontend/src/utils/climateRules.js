// Règles climatiques PhytoScan : lecture du JSON + petites fonctions de calcul (aucun appel réseau).
import RULES from '../data/regles_climat_phytoscan.json';

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// Espèce affichée dans l'app -> culture du JSON. Le JSON ne couvre que ces 3 cultures.
// (Le piment est rapproché du poivron : même espèce, Capsicum annuum.)
const SPECIES_TO_CULTURE = [['pomme de terre', 'Pomme de terre'], ['tomate', 'Tomate'],
                            ['poivron', 'Poivron']];

export function cultureOf(species) {
  const n = norm(species);
  const hit = SPECIES_TO_CULTURE.find(([k]) => n.includes(k));
  return hit ? hit[1] : null;
}

/** { optimal: règle "sain" de la culture, diseases: règles des maladies } */
export function rulesForCulture(culture) {
  const rows = Object.entries(RULES).filter(([, r]) => r.culture === culture).map(([key, r]) => ({ key, ...r }));
  return {
    optimal: rows.find((r) => norm(r.maladie).startsWith('sain')) || null,
    diseases: rows.filter((r) => !norm(r.maladie).startsWith('sain')),
  };
}

/** Extrait un nombre de "24°C", "62 %", 24... ; null si impossible. */
export function parseNumber(v) {
  const m = String(v ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

const inRange = (v, min, max) => (v == null ? null : v >= min && v <= max);

/** Niveau de risque d'une maladie selon la météo connue : 'high' | 'watch' | 'low' | 'unknown' */
export function riskLevel(rule, temp, hum) {
  const t = inRange(temp, rule.temp_min, rule.temp_max);
  const h = inRange(hum, rule.humidite_min, rule.humidite_max);
  if (t == null && h == null) return 'unknown';
  if (t === false || h === false) return 'low';
  return t && h ? 'high' : 'watch';          // 'watch' : une seule des deux mesures est connue et favorable
}

export const RISK_LABEL = { high: 'Risque élevé', watch: 'À surveiller', low: 'Peu probable', unknown: 'Mesure manquante' };
export const RISK_COLOR = {
  high: { bg: '#fff1f2', fg: '#be123c' }, watch: { bg: '#fffbeb', fg: '#b45309' },
  low: { bg: '#ecfdf5', fg: '#047857' }, unknown: { bg: '#f1f5f9', fg: '#64748b' },
};
const ORDER = { high: 0, watch: 1, unknown: 2, low: 3 };
export const byRisk = (a, b) => ORDER[a.level] - ORDER[b.level];

/** Retrouve la règle correspondant à un diagnostic écrit dans le carnet (ex. "Mildiou tardif (96.4%)"). */
export function findRuleForDiagnosis(text, culture) {
  const n = norm(text);
  const pool = culture ? rulesForCulture(culture).diseases
                       : Object.entries(RULES).map(([key, r]) => ({ key, ...r })).filter((r) => !norm(r.maladie).startsWith('sain'));
  return pool.filter((r) => n.includes(norm(r.maladie))).sort((a, b) => b.maladie.length - a.maladie.length)[0] || null;
}

export const rangeText = (r) => `${r.temp_min}–${r.temp_max} °C · ${r.humidite_min}–${r.humidite_max} % d'humidité`;
