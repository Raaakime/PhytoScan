import React, { useState, useEffect, useMemo } from 'react';
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
import { isLiveMode, fetchPlants, createPlant, saveDiagnostic } from './services/phytoscanApi';
import { buildAlerts } from './utils/alerts';

export default function App() {
  // Navigation entre les pages du site web
  const [activeScreen, setActiveScreen] = useState('scan'); // 'scan' | 'plants' | 'assistant'
  const [navigationHistory, setNavigationHistory] = useState(['scan']);
  const [navigationParams, setNavigationParams] = useState({});
  const [plantsList, setPlantsList] = useState(INITIAL_PLANTS);
  const [isOctopusModalOpen, setIsOctopusModalOpen] = useState(false);
  const [octopusConfig, setOctopusConfig] = useState(getOctopusConfig());
  const [apiError, setApiError] = useState(null); // message affiché si le back est injoignable

  // Chargement des plantes : depuis le back en mode live, depuis les données locales en simulation.
  // Se relance à chaque changement de configuration (modale Octopus).
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
          setPlantsList(INITIAL_PLANTS); // repli : données de démonstration locales
          setApiError(err.message);
        }
      });
    return () => { cancelled = true; };
  }, [octopusConfig]);

  // Alertes recalculées automatiquement dès qu'une plante change (badge du Header + panneau de l'assistant)
  const alerts = useMemo(() => buildAlerts(plantsList), [plantsList]);

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
  // MODE LIVE : le back enregistre l'historique et recalcule statut + score de santé.
  // Si le serveur échoue, on retombe sur la mise à jour locale pour ne pas bloquer l'utilisateur.
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

  // Création d'une culture dans le back (utilisée uniquement en mode live, voir PlantRecordsScreen)
  const handleCreatePlant = async (data) => {
    const created = await createPlant(data);
    setPlantsList((prev) => [created, ...prev]);
    return created;
  };

  // Mise à jour locale (mode simulation ou serveur injoignable)
  const saveDiagnosticLocally = ({ plantId, diseaseName, confidence, date }) => {
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
        alertCount={alerts.length}
      />

      {/* Contenu principal de la page web */}
      <main className="website-main-content">
        {apiError && (
          <div style={{ margin: '12px auto', maxWidth: '1100px', padding: '10px 14px', borderRadius: '8px',
                        background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.85rem' }}>
            Serveur PhytoScan injoignable ou erreur ({apiError}). Les données affichées peuvent être locales (démonstration).
          </div>
        )}
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
