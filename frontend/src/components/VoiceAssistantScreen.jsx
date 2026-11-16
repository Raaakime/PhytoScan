import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Bell, 
  ChevronRight, 
  Sparkles, 
  Leaf,
  Camera,
  FolderHeart,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  HelpCircle
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
  const [voiceNotice, setVoiceNotice] = useState('');
  const climate = useClimateRisks(plants);
  

  // Voix gratuite du navigateur (fr / en). Le wolof n'est pas pris en charge : saisie écrite uniquement.
  const {
    listening: isListening, speaking: isSpeaking,
    start: startListening, stop: stopListening, speak, stopSpeaking,
    canListen, canSpeak
  } = useBrowserVoice({
    language: currentLang,
    onFinalText: (text) => sendMessage(text),
    onError: setVoiceNotice
  });

  // Wolof : le navigateur ne le comprend pas, on enregistre la voix et le serveur la traite (modèles hébergés chez nous)
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
  const micAvailable = isWolof ? (wolofVoice.enabled && canRecordWo) : canListen;
  const micActive = isWolof ? isRecordingWo : isListening;
  const waveformActive = isListening || isSpeaking || isThinking || isRecordingWo || isPlayingAudio;

  const chatBottomRef = useRef(null);

  useEffect(() => {
    setMessages(INITIAL_CHAT_MESSAGES[currentLang] || INITIAL_CHAT_MESSAGES.fr);
    setVoiceNotice('');
    stopSpeaking();
    stopAudio();
  }, [currentLang]);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      sendMessage(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, waveformActive]);

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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

 

    try {
 

      const botReply = await askOctopusAssistant(query, currentLang, climate.context);
      setMessages(prev => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: botReply.text,
          timestamp: botReply.timestamp,
          hasAudio: canSpeak
        }
      ]);
      speakText(botReply.text);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: 'bot',
          text: error?.message || "Désolé, l'assistant est momentanément indisponible. Réessayez dans un instant.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasAudio: false
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Nombre d'alertes affiché dans le badge (2 = valeur historique des données statiques)
  const alertTotal = alerts ? alerts.length : 2;

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
            Échangez par la voix ou par écrit avec l'IA experte en pathologie végétale. Disponible en Français, Wolof et Anglais avec synthèse vocale.
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
                <span className="chat-bot-status">● Modèle connecté (PhytoScan Knowledge Base)</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="audio-voice-badge">
                {canSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
                {canSpeak ? ' Voix active' : ' Lecture vocale indisponible'}
              </span>
            </div>
          </div>

          {/* Flux de discussion défilant */}
          <div className="web-chat-feed">
            {messages.map((msg) => (
              msg.sender === 'user' ?    (
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
          <div className={`web-waveform-box ${waveformActive ? 'active' : ''}`}>
            <span className="waveform-info-txt">
              {micActive ? (isWolof ? "Enregistrement en cours... appuyez de nouveau pour envoyer" : "Écoute de votre voix en cours...") : (isSpeaking || isPlayingAudio) ? "Lecture de la réponse en cours..." : isThinking ? (isWolof ? "Traitement de votre voix en cours (cela peut prendre quelques secondes)..." : "Réflexion en cours...") : micAvailable ? "Microphone prêt" : "Microphone indisponible"}
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

          {(voiceNotice || !micAvailable) && (
            <p role="status" style={{ margin: '8px 16px 0', fontSize: '0.82rem', color: '#b45309' }}>
              {voiceNotice || (isWolof
                ? (wolofVoice.enabled
                    ? "L'enregistrement audio n'est pas disponible sur ce navigateur : écrivez votre question ci-dessous."
                    : "La voix en wolof n'est pas activée sur ce serveur : écrivez votre question ci-dessous.")
                : "La reconnaissance vocale n'est pas disponible sur ce navigateur (essayez Chrome ou Edge) : utilisez la saisie écrite.")}
            </p>
          )}

          {/* Barre d'interaction micro + texte */}
          <div className="web-chat-input-section">
            <div className="web-input-bar">
              <button 
                type="button" 
                className={`web-btn-mic-toggle ${micActive ? 'listening' : ''}`}
                onClick={toggleListening}
                disabled={!micAvailable || (isThinking && !micActive)}
                title={!micAvailable ? "Voix indisponible pour cette langue ou ce navigateur" : micActive ? (isWolof ? "Arrêter et envoyer" : "Arrêter l'écoute") : "Poser une question vocale"}
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
                  placeholder="Posez une question sur vos cultures, maladies, traitements bio..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />

                <button 
                  type="submit" 
                  className="web-btn-send-message"
                  disabled={!inputText.trim()}
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
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            COLONNE DROITE : TOUR DE CONTRÔLE DES ALERTES
            ========================================================= */}
        <div className="web-assistant-sidebar">
          {/* Centre des alertes phytosanitaires */}
          <div className="web-card web-alerts-card">
            <div className="alerts-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} color="#e11d48" />
                <h3 style={{ margin: 0 }}>Alertes Phytosanitaires en direct</h3>
              </div>
              <span className="urgent-badge-pill">{alertTotal} {alertTotal > 1 ? 'alertes actives' : 'alerte active'}</span>
            </div>

                       <div className="alerts-list">
              {alerts ? (
                <>
                  {alerts.length === 0 && (
                    <p className="alert-item-desc">Aucune alerte active : toutes vos cultures sont saines.</p>
                  )}
                  {alerts.map((a) => (
                    <div key={a.id} className={`web-alert-item ${a.level}`}>
                      <div className="alert-item-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {a.level === 'danger'
                            ? <ShieldAlert size={16} color="#e11d48" />
                            : <AlertTriangle size={16} color="#d97706" />}
                          <strong>{a.title}</strong>
                        </div>
                        <span className="alert-time">{a.date}</span>
                      </div>
                      <p className="alert-item-desc">{a.description}</p>
                      <div className="alert-item-actions">
                        <button
                          type="button"
                          className="web-alert-btn-action primary"
                          onClick={() => onNavigateToPlants && onNavigateToPlants({ plantId: a.plant.id })}
                        >
                          <FolderHeart size={14} />
                          <span>Consulter le dossier de la plante</span>
                        </button>
                        <button
                          type="button"
                          className="web-alert-btn-action secondary"
                          onClick={() => onNavigateToScan && onNavigateToScan({
                            targetPlant: {
                              id: a.plant.id,
                              name: a.plant.name,
                              species: (a.plant.species || '').split('(')[0].trim(),
                              plot: (a.plant.plot || '').split(' - ')[0].trim()
                            }
                          })}
                        >
                          <Camera size={14} />
                          <span>Faire un scan de contrôle</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {/* Alerte 1 : Plante 2 / Oïdium (exemple statique) */}
                  <div className="web-alert-item danger">
                    <div className="alert-item-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldAlert size={16} color="#e11d48" />
                        <strong>Plante 2 (Aubergine) — Parcelle B1</strong>
                      </div>
                      <span className="alert-time">Aujourd'hui, 10:24</span>
                    </div>
                    <p className="alert-item-desc">
                      Présence d'oïdium sur la canopée basse. Risque élevé de propagation sous l'effet de l'humidité relative (82%). Traitement fongicide recommandé sous 24h.
                    </p>
                    <div className="alert-item-actions">
                      <button
                        type="button"
                        className="web-alert-btn-action primary"
                        onClick={() => onNavigateToPlants && onNavigateToPlants({ plantId: 'P-002' })}
                      >
                        <FolderHeart size={14} />
                        <span>Consulter le dossier de la plante</span>
                      </button>
                      <button
                        type="button"
                        className="web-alert-btn-action secondary"
                        onClick={() => onNavigateToScan && onNavigateToScan({ targetPlant: { id: 'P-002', name: 'Plante 2', species: 'Aubergine', plot: 'Parcelle B1' } })}
                      >
                        <Camera size={14} />
                        <span>Faire un scan de contrôle</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Météo réelle (Open-Meteo) : affichée dans tous les cas */}
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
