import { useCallback, useEffect, useRef, useState } from 'react';

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
const MIN_BLOB_BYTES = 800;       // en dessous : aucun son exploitable
const BITRATE = 32_000;           // de la parole en Opus à 32 kbit/s reste très nette ; ~120 Ko pour 30 s (réseaux mobiles)

export const canRecordAudio = () =>
  typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof window.MediaRecorder !== 'undefined';

const errorCode = (error) => {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError': return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError': return 'no-device';
    case 'NotReadableError': return 'busy';
    default: return 'failed';
  }
};

/**
 * Enregistre la voix avec MediaRecorder.
 *
 * phase : 'idle' | 'requesting' (permission du micro en attente) | 'recording'.
 * `level` (0..1) suit le volume réel du micro ; `elapsed` compte les secondes ; l'arrêt est automatique à `maxSeconds`.
 * Les erreurs sont des CODES ('denied', 'no-device', 'busy', 'unsupported', 'empty', 'failed') : l'écran choisit le texte.
 */
export function useVoiceRecorder({ maxSeconds = 30, onRecorded, onError } = {}) {
  const [phase, setPhaseState] = useState('idle');
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const phaseRef = useRef('idle');   // garde synchrone : un double clic ne doit pas ouvrir deux flux
  const session = useRef({});        // recorder, stream, timer, raf, audioContext, discard
  const onRecordedRef = useRef(onRecorded);
  const onErrorRef = useRef(onError);

  useEffect(() => { onRecordedRef.current = onRecorded; onErrorRef.current = onError; });

  const setPhase = (value) => { phaseRef.current = value; setPhaseState(value); };

  const teardown = useCallback(() => {
    const s = session.current;
    window.clearInterval(s.timer);
    window.cancelAnimationFrame(s.raf);
    s.audioContext?.close().catch(() => {});
    s.stream?.getTracks().forEach((track) => track.stop());
    session.current = {};
    setLevel(0);
    setElapsed(0);
  }, []);

  const stop = useCallback(() => {
    const recorder = session.current.recorder;
    if (recorder?.state === 'recording') recorder.stop();
  }, []);

  /** Abandonne l'enregistrement en cours (ou la demande de permission) sans rien envoyer. */
  const cancel = useCallback(() => {
    session.current.discard = true;
    if (session.current.recorder?.state === 'recording') {
      session.current.recorder.stop();   // onstop nettoie
    } else if (phaseRef.current === 'recording') {
      teardown();
      setPhase('idle');
    }
  }, [teardown]);

  const startMeter = (stream) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      session.current.audioContext = audioContext;
      let smoothed = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) {
          const value = (samples[i] - 128) / 128;
          sum += value * value;
        }
        smoothed = Math.max(Math.min(1, Math.sqrt(sum / samples.length) * 4), smoothed * 0.8);
        setLevel(smoothed);
        session.current.raf = window.requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Le niveau sonore est un confort visuel : l'enregistrement fonctionne sans.
    }
  };

  const start = useCallback(async () => {
    if (phaseRef.current !== 'idle') return;
    if (!canRecordAudio()) {
      onErrorRef.current?.('unsupported');
      return;
    }
    setPhase('requesting');
    session.current = { discard: false };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      session.current = {};
      setPhase('idle');
      onErrorRef.current?.(errorCode(error));
      return;
    }
    if (session.current.discard) {        // annulé, ou composant démonté, pendant l'invite de permission
      stream.getTracks().forEach((track) => track.stop());
      session.current = {};
      setPhase('idle');
      return;
    }

    const mimeType = MIME_CANDIDATES.find((type) => window.MediaRecorder.isTypeSupported(type));
    let recorder;
    try {
      recorder = new window.MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: BITRATE });
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      session.current = {};
      setPhase('idle');
      onErrorRef.current?.('failed');
      return;
    }
    const chunks = [];
    const startedAt = Date.now();
    session.current = { recorder, stream, discard: false };

    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => {
      session.current.discard = true;
      teardown();
      setPhase('idle');
      onErrorRef.current?.('failed');
    };
    recorder.onstop = () => {
      const discard = session.current.discard;
      teardown();
      setPhase('idle');
      if (discard) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
      if (blob.size < MIN_BLOB_BYTES) onErrorRef.current?.('empty');
      else onRecordedRef.current?.(blob);
    };

    recorder.start(1000);
    setPhase('recording');
    startMeter(stream);
    session.current.timer = window.setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000;
      setElapsed(seconds);
      if (seconds >= maxSeconds) stop();
    }, 250);
  }, [maxSeconds, stop, teardown]);

  useEffect(() => () => {
    session.current.discard = true;
    if (session.current.recorder?.state === 'recording') session.current.recorder.stop();
    else teardown();
  }, [teardown]);

  return { phase, level, elapsed, start, stop, cancel, supported: canRecordAudio() };
}
