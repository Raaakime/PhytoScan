import { Leaf, Camera, FolderHeart, Mic, Cpu, ChevronLeft, LogIn, LogOut, User } from 'lucide-react';

export default function Header({ 
  activeScreen, 
  onNavigate, 
  canGoBack, 
  onGoBack, 
  onOpenOctopusConfig, 
  isOctopusConnected,
  alertCount = 0,
  currentUser = null,
  onLogout
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

          {/* Section Authentification Utilisateur */}
          {currentUser ? (
            <div className="web-user-profile-badge" title={`Exploitant : ${currentUser.name} (${currentUser.farmName || currentUser.role})`}>
              <div className="web-user-avatar" style={{ background: currentUser.avatarColor || '#10b981' }}>
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="web-user-info-text">
                <span className="web-user-name">{currentUser.name}</span>
                <span className="web-user-role">{currentUser.farmName || currentUser.role}</span>
              </div>
              <button 
                type="button" 
                className="web-btn-logout-icon"
                onClick={onLogout}
                title="Se déconnecter de PhytoScan"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="web-auth-nav-buttons">
              <button 
                type="button" 
                className={`web-btn-auth-link ${activeScreen === 'login' ? 'active' : ''}`}
                onClick={() => onNavigate('login')}
              >
                <LogIn size={15} />
                <span>Connexion</span>
              </button>
              <button 
                type="button" 
                className={`web-btn-auth-register ${activeScreen === 'register' ? 'active' : ''}`}
                onClick={() => onNavigate('register')}
              >
                <User size={15} />
                <span>Inscription</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
