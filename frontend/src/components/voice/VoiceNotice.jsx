import { LogIn, ShieldCheck } from 'lucide-react';

/**
 * Bandeau au-dessus de la saisie : consentement avant le premier enregistrement, invitation à se connecter,
 * ou message d'erreur. Un seul à la fois ; les erreurs sont annoncées aux lecteurs d'écran.
 */
export default function VoiceNotice({ kind, message, copy, onAccept, onDismiss, onLogin }) {
  if (kind === 'consent') {
    return (
      <div className="voice-notice voice-notice-consent" role="dialog" aria-label={copy.consentTitle}>
        <ShieldCheck size={18} aria-hidden="true" />
        <div>
          <strong>{copy.consentTitle}</strong>
          <p>{copy.consentBody}</p>
          <div className="voice-notice-actions">
            <button type="button" className="voice-notice-primary" onClick={onAccept}>{copy.consentAccept}</button>
            <button type="button" className="voice-notice-secondary" onClick={onDismiss}>{copy.consentRefuse}</button>
          </div>
        </div>
      </div>
    );
  }
  if (kind === 'login') {
    return (
      <div className="voice-notice" role="status">
        <LogIn size={18} aria-hidden="true" />
        <div>
          <p>{copy.loginRequired}</p>
          <div className="voice-notice-actions">
            <button type="button" className="voice-notice-primary" onClick={onLogin}>{copy.login}</button>
          </div>
        </div>
      </div>
    );
  }
  if (kind === 'error' && message) {
    return <p className="voice-notice voice-notice-error" role="alert">{message}</p>;
  }
  if (kind === 'info' && message) {
    return <p className="voice-notice" role="status">{message}</p>;
  }
  return null;
}
