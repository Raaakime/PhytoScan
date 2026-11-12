import { useState, useEffect } from 'react';
import Header from './components/Header';
import ScanScreen from './components/ScanScreen';
import PlantRecordsScreen from './components/PlantRecordsScreen';
import VoiceAssistantScreen from './components/VoiceAssistantScreen';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import FooterBanner from './components/FooterBanner';
import OctopusConfigModal from './components/OctopusConfigModal';
import { getOctopusConfig } from './services/octopusApi';
import { getCurrentUser, logoutUser } from './services/authService';
import { createPlant, listPlants, savePlantDiagnostic } from './services/plantsApi';

export default function App() {
  // Navigation entre les pages du site web
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const initialScreen = currentUser ? 'scan' : 'register';
  const [activeScreen, setActiveScreen] = useState(initialScreen); // 'scan' | 'plants' | 'assistant' | 'login' | 'register'
  const [navigationHistory, setNavigationHistory] = useState([initialScreen]);
  const [navigationParams, setNavigationParams] = useState({});
  const [plantsList, setPlantsList] = useState([]);
  const [plantsError, setPlantsError] = useState('');
  const [isOctopusModalOpen, setIsOctopusModalOpen] = useState(false);
  const [octopusConfig, setOctopusConfig] = useState(getOctopusConfig());

  useEffect(() => {
    if (!currentUser) {
      setPlantsList([]);
      setPlantsError('');
      return undefined;
    }

    let cancelled = false;
    listPlants(currentUser?.preferredLang || 'fr')
      .then(plants => {
        if (!cancelled) {
          setPlantsList(plants);
          setPlantsError('');
        }
      })
      .catch(error => {
        if (!cancelled) setPlantsError(`Impossible de charger les cultures : ${error.message}`);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setNavigationParams({});
    setNavigationHistory(['scan']);
    setActiveScreen('scan');
  };

  const handleRegisterSuccess = (user) => {
    setCurrentUser(user);
    setNavigationParams({});
    setNavigationHistory(['scan']);
    setActiveScreen('scan');
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setPlantsList([]);
    setNavigationParams({});
    setNavigationHistory(['register']);
    setActiveScreen('register');
  };

  // Calcul dynamique du nombre d'alertes phytosanitaires actives
  const activeAlertCount = plantsList.filter(
    (plant) => plant.status !== 'saine' || Boolean(plant.alert)
  ).length;

  // Fonction de navigation entre les pages
  const navigateTo = (screen, params = {}) => {
    if (!currentUser && !['login', 'register'].includes(screen)) return;

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

  const handleCreatePlant = async (plantData) => {
    try {
      const plant = await createPlant(plantData, currentUser?.preferredLang || 'fr');
      setPlantsList(previous => [plant, ...previous]);
      setPlantsError('');
      return plant;
    } catch (error) {
      setPlantsError(`Impossible d'ajouter la culture : ${error.message}`);
      throw error;
    }
  };

  const handleSaveDiagnosticToPlant = async (diagnostic) => {
    try {
      const plant = await savePlantDiagnostic(
        diagnostic.plantId,
        diagnostic,
        currentUser?.preferredLang || 'fr'
      );
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
            initialPlantId={navigationParams?.plantId || 'P-001'}
            onNavigateToScan={(params) => navigateTo('scan', params)}
            onNavigateToAssistant={(params) => navigateTo('assistant', params)}
          />
        );

      case 'assistant':
        return (
          <VoiceAssistantScreen 
            plants={plantsList}
            initialLanguage={currentUser?.preferredLang || 'fr'}
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

  return (
    <div className="website-root">
      {currentUser && (
        <Header 
          activeScreen={activeScreen}
          onNavigate={(screen) => navigateTo(screen)}
          canGoBack={navigationHistory.length > 1}
          onGoBack={goBack}
          onOpenOctopusConfig={() => setIsOctopusModalOpen(true)}
          isOctopusConnected={!octopusConfig.useMock && !!octopusConfig.baseUrl}
          alertCount={activeAlertCount}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Contenu principal de la page web */}
      <main className="website-main-content">
        {plantsError && <div className="auth-alert-box danger" role="alert">{plantsError}</div>}
        {renderCurrentScreen()}
      </main>

      {currentUser && <FooterBanner onNavigate={(screen) => navigateTo(screen)} />}

      {/* Modal de Configuration Octopus */}
      <OctopusConfigModal 
        isOpen={isOctopusModalOpen}
        onClose={() => setIsOctopusModalOpen(false)}
        onConfigSaved={(newCfg) => setOctopusConfig(newCfg)}
      />
    </div>
  );
}
