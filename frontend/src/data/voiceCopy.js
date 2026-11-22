// Textes de l'assistant vocal. Les clés absentes d'une langue retombent sur le français (voir voiceCopyFor).
//
// ATTENTION : les textes wolof sont des ébauches à faire valider par un locuteur. Ils reprennent les libellés
// déjà utilisés par l'équipe ; les phrases longues (consentement, erreurs détaillées) restent volontairement en
// français plutôt que d'inventer du wolof non relu.

export const VOICE_COPY = {
  fr: {
    micReady: 'Appuyez sur le micro pour parler',
    micRequesting: 'Autorisez le micro dans votre navigateur…',
    micRecording: 'Je vous écoute… appuyez pour envoyer',
    micProcessing: 'Je réfléchis à votre question…',
    micPlaying: 'Lecture de la réponse',
    micLoading: 'Vérification du service vocal…',
    micUnavailable: 'La voix n’est pas disponible pour le moment : écrivez votre question.',
    micUnavailableLanguage: 'La voix n’est pas encore disponible dans cette langue : écrivez votre question.',
    micStart: 'Parler',
    micSend: 'Envoyer ma question',
    cancel: 'Annuler',
    listen: 'Écouter',
    stop: 'Arrêter',
    preparing: 'Préparation…',
    loginRequired: 'Connectez-vous pour utiliser la voix.',
    login: 'Se connecter',
    consentTitle: 'Avant de parler',
    consentBody: 'Votre voix est envoyée à notre service de reconnaissance vocale pour être transformée en texte, puis la réponse est lue par une voix de synthèse. L’enregistrement n’est pas conservé ; seules la transcription et la réponse écrite sont enregistrées dans l’historique de votre compte.',
    consentAccept: 'Accepter et parler',
    consentRefuse: 'Plus tard',
    audioUnavailableNote: 'La réponse reste disponible en texte.',
    errors: {
      unsupported: 'Ce navigateur ne peut pas enregistrer la voix. Utilisez un navigateur récent, en HTTPS.',
      denied: 'Le micro est bloqué. Autorisez-le dans les réglages du navigateur, puis réessayez.',
      'no-device': 'Aucun micro détecté sur cet appareil.',
      busy: 'Le micro est utilisé par une autre application.',
      empty: 'Aucun son n’a été enregistré. Parlez plus près du micro et réessayez.',
      failed: 'L’enregistrement a échoué. Réessayez.',
      rateLimited: 'Trop de questions vocales en peu de temps. Patientez un instant avant de réessayer.',
      unavailable: 'Le service vocal est très sollicité ou indisponible. Réessayez dans un instant, ou écrivez votre question.',
      network: 'Connexion impossible. Vérifiez votre réseau puis réessayez.',
      blocked: 'Le navigateur a bloqué la lecture automatique. Appuyez sur « Écouter ».',
      playback: 'La lecture de l’audio a échoué.',
      generic: 'Une erreur est survenue. Réessayez.',
    },
  },
  en: {
    micReady: 'Press the microphone to speak',
    micRequesting: 'Allow the microphone in your browser…',
    micRecording: 'Listening… press to send',
    micProcessing: 'Thinking about your question…',
    micPlaying: 'Playing the answer',
    micLoading: 'Checking the voice service…',
    micUnavailable: 'Voice is not available right now: please type your question.',
    micUnavailableLanguage: 'Voice is not available in this language yet: please type your question.',
    micStart: 'Speak',
    micSend: 'Send my question',
    cancel: 'Cancel',
    listen: 'Listen',
    stop: 'Stop',
    preparing: 'Preparing…',
    loginRequired: 'Sign in to use voice.',
    login: 'Sign in',
    consentTitle: 'Before you speak',
    consentBody: 'Your voice is sent to our speech recognition service to be turned into text, and the answer is read aloud by a synthetic voice. The recording is not kept; only the transcript and the written answer are saved in your account history.',
    consentAccept: 'Accept and speak',
    consentRefuse: 'Later',
    audioUnavailableNote: 'The answer is still available as text.',
    errors: {
      unsupported: 'This browser cannot record audio. Use a recent browser over HTTPS.',
      denied: 'The microphone is blocked. Allow it in your browser settings, then try again.',
      'no-device': 'No microphone detected on this device.',
      busy: 'The microphone is being used by another application.',
      empty: 'No sound was recorded. Speak closer to the microphone and try again.',
      failed: 'Recording failed. Please try again.',
      rateLimited: 'Too many voice questions in a short time. Please wait a moment.',
      unavailable: 'The voice service is busy or unavailable. Try again shortly, or type your question.',
      network: 'Cannot connect. Check your network and try again.',
      blocked: 'The browser blocked autoplay. Press “Listen”.',
      playback: 'Audio playback failed.',
      generic: 'Something went wrong. Please try again.',
    },
  },
  wo: {
    // À VALIDER par un locuteur wolof.
    micRecording: 'Mikrofon bi mi ngi déglu',
    micProcessing: 'Bindinu wax ji ak tontu bi mi ngi dox...',
    micPlaying: 'Tontu bi mi ngi doon wax',
    cancel: 'Bàyyi',
    listen: 'Déglu',
    stop: 'Taxawal déglu bi',
    preparing: 'Waajal baat bi...',
    errors: {
      generic: 'Am na jafe-jafe',
      playback: 'Baatu bi mënul a dox.',
    },
  },
};

/** Textes d'une langue, complétés par le français pour les clés manquantes. */
export function voiceCopyFor(language) {
  const base = VOICE_COPY.fr;
  const own = VOICE_COPY[language] || {};
  return { ...base, ...own, errors: { ...base.errors, ...(own.errors || {}) } };
}
