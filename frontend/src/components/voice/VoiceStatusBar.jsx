const BARS = [0.45, 0.7, 0.9, 1, 0.85, 0.6, 0.8, 0.55, 0.4];   // profil de hauteur : plus naturel que des barres égales

/** Barre d'état : texte annoncé aux lecteurs d'écran + barres qui suivent le volume réel du micro. */
export default function VoiceStatusBar({ phase, level, elapsed, maxSeconds, playing, text }) {
  const recording = phase === 'recording';
  const active = recording || phase === 'processing' || playing;
  const remaining = Math.max(0, Math.ceil(maxSeconds - elapsed));

  return (
    <div className={`web-waveform-box ${active ? 'active' : ''} ${recording ? 'live' : ''}`}>
      <span className="waveform-info-txt" role="status" aria-live="polite">
        {text}
        {recording && elapsed >= maxSeconds - 10 && <strong className="voice-countdown"> · {remaining} s</strong>}
      </span>
      <div className="web-waveform-bars" aria-hidden="true">
        {BARS.map((weight, index) => (
          <div
            key={index}
            className="web-wave-bar"
            style={recording ? { height: `${6 + level * 18 * weight}px` } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
