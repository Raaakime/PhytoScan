import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Volume2,
  VolumeX,
  Bell,
  Leaf,
  Camera,
  FolderHeart,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Globe,
  RefreshCw,
  CheckCircle2,
  Cpu,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  ASSISTANT_LANGUAGES,
  INITIAL_CHAT_MESSAGES,
  SAMPLE_QUESTIONS
} from '../data/mockData';
import { askOctopusAssistant } from '../services/octopusApi';
import { base64ToBlob } from '../services/voiceApi';
import { voiceCopyFor } from '../data/voiceCopy';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useVoiceConsent } from '../hooks/useVoiceConsent';
import { useVoiceConversation } from '../hooks/useVoiceConversation';
import { useVoiceStatus } from '../hooks/useVoiceStatus';
import ListenButton from './voice/ListenButton';
import MicButton from './voice/MicButton';
import VoiceNotice from './voice/VoiceNotice';
import VoiceStatusBar from './voice/VoiceStatusBar';
import WeatherRiskCard from '../components/WeatherRiskCard';
import { useClimateRisks } from '../hooks/useClimateRisks';

const nowLabel = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Erreur (code, objet { code } ou Error de l'API) -> bandeau affichable, dans la langue de l'écran. */
function noticeForError(copy, error) {
  if (!error) return null;
  if (typeof error === 'string') return { kind: 'error', message: copy.errors[error] || copy.errors.generic };
  if (error.code === 'login' || error.status === 401) return { kind: 'login' };
  if (error.code) return { kind: 'error', message: copy.errors[error.code] || copy.errors.generic };
  if (error.status === 429) return { kind: 'error', message: copy.errors.rateLimited };
  if ([502, 503, 504].includes(error.status)) return { kind: 'error', message: copy.errors.unavailable };
  if (error.status === undefined && error.name !== 'Error') return { kind: 'error', message: copy.errors.generic };
  return { kind: 'error', message: error.message || copy.errors.generic };
}

export default function VoiceAssistantScreen({
  plants = [],
  alerts = null,
  initialQuery = '',
  isAuthenticated = false,
  onRequireLogin,
  onClearInitialQuery,
  onNavigateToScan,
  onNavigateToPlants,
  onOpenOctopusConfig
}) {
  const [currentLang, setCurrentLang] = useState('fr'); // 'fr' | 'wo' | 'en'
  const [messages, setMessages] = useState(INITIAL_CHAT_MESSAGES.fr);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSwitchingLang, setIsSwitchingLang] = useState(false);
  const [notice, setNotice] = useState(null);   // { kind: 'consent' | 'login' | 'info' | 'error', message? }
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const climate = useClimateRisks(plants);
  const chatBottomRef = useRef(null);

  // --- voix -----------------------------------------------------------------------------------------
  const copy = voiceCopyFor(currentLang);
  const voiceStatus = useVoiceStatus();
  const consent = useVoiceConsent();
  const capabilities = voiceStatus.capabilities(currentLang);
  const serverHasVoice = ['fr', 'en', 'wo'].some((code) => voiceStatus.capabilities(code).stt);

  const player = useAudioPlayer({ onError: (error) => setNotice(noticeForError(copy, error)) });

  // Réponse d'une question parlée : on l'ajoute au fil et on la lit tout de suite.
  const handleVoiceTurn = useCallback((result) => {
    const timestamp = result.timestamp || nowLabel();
    const botId = `b-${Date.now()}`;
    setMessages((previous) => [
      ...previous,
      { id: `u-${Date.now()}`, sender: 'user', text: result.transcript, timestamp },
      { id: botId, sender: 'bot', text: result.text, timestamp },
    ]);
    if (result.audioBase64 && result.audioMimeType) {
      const blob = base64ToBlob(result.audioBase64, result.audioMimeType);
      player.remember(botId, blob);
      player.playBlob(botId, blob);
    } else if (result.audioError) {
      setNotice({ kind: 'info', message: `${result.audioError} ${copy.audioUnavailableNote}` });
    }
  }, [player, copy]);

  const voice = useVoiceConversation({
    language: currentLang,
    maxRecordingSeconds: voiceStatus.maxRecordingSeconds,
    onTurn: handleVoiceTurn,
  });

  const micBlocked = voiceStatus.loading || !capabilities.stt || !voice.supported;
  const playing = player.active.state === 'playing';

  const statusText = voice.phase === 'requesting' ? copy.micRequesting
    : voice.phase === 'recording' ? copy.micRecording
      : voice.phase === 'processing' || isThinking ? copy.micProcessing
        : playing ? copy.micPlaying
          : voiceStatus.loading ? copy.micLoading
            : !capabilities.stt ? (serverHasVoice ? copy.micUnavailableLanguage : copy.micUnavailable)
              : !voice.supported ? copy.errors.unsupported
                : copy.micReady;

  const handleMicClick = () => {
    setNotice(null);
    if (voice.phase === 'recording') {
      voice.toggle();                       // 2e appui : envoie la question
      return;
    }
    if (!isAuthenticated) { setNotice({ kind: 'login' }); return; }
    if (!consent.given) { setNotice({ kind: 'consent' }); return; }
    player.stop();
    player.prime();                         // déverrouille la lecture automatique de la réponse (iOS)
    voice.toggle();
  };

  const handleConsentAccepted = () => {
    consent.accept();
    setNotice(null);
    player.prime();
    voice.toggle();
  };

  const shownNotice = voice.error ? noticeForError(copy, voice.error) : notice;
  const canListen = isAuthenticated && capabilities.tts;

  // --- langue ---------------------------------------------------------------------------------------
  const handleLanguageChange = (newLang) => {
    if (newLang === currentLang) return;
    player.stop();
    voice.reset();

    setCurrentLang(newLang);
    setNotice(null);
    setIsSwitchingLang(true);
    setIsThinking(true);
    setMessages([]);

    setTimeout(() => {
      setMessages(INITIAL_CHAT_MESSAGES[newLang] || INITIAL_CHAT_MESSAGES.fr);
      setIsThinking(false);
      setIsSwitchingLang(false);
    }, 550);
  };

  // --- texte ----------------------------------------------------------------------------------------
  const sendMessage = useCallback(async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    setMessages(prev => [...prev, { id: `u-${Date.now()}`, sender: 'user', text: query, timestamp: nowLabel() }]);
    setInputText('');
    setNotice(null);
    setIsThinking(true);

    try {
      const botReply = await askOctopusAssistant(query, currentLang, climate.context);
      setMessages(prev => [
        ...prev,
        { id: `b-${Date.now()}`, sender: 'bot', text: botReply.text, timestamp: botReply.timestamp || nowLabel() }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: 'bot',
          isError: true,
          text: error?.message || "Désolé, l'assistant est momentanément indisponible. Réessayez dans un instant.",
          timestamp: nowLabel()
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  }, [inputText, currentLang, climate.context]);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      sendMessage(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, voice.phase, isSwitchingLang]);

  const activeLangObj = ASSISTANT_LANGUAGES.find(l => l.code === currentLang) || ASSISTANT_LANGUAGES[0];
  const dynamicAlerts = alerts || (plants || []).filter(p => p.status !== 'saine' || Boolean(p.alert));
  const alertTotal = dynamicAlerts.length;
  // Affiche uniquement la première alerte par défaut + bouton Voir plus
  const visibleAlerts = showAllAlerts ? dynamicAlerts : dynamicAlerts.slice(0, 1);

  return (
    <div className="web-page-container">
      {/* En-tête simple + Sélecteur de langue en liste déroulante */}
      <div className="web-page-header">
        <div>
          <div className="web-breadcrumb">
            <span>Accueil</span>
            <span>/</span>
            <span className="current">Assistant vocal & alertes</span>
          </div>
          <h1 className="web-page-title">Assistant Agronome & Vigilance</h1>
          <p className="web-page-subtitle">
            Appuyez sur le micro pour parler ou écrivez votre question. Choisissez votre langue à droite.
          </p>
        </div>

        {/* Liste déroulante moderne pour le choix de langue */}
        <div className="ux-lang-dropdown-box">
          <Globe size={18} color="#059669" />
          <label htmlFor="assistant-lang-select" className="lang-label">
            Langue :
          </label>
          <select
            id="assistant-lang-select"
            className="ux-lang-select"
            value={currentLang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={voice.phase !== 'idle'}
          >
            {ASSISTANT_LANGUAGES.map((lang) => (
              <option style={{fontWeight:'600'}} key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grille 2 colonnes épurée */}
      <div className="web-assistant-grid">
        {/* COLONNE GAUCHE : DISCUSSION VOCALE & ÉCRITE */}
        <div className="web-card web-chat-main-card">
          <div className="chat-card-top-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="bot-status-avatar">
                <Leaf size={20} />
              </div>
              <div>
                <h3 className="chat-bot-name">Conseiller PhytoScan</h3>
                <span className="chat-bot-status">
                  ● Actif en {activeLangObj.flag} {activeLangObj.name}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="audio-voice-badge">
                {capabilities.tts ? <Volume2 size={14} /> : <VolumeX size={14} />}
                {capabilities.tts ? ' Réponse vocale' : ' Mode texte'}
              </span>
            </div>
          </div>

          {/* Zone de messages */}
          <div className="web-chat-feed">
            {isSwitchingLang ? (
              <div className="ux-chat-thinking-state">
                <RefreshCw size={24} className="progress-spinner" color="#10b981" />
                <p>L'assistant prépare la discussion en <strong>{activeLangObj.name}</strong>...</p>
              </div>
            ) : (
              messages.map((msg) => (
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
                        {canListen && !msg.isError && msg.text && (
                          <ListenButton
                            id={msg.id}
                            text={msg.text}
                            language={currentLang}
                            player={player}
                            copy={copy}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              ))
            )}

            {isThinking && !isSwitchingLang && (
              <div className="web-chat-bubble-bot-row">
                <div className="web-bot-avatar">
                  <Leaf size={16} />
                </div>
                <div className="web-chat-bubble-bot" style={{ color: '#059669', fontWeight: 600 }}>
                  <p>Réflexion en cours...</p>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* État de la voix : niveau réel du micro pendant l'enregistrement */}
          <VoiceStatusBar
            phase={voice.phase}
            level={voice.level}
            elapsed={voice.elapsed}
            maxSeconds={voice.maxSeconds}
            playing={playing || isThinking}
            text={statusText}
          />

          {shownNotice && (
            <VoiceNotice
              kind={shownNotice.kind}
              message={shownNotice.message}
              copy={copy}
              onAccept={handleConsentAccepted}
              onDismiss={() => setNotice(null)}
              onLogin={() => onRequireLogin?.()}
            />
          )}

          {/* Zone de saisie + Micro */}
          <div className="web-chat-input-section">
            <div className="web-input-bar">
              <MicButton
                phase={voice.phase}
                disabled={micBlocked || isThinking}
                copy={copy}
                onToggle={handleMicClick}
                onCancel={voice.cancel}
              />

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
                  placeholder="Écrivez votre question ici..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />

                <button 
                  type="submit" 
                  className="web-btn-send-message"
                  disabled={!inputText.trim() || isThinking}
                  title="Envoyer"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>

            {/* Questions rapides */}
            <div className="web-suggested-questions">
              <span className="suggested-heading">Idées de questions :</span>
              <div className="suggested-chips-wrap">
                {(SAMPLE_QUESTIONS[currentLang] || SAMPLE_QUESTIONS.fr).map((q, i) => (
                  <button 
                    key={i}
                    type="button" 
                    className="web-suggested-chip"
                    onClick={() => sendMessage(q)}
                    disabled={isThinking}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : TABLEAU DE BORD ALERTES (1ère alerte + Voir plus) & MÉTÉO */}
        <div className="web-assistant-sidebar">
          <div className="web-card web-alerts-card">
            <div className="alerts-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} color={alertTotal > 0 ? '#e11d48' : '#10b981'} />
                <h3 style={{ margin: 0 }}>Vigilance & Météo</h3>
              </div>
              <span 
                className="urgent-badge-pill"
                style={alertTotal === 0 ? { background: '#dcfce7', color: '#15803d' } : undefined}
              >
                {alertTotal} {alertTotal > 1 ? 'alertes' : 'alerte'}
              </span>
            </div>

            <div className="alerts-list">
              {alertTotal === 0 ? (
                <div className="web-alert-item" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
                    <CheckCircle2 size={18} color="#10b981" />
                    <strong>Toutes vos cultures sont saines</strong>
                  </div>
                </div>
              ) : (
                <>
                  {visibleAlerts.map((item) => {
                    const plantObj = item.plant || item;
                    const isDanger = item.level === 'danger' || plantObj.status === 'malade';
                    return (
                      <div key={item.id} className={`web-alert-item ${isDanger ? 'danger' : 'warning'}`}>
                        <div className="alert-item-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isDanger
                              ? <ShieldAlert size={16} color="#e11d48" />
                              : <AlertTriangle size={16} color="#d97706" />}
                            <strong>{item.title || `${plantObj.name} — ${plantObj.plot}`}</strong>
                          </div>
                          <span className="alert-time">{item.date || plantObj.lastObservation}</span>
                        </div>
                        <p className="alert-item-desc">
                          {item.description || plantObj.alert || plantObj.details?.notes}
                        </p>
                        <div className="alert-item-actions" style={{ flexDirection: 'row' }}>
                          <button
                            type="button"
                            className="web-alert-btn-action primary"
                            style={{ flex: 1 }}
                            onClick={() => onNavigateToPlants && onNavigateToPlants({ plantId: plantObj.id })}
                          >
                            <FolderHeart size={14} />
                            <span>Voir la fiche</span>
                          </button>
                          <button
                            type="button"
                            className="web-alert-btn-action secondary"
                            style={{ flex: 1 }}
                            onClick={() => onNavigateToScan && onNavigateToScan({ targetPlant: plantObj })}
                          >
                            <Camera size={14} />
                            <span>Scanner</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {alertTotal > 1 && (
                    <button
                      type="button"
                      className="ux-see-more-btn"
                      onClick={() => setShowAllAlerts(prev => !prev)}
                    >
                      {showAllAlerts ? (
                        <>
                          <ChevronUp size={16} />
                          <span>Réduire les alertes</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={16} />
                          <span>Voir plus ({alertTotal - 1} autre{alertTotal - 1 > 1 ? 's' : ''} alerte{alertTotal - 1 > 1 ? 's' : ''})</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}

              <WeatherRiskCard
                status={climate.status}
                weather={climate.weather}
                risks={climate.risks}
                tips={climate.tips}
                uncovered={climate.uncovered}
                error={climate.error}
                onRefresh={climate.refresh}
              />
            </div>
          </div>

          {/* Raccourcis essentiels */}
          <div className="web-card web-shortcuts-card">
            <h4>Actions rapides</h4>
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
                  <strong>Scanner une feuille</strong>
                  <span>Diagnostic photo instantané</span>
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
                  <strong>Mes cultures</strong>
                  <span>Voir toutes mes parcelles</span>
                </div>
                <ArrowRight size={15} style={{ marginLeft: 'auto', color: '#94a3b8' }} />
              </button>

              {onOpenOctopusConfig && (
                <button 
                  disabled={true}
                  type="button" 
                  className="web-shortcut-item disabled-btn"
                  onClick={onOpenOctopusConfig}
                >
                  <div className="shortcut-icon purple">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <strong>Agent IA PhytoScan</strong>
                    <span>Configuration serveur</span>
                  </div>
                  <ArrowRight size={15} style={{ marginLeft: 'auto', color: '#94a3b8' }} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
