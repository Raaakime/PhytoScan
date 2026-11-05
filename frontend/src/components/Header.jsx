import { Leaf, Camera, FolderHeart, Mic, Cpu, ChevronLeft, LogOut, LogIn, UserPlus } from 'lucide-react';
import { getProfileExtras } from '../services/profileExtras';

export default function Header({
  activeScreen,
  onNavigate,
  canGoBack,
  onGoBack,
  onOpenOctopusConfig,
  isOctopusConnected,
  alertCount = 0,
  currentUser = null,
  onLogout,
  onShowLogin,
  onShowRegister
}) {
  const displayName = currentUser?.fullName || currentUser?.email || 'Utilisateur';
  const extras = currentUser ? getProfileExtras(currentUser.email) : {};
  const subtitle = extras.farmName || extras.jobRole || currentUser?.email || '';
  const avatarColor = extras.avatarColor || '#10b981';

  return (
    <header className="web-navbar">
      <div className="web-navbar-container">
        {/* Logo */}
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

        {/* Navigation */}
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
            {alertCount > 0 && <span className="web-alert-pill">{alertCount}</span>}
          </button>
        </nav>

        {/* Actions */}
        <div className="web-navbar-actions">
          {canGoBack && (
            <button type="button" className="web-btn-back" onClick={onGoBack} title="Page précédente">
              <ChevronLeft size={17} />
              <span className="hdr-label">Précédent</span>
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
            <span>Octopus IA : {isOctopusConnected ? 'Connecté' : 'Simulation'}</span>
          </button>

          {currentUser ? (
            <div className="web-user-profile-badge" title={`${displayName}${subtitle ? ` (${subtitle})` : ''}`}>
              <div className="web-user-avatar" style={{ background: avatarColor }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="web-user-info-text">
                <span className="web-user-name">{displayName}</span>
                <span className="web-user-role">{subtitle}</span>
              </div>
              <button
                type="button"
                className="hdr-btn-logout"
                onClick={onLogout}
                title="Se déconnecter de PhytoScan"
              >
                <LogOut size={16} />
                <span className="hdr-label">Déconnexion</span>
              </button>
            </div>
          ) : (
            <div className="hdr-auth-buttons">
              <button type="button" className="hdr-btn-login" onClick={onShowLogin} title="Se connecter">
                <LogIn size={15} />
                <span className="hdr-label">Connexion</span>
              </button>
              <button type="button" className="hdr-btn-register" onClick={onShowRegister} title="Créer un compte">
                <UserPlus size={15} />
                <span className="hdr-label">Inscription</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}