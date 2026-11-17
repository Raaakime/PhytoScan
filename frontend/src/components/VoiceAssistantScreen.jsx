import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
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
import { askOctopusAssistant, sendWolofVoice, getWolofVoiceStatus, audioSrcFromResponse } from '../services/octopusApi';
import { useBrowserVoice } from '../hooks/useBrowserVoice';
import { useWolofRecorder } from '../hooks/useWolofRecorder';
import WeatherRiskCard from '../components/WeatherRiskCard';
import { useClimateRisks } from '../hooks/useClimateRisks';
import {synthesizeWolofText} from '../services/octopusApi'

export default function VoiceAssistantScreen({
  plants = [],
  alerts = null,
  initialQuery = '',
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
  const [voiceNotice, setVoiceNotice] = useState('');
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const climate = useClimateRisks(plants);

  // Voix navigateur (fr / en)
  const {
    listening: isListening, speaking: isSpeaking,
    start: startListening, stop: stopListening, speak, stopSpeaking,
    canListen, canSpeak
  } = useBrowserVoice({
    language: currentLang,
    onFinalText: (text) => sendMessage(text),
    onError: setVoiceNotice
  });

  // Voix serveur pour le Wolof
  const [wolofVoice, setWolofVoice] = useState({ enabled: false });
  const [voiceSessionId, setVoiceSessionId] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef(null);

  const nowLabel = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  const playAudio = (src) => {
    if (!src) return;
    stopAudio();
    const player = new Audio(src);
    audioPlayerRef.current = player;
    player.onplay = () => setIsPlayingAudio(true);
    player.onended = () => setIsPlayingAudio(false);
    player.onerror = () => setIsPlayingAudio(false);
    player.play().catch(() => setIsPlayingAudio(false));
  };

  const sendWolofAudio = async (blob) => {
    setIsThinking(true);
    try {
      const result = await sendWolofVoice(blob, voiceSessionId);
      if (result.sessionId) setVoiceSessionId(result.sessionId);
      const audioSrc = audioSrcFromResponse(result);
      setMessages(prev => [
        ...prev,
        { id: `u-${Date.now()}`, sender: 'user', text: result.transcript, timestamp: nowLabel() },
        { id: `b-${Date.now()}`, sender: 'bot', text: result.text, timestamp: result.timestamp || nowLabel(),
          hasAudio: Boolean(audioSrc), audioSrc }
      ]);
      if (audioSrc) playAudio(audioSrc);
      else if (result.audioError) setVoiceNotice(result.audioError);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { id: `e-${Date.now()}`, sender: 'bot', timestamp: nowLabel(), hasAudio: false,
          text: error?.message || "Désolé, la voix en wolof est momentanément indisponible. Écrivez votre question." }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const {
    recording: isRecordingWo, start: startRecording, stop: stopRecording, canRecord: canRecordWo
  } = useWolofRecorder({ onRecorded: sendWolofAudio, onError: setVoiceNotice });

  useEffect(() => {
    getWolofVoiceStatus().then(setWolofVoice);
  }, []);

  const isWolof = currentLang === 'wo';
 const wolofServerReady = Boolean(wolofVoice?.enabled || wolofVoice?.hf_space_url);
  const micAvailable = isWolof ? (wolofServerReady && canRecordWo) : canListen;

  const micActive = isWolof ? isRecordingWo : isListening;
  const waveformActive = isListening || isSpeaking || isThinking || isRecordingWo || isPlayingAudio;

  const chatBottomRef = useRef(null);

  // Changement de langue avec réflexion visuelle et réinitialisation du chat
  const handleLanguageChange = (newLang) => {
    if (newLang === currentLang) return;
    stopSpeaking();
    stopAudio();
    if (isListening) stopListening();
    if (isRecordingWo) stopRecording();

    setCurrentLang(newLang);
    setVoiceNotice('');
    setVoiceSessionId(null);
    setIsSwitchingLang(true);
    setIsThinking(true);
    setMessages([]);

    setTimeout(() => {
      setMessages(INITIAL_CHAT_MESSAGES[newLang] || INITIAL_CHAT_MESSAGES.fr);
      setIsThinking(false);
      setIsSwitchingLang(false);
    }, 550);
  };

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      sendMessage(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, waveformActive, isSwitchingLang]);

  const speakText = (text) => speak(text);

  const toggleListening = () => {
    setVoiceNotice('');
    if (isWolof) {
      if (isRecordingWo) {
        stopRecording();
      } else {
        stopAudio();
        startRecording();
      }
      return;
    }
    if (isListening) {
      stopListening();
      return;
    }
    stopSpeaking();
    startListening();
  };

  const sendMessage = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: nowLabel()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    try {
      const botReply = await askOctopusAssistant(query, currentLang, climate.context);
      let wolofAudioSrc = null;

      if (isWolof && botReply.text) {
        try {
          wolofAudioSrc = await synthesizeWolofText(botReply.text);
        } catch {
          setVoiceNotice("Réponse texte affichée (audio wolof indisponible).");
        }
      }

      setMessages(prev => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: botReply.text,
          timestamp: botReply.timestamp || nowLabel(),
          hasAudio: isWolof ? Boolean(wolofAudioSrc) : canSpeak,
          audioSrc: wolofAudioSrc
        }
      ]);

      if (isWolof) {
        if (wolofAudioSrc) playAudio(wolofAudioSrc);
      } else {
        speakText(botReply.text);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: 'bot',
          text: error?.message || "Désolé, l'assistant est momentanément indisponible. Réessayez dans un instant.",
          timestamp: nowLabel(),
          hasAudio: false
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };


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
            disabled={isListening || isRecordingWo}
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
                {canSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
                {canSpeak ? ' Réponse vocale' : ' Mode texte'}
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
                        {msg.hasAudio && (
                          <button 
                            type="button" 
                            className="web-btn-listen"
                            onClick={() => (msg.audioSrc ? playAudio(msg.audioSrc) : speakText(msg.text))}
                          >
                            <Volume2 size={13} />
                            <span>Écouter</span>
                          </button>
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

          {/* Barre audio simplifiée */}
          <div className={`web-waveform-box ${waveformActive ? 'active' : ''}`}>
            <span className="waveform-info-txt">
              {micActive
                ? (isWolof ? "Parlez maintenant... cliquez sur le micro pour envoyer" : "Je vous écoute...")
                : (isSpeaking || isPlayingAudio)
                  ? "Lecture vocale en cours..."
                  : isThinking
                    ? "L'assistant réfléchit..."
                    : micAvailable
                      ? "Cliquez sur le micro vert pour parler"
                      : "Saisie par clavier disponible"}
            </span>
            <div className="web-waveform-bars">
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
              <div className="web-wave-bar" />
            </div>
          </div>

          {(voiceNotice || !micAvailable) && (
            <p role="status" style={{ margin: '0 4px', fontSize: '0.82rem', color: '#b45309' }}>
              {voiceNotice || (isWolof
                ? "Micro Wolof indisponible sur cet appareil : écrivez votre question ci-dessous."
                : "Micro indisponible sur ce navigateur : écrivez votre question ci-dessous.")}
            </p>
          )}

          {/* Zone de saisie + Micro */}
          <div className="web-chat-input-section">
            <div className="web-input-bar">
              <button 
                type="button" 
                className={`web-btn-mic-toggle ${micActive ? 'listening' : ''}`}
                onClick={toggleListening}
                disabled={!micAvailable || (isThinking && !micActive)}
                title={micActive ? "Envoyer l'enregistrement" : "Parler au micro"}
              >
                {micActive ? <MicOff size={22} /> : <Mic size={22} />}
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
