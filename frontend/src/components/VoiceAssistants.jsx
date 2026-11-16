import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Bell,
  Leaf,
  Camera,
  FolderHeart,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Cpu,
  CheckCircle2
} from 'lucide-react';
import {
  ASSISTANT_LANGUAGES,
  INITIAL_CHAT_MESSAGES,
  INITIAL_PLANTS,
  SAMPLE_QUESTIONS
} from '../data/mockData';
import { askOctopusAssistant, transcribeAssistantAudio } from '../services/octopusApi';

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Chrome charge les voix de façon asynchrone : getVoices() peut être vide au premier appel.
const loadVoices = () => new Promise((resolve) => {
  const synth = window.speechSynthesis;
  if (synth.getVoices().length) {
    resolve(synth.getVoices());
    return;
  }
  const done = () => {
    synth.removeEventListener('voiceschanged', done);
    resolve(synth.getVoices());
  };
  synth.addEventListener('voiceschanged', done);
  setTimeout(done, 1000); // repli si l'événement n'arrive jamais
});

export default function VoiceAssistantScreen({
  plants = INITIAL_PLANTS,
  initialQuery = '',
  onClearInitialQuery,
  onNavigateToScan,
  onNavigateToPlants,
  onOpenOctopusConfig
}) {
  const [currentLang, setCurrentLang] = useState('fr'); // 'fr' | 'wo' | 'en'
  const [messages, setMessages] = useState(INITIAL_CHAT_MESSAGES.fr);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [waveformActive, setWaveformActive] = useState(false);
  const [assistantError, setAssistantError] = useState('');
  const [assistantNotice, setAssistantNotice] = useState('');

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatBottomRef = useRef(null);
  const lastInitialQueryRef = useRef('');
  const langRef = useRef('fr');
  const plantsRef = useRef(plants);
  const isSendingRef = useRef(false);
  const unmountedRef = useRef(false);

  plantsRef.current = plants;

  // Plantes ayant une alerte active ou un état non sain ('malade' ou 'surveiller')
  const activePlantAlerts = (plants || []).filter(
    (plant) => plant.status !== 'saine' || Boolean(plant.alert)
  );

  // Garde la langue courante accessible aux callbacks asynchrones (micro, synthèse).
  // Si la conversation n'a pas commencé, on affiche le message d'accueil dans la nouvelle langue.
  useEffect(() => {
    langRef.current = currentLang;
    setMessages((prev) => (
      prev.some((m) => m.sender === 'user')
        ? prev
        : (INITIAL_CHAT_MESSAGES[currentLang] || INITIAL_CHAT_MESSAGES.fr)
    ));
  }, [currentLang]);

  // Nettoyage au démontage : on marque d'abord le composant comme démonté
  // pour que recorder.onstop n'envoie rien.
  useEffect(() => {
    unmountedRef.current = false; // nécessaire avec React StrictMode
    return () => {
      unmountedRef.current = true;
      try {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      } catch { /* déjà arrêté */ }
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, waveformActive]);

  const speakText = useCallback(async (text) => {
    const lang = langRef.current;
    setAssistantNotice('');

    if (!text || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
      setAssistantNotice("La synthèse vocale n'est pas prise en charge par ce navigateur.");
      setIsSpeaking(false);
      setWaveformActive(false);
      return;
    }

    // Mode strictement local : ne sélectionne jamais les voix réseau (localService=false).
    const localVoices = (await loadVoices()).filter((voice) => voice.localService === true);
    if (unmountedRef.current) return;

    const languageTag = lang === 'en' ? 'en-US' : lang === 'wo' ? 'wo-SN' : 'fr-FR';
    const preferredVoice = lang === 'wo'
      ? localVoices.find((voice) => /^wo(-|$)/i.test(voice.lang))
      : localVoices.find((voice) => voice.lang?.toLowerCase() === languageTag.toLowerCase())
        || localVoices.find((voice) => voice.lang?.toLowerCase().startsWith(lang === 'en' ? 'en' : 'fr'));

    if (!preferredVoice) {
      setAssistantNotice(lang === 'wo'
        ? "Aucune voix wolof n'est installée sur cet appareil : la réponse reste affichée à l'écran."
        : "Aucune voix locale compatible n'est installée sur cet appareil : la réponse reste affichée à l'écran.");
      setIsSpeaking(false);
      setWaveformActive(false);
      return;
    }

    // cancel() après l'attente : évite que deux lectures se chevauchent
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageTag;
    utterance.rate = lang === 'wo' ? 0.88 : 0.95;
    utterance.voice = preferredVoice;
    utterance.onstart = () => {
      setIsSpeaking(true);
      setWaveformActive(true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setWaveformActive(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setWaveformActive(false);
      setAssistantNotice("La lecture audio a échoué. Vous pouvez lire la réponse à l'écran.");
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const sendMessage = async (textToSend) => {
    const query = (textToSend ?? inputText).trim();
    if (!query || isSendingRef.current) return;

    isSendingRef.current = true;
    const lang = langRef.current;

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, sender: 'user', text: query, timestamp: nowTime() }
    ]);
    setInputText('');
    setAssistantError('');
    setAssistantNotice('');
    setWaveformActive(true);
    setIsSending(true);

    try {
     const botReply = await askOctopusAssistant(
                    query,
                    currentLang,
                    {
                      plants,
                      alerts
                    }
    );
      const replyText = typeof botReply?.text === 'string' ? botReply.text.trim() : '';
      if (!replyText) {
        throw new Error("Le serveur n'a renvoyé aucune réponse exploitable.");
      }
      if (unmountedRef.current) return;

      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: replyText,
          timestamp: botReply.timestamp || nowTime(),
          hasAudio: lang !== 'wo' // pas de voix wolof dans le navigateur
        }
      ]);
      speakText(replyText);
    } catch (error) {
      console.error("Erreur de l'assistant PhytoScan :", error);
      if (!unmountedRef.current) {
        setWaveformActive(false);
        setAssistantError(error?.message || "Impossible de contacter l'assistant. Vérifiez la connexion au serveur.");
      }
    } finally {
      isSendingRef.current = false;
      if (!unmountedRef.current) setIsSending(false);
    }
  };

  // Question venant d'un autre écran : envoyée une seule fois.
  useEffect(() => {
    const query = (initialQuery || '').trim();
    if (query && query !== lastInitialQueryRef.current) {
      lastInitialQueryRef.current = query;
      sendMessage(query);
      if (onClearInitialQuery) onClearInitialQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const toggleListening = async () => {
    if (isListening) {
      try { recorderRef.current?.stop(); } catch { /* enregistrement déjà arrêté */ }
      return;
    }
    if (isTranscribing || isSending) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      setAssistantError("L'enregistrement audio n'est pas disponible dans ce navigateur. Utilisez la saisie écrite.");
      return;
    }

    try {
      setAssistantError('');
      setAssistantNotice('');
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      if (unmountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      audioChunksRef.current = [];

      const preferredMime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((mime) => window.MediaRecorder.isTypeSupported?.(mime));
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) audioChunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        setIsListening(false);
        setWaveformActive(false);
        setAssistantError("L'enregistrement a échoué. Vérifiez le microphone et réessayez.");
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (unmountedRef.current) return;

        setIsListening(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        if (!audioBlob.size) {
          setWaveformActive(false);
          setAssistantError("Aucun son n'a été enregistré. Réessayez en parlant après le démarrage du microphone.");
          return;
        }

        setIsTranscribing(true);
        setWaveformActive(true);
        let transcript = '';
        try {
          const result = await transcribeAssistantAudio(audioBlob, langRef.current);
          transcript = result?.text?.trim() || '';
          if (!transcript) throw new Error("Aucune parole reconnue. Réessayez ou écrivez votre question.");
        } catch (error) {
          if (!unmountedRef.current) {
            setWaveformActive(false);
            setAssistantError(error?.message || "La transcription locale a échoué.");
          }
          return;
        } finally {
          if (!unmountedRef.current) setIsTranscribing(false);
        }

        if (unmountedRef.current) return;
        await sendMessage(transcript);
      };

      recorder.start();
      setIsListening(true);
      setWaveformActive(true);
    } catch (error) {
      setIsListening(false);
      setWaveformActive(false);
      const message = error?.name === 'NotAllowedError'
        ? "L'accès au microphone est refusé. Autorisez le microphone dans votre navigateur."
        : error?.name === 'NotFoundError'
          ? "Aucun microphone n'a été détecté sur cet ordinateur."
          : "Impossible de démarrer le microphone. Vérifiez les autorisations du navigateur.";
      setAssistantError(message);
      console.error("Erreur d'enregistrement vocal :", error);
    }
  };

  const statusLabel = isListening
    ? "Écoute de votre voix en cours..."
    : isTranscribing
      ? "Transcription en cours..."
      : isSpeaking
        ? "Lecture de la réponse en cours..."
        : isSending
          ? "L'assistant prépare sa réponse..."
          : "Microphone prêt";

  return (
    <div className="web-page-container">
      {/* En-tête de page du site web */}
      <div className="web-page-header">
        <div>
          <div className="web-breadcrumb">
            <span>Accueil</span>
            <span>/</span>
            <span className="current">Assistant vocal & alertes</span>
          </div>
          <h1 className="web-page-title">
            Assistant Agronome Intelligent & Tour de Contrôle
          </h1>
          <p className="web-page-subtitle">
            Échangez par la voix ou par écrit avec l'IA experte en pathologie végétale. Disponible en français, wolof et anglais. La transcription de votre voix se fait sur le serveur PhytoScan, sans service cloud.
          </p>
        </div>

        {/* Sélecteur de langue Web */}
        <div className="web-lang-selector-card">
          <span className="lang-label">Langue de l'IA :</span>
          <div className="lang-buttons-group">
            {ASSISTANT_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`web-lang-btn ${currentLang === lang.code ? 'active' : ''}`}
                onClick={() => setCurrentLang(lang.code)}
                disabled={isListening || isTranscribing}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grille principale 2 colonnes du site web */}
      <div className="web-assistant-grid">
        {/* =========================================================
            COLONNE GAUCHE : INTERFACE DE DISCUSSION & AUDIO
            ========================================================= */}
        <div className="web-card web-chat-main-card">
          <div className="chat-card-top-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="bot-status-avatar">
                <Leaf size={20} />
              </div>
              <div>
                <h3 className="chat-bot-name">PhytoScan Agronome IA</h3>
                <span className="chat-bot-status">● Assistant PhytoScan</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="audio-voice-badge">
                <Volume2 size={14} /> Voix
              </span>
            </div>
          </div>

          {/* Flux de discussion défilant */}
          <div className="web-chat-feed">
            {messages.map((msg) => (
              msg.sender === 'user' ? (
                <div key={msg.id} className="web-chat-bubble-user-row">
                  <div className="web-chat-bubble-user">
                    <p>{msg.text}</p>
                    <span className="bubble-timestamp">{msg.timestamp}</span>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="web-chat-bubble-bot-row">
                  <div className="web-bot-avatar">
                    <Leaf size={16} />
                  </div>
                  <div className="web-chat-bubble-bot">
                    <p>{msg.text}</p>
                    <div className="bubble-bot-footer">
                      <span className="bubble-timestamp">{msg.timestamp}</span>
                      {msg.hasAudio && (
                        <button
                          type="button"
                          className="web-btn-listen"
                          onClick={() => speakText(msg.text)}
                        >
                          <Volume2 size={13} />
                          <span>Réécouter la réponse</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Visualisation Waveform Audio */}
          <div className={`web-waveform-box ${waveformActive || isListening || isTranscribing || isSpeaking ? 'active' : ''}`}>
            <span className="waveform-info-txt" aria-live="polite">{statusLabel}</span>
            <div className="web-waveform-bars">
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
            </div>
          </div>
          {assistantError && (
            <p role="alert" className="alert-item-desc" style={{ color: '#b91c1c', padding: '0 16px', margin: '8px 0' }}>
              {assistantError}
            </p>
          )}
          {assistantNotice && !assistantError && (
            <p role="status" className="alert-item-desc" style={{ color: '#475569', padding: '0 16px', margin: '8px 0' }}>
              {assistantNotice}
            </p>
          )}

          {/* Barre d'interaction micro + texte */}
          <div className="web-chat-input-section">
            <div className="web-input-bar">
              <button
                type="button"
                className={`web-btn-mic-toggle ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
                disabled={isTranscribing || isSending}
                title={isListening ? "Arrêter l'écoute et envoyer" : "Poser une question vocale"}
                aria-label={isListening ? "Arrêter l'écoute et envoyer" : "Poser une question vocale"}
              >
                {isListening ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputText.trim()) sendMessage(inputText);
                }}
                style={{ flex: 1, display: 'flex', gap: '8px' }}
              >
                <input
                  type="text"
                  className="web-chat-text-input"
                  placeholder="Posez une question sur vos cultures, maladies, traitements bio..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />

                <button
                  type="submit"
                  className="web-btn-send-message"
                  disabled={!inputText.trim() || isSending}
                  title="Envoyer"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>

            {/* Questions fréquentes en badges */}
            <div className="web-suggested-questions">
              <span className="suggested-heading">Questions suggérées ({currentLang.toUpperCase()}) :</span>
              <div className="suggested-chips-wrap">
                {(SAMPLE_QUESTIONS[currentLang] || SAMPLE_QUESTIONS.fr).map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    className="web-suggested-chip"
                    onClick={() => sendMessage(q)}
                    disabled={isSending}
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            COLONNE DROITE : TOUR DE CONTRÔLE DES ALERTES DYNAMIQUES
            ========================================================= */}
        <div className="web-assistant-sidebar">
          {/* Centre des alertes phytosanitaires */}
          <div className="web-card web-alerts-card">
            <div className="alerts-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} color={activePlantAlerts.length > 0 ? '#e11d48' : '#10b981'} />
                <h3 style={{ margin: 0 }}>Alertes Phytosanitaires en direct</h3>
              </div>
              <span
                className="urgent-badge-pill"
                style={
                  activePlantAlerts.length === 0
                    ? { background: '#dcfce7', color: '#15803d' }
                    : undefined
                }
              >
                {activePlantAlerts.length} alerte{activePlantAlerts.length > 1 ? 's' : ''} active{activePlantAlerts.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="alerts-list">
              {activePlantAlerts.length === 0 ? (
                <div
                  className="web-alert-item"
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} color="#10b981" />
                    <strong>Aucune alerte sanitaire sur vos parcelles</strong>
                  </div>
                  <p className="alert-item-desc" style={{ color: '#15803d' }}>
                    Toutes les cultures enregistrées dans votre carnet sont actuellement saines.
                  </p>
                </div>
              ) : (
                activePlantAlerts.map((plant) => {
                  const isSevere = plant.status === 'malade';
                  return (
                    <div
                      key={plant.id}
                      className={`web-alert-item ${isSevere ? 'danger' : 'warning'}`}
                    >
                      <div className="alert-item-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isSevere ? (
                            <ShieldAlert size={16} color="#e11d48" />
                          ) : (
                            <AlertTriangle size={16} color="#d97706" />
                          )}
                          <strong>
                            {plant.name} ({(plant.species || '').split(' (')[0]}) — {plant.plot}
                          </strong>
                        </div>
                        <span className="alert-time">{plant.lastObservation}</span>
                      </div>
                      <p className="alert-item-desc">
                        {plant.alert || plant.details?.notes || `Statut actuel : ${plant.statusLabel} (Score de santé : ${plant.healthScore}/100).`}
                      </p>
                      <div className="alert-item-actions">
                        <button
                          type="button"
                          className="web-alert-btn-action primary"
                          onClick={() => onNavigateToPlants && onNavigateToPlants({ plantId: plant.id })}
                        >
                          <FolderHeart size={14} />
                          <span>Consulter le dossier de la plante</span>
                        </button>
                        <button
                          type="button"
                          className="web-alert-btn-action secondary"
                          onClick={() => onNavigateToScan && onNavigateToScan({ targetPlant: plant })}
                        >
                          <Camera size={14} />
                          <span>Faire un scan de contrôle</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Bulletin de vigilance agro-météorologique */}
              <div className="web-alert-item warning">
                <div className="alert-item-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} color="#d97706" />
                    <strong>Vigilance Météo & Risque Fongique</strong>
                  </div>
                  <span className="alert-time">Bulletin préventif</span>
                </div>
                <p className="alert-item-desc">
                  Hygrométrie matinale élevée prévue sur le secteur. Aérez les serres et arrosez directement au pied pour éviter l'eau stagnante sur le feuillage.
                </p>
              </div>
            </div>
          </div>

          {/* Raccourcis d'actions agronomiques */}
          <div className="web-card web-shortcuts-card">
            <h4>Raccourcis rapides de la plateforme</h4>
            <div className="web-shortcuts-list">
              <button
                type="button"
                className="web-shortcut-item"
                onClick={() => onNavigateToScan && onNavigateToScan()}
              >
                <div className="shortcut-icon green">
                  <Camera size={18} />
                </div>
                <div>
                  <strong>Nouveau diagnostic par Scan</strong>
                  <span>Analyser une feuille par vision IA</span>
                </div>
                <ArrowRight size={15} style={{ marginLeft: 'auto', color: '#94a3b8' }} />
              </button>

              <button
                type="button"
                className="web-shortcut-item"
                onClick={() => onNavigateToPlants && onNavigateToPlants()}
              >
                <div className="shortcut-icon blue">
                  <FolderHeart size={18} />
                </div>
                <div>
                  <strong>Carnet de santé des cultures</strong>
                  <span>Gérer vos parcelles et historiques</span>
                </div>
                <ArrowRight size={15} style={{ marginLeft: 'auto', color: '#94a3b8' }} />
              </button>

              <button
                type="button"
                className="web-shortcut-item"
                onClick={onOpenOctopusConfig}
              >
                <div className="shortcut-icon purple">
                  <Cpu size={18} />
                </div>
                <div>
                  <strong>Agent IA Octopus</strong>
                  <span>Régler l'adresse API et le modèle</span>
                </div>
                <ArrowRight size={15} style={{ marginLeft: 'auto', color: '#94a3b8' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
