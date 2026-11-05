import { useState, useEffect } from 'react';
import Header from './components/Header';
import ScanScreen from './components/ScanScreen';
import PlantRecordsScreen from './components/PlantRecordsScreen';
import VoiceAssistantScreen from './components/VoiceAssistantScreen';
import FooterBanner from './components/FooterBanner';
import OctopusConfigModal from './components/OctopusConfigModal';
import { getOctopusConfig } from './services/octopusApi';
import { INITIAL_PLANTS } from './data/mockData';

const PLANTS_STORAGE_KEY = 'phytoscan_plants_data';

const loadPersistedPlants = () => {
  try {
    const saved = localStorage.getItem(PLANTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Impossible de charger les plantes depuis localStorage:', err);
  }
  return INITIAL_PLANTS;
};

export default function App() {
  // Navigation entre les pages du site web
  const [activeScreen, setActiveScreen] = useState('scan'); // 'scan' | 'plants' | 'assistant'
  const [navigationHistory, setNavigationHistory] = useState(['scan']);
  const [navigationParams, setNavigationParams] = useState({});
  const [plantsList, setPlantsList] = useState(loadPersistedPlants);
  const [isOctopusModalOpen, setIsOctopusModalOpen] = useState(false);
  const [octopusConfig, setOctopusConfig] = useState(getOctopusConfig());

  // Sauvegarde automatique dans localStorage à chaque mise à jour des cultures
  useEffect(() => {
    try {
      localStorage.setItem(PLANTS_STORAGE_KEY, JSON.stringify(plantsList));
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des cultures dans localStorage:', err);
    }
  }, [plantsList]);

  // Calcul dynamique du nombre d'alertes phytosanitaires actives
  const activeAlertCount = plantsList.filter(
    (plant) => plant.status !== 'saine' || Boolean(plant.alert)
  ).length;

  // Fonction de navigation entre les pages
  const navigateTo = (screen, params = {}) => {
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

  // Enregistrement d'un résultat de diagnostic dans la plante ciblée
  const handleSaveDiagnosticToPlant = ({
    plantId,
    status,
    diseaseName,
    confidence,
    remedies,
    date
  }) => {
    const obsDate = date || new Date().toLocaleDateString('fr-FR');
    const isHealthy =
      status === 'saine' ||
      diseaseName.toLowerCase().includes('sain') ||
      diseaseName.toLowerCase().includes('aucune anomalie');
    const isWatch = status === 'surveiller';

    const resolvedStatus = isHealthy ? 'saine' : isWatch ? 'surveiller' : 'malade';
    const resolvedLabel = isHealthy ? 'Saine' : isWatch ? 'À surveiller' : 'Malade';
    const resolvedScore = isHealthy ? 98 : isWatch ? 72 : 42;
    const resolvedAlert = isHealthy
      ? null
      : isWatch
        ? `Suspicion détectée : ${diseaseName} (${confidence}). Surveillance et traitement préventif conseillés.`
        : `Diagnostic IA : ${diseaseName} (${confidence}). Traitement d'urgence requis.`;

    setPlantsList(prevPlants => {
      return prevPlants.map(plant => {
        if (plant.id === plantId) {
          const newHistoryItem = {
            date: obsDate,
            type: 'Diagnostic IA',
            result: `${diseaseName} (${confidence})`,
            notes: remedies && remedies.length > 0
              ? `Recommandation clé : ${remedies[0]}`
              : 'Diagnostic automatique enregistré via la vision par ordinateur.'
          };

          const updatedCare =
            !isHealthy && remedies && remedies.length > 0
              ? [
                  {
                    task: remedies[0],
                    frequency: 'Immédiat (Suite au scan IA)',
                    status: isWatch ? 'Préventif' : 'Urgent (24h)'
                  },
                  ...(plant.care || [])
                ]
              : plant.care || [];

          return {
            ...plant,
            status: resolvedStatus,
            statusLabel: resolvedLabel,
            healthScore: resolvedScore,
            alert: resolvedAlert,
            lastObservation: obsDate,
            history: [newHistoryItem, ...(plant.history || [])],
            care: updatedCare
          };
        }
        return plant;
      });
    });
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
            onUpdatePlants={(updated) => setPlantsList(updated)}
            initialPlantId={navigationParams?.plantId || 'P-001'}
            onNavigateToScan={(params) => navigateTo('scan', params)}
            onNavigateToAssistant={(params) => navigateTo('assistant', params)}
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

      default:
        return null;
    }
  };

  return (
    <div className="website-root">
      {/* Barre de navigation principale du site */}
      <Header 
        activeScreen={activeScreen}
        onNavigate={(screen) => navigateTo(screen)}
        canGoBack={navigationHistory.length > 1}
        onGoBack={goBack}
        onOpenOctopusConfig={() => setIsOctopusModalOpen(true)}
        isOctopusConnected={!octopusConfig.useMock && !!octopusConfig.baseUrl}
        alertCount={activeAlertCount}
      />

      {/* Contenu principal de la page web */}
      <main className="website-main-content">
        {renderCurrentScreen()}
      </main>

      {/* Pied de page du site web */}
      <FooterBanner onNavigate={(screen) => navigateTo(screen)} />

      {/* Modal de Configuration Octopus */}
      <OctopusConfigModal 
        isOpen={isOctopusModalOpen}
        onClose={() => setIsOctopusModalOpen(false)}
        onConfigSaved={(newCfg) => setOctopusConfig(newCfg)}
      />
    </div>
  );
}
