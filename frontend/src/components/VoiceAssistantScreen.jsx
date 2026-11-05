import React, { useState, useEffect, useRef } from 'react';
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
import { askOctopusAssistant } from '../services/octopusApi';

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [waveformActive, setWaveformActive] = useState(false);

  const chatBottomRef = useRef(null);

  // Plantes ayant une alerte active ou un état non sain ('malade' ou 'surveiller')
  const activePlantAlerts = (plants || []).filter(
    (plant) => plant.status !== 'saine' || Boolean(plant.alert)
  );

  useEffect(() => {
    setMessages(INITIAL_CHAT_MESSAGES[currentLang] || INITIAL_CHAT_MESSAGES.fr);
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

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
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
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      handleSendSimulatedVoice();
      return;
    }

    if (isListening) {
      setIsListening(false);
      setWaveformActive(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentLang === 'en' ? 'en-US' : currentLang === 'wo' ? 'wo-SN' : 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setWaveformActive(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setWaveformActive(false);
        sendMessage(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setWaveformActive(false);
        handleSendSimulatedVoice();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      handleSendSimulatedVoice();
    }
  };

  const handleSendSimulatedVoice = () => {
    setIsListening(true);
    setWaveformActive(true);

    setTimeout(() => {
      setIsListening(false);
      const sampleList = SAMPLE_QUESTIONS[currentLang] || SAMPLE_QUESTIONS.fr;
      const randomQuery = sampleList[Math.floor(Math.random() * sampleList.length)];
      sendMessage(randomQuery);
    }, 1200);
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
    setWaveformActive(true);

    try {
      const botReply = await askOctopusAssistant(query, currentLang, { plants });
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
    } catch {
      setWaveformActive(false);
    }
  };

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
                <span className="chat-bot-status">● Modèle connecté (Octopus Knowledge Base)</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="audio-voice-badge">
                <Volume2 size={14} /> Voix active
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
          <div className={`web-waveform-box ${waveformActive || isListening || isSpeaking ? 'active' : ''}`}>
            <span className="waveform-info-txt">
              {isListening ? "Écoute de votre voix en cours..." : isSpeaking ? "Lecture de la réponse en cours..." : "Microphone prêt"}
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
              <button 
                type="button" 
                className={`web-btn-mic-toggle ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
                title={isListening ? "Arrêter l'écoute" : "Poser une question vocale"}
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
                            {plant.name} ({plant.species.split(' (')[0]}) — {plant.plot}
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
