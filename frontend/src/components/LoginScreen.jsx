import { useState } from 'react';
import { 
  Leaf, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { loginUser } from '../services/authService';

export default function LoginScreen({ onNavigateToRegister, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }

    setLoading(true);
    const res = await loginUser(email, password, rememberMe);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(`Ravi de vous revoir, ${res.user.name} !`);
      if (onLoginSuccess) onLoginSuccess(res.user);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="web-page-container">
      <div className="auth-container-wrapper login-variant">
        {/* Colonne latérale informative */}
        <div className="auth-brand-sidebar">
          <div className="auth-sidebar-header">
            <div className="auth-logo-box">
              <Leaf size={28} />
            </div>
            <div>
              <h2 className="auth-sidebar-title">PhytoScan <span style={{ color: '#34d399' }}>AI</span></h2>
              <span className="auth-sidebar-tag">Plateforme Agronomique Intelligente</span>
            </div>
          </div>

          <div className="auth-sidebar-pitch">
            <h3>Retrouvez l'historique et la santé de vos cultures</h3>
            <p>
              Connectez-vous pour accéder à vos parcelles enregistrées, consulter les diagnostics de l'Agent IA Octopus et piloter vos soins agronomiques.
            </p>
          </div>

          <div className="auth-sidebar-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#34d399" />
              <span>Session sécurisée et chiffrement local</span>
            </div>
          </div>
        </div>

        {/* Formulaire de connexion */}
        <div className="auth-form-card">
          <div className="auth-form-header">
            <div className="auth-badge-pill">
              <KeyRound size={14} />
              <span>Espace Exploitant</span>
            </div>
            <h1 className="auth-title">Connexion à votre espace</h1>
            <p className="auth-subtitle">
              Saisissez vos identifiants pour accéder à vos diagnostics et dossiers.
            </p>
          </div>

          {error && (
            <div className="auth-alert-box danger">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert-box success">
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="auth-label">
                <span>Adresse email</span>
              </label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-field-icon" />
                <input 
                  type="email" 
                  className="auth-input"
                  placeholder="nom@exemple.sn"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="auth-label">
                  <span>Mot de passe</span>
                </label>
                <button 
                  type="button" 
                  className="auth-forgot-link"
                  onClick={() => alert("Pour ce prototype local, utilisez le bouton 'Connexion en 1 clic au compte Démo' ou réinitialisez votre session.")}
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-field-icon" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="auth-input"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  required
                />
                <button 
                  type="button" 
                  className="auth-btn-eye"
                  onClick={() => setShowPassword(p => !p)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-checkbox-row">
              <input 
                type="checkbox" 
                id="remember"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember">
                Se souvenir de moi sur cet appareil
              </label>
            </div>

            <button 
              type="submit" 
              className="web-btn-primary auth-submit-btn"
              disabled={loading}
            >
              <span>{loading ? 'Connexion en cours...' : 'Se connecter à mon compte'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-footer-prompt">
            <span>Vous n'avez pas encore de compte ?</span>
            <button 
              type="button" 
              className="auth-link-btn"
              onClick={onNavigateToRegister}
            >
              Inscrivez-vous gratuitement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

