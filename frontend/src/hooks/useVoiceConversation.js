import { useCallback, useEffect, useRef, useState } from 'react';
import { sendVoiceMessage } from '../services/voiceApi';
import { useVoiceRecorder } from './useVoiceRecorder';

const SAFETY_MARGIN_SECONDS = 2;   // arrêt avant la limite du serveur : l'encodeur ajoute quelques centaines de ms

/** Traduit une erreur d'API en code d'erreur de l'interface (voir VOICE_COPY.errors) ou en message serveur. */
function describeApiError(error) {
  if (error?.status === 429) return { code: 'rateLimited' };
  if (error?.status === 503 || error?.status === 502 || error?.status === 504) return { code: 'unavailable' };
  if (!error?.status) return { code: 'network' };
  if (error.status === 401) return { code: 'login' };
  return { message: error.message };   // 400 / 413 / 415 : message précis du serveur (« rien entendu », « trop court »...)
}

/**
 * Une conversation vocale : micro -> envoi au serveur -> réponse.
 * `sessionRef` est partagé avec les questions écrites : voix et texte forment UNE conversation (le serveur
 * s'en sert pour comprendre « et pour la plante 3 ? »).
 *
 * phase : 'idle' | 'requesting' | 'recording' | 'processing'.
 * error : null | { code } | { message }. `onTurn(result)` reçoit la réponse du serveur
 * (transcript, text, audioBase64...). La session côté serveur est conservée pour toute la conversation.
 */
export function useVoiceConversation({ language, sessionRef, maxRecordingSeconds = 30, onTurn }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const requestRef = useRef(0);
  const abortRef = useRef(null);
  const languageRef = useRef(language);
  const onTurnRef = useRef(onTurn);

  useEffect(() => { onTurnRef.current = onTurn; });

  const submit = useCallback(async (blob) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const controller = new AbortController();
    abortRef.current = controller;
    setProcessing(true);
    setError(null);
    try {
      const result = await sendVoiceMessage({
        audio: blob, language: languageRef.current, sessionId: sessionRef.current, signal: controller.signal,
      });
      if (requestRef.current !== requestId) return;
      sessionRef.current = result.sessionId;
      onTurnRef.current?.(result);
    } catch (apiError) {
      if (requestRef.current === requestId && apiError?.name !== 'AbortError') setError(describeApiError(apiError));
    } finally {
      if (requestRef.current === requestId) setProcessing(false);
    }
  }, [sessionRef]);

  const recorder = useVoiceRecorder({
    maxSeconds: Math.max(5, maxRecordingSeconds - SAFETY_MARGIN_SECONDS),
    onRecorded: submit,
    onError: (code) => setError({ code }),
  });

  /** Annule l'enregistrement et/ou la requête en cours, sans toucher à la session. */
  const cancel = useCallback(() => {
    recorder.cancel();
    requestRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setProcessing(false);
  }, [recorder]);

  /** Appuyer démarre l'enregistrement, ré-appuyer l'envoie. */
  const toggle = useCallback(() => {
    if (processing) return;
    if (recorder.phase === 'recording') {
      recorder.stop();
    } else if (recorder.phase === 'idle') {
      setError(null);
      recorder.start();
    }
  }, [processing, recorder]);

  const reset = useCallback(() => {
    cancel();
    sessionRef.current = null;
    setError(null);
  }, [cancel, sessionRef]);

  // Changer de langue ferme la conversation : la session du serveur est propre à une langue.
  useEffect(() => {
    languageRef.current = language;
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => () => {
    requestRef.current += 1;
    abortRef.current?.abort();
  }, []);

  return {
    phase: processing ? 'processing' : recorder.phase,
    level: recorder.level,
    elapsed: recorder.elapsed,
    maxSeconds: Math.max(5, maxRecordingSeconds - SAFETY_MARGIN_SECONDS),
    supported: recorder.supported,
    error,
    clearError: () => setError(null),
    toggle,
    cancel,
    reset,
  };
}
