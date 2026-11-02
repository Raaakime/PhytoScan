import React from 'react';
import { Leaf, Camera, FolderHeart, Mic, Cpu, ChevronLeft, Bell, PlusCircle } from 'lucide-react';

export default function Header({ 
  activeScreen, 
  onNavigate, 
  canGoBack, 
  onGoBack, 
  onOpenOctopusConfig, 
  isOctopusConnected,
  alertCount = 0
}) {
  return (
    <header className="web-navbar">
      <div className="web-navbar-container">
        {/* Brand & Logo */}
        <div className="web-brand-block" onClick={() => onNavigate('scan')} style={{ cursor: 'pointer' }}>
          <div className="web-brand-logo">
            <Leaf size={24} />
          </div>
          <div className="web-brand-text">
            <span className="web-brand-title">
              PhytoScan <span className="web-brand-highlight">AI</span>
            </span>
            <span className="web-brand-subtitle">
              Plateforme Intelligente de Diagnostic Phytosanitaire
            </span>
          </div>
        </div>

        {/* Liens de navigation du site web */}
        <nav className="web-nav-links" aria-label="Menu principal">
          <button 
            type="button" 
            className={`web-nav-item ${activeScreen === 'scan' ? 'active' : ''}`}
            onClick={() => onNavigate('scan')}
          >
            <Camera size={18} />
            <span>Diagnostic & Scan IA</span>
          </button>

          <button 
            type="button" 
            className={`web-nav-item ${activeScreen === 'plants' ? 'active' : ''}`}
            onClick={() => onNavigate('plants')}
          >
            <FolderHeart size={18} />
            <span>Dossier des Cultures</span>
          </button>

          <button 
            type="button" 
            className={`web-nav-item ${activeScreen === 'assistant' ? 'active' : ''}`}
            onClick={() => onNavigate('assistant')}
          >
            <Mic size={18} />
            <span>Assistant Vocal & Alertes</span>
            {alertCount > 0 && (
              <span className="web-alert-pill">
                {alertCount} alertes
              </span>
            )}
          </button>
        </nav>

        {/* Actions & Statut */}
        <div className="web-navbar-actions">
          {canGoBack && (
            <button 
              type="button" 
              className="web-btn-back"
              onClick={onGoBack}
              title="Retourner à la page précédente"
            >
              <ChevronLeft size={17} />
              <span>Précédent</span>
            </button>
          )}

          <button 
            type="button" 
            className="web-btn-octopus"
            onClick={onOpenOctopusConfig}
            title="Paramètres de l'Agent Octopus IA"
          >
            <span className="web-status-pulse" />
            <Cpu size={16} />
            <span>Octopus IA : {isOctopusConnected ? "Connecté" : "Simulation"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
