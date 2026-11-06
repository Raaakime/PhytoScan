import { useState } from 'react';
import { 
  Leaf, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Sprout
} from 'lucide-react';
import { registerUser } from '../services/authService';

export default function RegisterScreen({ onNavigateToLogin, onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    farmName: '',
    role: 'Maraîcher / Exploitant Agricole',
    password: '',
    confirmPassword: '',
    acceptTerms: true
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Veuillez renseigner votre nom complet.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Veuillez renseigner une adresse email valide.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!formData.acceptTerms) {
      setError('Veuillez accepter les conditions d\'utilisation.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const res = registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        farmName: formData.farmName,
        role: formData.role
      });

      setLoading(false);

      if (res.success) {
        setSuccessMsg('Compte créé avec succès ! Connexion automatique...');
        setTimeout(() => {
          if (onRegisterSuccess) onRegisterSuccess(res.user);
        }, 800);
      } else {
        setError(res.message);
      }
    }, 500);
  };

  return (
    <div className="web-page-container">
      <div className="auth-container-wrapper">
        {/* Colonne latérale informative / Avantages agronomiques */}
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
            <h3>Prenez soin de vos cultures avec la vision par ordinateur</h3>
            <p>
              Rejoignez les exploitants agricoles, maraîchers et techniciens qui optimisent leurs rendements et protègent leurs récoltes des bio-agresseurs.
            </p>
          </div>

          <div className="auth-benefits-list">
            <div className="benefit-item">
              <div className="benefit-icon">
                <CheckCircle2 size={18} color="#34d399" />
              </div>
              <div>
                <strong>Diagnostic instantané par IA</strong>
                <p>Détection précoce du Cercospora, mildiou, oïdium et carences foliaires en 1,2 seconde.</p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <CheckCircle2 size={18} color="#34d399" />
              </div>
              <div>
                <strong>Carnet de santé de vos parcelles</strong>
                <p>Suivi phénologique continu, historique des observations et rappels de soins personnalisés.</p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <CheckCircle2 size={18} color="#34d399" />
              </div>
              <div>
                <strong>Assistant vocal multilingue</strong>
                <p>Posez vos questions agronomiques à la voix en Français, Wolof et Anglais.</p>
              </div>
            </div>
          </div>

          <div className="auth-sidebar-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#34d399" />
              <span>Souveraineté des données agricoles garantie</span>
            </div>
          </div>
        </div>

        {/* Formulaire d'inscription */}
        <div className="auth-form-card">
          <div className="auth-form-header">
            <div className="auth-badge-pill">
              <Sprout size={14} />
              <span>Inscription Gratuite</span>
            </div>
            <h1 className="auth-title">Créer votre compte PhytoScan</h1>
            <p className="auth-subtitle">
              Commencez à surveiller l'état sanitaire de vos cultures dès aujourd'hui.
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
                <span>Nom complet *</span>
              </label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-field-icon" />
                <input 
                  type="text" 
                  className="auth-input"
                  placeholder="Ex : Fatou Sow / Moussa Ndiaye"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="auth-label">
                <span>Adresse email *</span>
              </label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-field-icon" />
                <input 
                  type="email" 
                  className="auth-input"
                  placeholder="nom@exemple.sn"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-row-2col">
              <div className="form-group">
                <label className="auth-label">
                  <span>Nom de l'exploitation (Optionnel)</span>
                </label>
                <div className="auth-input-wrapper">
                  <Building2 size={18} className="auth-field-icon" />
                  <input 
                    type="text" 
                    className="auth-input"
                    placeholder="Ex : Ferme des Niayes"
                    value={formData.farmName}
                    onChange={e => handleChange('farmName', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="auth-label">
                  <span>Profil d'activité</span>
                </label>
                <select 
                  className="auth-select"
                  value={formData.role}
                  onChange={e => handleChange('role', e.target.value)}
                >
                  <option value="Maraîcher / Exploitant Agricole">Maraîcher / Exploitant</option>
                  <option value="Ingénieur / Conseiller Agronome">Ingénieur / Conseiller</option>
                  <option value="Technicien de culture">Technicien de culture</option>
                  <option value="Chercheur / Enseignant">Chercheur / Enseignant</option>
                  <option value="Particulier / Jardinier passionné">Particulier / Jardinier</option>
                </select>
              </div>
            </div>

            <div className="auth-row-2col">
              <div className="form-group">
                <label className="auth-label">
                  <span>Mot de passe *</span>
                </label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-field-icon" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="auth-input"
                    placeholder="Au moins 6 caractères"
                    value={formData.password}
                    onChange={e => handleChange('password', e.target.value)}
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

              <div className="form-group">
                <label className="auth-label">
                  <span>Confirmer le mot de passe *</span>
                </label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-field-icon" />
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    className="auth-input"
                    placeholder="Répétez le mot de passe"
                    value={formData.confirmPassword}
                    onChange={e => handleChange('confirmPassword', e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="auth-btn-eye"
                    onClick={() => setShowConfirmPassword(p => !p)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="auth-checkbox-row">
              <input 
                type="checkbox" 
                id="terms"
                checked={formData.acceptTerms}
                onChange={e => handleChange('acceptTerms', e.target.checked)}
              />
              <label htmlFor="terms">
                J'accepte les conditions générales d'utilisation et la politique de respect des données agronomiques de PhytoScan AI.
              </label>
            </div>

            <button 
              type="submit" 
              className="web-btn-primary auth-submit-btn"
              disabled={loading}
            >
              <span>{loading ? 'Création du compte en cours...' : 'Finaliser mon inscription'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-footer-prompt">
            <span>Vous avez déjà un compte ?</span>
            <button 
              type="button" 
              className="auth-link-btn"
              onClick={onNavigateToLogin}
            >
              Connectez-vous ici
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

