import { useCallback, useState } from 'react';

const KEY = 'phytoscan_voice_consent_v1';

const read = () => {
  try { return localStorage.getItem(KEY) === 'yes'; } catch { return false; }
};

/** Consentement à l'envoi de la voix au service de reconnaissance, demandé une fois par navigateur. */
export function useVoiceConsent() {
  const [given, setGiven] = useState(read);
  const accept = useCallback(() => {
    try { localStorage.setItem(KEY, 'yes'); } catch { /* navigation privée : on redemandera la prochaine fois */ }
    setGiven(true);
  }, []);
  return { given, accept };
}
