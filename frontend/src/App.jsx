import React, { useState } from 'react';
import { 
  Camera, 
  FolderHeart, 
  Mic, 
  Menu, 
  Leaf, 
  ArrowRight,
  Wifi, 
  BatteryMedium,
  CheckCircle2,
  Bell
} from 'lucide-react';
import Header from './components/Header';
import ScanScreen from './components/ScanScreen';
import PlantRecordsScreen from './components/PlantRecordsScreen';
import VoiceAssistantScreen from './components/VoiceAssistantScreen';
import FooterBanner from './components/FooterBanner';
import OctopusConfigModal from './components/OctopusConfigModal';
import { getOctopusConfig } from './services/octopusApi';

export default function App() {
  const [viewMode, setViewMode] = useState('triptych'); // 'triptych' | 'mobile' | 'full'
  const [activeMobileTab, setActiveMobileTab] = useState('scan'); // 'scan' | 'plants' | 'assistant'
  const [isOctopusModalOpen, setIsOctopusModalOpen] = useState(false);
  const [octopusConfig, setOctopusConfig] = useState(getOctopusConfig());

  // Rendu de l'écran interne selon l'onglet
  const renderScreenContent = (screenType) => {
    switch (screenType) {
      case 'scan':
        return (
          <ScanScreen 
            onNavigateToPlants={() => setActiveMobileTab('plants')}
            onNavigateToAssistant={() => setActiveMobileTab('assistant')}
          />
        );
      case 'plants':
        return (
          <PlantRecordsScreen 
            onSelectPlantForScan={() => setActiveMobileTab('scan')}
          />
        );
      case 'assistant':
        return (
          <VoiceAssistantScreen 
            onAlertClick={() => setActiveMobileTab('plants')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* En-tête global avec sélecteur de mode et configuration Octopus */}
      <Header 
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenOctopusConfig={() => setIsOctopusModalOpen(true)}
        isOctopusConnected={!octopusConfig.useMock && !!octopusConfig.baseUrl}
      />

      {/* Bannière Hero d'introduction (fidèle au mockup) */}
      <section className="hero-banner">
        <div className="hero-logo-large">
          <div className="brand-logo-icon" style={{ width: 48, height: 48 }}>
            <Leaf size={28} />
          </div>
          <h1>
            PhytoScan <span style={{ color: '#10b981' }}>AI</span>
          </h1>
        </div>
        <p className="hero-subtitle">
          Des plantes en meilleure santé, grâce à l'intelligence artificielle.
        </p>
      </section>

      {/* =========================================================================
          MODE 1 : Triptyque Vitrine (Les 3 écrans côte à côte comme sur l'affiche)
          ========================================================================= */}
      {viewMode === 'triptych' && (
        <main className="triptych-container">
          {/* Colonne 1 : Détection des maladies */}
          <div className="triptych-step-column">
            <div className="step-header-badge">
              <div className="step-number-circle">1</div>
              <div>
                <div className="step-info-title">Détection des maladies par l'IA</div>
                <div className="step-info-desc">Une analyse rapide et précise de l'état de vos plantes.</div>
              </div>
            </div>

            {/* Téléphone 1 */}
            <div className="phone-mockup-frame">
              <div className="phone-status-bar">
                <span>9:41</span>
                <div className="phone-dynamic-notch" />
                <div className="status-bar-icons">
                  <Wifi size={13} />
                  <BatteryMedium size={14} />
                </div>
              </div>

              <div className="screen-app-header">
                <button className="screen-app-btn-icon" title="Précédent">‹</button>
                <div className="screen-app-brand">
                  <Leaf size={18} color="#10b981" />
                  <span>PhytoScan AI</span>
                </div>
                <button className="screen-app-btn-icon" title="Menu">
                  <Menu size={18} />
                </button>
              </div>

              {renderScreenContent('scan')}
            </div>

            {/* Flèche d'enchaînement vers l'étape suivante */}
            <div className="arrow-divider" title="Étape suivante">
              <ArrowRight size={20} />
            </div>
          </div>

          {/* Colonne 2 : Dossier numérique */}
          <div className="triptych-step-column">
            <div className="step-header-badge">
              <div className="step-number-circle">2</div>
              <div>
                <div className="step-info-title">Dossier numérique des plantes</div>
                <div className="step-info-desc">Toutes les informations de vos plantes au même endroit.</div>
              </div>
            </div>

            {/* Téléphone 2 */}
            <div className="phone-mockup-frame">
              <div className="phone-status-bar">
                <span>9:41</span>
                <div className="phone-dynamic-notch" />
                <div className="status-bar-icons">
                  <Wifi size={13} />
                  <BatteryMedium size={14} />
                </div>
              </div>

              <div className="screen-app-header">
                <div className="screen-app-brand">
                  <Leaf size={18} color="#10b981" />
                  <span>PhytoScan AI</span>
                </div>
                <button className="screen-app-btn-icon" title="Menu">
                  <Menu size={18} />
                </button>
              </div>

              {renderScreenContent('plants')}
            </div>

            {/* Flèche d'enchaînement vers l'étape suivante */}
            <div className="arrow-divider" title="Étape suivante">
              <ArrowRight size={20} />
            </div>
          </div>

          {/* Colonne 3 : Assistant vocal & alertes */}
          <div className="triptych-step-column">
            <div className="step-header-badge">
              <div className="step-number-circle">3</div>
              <div>
                <div className="step-info-title">Assistant vocal et alertes</div>
                <div className="step-info-desc">Posez vos questions, recevez des réponses et ne manquez aucune intervention.</div>
              </div>
            </div>

            {/* Téléphone 3 */}
            <div className="phone-mockup-frame">
              <div className="phone-status-bar">
                <span>9:41</span>
                <div className="phone-dynamic-notch" />
                <div className="status-bar-icons">
                  <Wifi size={13} />
                  <BatteryMedium size={14} />
                </div>
              </div>

              <div className="screen-app-header">
                <div className="screen-app-brand">
                  <Leaf size={18} color="#10b981" />
                  <span>PhytoScan AI</span>
                </div>
                <button className="screen-app-btn-icon" title="Menu">
                  <Menu size={18} />
                </button>
              </div>

              {renderScreenContent('assistant')}
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          MODE 2 : Application Mobile Interactive (Smartphone unique avec navigation)
          ========================================================================= */}
      {viewMode === 'mobile' && (
        <main style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '14px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: 600 }}>
              Simulateur Mobile interactif : Naviguez avec les onglets en bas de l'écran.
            </span>
          </div>

          <div className="phone-mockup-frame" style={{ maxWidth: '410px' }}>
            {/* Status bar */}
            <div className="phone-status-bar">
              <span>9:41</span>
              <div className="phone-dynamic-notch" />
              <div className="status-bar-icons">
                <Wifi size={13} />
                <BatteryMedium size={14} />
              </div>
            </div>

            {/* Screen Header */}
            <div className="screen-app-header">
              <div className="screen-app-brand">
                <Leaf size={18} color="#10b981" />
                <span>PhytoScan AI</span>
              </div>
              <button 
                className="screen-app-btn-icon" 
                onClick={() => setIsOctopusModalOpen(true)}
                title="Configuration"
              >
                <Menu size={18} />
              </button>
            </div>

            {/* Contenu de l'onglet actif */}
            {renderScreenContent(activeMobileTab)}

            {/* Barre de navigation mobile inférieure (Bottom Navigation) */}
            <nav style={{ 
              display: 'flex', 
              background: '#ffffff', 
              borderTop: '1px solid #e2e8f0', 
              padding: '8px 12px 14px', 
              justifyContent: 'space-around',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.03)'
            }}>
              <button 
                type="button" 
                onClick={() => setActiveMobileTab('scan')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '3px',
                  cursor: 'pointer',
                  color: activeMobileTab === 'scan' ? '#10b981' : '#64748b',
                  fontWeight: activeMobileTab === 'scan' ? 700 : 500,
                  fontSize: '0.72rem'
                }}
              >
                <Camera size={20} />
                <span>Scan IA</span>
              </button>

              <button 
                type="button" 
                onClick={() => setActiveMobileTab('plants')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '3px',
                  cursor: 'pointer',
                  color: activeMobileTab === 'plants' ? '#10b981' : '#64748b',
                  fontWeight: activeMobileTab === 'plants' ? 700 : 500,
                  fontSize: '0.72rem'
                }}
              >
                <FolderHeart size={20} />
                <span>Mes Plantes</span>
              </button>

              <button 
                type="button" 
                onClick={() => setActiveMobileTab('assistant')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '3px',
                  cursor: 'pointer',
                  color: activeMobileTab === 'assistant' ? '#10b981' : '#64748b',
                  fontWeight: activeMobileTab === 'assistant' ? 700 : 500,
                  fontSize: '0.72rem'
                }}
              >
                <Mic size={20} />
                <span>Assistant Vocal</span>
              </button>
            </nav>
          </div>
        </main>
      )}

      {/* =========================================================================
          MODE 3 : Mode Plein Écran Web (Pour ordinateur et tablettes)
          ========================================================================= */}
      {viewMode === 'full' && (
        <main style={{ maxWidth: '1280px', margin: '0 auto 40px', padding: '0 20px', width: '100%' }}>
          {/* Navigation par onglets Web */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div className="view-mode-tabs" style={{ background: '#e2ece5' }}>
              <button 
                className={`mode-tab-btn ${activeMobileTab === 'scan' ? 'active' : ''}`}
                onClick={() => setActiveMobileTab('scan')}
              >
                <Camera size={16} />
                <span>1. Scan & Diagnostic IA</span>
              </button>
              <button 
                className={`mode-tab-btn ${activeMobileTab === 'plants' ? 'active' : ''}`}
                onClick={() => setActiveMobileTab('plants')}
              >
                <FolderHeart size={16} />
                <span>2. Dossier Numérique des Plantes</span>
              </button>
              <button 
                className={`mode-tab-btn ${activeMobileTab === 'assistant' ? 'active' : ''}`}
                onClick={() => setActiveMobileTab('assistant')}
              >
                <Mic size={16} />
                <span>3. Assistant Vocal & Alertes</span>
              </button>
            </div>
          </div>

          <div style={{ 
            background: '#ffffff', 
            borderRadius: '24px', 
            padding: '24px', 
            boxShadow: '0 10px 30px rgba(15, 56, 42, 0.08)',
            border: '1px solid #e2e8f0',
            maxWidth: '680px',
            margin: '0 auto'
          }}>
            {renderScreenContent(activeMobileTab)}
          </div>
        </main>
      )}

      {/* Bandeau de valeur au pied de page (comme sur le mockup) */}
      <FooterBanner />

      {/* Modal de Configuration Octopus */}
      <OctopusConfigModal 
        isOpen={isOctopusModalOpen}
        onClose={() => setIsOctopusModalOpen(false)}
        onConfigSaved={(newCfg) => setOctopusConfig(newCfg)}
      />
    </div>
  );
}
