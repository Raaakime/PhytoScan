// Voix 100 % gratuite, sans clé ni back : reconnaissance et lecture vocales intégrées au navigateur.
// Langues : fr et en. Le wolof n'est PAS pris en charge par les navigateurs (voir canListen / canSpeak).
// Fonctionne sur Chrome / Edge / Safari, en HTTPS ou sur localhost. Firefox : pas de reconnaissance vocale.
import { useCallback, useEffect, useRef, useState } from 'react';

const LANG_MAP = { fr: 'fr-FR', en: 'en-US' };

const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const canListenIn = (language) => Boolean(SpeechRecognitionAPI && LANG_MAP[language]);
export const canSpeakIn = (language) =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && Boolean(LANG_MAP[language]);

const ERRORS = {
  'not-allowed': "L'accès au micro est refusé : autorisez-le dans le navigateur.",
  'service-not-allowed': "La reconnaissance vocale est bloquée sur ce navigateur.",
  'no-speech': "Aucune voix détectée, réessayez.",
  'audio-capture': "Aucun micro détecté.",
  network: "La reconnaissance vocale du navigateur a besoin d'une connexion internet.",
};

/**
 * @param {{language?: 'fr'|'en'|'wo', onFinalText?: (text: string) => void, onError?: (message: string) => void}} options
 * onFinalText reçoit le texte reconnu : envoyez-le à askOctopusAssistant(texte, language, ...).
 */
export function useBrowserVoice({ language = 'fr', onFinalText, onError } = {}) {
  const recognitionRef = useRef(null);
  const onFinalRef = useRef(onFinalText);
  const onErrorRef = useRef(onError);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => { onFinalRef.current = onFinalText; onErrorRef.current = onError; });

  const start = useCallback(() => {
    if (!canListenIn(language)) {
      onErrorRef.current?.(
        language === 'wo'
          ? "La voix n'est pas disponible en wolof : utilisez la saisie écrite."
          : "La reconnaissance vocale n'est pas disponible sur ce navigateur (essayez Chrome ou Edge)."
      );
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = LANG_MAP[language];
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece; else interimText += piece;
      }
      setInterim(interimText);
      if (finalText.trim()) onFinalRef.current?.(finalText.trim());
    };
    recognition.onerror = (event) => {
      setListening(false);
      onErrorRef.current?.(ERRORS[event.error] || `Erreur de reconnaissance vocale (${event.error}).`);
    };
    recognition.onend = () => { setListening(false); setInterim(''); };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [language]);

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  const speak = useCallback((text) => {
    if (!text || !canSpeakIn(language)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_MAP[language];
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(language));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
    return true;
  }, [language]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  return {
    listening, speaking, interim, start, stop, speak, stopSpeaking,
    canListen: canListenIn(language), canSpeak: canSpeakIn(language),
  };
}
