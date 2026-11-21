import { RefreshCw, Square, Volume2 } from 'lucide-react';
import { synthesizeSpeech } from '../../services/voiceApi';

/** Bouton « Écouter » d'une bulle de l'assistant : lit le texte avec la voix du serveur (même voix dans toute l'appli). */
export default function ListenButton({ id, text, language, player, copy }) {
  const state = player.active.id === id ? player.active.state : 'idle';

  const handleClick = () => {
    player.prime();
    player.toggle(id, (signal) => synthesizeSpeech(text, language, signal));
  };

  return (
    <button type="button" className="web-btn-listen" onClick={handleClick} aria-busy={state === 'loading'}>
      {state === 'loading' ? <RefreshCw size={13} className="progress-spinner" />
        : state === 'playing' ? <Square size={12} fill="currentColor" />
          : <Volume2 size={13} />}
      <span>{state === 'loading' ? copy.preparing : state === 'playing' ? copy.stop : copy.listen}</span>
    </button>
  );
}
