// Blocs "règles climatiques" à insérer dans PlantRecordsScreen (3 onglets). Aucune dépendance externe.
import {
  cultureOf, rulesForCulture, parseNumber, riskLevel, byRisk, findRuleForDiagnosis,
  rangeText, RISK_LABEL, RISK_COLOR,
} from '../utils/climateRules';

const box = { marginTop: 16, padding: 14, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' };
const heading = { display: 'block', fontWeight: 700, color: '#1e293b', fontSize: '0.92rem', marginBottom: 4 };
const muted = { color: '#64748b', fontSize: '0.82rem' };

function Pill({ level }) {
  const c = RISK_COLOR[level];
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: '2px 10px', fontSize: '0.75rem',
                   fontWeight: 600, whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>{RISK_LABEL[level]}</span>
  );
}

/** Saisie de l'humidité de l'air (le carnet ne mesure que l'humidité du substrat). */
export function HumidityField({ value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, ...muted }}>
      Humidité de l'air (%)
      <input type="number" min="0" max="100" inputMode="numeric" className="form-input"
             style={{ width: 90, padding: '4px 8px' }} value={value}
             onChange={(e) => onChange(e.target.value)} placeholder="ex. 85" />
    </label>
  );
}

function useClimate(plant, humidityInput) {
  const culture = cultureOf(plant?.species);
  const temp = parseNumber(plant?.details?.temperature);
  const hum = parseNumber(humidityInput) ?? parseNumber(plant?.details?.airHumidity);
  if (!culture) return { culture, temp, hum, optimal: null, risks: [] };
  const { optimal, diseases } = rulesForCulture(culture);
  const risks = diseases.map((r) => ({ ...r, level: riskLevel(r, temp, hum) })).sort(byRisk);
  return { culture, temp, hum, optimal, risks };
}

function NoRules({ plant }) {
  return (
    <div style={{ ...box, background: '#f8fafc' }}>
      <span style={heading}>Règles climatiques</span>
      <span style={muted}>
        Le modèle  EfficientNetB0 v3 couvre la tomate, le poivron et la pomme de terre. Aucune règle n'est disponible
        pour « {plant?.species || 'cette culture'} ».
      </span>
    </div>
  );
}

/* ------------------------------------------------ Onglet « Paramètres agronomiques » */
export function ClimateAgronomyPanel({ plant, humidity, onHumidityChange }) {
  const { culture, temp, hum, optimal, risks } = useClimate(plant, humidity);
  if (!culture) return <NoRules plant={plant} />;

  const tempOk = optimal && temp != null ? temp >= optimal.temp_min && temp <= optimal.temp_max : null;
  const humOk = optimal && hum != null ? hum >= optimal.humidite_min && hum <= optimal.humidite_max : null;

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={heading}>Conditions climatiques · {culture}</span>
        <HumidityField value={humidity} onChange={onHumidityChange} />
      </div>

      {optimal && (
        <p style={{ margin: '6px 0 12px', fontSize: '0.88rem', color: '#334155' }}>
          Plage de croissance optimale : <strong>{rangeText(optimal)}</strong>.{' '}
          {temp != null && (
            <span style={{ color: tempOk ? '#047857' : '#be123c' }}>
              Température mesurée ({temp} °C) : {tempOk ? 'dans la plage' : 'hors plage'}.
            </span>
          )}{' '}
          {hum != null && (
            <span style={{ color: humOk ? '#047857' : '#be123c' }}>
              Humidité de l'air ({hum} %) : {humOk ? 'dans la plage' : 'hors plage'}.
            </span>
          )}
        </p>
      )}

      <span style={{ ...heading, fontSize: '0.84rem' }}>Maladies favorisées par le climat</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {risks.map((r) => (
          <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px',
                                    border: '1px solid #f1f5f9', borderRadius: 8 }}>
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>{r.maladie}</strong>
              <div style={muted}>{rangeText(r)}</div>
              <div style={muted}>{r.condition_critique}</div>
            </div>
            <Pill level={r.level} />
          </div>
        ))}
      </div>
      {hum == null && (
        <p style={{ ...muted, marginTop: 10 }}>
          Saisissez l'humidité de l'air pour affiner le niveau de risque (sinon seule la température est comparée).
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------ Onglet « Carnet de santé » : sous chaque scan */
export function ClimateHistoryHint({ plant, entry }) {
  if (!entry || !/scan/i.test(entry.type || '')) return null;
  const rule = findRuleForDiagnosis(entry.result, cultureOf(plant?.species));
  if (!rule) return null;
  return (
    <div style={{ marginTop: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, fontSize: '0.8rem', color: '#475569' }}>
      <strong>Conditions favorables à cette maladie :</strong> {rangeText(rule)}.<br />
      {rule.condition_critique}
    </div>
  );
}

/* ------------------------------------------------ Onglet « Calendrier des soins » */
export function ClimateCarePanel({ plant, humidity, onHumidityChange }) {
  const { culture, temp, hum, risks } = useClimate(plant, humidity);
  if (!culture) return <NoRules plant={plant} />;

  const active = risks.filter((r) => r.level === 'high' || r.level === 'watch');
  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={heading}>Vigilance climatique</span>
        <HumidityField value={humidity} onChange={onHumidityChange} />
      </div>
      {temp == null && hum == null ? (
        <span style={muted}>Aucune mesure de température ou d'humidité : la vigilance ne peut pas être calculée.</span>
      ) : active.length === 0 ? (
        <span style={{ ...muted, color: '#047857' }}>Aucune maladie n'est favorisée par les conditions actuelles.</span>
      ) : (
        <div className="care-tasks-grid">
          {active.map((r) => (
            <div key={r.key} className="care-task-card">
              <div>
                <strong className="task-name">Surveiller : {r.maladie}</strong>
                <span className="task-freq">{r.condition_critique}</span>
              </div>
              <Pill level={r.level} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
