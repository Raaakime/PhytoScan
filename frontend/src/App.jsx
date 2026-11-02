import React, { useState } from 'react';
import { 
  Camera, 
  FolderHeart, 
  Mic, 
  Leaf, 
  ChevronLeft,
  Bell,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import Header from './components/Header';
import ScanScreen from './components/ScanScreen';
import PlantRecordsScreen from './components/PlantRecordsScreen';
import VoiceAssistantScreen from './components/VoiceAssistantScreen';
import FooterBanner from './components/FooterBanner';
import OctopusConfigModal from './components/OctopusConfigModal';
import { getOctopusConfig } from './services/octopusApi';
import { INITIAL_PLANTS } from './data/mockData';

export default function App() {
  // Navigation entre les pages du site web
  const [activeScreen, setActiveScreen] = useState('scan'); // 'scan' | 'plants' | 'assistant'
  const [navigationHistory, setNavigationHistory] = useState(['scan']);
  const [navigationParams, setNavigationParams] = useState({});
  const [plantsList, setPlantsList] = useState(INITIAL_PLANTS);
  const [isOctopusModalOpen, setIsOctopusModalOpen] = useState(false);
  const [octopusConfig, setOctopusConfig] = useState(getOctopusConfig());

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
  const handleSaveDiagnosticToPlant = ({ plantId, diseaseName, confidence, date }) => {
    setPlantsList(prevPlants => {
      return prevPlants.map(plant => {
        if (plant.id === plantId) {
          const newHistoryItem = {
            date: date || new Date().toLocaleDateString('fr-FR'),
            type: "Diagnostic IA",
            result: `${diseaseName} (${confidence})`,
            notes: "Diagnostic automatique enregistré via la vision par ordinateur."
          };
          return {
            ...plant,
            status: diseaseName.toLowerCase().includes('sain') ? 'saine' : 'malade',
            statusLabel: diseaseName.toLowerCase().includes('sain') ? 'Saine' : 'Maladie détectée',
            healthScore: diseaseName.toLowerCase().includes('sain') ? 98 : 45,
            lastObservation: date || new Date().toLocaleDateString('fr-FR'),
            history: [newHistoryItem, ...(plant.history || [])]
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
        alertCount={2}
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
