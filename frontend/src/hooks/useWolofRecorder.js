// Enregistre la voix de l'utilisateur (MediaRecorder) pour l'envoyer au back : sert au wolof,
// que la reconnaissance vocale du navigateur ne comprend pas. Appuyer pour démarrer, rappuyer pour envoyer.
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_RECORDING_MS = 30000; // doit rester <= VOICE_WOLOF_MAX_SECONDS côté back

const pickMimeType = () => {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || '';
};

export const canRecordAudio = () =>
  typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof window.MediaRecorder !== 'undefined';

/**
 * @param {{onRecorded?: (blob: Blob) => void, onError?: (message: string) => void}} options
 */
export function useWolofRecorder({ onRecorded, onError } = {}) {
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);
  const onRecordedRef = useRef(onRecorded);
  const onErrorRef = useRef(onError);
  const [recording, setRecording] = useState(false);

  useEffect(() => { onRecordedRef.current = onRecorded; onErrorRef.current = onError; });

  const start = useCallback(async () => {
    if (!canRecordAudio()) {
      onErrorRef.current?.("L'enregistrement audio n'est pas disponible sur ce navigateur.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onstop = () => {
        clearTimeout(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
        if (!cancelledRef.current && blob.size > 0) onRecordedRef.current?.(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      timerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();   // arrêt automatique après 30 s
      }, MAX_RECORDING_MS);
    } catch (error) {
      setRecording(false);
      onErrorRef.current?.(
        error?.name === 'NotAllowedError'
          ? "L'accès au micro est refusé : autorisez-le dans le navigateur."
          : "Impossible d'accéder au micro."
      );
    }
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  useEffect(() => () => {
    cancelledRef.current = true;
    clearTimeout(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  return { recording, start, stop, canRecord: canRecordAudio() };
}
