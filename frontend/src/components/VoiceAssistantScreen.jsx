import { useState, useEffect, useRef, useCallback } from 'react';
import { 
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
import VoiceAssistant from './VoiceAssistant';
import { 
  ASSISTANT_LANGUAGES, 
  INITIAL_PLANTS,
  SAMPLE_QUESTIONS 
} from '../data/mockData';
import { ASSISTANT_COPY } from '../data/assistantCopy';
import { askOctopusAssistant } from '../services/octopusApi';
import { synthesizeWolofSpeech } from '../services/voiceApi';

export default function VoiceAssistantScreen({ 
  plants = INITIAL_PLANTS,
  initialLanguage = 'fr',
  initialQuery = '', 
  onClearInitialQuery,
  onNavigateToScan, 
  onNavigateToPlants, 
  onOpenOctopusConfig 
}) {
  const [currentLang, setCurrentLang] = useState(
    () => ASSISTANT_COPY[initialLanguage] ? initialLanguage : 'fr'
  );
  const [messages, setMessages] = useState(() => {
    const language = ASSISTANT_COPY[initialLanguage] ? initialLanguage : 'fr';
    return [{
      id: `welcome-${language}`,
      sender: 'bot',
      text: ASSISTANT_COPY[language].welcome,
      timestamp: '',
      hasAudio: false
    }];
  });
  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [waveformActive, setWaveformActive] = useState(false);
  const [speechMessageId, setSpeechMessageId] = useState('');
  const [speechLoadingId, setSpeechLoadingId] = useState('');
  const [speechError, setSpeechError] = useState('');
  const copy = ASSISTANT_COPY[currentLang] || ASSISTANT_COPY.fr;

  const chatBottomRef = useRef(null);
  const currentLanguageRef = useRef(currentLang);
  const wolofAudioRef = useRef(null);
  const wolofAudioUrlRef = useRef('');
  const speechRequestIdRef = useRef(0);
  const speechControllerRef = useRef(null);

  // Plantes ayant une alerte active ou un état non sain ('malade' ou 'surveiller')
  const activePlantAlerts = (plants || []).filter(
    (plant) => plant.status !== 'saine' || Boolean(plant.alert)
  );

  const speakText = useCallback((text) => {
    if (currentLang === 'wo' || !('speechSynthesis' in window)) {
      setIsSpeaking(false);
      setWaveformActive(false);
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang === 'en' ? 'en-US' : 'fr-FR';
    utterance.rate = 0.95;

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
    };

    window.speechSynthesis.speak(utterance);
  }, [currentLang]);

  const playAssistantAudio = useCallback(async (text, messageId) => {
    if (currentLang !== 'wo') {
      speakText(text);
      return;
    }

    if (speechMessageId === messageId && !wolofAudioRef.current) {
      speechRequestIdRef.current += 1;
      speechControllerRef.current?.abort();
      speechControllerRef.current = null;
      setSpeechMessageId('');
      setSpeechLoadingId('');
      return;
    }

    if (speechMessageId === messageId && wolofAudioRef.current) {
      speechRequestIdRef.current += 1;
      speechControllerRef.current?.abort();
      speechControllerRef.current = null;
      wolofAudioRef.current.pause();
      wolofAudioRef.current = null;
      URL.revokeObjectURL(wolofAudioUrlRef.current);
      wolofAudioUrlRef.current = '';
      setSpeechMessageId('');
      setSpeechLoadingId('');
      return;
    }

    const requestId = speechRequestIdRef.current + 1;
    speechRequestIdRef.current = requestId;
    speechControllerRef.current?.abort();
    const controller = new AbortController();
    speechControllerRef.current = controller;
    wolofAudioRef.current?.pause();
    URL.revokeObjectURL(wolofAudioUrlRef.current);
    wolofAudioRef.current = null;
    wolofAudioUrlRef.current = '';
    setSpeechError('');
    setSpeechMessageId(messageId);
    setSpeechLoadingId(messageId);

    try {
      const audioBlob = await synthesizeWolofSpeech(text, controller.signal);
      if (requestId !== speechRequestIdRef.current || currentLanguageRef.current !== 'wo') return;
      speechControllerRef.current = null;

      setSpeechLoadingId('');
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      wolofAudioUrlRef.current = audioUrl;
      wolofAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        wolofAudioUrlRef.current = '';
        wolofAudioRef.current = null;
        setSpeechMessageId('');
        setSpeechLoadingId('');
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        wolofAudioUrlRef.current = '';
        wolofAudioRef.current = null;
        setSpeechMessageId('');
        setSpeechLoadingId('');
        setSpeechError(copy.speechError);
      };
      await audio.play();
    } catch (error) {
      if (requestId === speechRequestIdRef.current) {
        speechControllerRef.current = null;
        wolofAudioRef.current?.pause();
        wolofAudioRef.current = null;
        if (wolofAudioUrlRef.current) URL.revokeObjectURL(wolofAudioUrlRef.current);
        wolofAudioUrlRef.current = '';
        setSpeechMessageId('');
        setSpeechLoadingId('');
        setSpeechError(error.message || copy.speechError);
      }
    }
  }, [copy.speechError, currentLang, speakText, speechMessageId]);

  const sendMessage = useCallback(async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;
    const requestLanguage = currentLang;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setWaveformActive(true);

    try {
      const botReply = await askOctopusAssistant(query, requestLanguage, { plants });
      if (currentLanguageRef.current !== requestLanguage) return;
      setMessages(prev => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: botReply.text,
          timestamp: botReply.timestamp,
          hasAudio: true
        }
      ]);
      speakText(botReply.text);
    } catch (error) {
      if (currentLanguageRef.current !== requestLanguage) return;
      setWaveformActive(false);
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: 'bot',
          text: error.message || 'Impossible de joindre le serveur. Vérifiez la connexion puis réessayez.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasAudio: false
        }
      ]);
    }
  }, [inputText, currentLang, plants, speakText]);

  useEffect(() => {
    currentLanguageRef.current = currentLang;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    speechRequestIdRef.current += 1;
    speechControllerRef.current?.abort();
    speechControllerRef.current = null;
    wolofAudioRef.current?.pause();
    wolofAudioRef.current = null;
    if (wolofAudioUrlRef.current) URL.revokeObjectURL(wolofAudioUrlRef.current);
    wolofAudioUrlRef.current = '';
    setSpeechMessageId('');
    setSpeechLoadingId('');
    setSpeechError('');
    setIsSpeaking(false);
    setWaveformActive(false);
    setMessages([
      { id: `welcome-${currentLang}`, sender: 'bot', text: copy.welcome, timestamp: '', hasAudio: false }
    ]);
  }, [currentLang, copy.welcome]);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      sendMessage(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery, sendMessage, onClearInitialQuery]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, waveformActive]);

  // Nettoyage de la synthèse vocale du navigateur.
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechRequestIdRef.current += 1;
      speechControllerRef.current?.abort();
      wolofAudioRef.current?.pause();
      if (wolofAudioUrlRef.current) URL.revokeObjectURL(wolofAudioUrlRef.current);
    };
  }, []);

  return (
    <div className="web-page-container">
      {/* En-tête de page du site web */}
      <div className="web-page-header">
        <div>
          <div className="web-breadcrumb">
            <span>Accueil</span>
            <span>/</span>
            <span className="current">{copy.breadcrumb}</span>
          </div>
          <h1 className="web-page-title">{copy.title}</h1>
          <p className="web-page-subtitle">{copy.subtitle}</p>
        </div>

        {/* Sélecteur de langue Web */}
        <div className="web-lang-selector-card">
          <span className="lang-label">{copy.language}</span>
          <div className="lang-buttons-group">
            {ASSISTANT_LANGUAGES.map((lang) => (
              <button 
                key={lang.code}
                type="button"
                className={`web-lang-btn ${currentLang === lang.code ? 'active' : ''}`}
                onClick={() => {
                  currentLanguageRef.current = lang.code;
                  setCurrentLang(lang.code);
                }}
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
                <h3 className="chat-bot-name">{copy.chatTitle}</h3>
                <span className="chat-bot-status">{copy.chatStatus}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="audio-voice-badge">
                <Volume2 size={14} /> {copy.voiceBadge}
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
                          onClick={() => playAssistantAudio(msg.text, msg.id)}
                        >
                          <Volume2 size={13} />
                          <span>
                            {speechMessageId === msg.id
                              ? speechLoadingId === msg.id
                                ? copy.generatingAudio
                                : copy.stopAudio
                              : copy.listenAnswer}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            ))}
            <div ref={chatBottomRef} />
          </div>
          {speechError && <p className="voice-assistant-error" role="alert">{speechError}</p>}

          <VoiceAssistant
            language={currentLang}
            onVoiceResult={(result) => {
              const timestamp = result.timestamp || new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });
              setMessages(previous => [
                ...previous,
                { id: `u-${Date.now()}`, sender: 'user', text: result.transcript, timestamp },
                { id: `b-${Date.now() + 1}`, sender: 'bot', text: result.text, timestamp, hasAudio: false }
              ]);
            }}
            onNewConversation={() => setMessages([
              { id: `welcome-${currentLang}`, sender: 'bot', text: copy.welcome, timestamp: '', hasAudio: false }
            ])}
          />

          {/* Visualisation de la synthèse vocale du navigateur pour les réponses écrites */}
          <div className={`web-waveform-box ${waveformActive || isSpeaking ? 'active' : ''}`}>
            <span className="waveform-info-txt">
              {isSpeaking ? copy.speechPlaying : copy.speechReady}
            </span>
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

          {/* Barre d'interaction micro + texte */}
          <div className="web-chat-input-section">
            <div className="web-input-bar">
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
                  placeholder={copy.placeholder}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />

                <button 
                  type="submit" 
                  className="web-btn-send-message"
                  disabled={!inputText.trim()}
                  title={copy.send}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>

            {/* Questions fréquentes en badges */}
            <div className="web-suggested-questions">
              <span className="suggested-heading">{copy.suggestions} ({currentLang.toUpperCase()}) :</span>
              <div className="suggested-chips-wrap">
                {(SAMPLE_QUESTIONS[currentLang] || SAMPLE_QUESTIONS.fr).map((q, i) => (
                  <button 
                    key={i}
                    type="button" 
                    className="web-suggested-chip"
                    onClick={() => sendMessage(q)}
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
                <h3 style={{ margin: 0 }}>{copy.alertsTitle}</h3>
              </div>
              <span
                className="urgent-badge-pill"
                style={
                  activePlantAlerts.length === 0
                    ? { background: '#dcfce7', color: '#15803d' }
                    : undefined
                }
              >
                {copy.alertCount(activePlantAlerts.length)}
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
                    <strong>{copy.noAlerts}</strong>
                  </div>
                  <p className="alert-item-desc" style={{ color: '#15803d' }}>
                    {copy.allHealthy}
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
                            {plant.name} ({plant.species.split(' (')[0]}) — {plant.plot}
                          </strong>
                        </div>
                        <span className="alert-time">{plant.lastObservation}</span>
                      </div>
                      <p className="alert-item-desc">
                        {plant.alert || plant.details?.notes || `${copy.status} : ${copy.plantStatus[plant.status] || plant.statusLabel} (${copy.score} : ${plant.healthScore}/100).`}
                      </p>
                      <div className="alert-item-actions">
                        <button 
                          type="button" 
                          className="web-alert-btn-action primary"
                          onClick={() => onNavigateToPlants && onNavigateToPlants({ plantId: plant.id })}
                        >
                          <FolderHeart size={14} />
                          <span>{copy.viewPlant}</span>
                        </button>
                        <button 
                          type="button" 
                          className="web-alert-btn-action secondary"
                          onClick={() => onNavigateToScan && onNavigateToScan({ targetPlant: plant })}
                        >
                          <Camera size={14} />
                          <span>{copy.scanPlant}</span>
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
                    <strong>{copy.weatherTitle}</strong>
                  </div>
                  <span className="alert-time">{copy.weatherBadge}</span>
                </div>
                <p className="alert-item-desc">
                  {copy.weatherBody}
                </p>
              </div>
            </div>
          </div>

          {/* Raccourcis d'actions agronomiques */}
          <div className="web-card web-shortcuts-card">
            <h4>{copy.shortcuts}</h4>
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
                  <strong>{copy.newScan}</strong>
                  <span>{copy.newScanDescription}</span>
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
                  <strong>{copy.plantBook}</strong>
                  <span>{copy.plantBookDescription}</span>
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
                  <strong>{copy.agent}</strong>
                  <span>{copy.agentDescription}</span>
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
