import React from 'react';
import { Leaf, Layers, Smartphone, Monitor, Cpu } from 'lucide-react';

export default function Header({ viewMode, setViewMode, onOpenOctopusConfig, isOctopusConnected }) {
  return (
    <header className="global-header">
      <div className="header-container">
        {/* Logo & Titre */}
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Leaf size={24} />
          </div>
          <div className="brand-info">
            <span className="brand-title">
              PhytoScan <span className="brand-title-ai">AI</span>
            </span>
            <span className="brand-tagline">
              Des plantes en meilleure santé, grâce à l'intelligence artificielle
            </span>
          </div>
        </div>

        {/* Sélecteur de mode de vue */}
        <div className="view-mode-tabs">
          <button 
            type="button" 
            className={`mode-tab-btn ${viewMode === 'triptych' ? 'active' : ''}`}
            onClick={() => setViewMode('triptych')}
            title="Aperçu des 3 écrans côte à côte comme sur le mockup"
          >
            <Layers size={15} />
            <span>Vue Vitrine (3 Écrans)</span>
          </button>
          <button 
            type="button" 
            className={`mode-tab-btn ${viewMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setViewMode('mobile')}
            title="Simulateur d'application mobile tactile"
          >
            <Smartphone size={15} />
            <span>App Mobile</span>
          </button>
          <button 
            type="button" 
            className={`mode-tab-btn ${viewMode === 'full' ? 'active' : ''}`}
            onClick={() => setViewMode('full')}
            title="Interface Web plein écran pour ordinateur et tablette"
          >
            <Monitor size={15} />
            <span>Plein Écran</span>
          </button>
        </div>

        {/* Statut Agent Octopus & Configuration */}
        <div className="header-actions">
          <button 
            type="button" 
            className="btn-octopus-status"
            onClick={onOpenOctopusConfig}
            title="Configurer la connexion à l'Agent IA Octopus"
          >
            <span className="status-dot-pulse" />
            <Cpu size={15} />
            <span>Agent Octopus IA : {isOctopusConnected ? "Prêt (Actif)" : "Simulation"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
