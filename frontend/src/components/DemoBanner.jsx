// Mode démo : bandeau permanent + fenêtre d'invitation à créer un compte (affichée quand on tente d'enregistrer).

export function DemoBanner({ onRegister, onLogin }) {
  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        padding: '10px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', color: '#92400e',
        fontSize: '0.88rem'
      }}
    >
      <span>
        <strong>Mode démo</strong> : vous testez PhytoScan avec des cultures d'exemple.
        Vos analyses ne sont pas enregistrées.
      </span>
      <span style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="web-btn-primary" onClick={onRegister}>Créer mon compte</button>
        <button type="button" className="mode-tab-btn" style={{ border: '1px solid #cbd5e1' }} onClick={onLogin}>
          Se connecter
        </button>
      </span>
    </div>
  );
}

export function SignupPromptModal({ message, onRegister, onLogin, onClose }) {
  if (!message) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3 className="modal-title">Créez votre compte gratuit</h3>
          <button type="button" className="screen-app-btn-icon" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <p style={{ margin: '4px 0 16px', color: '#475569', fontSize: '0.92rem' }}>{message}</p>
        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.84rem' }}>
          Avec un compte, vos cultures, vos diagnostics et vos photos restent privés : vous seul les voyez.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="web-btn-primary" style={{ flex: 1 }} onClick={onRegister}>
            Créer mon compte
          </button>
          <button type="button" className="mode-tab-btn" style={{ border: '1px solid #cbd5e1' }} onClick={onLogin}>
            J'ai déjà un compte
          </button>
        </div>
      </div>
    </div>
  );
}
