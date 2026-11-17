import { useState } from 'react';
import { AlertTriangle, CloudSun, RefreshCw, ShieldAlert, ChevronDown } from 'lucide-react';

const LEVEL_LABEL = { high: 'Risque élevé', moderate: 'Risque modéré' };

const formatTime = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Météo et risques climatiques sous forme de bloc déroulant (accordéon / liste déroulante)
 * pour alléger l'interface tout en conservant toutes les données en direct.
 */
export default function WeatherRiskCard({ status, weather, risks = [], tips = [], uncovered = [], error, onRefresh }) {
  const [selectedSection, setSelectedSection] = useState('weather'); // 'closed' | 'weather' | 'risks'

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
  const rain = Number(weather.precipitation) > 0 ? ` · ${Number(weather.precipitation).toFixed(1)} mm de pluie` : '';
  const wind = weather.windSpeed != null ? ` · vent ${Math.round(weather.windSpeed)} km/h` : '';

  return (
    <div className={`web-alert-item ${hasHigh ? 'danger' : 'warning'}`} style={{ padding: '12px 14px' }}>
      {/* En-tête compact avec sélecteur déroulant */}
      <div className="ux-weather-dropdown-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <CloudSun size={18} color={hasHigh ? '#e11d48' : '#d97706'} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Météo · {Math.round(weather.temperature)} °C ({Math.round(weather.humidity)} %)
            </strong>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {weather.location?.label}
            </span>
          </div>
        </div>

        <div className="ux-weather-select-wrapper">
          <select
          style={{backgroundColor:'#e0f4ed'}}
            aria-label="Afficher les détails météo ou risques climatiques"
            className="ux-weather-select"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option className='closed' value="closed" style={{ color:'#05633e'}}>Masquer les détails</option>
            <option value="weather" style={{ color:'#05633e'}}>Détails météo en direct</option>
            <option value="risks" style={{color:'#05633e'}}>Risques climat ({risks.length})</option>
          </select>
          <ChevronDown size={14} className="ux-weather-select-icon" />
        </div>
      </div>

      {/* Vue 1 : Détails météo en direct */}
      {selectedSection === 'weather' && (
        <div className="ux-weather-dropdown-body">
          <p className="alert-item-desc">
            <strong>{Math.round(weather.temperature)} °C</strong> · {Math.round(weather.humidity)} % d'humidité{rain}{wind}
            {weather.today?.min != null && ` · aujourd'hui ${Math.round(weather.today.min)}–${Math.round(weather.today.max)} °C`}
          </p>

          {tips.map((tip) => (
            <p key={tip.text} className="alert-item-desc" style={{ marginTop: '4px' }}>
              {tip.text}
            </p>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {weather.stale ? 'Hors connexion · ' : 'Mis à jour '}
              {formatTime(weather.fetchedAt)}
            </span>

            {onRefresh && (
              <button
                type="button"
                className="web-alert-btn-action secondary"
                style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                onClick={onRefresh}
              >
                <RefreshCw size={12} /><span>Actualiser</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Vue 2 : Liste des risques climatiques par plante */}
      {selectedSection === 'risks' && (
        <div className="ux-weather-dropdown-body">
          {risks.length === 0 ? (
            <p className="alert-item-desc">
              Aucune condition climatique favorable aux maladies dans les 48 prochaines heures.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {risks.map((risk) => (
                <div
                  key={`${risk.plantId}-${risk.ruleKey}`}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '8px 10px'
                  }}
                >
                  <div className="alert-item-top" style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {risk.level === 'high'
                        ? <ShieldAlert size={14} color="#e11d48" />
                        : <AlertTriangle size={14} color="#d97706" />}
                      <strong style={{ fontSize: '0.82rem' }}>{risk.plantName} — {risk.disease}</strong>
                    </div>
                    <span className="alert-time" style={{ fontWeight: 700, color: risk.level === 'high' ? '#be123c' : '#b45309' }}>
                      {LEVEL_LABEL[risk.level]}
                    </span>
                  </div>
                  <p className="alert-item-desc" style={{ fontSize: '0.8rem' }}>{risk.summary}</p>
                </div>
              ))}
            </div>
          )}

          {uncovered.length > 0 && (
            <p className="alert-item-desc" style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: '6px' }}>
              Pas de règle climatique pour : {uncovered.join(', ')}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
