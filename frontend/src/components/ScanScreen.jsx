import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  RotateCcw, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Sparkles, 
  Info,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { analyzePlantImage } from '../services/octopusApi';

export default function ScanScreen({ onNavigateToPlants, onNavigateToAssistant, onAddPlantRecord }) {
  // Image affichée dans le viseur (par défaut celle extraite du mockup scan.jpeg)
  const [currentImage, setCurrentImage] = useState('/assets/sample_infected_leaf.jpg');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(78);
  const [analysisResult, setAnalysisResult] = useState({
    status: 'malade',
    statusLabel: 'Maladie détectée',
    diseaseName: 'Tache foliaire (Cercospora)',
    confidence: '96.4%',
    pathogen: 'Cercospora capsici / solani',
    severity: 'Élevée',
    remedies: [
      'Supprimer immédiatement les feuilles nécrosées',
      'Arroser exclusivement au sol sans mouiller le feuillage',
      'Appliquer un traitement bio à base de cuivre ou décoction de prêle'
    ],
    comparison: {
      healthyImg: '/assets/comparaison_saine.jpg',
      infectedImg: '/assets/comparaison_malade.jpg'
    }
  });

  const [useCameraStream, setUseCameraStream] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Démarrage ou arrêt de la caméra réelle du smartphone/PC si demandé
  useEffect(() => {
    let stream = null;
    if (useCameraStream) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.warn("Impossible d'accéder à la caméra:", err);
          alert("Accès caméra refusé ou indisponible. Retour au mode image d'exemple.");
          setUseCameraStream(false);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [useCameraStream]);

  // Déclencher une nouvelle analyse IA
  const handleTriggerScan = async (sampleType = 'default') => {
    setIsScanning(true);
    setScanProgress(15);

    const pInterval = setInterval(() => {
      setScanProgress(prev => (prev < 90 ? prev + 18 : prev));
    }, 280);

    try {
      const isHealthy = sampleType === 'healthy';
      const result = await analyzePlantImage(currentImage, { forceHealthy: isHealthy });
      clearInterval(pInterval);
      setScanProgress(100);

      setTimeout(() => {
        setIsScanning(false);
        setAnalysisResult({
          status: result.status,
          statusLabel: result.statusLabel,
          diseaseName: result.diseaseName,
          confidence: `${result.confidence}%`,
          pathogen: result.pathogen,
          severity: result.severity,
          remedies: result.recommendations,
          comparison: result.comparison
        });
      }, 400);
    } catch (err) {
      clearInterval(pInterval);
      setIsScanning(false);
      alert("Erreur lors de l'analyse : " + err.message);
    }
  };

  // Gestion de l'import d'une photo depuis la galerie ou prise de photo native
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCurrentImage(url);
      setUseCameraStream(false);
      handleTriggerScan('upload');
    }
  };

  return (
    <div className="screen-scroll-body" id="scan-screen-container">
      {/* Viseur de caméra & Scan interactif */}
      <div className="camera-viewfinder-card">
        {useCameraStream ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="camera-video-stream" 
          />
        ) : (
          <img 
            src={currentImage} 
            alt="Plante dans le viseur" 
            className="camera-preview-img"
          />
        )}

        {/* Brackets d'angles de visée comme sur l'image */}
        <div className="viewfinder-bracket bracket-tl" />
        <div className="viewfinder-bracket bracket-tr" />
        <div className="viewfinder-bracket bracket-bl" />
        <div className="viewfinder-bracket bracket-br" />

        {/* Laser de numérisation IA */}
        <div className="scan-laser-line" />

        {/* Contrôles du viseur */}
        <div className="viewfinder-controls">
          <button 
            type="button" 
            className="btn-pill-glass"
            onClick={() => setUseCameraStream(!useCameraStream)}
            title="Basculer vers la caméra en direct de votre appareil"
          >
            <Camera size={13} />
            <span>{useCameraStream ? "Mode Fichier" : "Caméra Direct"}</span>
          </button>

          <button 
            type="button" 
            className="btn-pill-glass"
            onClick={() => fileInputRef.current?.click()}
            title="Importer une photo depuis vos fichiers ou galerie"
          >
            <Upload size={13} />
            <span>Importer</span>
          </button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          capture="environment"
          style={{ display: 'none' }} 
          onChange={handleFileUpload}
        />
      </div>

      {/* Barre d'état: Analyse en cours... */}
      <div className="analysis-progress-card">
        <div className="progress-header">
          <div className="progress-label">
            <Sparkles size={16} className={isScanning ? "progress-spinner" : ""} />
            <span>{isScanning ? "Analyse Octopus en cours..." : "Analyse IA terminée"}</span>
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>
            {scanProgress}%
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-bar-fill" style={{ width: `${scanProgress}%` }} />
        </div>
      </div>

      {/* Résultat de l'IA */}
      <div 
        className="ai-result-card" 
        onClick={() => setShowDetailsModal(true)}
        title="Cliquer pour afficher les détails agronomiques et soins recommandés"
      >
        <div className="ai-result-top">
          <div className="ai-result-title">
            <CheckCircle2 size={18} color="#10b981" />
            <span>Résultat de l'IA</span>
          </div>
          <ChevronRight size={18} color="#94a3b8" />
        </div>

        <div style={{ paddingLeft: '26px' }}>
          <span className={analysisResult.status === 'malade' ? 'badge-disease-alert' : 'badge-healthy'}>
            {analysisResult.statusLabel} ({analysisResult.confidence})
          </span>
          <div className="disease-subtext" style={{ fontWeight: 600, color: '#0f172a' }}>
            {analysisResult.diseaseName}
          </div>
        </div>
      </div>

      {/* Comparaison visuelle Plante saine vs Plante malade */}
      <div className="comparison-section">
        <span className="section-label">Comparaison</span>
        <div className="comparison-grid">
          <div className="comparison-card">
            <img 
              src={analysisResult.comparison?.healthyImg || '/assets/comparaison_saine.jpg'} 
              alt="Plante saine" 
              className="comparison-thumb"
            />
            <span className="pill-compare-saine">Plante saine</span>
          </div>
          <div className="comparison-card">
            <img 
              src={analysisResult.comparison?.infectedImg || '/assets/comparaison_malade.jpg'} 
              alt="Plante malade" 
              className="comparison-thumb"
            />
            <span className="pill-compare-malade">Plante malade</span>
          </div>
        </div>
      </div>

      {/* Bouton d'action principale */}
      <button 
        type="button" 
        className="btn-primary-action"
        onClick={() => handleTriggerScan('default')}
        disabled={isScanning}
      >
        <Camera size={18} />
        <span>Nouvelle analyse</span>
      </button>

      {/* Raccourci pour tester une plante saine */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
        <button 
          type="button"
          style={{ background: 'none', border: 'none', color: '#10875a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => handleTriggerScan('healthy')}
        >
          Tester avec une feuille saine
        </button>
        <span style={{ color: '#cbd5e1' }}>•</span>
        <button 
          type="button"
          style={{ background: 'none', border: 'none', color: '#10875a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => handleTriggerScan('infected')}
        >
          Tester avec Cercospora
        </button>
      </div>

      {/* Modal Détails Diagnostic & Traitements */}
      {showDetailsModal && (
        <div className="modal-backdrop" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info color="#10b981" />
                <h3 className="modal-title">Rapport de Diagnostic IA</h3>
              </div>
              <button 
                className="screen-app-btn-icon" 
                onClick={() => setShowDetailsModal(false)}
              >
                ✕
              </button>
            </div>

            <div>
              <div style={{ marginBottom: '12px' }}>
                <span className={analysisResult.status === 'malade' ? 'badge-disease-alert' : 'badge-healthy'}>
                  {analysisResult.diseaseName}
                </span>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                  Agent pathogène : <strong>{analysisResult.pathogen}</strong> • Indice de certitude : <strong>{analysisResult.confidence}</strong>
                </p>
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Recommandations d'intervention immédiates :
              </h4>
              <ul style={{ paddingLeft: '20px', fontSize: '0.84rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {analysisResult.remedies?.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button 
                className="btn-primary-action"
                style={{ fontSize: '0.82rem', padding: '10px' }}
                onClick={() => {
                  setShowDetailsModal(false);
                  if (onNavigateToAssistant) onNavigateToAssistant();
                }}
              >
                Demander à l'assistant vocal
              </button>
              <button 
                className="mode-tab-btn" 
                style={{ border: '1px solid #cbd5e1' }}
                onClick={() => setShowDetailsModal(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
