import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import ScanScreen from './components/ScanScreen';
import PlantRecordsScreen from './components/PlantRecordsScreen';
import VoiceAssistantScreen from './components/VoiceAssistantScreen';
import FooterBanner from './components/FooterBanner';
import OctopusConfigModal from './components/OctopusConfigModal';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import { getOctopusConfig } from './services/octopusApi';
import { INITIAL_PLANTS } from './data/mockData';
import { isLiveMode, fetchPlants, createPlant, saveDiagnostic } from './services/phytoscanApi';
import { buildAlerts } from './utils/alerts';
import { getCurrentUser, SESSION_EVENT, checkAuthRequired, logout } from './services/authService';

export default function App() {
  // ---------------------------------------------------------------- États
  const [authRequired, setAuthRequired] = useState(null); // null = vérification en cours
  const [authView, setAuthView] = useState('login');      // 'login' | 'register'
  const [showAuth, setShowAuth] = useState(false);        // ouvre connexion/inscription quand elle est facultative
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  const [activeScreen, setActiveScreen] = useState('scan');
  const [navigationHistory, setNavigationHistory] = useState(['scan']);
  const [navigationParams, setNavigationParams] = useState({});
  const [plantsList, setPlantsList] = useState(INITIAL_PLANTS);
  const [isOctopusModalOpen, setIsOctopusModalOpen] = useState(false);
  const [octopusConfig, setOctopusConfig] = useState(getOctopusConfig());
  const [apiError, setApiError] = useState(null);

  // ---------------------------------------------------------------- Effets
  useEffect(() => {
    checkAuthRequired()
      .then(setAuthRequired)
      .catch(() => setAuthRequired(false));
  }, [octopusConfig]);

  useEffect(() => {
    const sync = () => setCurrentUser(getCurrentUser());
    window.addEventListener(SESSION_EVENT, sync);
    return () => window.removeEventListener(SESSION_EVENT, sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isLiveMode()) {
      setPlantsList(INITIAL_PLANTS);
      setApiError(null);
      return undefined;
    }
    fetchPlants()
      .then((list) => { if (!cancelled) { setPlantsList(list); setApiError(null); } })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Chargement des plantes impossible :', err.message);
          setPlantsList(INITIAL_PLANTS);
          setApiError(err.message);
        }
      });
    return () => { cancelled = true; };
  }, [octopusConfig, currentUser]);

  const alerts = useMemo(() => buildAlerts(plantsList), [plantsList]);

  // ---------------------------------------------------------------- Navigation
  const navigateTo = (screen, params = {}) => {
    setNavigationParams(params);
    setNavigationHistory((prev) => [...prev, screen]);
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop();
      const previousScreen = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setActiveScreen(previousScreen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openLogin = () => { setAuthView('login'); setShowAuth(true); };
  const openRegister = () => { setAuthView('register'); setShowAuth(true); };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setShowAuth(false);
  };

  // ---------------------------------------------------------------- Données
  const saveDiagnosticLocally = ({ plantId, diseaseName, confidence, date }) => {
    setPlantsList((prevPlants) =>
      prevPlants.map((plant) => {
        if (plant.id === plantId) {
          const newHistoryItem = {
            date: date || new Date().toLocaleDateString('fr-FR'),
            type: 'Diagnostic IA',
            result: `${diseaseName} (${confidence})`,
            notes: 'Diagnostic automatique enregistré via la vision par ordinateur.'
          };
          const isHealthy = diseaseName.toLowerCase().includes('sain');
          return {
            ...plant,
            status: isHealthy ? 'saine' : 'malade',
            statusLabel: isHealthy ? 'Saine' : 'Maladie détectée',
            healthScore: isHealthy ? 98 : 45,
            lastObservation: date || new Date().toLocaleDateString('fr-FR'),
            history: [newHistoryItem, ...(plant.history || [])]
          };
        }
        return plant;
      })
    );
  };

  const handleSaveDiagnosticToPlant = async (payload) => {
    if (isLiveMode()) {
      try {
        const updated = await saveDiagnostic(payload.plantId, {
          diseaseName: payload.diseaseName,
          confidence: payload.confidence,
          date: payload.date
        });
        setPlantsList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        return;
      } catch (err) {
        console.warn('Enregistrement du diagnostic impossible côté serveur :', err.message);
        setApiError(err.message);
      }
    }
    saveDiagnosticLocally(payload);
  };

  const handleCreatePlant = async (data) => {
    const created = await createPlant(data);
    setPlantsList((prev) => [created, ...prev]);
    return created;
  };

  // ---------------------------------------------------------------- Rendu de la page active
  const renderCurrentScreen = () => {
    switch (activeScreen) {
      case 'scan':
        return (
          <ScanScreen
            onNavigateToPlants={(params) => navigateTo('plants', params)}
            onNavigateToAssistant={(params) => navigateTo('assistant', params)}
            targetPlant={navigationParams?.targetPlant}
            onClearTargetPlant={() => setNavigationParams((prev) => ({ ...prev, targetPlant: null }))}
            onSaveDiagnosticToPlant={handleSaveDiagnosticToPlant}
          />
        );
      case 'plants':
        return (
          <PlantRecordsScreen
            plants={plantsList}
            onUpdatePlants={(updated) => setPlantsList(updated)}
            onCreatePlant={isLiveMode() ? handleCreatePlant : undefined}
            initialPlantId={navigationParams?.plantId || 'P-001'}
            onNavigateToScan={(params) => navigateTo('scan', params)}
            onNavigateToAssistant={(params) => navigateTo('assistant', params)}
          />
        );
      case 'assistant':
        return (
          <VoiceAssistantScreen
            initialQuery={navigationParams?.initialQuery || ''}
            alerts={alerts}
            onClearInitialQuery={() => setNavigationParams((prev) => ({ ...prev, initialQuery: '' }))}
            onNavigateToScan={(params) => navigateTo('scan', params)}
            onNavigateToPlants={(params) => navigateTo('plants', params)}
            onOpenOctopusConfig={() => setIsOctopusModalOpen(true)}
          />
        );
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------- Écrans de connexion / inscription
  if (authRequired === null) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement…</div>;
  }

  // Obligatoire (AUTH_REQUIRED=true) ou demandée par l'utilisateur (option B)
  if ((authRequired || showAuth) && !currentUser) {
    return (
      <>
        {!authRequired && (
          <div style={{ padding: '12px 20px' }}>
            <button
              type="button"
              onClick={() => setShowAuth(false)}
              style={{ cursor: 'pointer', border: 'none', background: 'none', color: '#059669', fontWeight: 600 }}
            >
              ← Continuer sans compte
            </button>
          </div>
        )}
        {authView === 'login' ? (
          <LoginScreen
            onNavigateToRegister={() => setAuthView('register')}
            onLoginSuccess={handleAuthSuccess}
          />
        ) : (
          <RegisterScreen
            onNavigateToLogin={() => setAuthView('login')}
            onRegisterSuccess={handleAuthSuccess}
          />
        )}
      </>
    );
  }

  // ---------------------------------------------------------------- Application
  return (
    <div className="website-root">
      <Header
        activeScreen={activeScreen}
        onNavigate={(screen) => navigateTo(screen)}
        canGoBack={navigationHistory.length > 1}
        onGoBack={goBack}
        onOpenOctopusConfig={() => setIsOctopusModalOpen(true)}
        isOctopusConnected={!octopusConfig.useMock && !!octopusConfig.baseUrl}
        alertCount={alerts.length}
        currentUser={currentUser}
        onLogout={logout}
        onShowLogin={openLogin}
        onShowRegister={openRegister}
      />

      <main className="website-main-content">
        {apiError && (
          <div
            style={{
              margin: '12px auto', maxWidth: '1100px', padding: '10px 14px', borderRadius: '8px',
              background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.85rem'
            }}
          >
            Serveur PhytoScan injoignable ou erreur ({apiError}). Les données affichées peuvent être locales (démonstration).
          </div>
        )}
        {renderCurrentScreen()}
      </main>

      <FooterBanner onNavigate={(screen) => navigateTo(screen)} />

      <OctopusConfigModal
        isOpen={isOctopusModalOpen}
        onClose={() => setIsOctopusModalOpen(false)}
        onConfigSaved={(newCfg) => setOctopusConfig(newCfg)}
      />
    </div>
  );
}