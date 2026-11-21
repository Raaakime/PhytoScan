import { Mic, RefreshCw, Square } from 'lucide-react';

/** Bouton micro : démarre l'enregistrement, ré-appuyer l'envoie. Un second bouton permet d'annuler. */
export default function MicButton({ phase, disabled, copy, onToggle, onCancel }) {
  const recording = phase === 'recording';
  const waiting = phase === 'requesting' || phase === 'processing';
  const label = recording ? copy.micSend : copy.micStart;

  return (
    <>
      <button
        type="button"
        className={`web-btn-mic-toggle ${recording ? 'listening' : ''}`}
        onClick={onToggle}
        disabled={disabled || waiting}
        aria-label={label}
        aria-pressed={recording}
        title={label}
      >
        {waiting ? <RefreshCw size={20} className="progress-spinner" /> : recording ? <Square size={18} fill="currentColor" /> : <Mic size={22} />}
      </button>
      {(recording || phase === 'processing') && (
        <button type="button" className="voice-cancel-btn" onClick={onCancel}>
          {copy.cancel}
        </button>
      )}
    </>
  );
}
