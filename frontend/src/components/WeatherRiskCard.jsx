import { AlertTriangle, CloudSun, RefreshCw, ShieldAlert } from 'lucide-react';

const LEVEL_LABEL = { high: 'Risque élevé', moderate: 'Risque modéré' };
const MAX_RISKS = 4;

const formatTime = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Remplace le bloc « Vigilance Météo » fixe. Affiche des éléments `.web-alert-item`
 * (à placer dans `.alerts-list`) : météo en direct, puis risques par plante.
 */
export default function WeatherRiskCard({ status, weather, risks = [], tips = [], uncovered = [], error, onRefresh }) {
  if (status === 'loading' && !weather) {
    return (
      <div className="web-alert-item">
        <p className="alert-item-desc">Chargement de la météo locale…</p>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="web-alert-item warning">
        <div className="alert-item-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} color="#d97706" />
            <strong>Météo indisponible</strong>
          </div>
        </div>
        <p className="alert-item-desc">{error || 'Impossible de récupérer la météo pour le moment.'}</p>
        {onRefresh && (
          <div className="alert-item-actions">
            <button type="button" className="web-alert-btn-action secondary" onClick={onRefresh}>
              <RefreshCw size={14} /><span>Réessayer</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const hasHigh = risks.some((r) => r.level === 'high');
  const shownRisks = risks.slice(0, MAX_RISKS);
  const rain = Number(weather.precipitation) > 0 ? ` · ${Number(weather.precipitation).toFixed(1)} mm de pluie` : '';
  const wind = weather.windSpeed != null ? ` · vent ${Math.round(weather.windSpeed)} km/h` : '';

  return (
    <>
      <div className={`web-alert-item ${hasHigh ? 'danger' : 'warning'}`}>
        <div className="alert-item-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CloudSun size={16} color={hasHigh ? '#e11d48' : '#d97706'} />
            <strong>Météo en direct — {weather.location?.label}</strong>
          </div>
          <span className="alert-time">{weather.stale ? 'Dernière mesure ' : 'Mis à jour '}{formatTime(weather.fetchedAt)}</span>
        </div>
        <p className="alert-item-desc">
          <strong>{Math.round(weather.temperature)} °C</strong> · {Math.round(weather.humidity)} % d'humidité{rain}{wind}
          {weather.today?.min != null && ` · aujourd'hui ${Math.round(weather.today.min)}–${Math.round(weather.today.max)} °C`}
        </p>
        {tips.map((tip) => <p key={tip.text} className="alert-item-desc">{tip.text}</p>)}
        {shownRisks.length === 0 && tips.length === 0 && (
          <p className="alert-item-desc">Aucune condition climatique particulièrement favorable aux maladies de vos cultures dans les 48 prochaines heures.</p>
        )}
        {onRefresh && (
          <div className="alert-item-actions">
            <button type="button" className="web-alert-btn-action secondary" onClick={onRefresh}>
              <RefreshCw size={14} /><span>Actualiser</span>
            </button>
          </div>
        )}
        <p className="alert-item-desc" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          Données météo : Open-Meteo (CC BY 4.0){weather.stale ? ' — hors connexion, dernière mesure affichée' : ''}
        </p>
      </div>

      {shownRisks.map((risk) => (
        <div key={`${risk.plantId}-${risk.ruleKey}`} className={`web-alert-item ${risk.level === 'high' ? 'danger' : 'warning'}`}>
          <div className="alert-item-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {risk.level === 'high'
                ? <ShieldAlert size={16} color="#e11d48" />
                : <AlertTriangle size={16} color="#d97706" />}
              <strong>{risk.plantName} ({risk.culture}) — {risk.disease}</strong>
            </div>
            <span className="alert-time">{LEVEL_LABEL[risk.level]}</span>
          </div>
          <p className="alert-item-desc">{risk.summary}</p>
          {risk.trigger && <p className="alert-item-desc">Situation critique : {risk.trigger}.</p>}
        </div>
      ))}

      {risks.length > MAX_RISKS && (
        <p className="alert-item-desc">Et {risks.length - MAX_RISKS} autre(s) risque(s) climatique(s).</p>
      )}
      {uncovered.length > 0 && (
        <p className="alert-item-desc" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          Pas de règle climatique pour : {uncovered.join(', ')}.
        </p>
      )}
    </>
  );
}
