import { useState } from 'react';
import { Cpu, Check, AlertCircle, Save, RefreshCw } from 'lucide-react';
import { getOctopusConfig, saveOctopusConfig } from '../services/octopusApi';
import { apiRequest } from '../services/apiClient';

export default function OctopusConfigModal({ isOpen, onClose, onConfigSaved }) {
  const [config, setConfig] = useState(getOctopusConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    saveOctopusConfig(config);
    if (onConfigSaved) onConfigSaved(config);
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    if (config.useMock) {
      setTimeout(() => {
        setTesting(false);
        setTestResult({
          success: true,
          message: "Mode simulation intelligent actif : le moteur IA local Octopus répond parfaitement."
        });
      }, 700);
      return;
    }

    try {
      await apiRequest('/health', {}, config.baseUrl);
      setTestResult({
        success: true,
        message: "Connexion réussie avec le backend PhytoScan !"
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: `Impossible de joindre le serveur à l'adresse indiquée (${err.message}). Vérifiez que votre backend Octopus est lancé.`
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu color="#10b981" />
            <h3 className="modal-title">Configuration Agent Octopus IA</h3>
          </div>
          <button className="screen-app-btn-icon" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: '0.84rem', color: '#64748b' }}>
          Connectez l'interface web directement à votre modèle d'IA entraîné avec Octopus pour le diagnostic en temps réel des maladies foliaires.
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Mode d'exécution de l'IA</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="useMock" 
                  checked={config.useMock} 
                  onChange={() => setConfig({ ...config, useMock: true })}
                />
                <strong>Simulation intelligente (Données locales complètes)</strong>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="useMock" 
                  checked={!config.useMock} 
                  onChange={() => setConfig({ ...config, useMock: false })}
                />
                <strong>API Backend Octopus Live</strong>
              </label>
            </div>
          </div>

          {!config.useMock && (
            <>
              <div className="form-group">
                <label className="form-label">URL de l'API Octopus</label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="http://localhost:8000/api/v1"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  required={!config.useMock}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Identifiant du modèle</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="octopus-vision-v2"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                />
              </div>
            </>
          )}

          {/* Bouton de test */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="mode-tab-btn"
              style={{ border: '1px solid #cbd5e1', padding: '8px 14px' }}
              onClick={handleTestConnection}
              disabled={testing}
            >
              <RefreshCw size={14} className={testing ? "progress-spinner" : ""} />
              <span>Tester la connectivité</span>
            </button>
          </div>

          {testResult && (
            <div style={{ 
              padding: '10px 12px', 
              borderRadius: '8px', 
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: testResult.success ? '#d1fae5' : '#fee2e2',
              color: testResult.success ? '#065f46' : '#991b1b',
              border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`
            }}>
              {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="submit" className="btn-primary-action" style={{ flex: 1 }}>
              <Save size={16} />
              <span>Enregistrer la configuration</span>
            </button>
            <button 
              type="button" 
              className="mode-tab-btn" 
              style={{ border: '1px solid #cbd5e1' }}
              onClick={onClose}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
