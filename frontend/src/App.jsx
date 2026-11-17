import { useState, useEffect } from 'react';
import Header from './components/Header';
import ScanScreen from './components/ScanScreen';
import PlantRecordsScreen from './components/PlantRecordsScreen';
import VoiceAssistantScreen from './components/VoiceAssistantScreen';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import FooterBanner from './components/FooterBanner';
import OctopusConfigModal from './components/OctopusConfigModal';
import { DemoBanner, SignupPromptModal } from './components/DemoBanner';
import { getOctopusConfig } from './services/octopusApi';
import { getCurrentUser, logoutUser } from './services/authService';
import { createPlant, listPlants, savePlantDiagnostic, deletePlant, updatePlant } from './services/plantsApi';
import { apiRequest, SESSION_EXPIRED_EVENT } from './services/apiClient';

const AUTH_SCREENS = ['login', 'register'];
const DEMO_SCREENS = ['scan', 'plants', 'assistant', ...AUTH_SCREENS];
// Faux profil affiché dans l'en-tête tant qu'on est en mode démo (aucun vrai compte)
const DEMO_VISITOR = { fullName: 'Visiteur (démo)', full_name: 'Visiteur (démo)', email: '', isDemo: true };

export default function App() {
  // currentUser = null  ->  MODE DÉMO : on peut tester le scan et consulter des cultures d'exemple (lecture seule)
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const isDemo = !currentUser;

  // 1. Récupération sécurisée de l'écran sauvegardé au chargement
  const getSavedScreen = () => {
    const saved = sessionStorage.getItem('phytoscan_active_screen');
    if (currentUser) {
      return saved && !AUTH_SCREENS.includes(saved) ? saved : 'scan';
    }
    return saved && DEMO_SCREENS.includes(saved) ? saved : 'scan';
  };

  const [activeScreen, setActiveScreen] = useState(getSavedScreen);

  const [navigationHistory, setNavigationHistory] = useState(() => {
    const savedHistory = sessionStorage.getItem('phytoscan_history');
    return savedHistory ? JSON.parse(savedHistory) : [getSavedScreen()];
  });

  const [navigationParams, setNavigationParams] = useState(() => {
    const savedParams = sessionStorage.getItem('phytoscan_params');
    return savedParams ? JSON.parse(savedParams) : {};
  });

  const [plantsList, setPlantsList] = useState([]);
  const [plantsError, setPlantsError] = useState('');
  const [signupPrompt, setSignupPrompt] = useState(null); // message de la fenêtre « créez un compte » (null = fermée)
  const [isOctopusModalOpen, setIsOctopusModalOpen] = useState(false);
  const [octopusConfig, setOctopusConfig] = useState(getOctopusConfig());
  const [isBackendReachable, setIsBackendReachable] = useState(false);

  // Vérification de la connexion réelle avec le backend
  useEffect(() => {
    if (octopusConfig.useMock || !octopusConfig.baseUrl) {
      setIsBackendReachable(false);
      return;
    }

    let cancelled = false;
    apiRequest('/health', {}, octopusConfig.baseUrl)
      .then(() => {
        if (!cancelled) setIsBackendReachable(true);
      })
      .catch(() => {
        if (!cancelled) setIsBackendReachable(false);
      });

    return () => {
      cancelled = true;
    };
  }, [octopusConfig]);

  // 2. Sauvegarde automatique dès que l'écran, l'historique ou les paramètres changent
  useEffect(() => {
    sessionStorage.setItem('phytoscan_active_screen', activeScreen);
    sessionStorage.setItem('phytoscan_history', JSON.stringify(navigationHistory));
    sessionStorage.setItem('phytoscan_params', JSON.stringify(navigationParams));
  }, [activeScreen, navigationHistory, navigationParams]);

  // 3. Cultures : à chaque changement d'utilisateur (connexion, déconnexion, démo), on repart de zéro pour
  //    ne JAMAIS mélanger les données d'un compte avec celles de la démo ou d'un autre compte.
  //    Visiteur -> cultures de démonstration ; compte -> uniquement SES cultures (vide pour un compte neuf).
  useEffect(() => {
    let cancelled = false;
    setPlantsList([]);
    setPlantsError('');
    listPlants()
      .then(plants => {
        if (!cancelled) setPlantsList(plants);
      })
      .catch(error => {
        if (!cancelled) setPlantsError(`Impossible de charger les cultures : ${error.message}`);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // 4. Session expirée (jeton refusé et non renouvelable) : retour en mode démo, sans erreurs en cascade
  useEffect(() => {
    const onSessionExpired = () => {
      logoutUser();
      setCurrentUser(null);
      setNavigationParams({});
      setNavigationHistory(['login']);
      setActiveScreen('login');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  const handleAuthSuccess = (user) => {
    setSignupPrompt(null);
    setCurrentUser(user);
    setNavigationParams({});
    setNavigationHistory(['scan']);
    setActiveScreen('scan');
  };
  const handleLoginSuccess = handleAuthSuccess;
  const handleRegisterSuccess = handleAuthSuccess;

  const handleLogout = () => {
    logoutUser();
    sessionStorage.removeItem('phytoscan_active_screen');
    sessionStorage.removeItem('phytoscan_history');
    sessionStorage.removeItem('phytoscan_params');

    setCurrentUser(null);
    setPlantsList([]);
    setNavigationParams({});
    setNavigationHistory(['scan']);
    setActiveScreen('scan');
  };

  // Calcul dynamique du nombre d'alertes phytosanitaires actives
  const activeAlertCount = plantsList.filter(
    (plant) => plant.status !== 'saine' || Boolean(plant.alert)
  ).length;

  // Fonction de navigation entre les pages (toutes accessibles en mode démo)
  const navigateTo = (screen, params = {}) => {
    setSignupPrompt(null);
    setNavigationParams(params);
    setNavigationHistory(prev => [...prev, screen]);
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Bouton retour dans l'historique
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

  // En mode démo, toute écriture est refusée côté front ET côté back : on invite à créer un compte.
  const requireAccount = (reason) => {
    setSignupPrompt(reason);
    throw new Error('Mode démo : créez un compte gratuit pour enregistrer vos données.');
  };

  const handleCreatePlant = async (plantData) => {
    if (isDemo) requireAccount("Pour ajouter vos propres cultures, créez votre compte.");
    try {
      const plant = await createPlant(plantData);
      setPlantsList(previous => [plant, ...previous]);
      setPlantsError('');
      return plant;
    } catch (error) {
      setPlantsError(`Impossible d'ajouter la culture : ${error.message}`);
      throw error;
    }
  };

  const handleDeletePlant = async (plantId) => {
  if (isDemo) requireAccount("Pour supprimer une culture, créez votre compte.");
  try {
    await deletePlant(plantId);
    setPlantsList(previous => previous.filter(item => item.id !== plantId));
    setPlantsError('');
  } catch (error) {
    setPlantsError(`Impossible de supprimer la culture : ${error.message}`);
    throw error;
  }
};

const handleUpdatePlant = async (plantId, plantData) => {
  if (isDemo) requireAccount("Pour modifier une culture, créez votre compte.");
  try {
    const updated = await updatePlant(plantId, plantData);
    setPlantsList(previous => previous.map(item => (item.id === plantId ? updated : item)));
    setPlantsError('');
    return updated;
  } catch (error) {
    setPlantsError(`Impossible de modifier la culture : ${error.message}`);
    throw error;
  }
};


  const handleSaveDiagnosticToPlant = async (diagnostic) => {
    if (isDemo) requireAccount("Vous avez testé le scan. Pour enregistrer ce diagnostic dans le carnet de santé d'une culture, créez votre compte.");
    try {
      const plant = await savePlantDiagnostic(diagnostic.plantId, diagnostic);
      setPlantsList(previous => previous.map(item => item.id === plant.id ? plant : item));
      setPlantsError('');
      return plant;
    } catch (error) {
      setPlantsError(`Impossible d'enregistrer le diagnostic : ${error.message}`);
      throw error;
    }
  };

  // Rendu de la page active du site
  const renderCurrentScreen = () => {
    switch (activeScreen) {
      case 'scan':
        return (
          <ScanScreen 
            plants={plantsList}
            onNavigateToPlants={(params) => navigateTo('plants', params)}
            onNavigateToAssistant={(params) => navigateTo('assistant', params)}
            targetPlant={navigationParams?.targetPlant}
            onClearTargetPlant={() => setNavigationParams(prev => ({ ...prev, targetPlant: null }))}
            onSaveDiagnosticToPlant={handleSaveDiagnosticToPlant}
          />
        );

      case 'plants':
        return (
          <PlantRecordsScreen 
            plants={plantsList}
            onCreatePlant={handleCreatePlant}
            initialPlantId={navigationParams?.plantId || plantsList[0]?.id || ''}
            onNavigateToScan={(params) => navigateTo('scan', params)}
            onNavigateToAssistant={(params) => navigateTo('assistant', params)}
            onUpdatePlant={handleUpdatePlant}
            onDeletePlant={handleDeletePlant}
          />
        );

      case 'assistant':
        return (
          <VoiceAssistantScreen 
            plants={plantsList}
            initialQuery={navigationParams?.initialQuery || ''}
            onClearInitialQuery={() => setNavigationParams(prev => ({ ...prev, initialQuery: '' }))}
            onNavigateToScan={(params) => navigateTo('scan', params)}
            onNavigateToPlants={(params) => navigateTo('plants', params)}
            onOpenOctopusConfig={() => setIsOctopusModalOpen(true)}
          />
        );

      case 'login':
        return (
          <LoginScreen 
            onNavigateToRegister={() => navigateTo('register')}
            onLoginSuccess={handleLoginSuccess}
          />
        );

      case 'register':
        return (
          <RegisterScreen 
            onNavigateToLogin={() => navigateTo('login')}
            onRegisterSuccess={handleRegisterSuccess}
          />
        );

      default:
        return null;
    }
  };

  const isAuthScreen = AUTH_SCREENS.includes(activeScreen);

  return (
    <div className="website-root">
      {/* Écrans de connexion / inscription : plein écran, sans menu (comme avant) */}
      {!isAuthScreen && (
        <Header 
          activeScreen={activeScreen}
          onNavigate={(screen) => navigateTo(screen)}
          canGoBack={navigationHistory.length > 1}
          onGoBack={goBack}
          onOpenOctopusConfig={() => setIsOctopusModalOpen(true)}
          isOctopusConnected={isBackendReachable}
          alertCount={activeAlertCount}
          currentUser={currentUser || DEMO_VISITOR}
          onLogout={isDemo ? () => navigateTo('login') : handleLogout}
        />
      )}

      {isDemo && !isAuthScreen && (
        <DemoBanner onRegister={() => navigateTo('register')} onLogin={() => navigateTo('login')} />
      )}

      <main className="website-main-content">
        {isDemo && isAuthScreen && (
          <div style={{ padding: '12px 16px' }}>
            <button type="button" className="mode-tab-btn" style={{ border: '1px solid #cbd5e1' }}
                    onClick={() => navigateTo('scan')}>
              ← Continuer en mode démo
            </button>
          </div>
        )}
        {plantsError && <div className="auth-alert-box danger" role="alert">{plantsError}</div>}
        {renderCurrentScreen()}
      </main>

      {!isAuthScreen && <FooterBanner onNavigate={(screen) => navigateTo(screen)} />}

      <SignupPromptModal
        message={signupPrompt}
        onClose={() => setSignupPrompt(null)}
        onRegister={() => navigateTo('register')}
        onLogin={() => navigateTo('login')}
      />

      <OctopusConfigModal 
        isOpen={isOctopusModalOpen}
        onClose={() => setIsOctopusModalOpen(false)}
        onConfigSaved={(newCfg) => setOctopusConfig(newCfg)}
      />
    </div>
  );
}
