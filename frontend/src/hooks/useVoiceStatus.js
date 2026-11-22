import { useCallback, useEffect, useState } from 'react';
import { getVoiceStatus } from '../services/voiceApi';

const NONE = { stt: false, tts: false };

/**
 * Capacités vocales du serveur. Ne lève jamais d'erreur : si le serveur est injoignable, la voix est
 * simplement indisponible et l'écran retombe sur la saisie au clavier.
 */
export function useVoiceStatus() {
  const [state, setState] = useState({ loading: true, status: null });

  const load = useCallback(async (signal) => {
    try {
      const status = await getVoiceStatus(signal);
      if (!signal?.aborted) setState({ loading: false, status });
    } catch {
      if (!signal?.aborted) setState({ loading: false, status: null });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const capabilities = useCallback(
    (language) => state.status?.languages?.[language] ?? NONE,
    [state.status],
  );

  return {
    loading: state.loading,
    maxRecordingSeconds: state.status?.maxRecordingSeconds ?? 30,
    capabilities,
    refresh: () => load(),
  };
}
