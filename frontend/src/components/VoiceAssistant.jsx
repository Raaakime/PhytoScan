import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, RotateCcw, Square, Volume2 } from 'lucide-react';
import { getVoiceStatus, sendVoiceMessage } from '../services/voiceApi';

const MAX_RECORDING_MS = 60_000;

function audioBlobFromBase64(encoded, mimeType) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

export default function VoiceAssistant({ language, onVoiceResult, onNewConversation }) {
  const [phase, setPhase] = useState('IDLE');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [audioError, setAudioError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timeoutRef = useRef(null);
  const audioRef = useRef(null);
  const discardRecordingRef = useRef(false);
  const requestControllerRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let active = true;
    getVoiceStatus()
      .then(result => {
        if (active) setStatus(result);
      })
      .catch(error => {
        if (active) {
          setStatus({
            enabled: false,
            supportedLanguages: [],
            message: `État du service vocal indisponible : ${error.message}`,
          });
        }
      });

    return () => {
      active = false;
      discardRecordingRef.current = true;
      requestControllerRef.current?.abort();
      window.clearTimeout(timeoutRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const stopRecording = useCallback(() => {
    window.clearTimeout(timeoutRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const submitRecording = useCallback(async (blob) => {
    if (!blob.size) {
      setPhase('ERROR');
      setMessage("Aucun son n'a été capturé. Réessayez en parlant plus près du microphone.");
      return;
    }

    setPhase('PROCESSING');
    setMessage('');
    setAudioError('');
    setTranscript('');
    setAnswer('');
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const requestController = new AbortController();
    requestControllerRef.current = requestController;
    try {
      const result = await sendVoiceMessage({
        audio: blob,
        language,
        sessionId,
        signal: requestController.signal,
      });
      if (requestId !== requestIdRef.current) return;
      setTranscript(result.transcript);
      setAnswer(result.text);
      setSessionId(result.sessionId);
      setAudioError(result.audioError || '');
      onVoiceResult?.(result);

      if (result.audioBase64 && result.audioMimeType) {
        const url = URL.createObjectURL(audioBlobFromBase64(result.audioBase64, result.audioMimeType));
        setAudioUrl(url);
        setPhase('SPEAKING');
        requestAnimationFrame(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(() => setPhase('IDLE'));
          }
        });
      } else {
        setAudioUrl('');
        setPhase('IDLE');
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setPhase('ERROR');
        setMessage(error.message || "Impossible de traiter l'enregistrement.");
      }
    } finally {
      if (requestId === requestIdRef.current) requestControllerRef.current = null;
    }
  }, [language, onVoiceResult, sessionId]);

  const startRecording = async () => {
    setMessage('');
    setTranscript('');
    setAnswer('');
    setAudioError('');
    setAudioUrl('');
    audioRef.current?.pause();
    discardRecordingRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setPhase('ERROR');
      setMessage("L'enregistrement audio n'est pas pris en charge par ce navigateur. Essayez un navigateur récent en HTTPS.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (discardRecordingRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm']
        .find(type => window.MediaRecorder.isTypeSupported(type));
      const recorder = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setPhase('ERROR');
        setMessage("Une erreur est survenue pendant l'enregistrement.");
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (discardRecordingRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        void submitRecording(blob);
      };
      recorder.start();
      setPhase('RECORDING');
      timeoutRef.current = window.setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch (error) {
      setPhase('ERROR');
      setMessage(error.name === 'NotAllowedError'
        ? "L'accès au microphone a été refusé. Autorisez-le dans les réglages du navigateur."
        : `Impossible d'accéder au microphone : ${error.message}`);
    }
  };

  const toggleRecording = () => {
    if (phase === 'RECORDING') {
      stopRecording();
    } else if (phase === 'IDLE' || phase === 'ERROR') {
      void startRecording();
    }
  };

  const playAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(error => {
      setMessage(`Impossible de lire la réponse audio : ${error.message}`);
    });
  };

  const resetConversation = () => {
    discardRecordingRef.current = true;
    requestIdRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    stopRecording();
    audioRef.current?.pause();
    setAudioUrl('');
    setSessionId('');
    setTranscript('');
    setAnswer('');
    setAudioError('');
    setMessage('');
    setPhase('IDLE');
    onNewConversation?.();
  };

  const voiceEnabled = status?.enabled && status.supportedLanguages?.includes(language);
  const isBusy = phase === 'PROCESSING' || phase === 'SPEAKING';
  const phaseLabel = {
    IDLE: voiceEnabled ? 'Microphone prêt' : 'Voix indisponible',
    RECORDING: "Écoute en cours — appuyez pour envoyer",
    PROCESSING: 'Transcription et réponse en cours…',
    SPEAKING: 'Lecture de la réponse',
    ERROR: 'Une erreur est survenue',
  }[phase];

  return (
    <section className="voice-assistant-control" aria-label="Assistant vocal Push-to-Talk">
      <div className={`web-waveform-box ${phase === 'RECORDING' || isBusy ? 'active' : ''}`}>
        <span className="waveform-info-txt" aria-live="polite">{phaseLabel}</span>
        <div className="web-waveform-bars" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => <div className="web-wave-bar" key={index} />)}
        </div>
      </div>

      <div className="voice-assistant-actions">
        <button
          type="button"
          className={`web-btn-mic-toggle ${phase === 'RECORDING' ? 'listening' : ''}`}
          onClick={toggleRecording}
          disabled={!voiceEnabled || isBusy}
          aria-label={phase === 'RECORDING' ? 'Arrêter et envoyer' : 'Commencer une question vocale'}
          title={phase === 'RECORDING' ? 'Arrêter et envoyer' : 'Commencer une question vocale'}
        >
          {phase === 'RECORDING' ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        {phase === 'RECORDING' && (
          <button type="button" className="voice-assistant-secondary" onClick={stopRecording}>
            <Square size={15} /> Arrêter et envoyer
          </button>
        )}
        {audioUrl && (
          <>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              onPlay={() => setPhase('SPEAKING')}
              onEnded={() => setPhase('IDLE')}
              onPause={() => setPhase('IDLE')}
            />
            <button type="button" className="voice-assistant-secondary" onClick={playAudio}>
              <Volume2 size={16} /> Réécouter
            </button>
            <button
              type="button"
              className="voice-assistant-secondary"
              onClick={() => {
                audioRef.current?.pause();
                setPhase('IDLE');
              }}
            >
              Arrêter la lecture
            </button>
          </>
        )}
        <button type="button" className="voice-assistant-secondary" onClick={resetConversation}>
          <RotateCcw size={15} /> Nouvelle conversation
        </button>
      </div>

      {!voiceEnabled && (
        <p className="voice-assistant-notice" role="status">
          {language === 'wo'
            ? 'La voix en wolof n’est pas activée. Utilisez le champ texte ci-dessous.'
            : status?.message || 'Assistant vocal indisponible. Configurez les fournisseurs côté backend.'}
        </p>
      )}
      {voiceEnabled && (
        <p className="voice-assistant-privacy">
          En envoyant une question vocale, votre audio est transmis à OpenAI pour transcription et la réponse à ElevenLabs pour synthèse. L’audio n’est pas stocké par PhytoScan ; transcription et réponse sont conservées dans l’historique de votre compte.
        </p>
      )}
      {transcript && <p className="voice-assistant-transcript"><strong>Vous avez dit :</strong> {transcript}</p>}
      {answer && <p className="voice-assistant-answer"><strong>Réponse :</strong> {answer}</p>}
      {audioError && <p className="voice-assistant-notice" role="status">{audioError} La réponse reste disponible en texte.</p>}
      {message && <p className="voice-assistant-error" role="alert">{message}</p>}
    </section>
  );
}
