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
  Leaf
} from 'lucide-react';
import { 
  ASSISTANT_LANGUAGES, 
  INITIAL_CHAT_MESSAGES, 
  SAMPLE_QUESTIONS 
} from '../data/mockData';
import { askOctopusAssistant } from '../services/octopusApi';

export default function VoiceAssistantScreen({ onAlertClick }) {
  const [currentLang, setCurrentLang] = useState('fr'); // 'fr' | 'wo' | 'en'
  const [messages, setMessages] = useState(INITIAL_CHAT_MESSAGES.fr);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [waveformActive, setWaveformActive] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);

  const chatBottomRef = useRef(null);

  // Synchronisation lors du changement de langue
  useEffect(() => {
    setMessages(INITIAL_CHAT_MESSAGES[currentLang] || INITIAL_CHAT_MESSAGES.fr);
  }, [currentLang]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, waveformActive]);

  // Synthèse vocale du navigateur si supportée
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Wolof n'a pas de voix TTS native standard dans les navigateurs, on fallback sur français avec accent
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

  // Reconnaissance vocale (Speech to text)
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback si l'API n'est pas supportée dans ce navigateur
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
        // Simulation gracieuse
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

  // Envoi d'une question simulée adaptée à la langue choisie
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

    // Réponse de l'Agent Octopus
    try {
      const botReply = await askOctopusAssistant(query, currentLang);
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
      // Jouer la synthèse vocale
      speakText(botReply.text);
    } catch {
      setWaveformActive(false);
    }
  };

  return (
    <div className="screen-scroll-body" id="voice-screen-container">
      {/* Flux de conversation */}
      <div className="chat-conversation-feed">
        {messages.map((msg) => (
          msg.sender === 'user' ? (
            <div key={msg.id} className="chat-bubble-user">
              {msg.text}
            </div>
          ) : (
            <div key={msg.id} className="chat-bubble-bot-row">
              <div className="bot-avatar-leaf">
                <Leaf size={16} />
              </div>
              <div className="chat-bubble-bot">
                {msg.text}
                {msg.hasAudio && (
                  <button 
                    type="button" 
                    onClick={() => speakText(msg.text)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      background: 'none', 
                      border: 'none', 
                      color: '#10875a', 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      cursor: 'pointer', 
                      marginTop: '6px' 
                    }}
                  >
                    <Volume2 size={13} />
                    <span>Écouter la réponse</span>
                  </button>
                )}
              </div>
            </div>
          )
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Visualisation audio Waveform (comme sur l'image) */}
      <div className={`waveform-container ${waveformActive || isListening || isSpeaking ? 'waveform-animating' : ''}`}>
        <div className="waveform-bar" />
        <div className="waveform-bar" />
        <div className="waveform-bar" />
        <div className="waveform-bar" />
        <div className="waveform-bar" />
        <div className="waveform-bar" />
        <div className="waveform-bar" />
      </div>

      {/* Grand Bouton Microphone tactile */}
      <div className="mic-action-container">
        <button 
          type="button" 
          className={`btn-mic-circle ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
          title={isListening ? "Écoute en cours..." : "Appuyer pour poser une question vocale"}
        >
          {isListening ? <MicOff size={28} /> : <Mic size={28} />}
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.76rem', color: '#64748b' }}>
        {isListening ? "Écoute de votre voix..." : "Touchez le micro pour parler ou posez une question"}
      </div>

      {/* Sélecteur de Langue (Français 🇫🇷, Wolof 🇸🇳, English 🇬🇧) */}
      <div className="languages-selector-row">
        {ASSISTANT_LANGUAGES.map((lang) => (
          <button 
            key={lang.code}
            type="button"
            className={`lang-pill-btn ${currentLang === lang.code ? 'active' : ''}`}
            onClick={() => setCurrentLang(lang.code)}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>

      {/* Questions suggérées en boutons rapides */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
          Questions fréquentes ({currentLang.toUpperCase()}) :
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(SAMPLE_QUESTIONS[currentLang] || SAMPLE_QUESTIONS.fr).slice(0, 2).map((q, i) => (
            <button 
              key={i}
              type="button"
              className="btn-pill-glass"
              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', fontSize: '0.72rem' }}
              onClick={() => sendMessage(q)}
            >
              💬 {q}
            </button>
          ))}
        </div>
      </div>

      {/* Carte Notification d'Alerte (comme sur le mockup) */}
      <div 
        className="alert-urgent-card"
        onClick={() => setShowAlertModal(true)}
        title="Voir l'alerte phytosanitaire d'urgence"
      >
        <div className="alert-icon-bell">
          <Bell size={16} />
        </div>
        <div className="alert-content-box">
          <div className="alert-title-row">
            <span className="alert-badge-label">Alerte</span>
            <ChevronRight size={14} color="#f43f5e" />
          </div>
          <p className="alert-text-body">
            La plante 2 nécessite un traitement fongicide. Intervention recommandée dans les 24h.
          </p>
          <span className="alert-time-tag">Aujourd'hui, 10:24</span>
        </div>
      </div>

      {/* Modal Détails Alerte */}
      {showAlertModal && (
        <div className="modal-backdrop" onClick={() => setShowAlertModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell color="#e11d48" />
                <h3 className="modal-title" style={{ color: '#9f1239' }}>Alerte Phytosanitaire Urgente</h3>
              </div>
              <button className="screen-app-btn-icon" onClick={() => setShowAlertModal(false)}>✕</button>
            </div>

            <div style={{ fontSize: '0.86rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p>
                <strong>Cible :</strong> Plante 2 (Aubergine) — Parcelle B1.
              </p>
              <p>
                <strong>Diagnostic Octopus :</strong> Foyers d'oïdium en phase de sporulation détectés sur la canopée basse. Taux d'humidité actuel de 82% favorisant la contamination des plants voisins.
              </p>
              <p>
                <strong>Plan d'intervention préconisé :</strong>
                <br />1. Éliminer les premières feuilles jaunies à la base.
                <br />2. Pulvériser un mélange d'eau, savon noir et bicarbonate de soude ou soufre mouillable.
                <br />3. Espacer les rangs pour favoriser la ventilation naturelle.
              </p>
            </div>

            <button 
              className="btn-primary-action" 
              style={{ background: '#be123c' }}
              onClick={() => setShowAlertModal(false)}
            >
              Marquer comme prise en compte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
