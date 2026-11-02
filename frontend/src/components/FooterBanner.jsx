import React from 'react';
import { Cpu, Leaf, Mic, ShieldCheck, Heart, Sparkles, ExternalLink } from 'lucide-react';

export default function FooterBanner({ onNavigate }) {
  return (
    <footer className="web-footer">
      <div className="web-footer-container">
        {/* Grille des piliers technologiques */}
        <div className="web-footer-features-grid">
          <div 
            className="footer-feature-box" 
            onClick={() => onNavigate && onNavigate('scan')}
            style={{ cursor: onNavigate ? 'pointer' : 'default' }}
          >
            <div className="footer-feature-icon">
              <Cpu size={24} />
            </div>
            <div>
              <h4 className="footer-feature-title">Vision IA & Réseaux de Neurones</h4>
              <p className="footer-feature-desc">
                Détection instantanée et identification précise des symptômes cryptogamiques et bactériens.
              </p>
            </div>
          </div>

          <div 
            className="footer-feature-box" 
            onClick={() => onNavigate && onNavigate('plants')}
            style={{ cursor: onNavigate ? 'pointer' : 'default' }}
          >
            <div className="footer-feature-icon">
              <Leaf size={24} />
            </div>
            <div>
              <h4 className="footer-feature-title">Carnet de Santé Agronomique</h4>
              <p className="footer-feature-desc">
                Suivi complet du cycle végétatif, historique des analyses et planification des soins sur le terrain.
              </p>
            </div>
          </div>

          <div 
            className="footer-feature-box" 
            onClick={() => onNavigate && onNavigate('assistant')}
            style={{ cursor: onNavigate ? 'pointer' : 'default' }}
          >
            <div className="footer-feature-icon">
              <Mic size={24} />
            </div>
            <div>
              <h4 className="footer-feature-title">Conseiller Vocal Multilingue</h4>
              <p className="footer-feature-desc">
                Assistance agronomique en temps réel en Français, Wolof et Anglais avec synthèse vocale.
              </p>
            </div>
          </div>
        </div>

        {/* Section liens et description */}
        <div className="web-footer-bottom-row">
          <div className="web-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="brand-logo-icon" style={{ width: 32, height: 32 }}>
                <Leaf size={18} />
              </div>
              <strong style={{ fontSize: '1.2rem', color: '#0f382a' }}>PhytoScan AI</strong>
            </div>
            <p className="web-footer-tagline">
              Des plantes en meilleure santé, grâce à l'intelligence artificielle agronomique.
            </p>
          </div>

          <div className="web-footer-links">
            <button type="button" onClick={() => onNavigate && onNavigate('scan')}>Diagnostic & Scan IA</button>
            <button type="button" onClick={() => onNavigate && onNavigate('plants')}>Dossier des Cultures</button>
            <button type="button" onClick={() => onNavigate && onNavigate('assistant')}>Assistant Vocal & Alertes</button>
          </div>
        </div>

        {/* Copyright */}
        <div className="web-footer-copyright">
          <span>© 2026 PhytoScan AI. Plateforme Web d'Aide à la Décision Phytosanitaire.</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Données agricoles et souveraineté préservées.</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
