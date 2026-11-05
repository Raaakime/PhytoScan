import { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  FolderHeart,
  Mic,
  BookmarkCheck,
  ArrowRight,
  Sprout,
  ShieldAlert,
  Check,
  Activity,
  ScanLine
} from 'lucide-react';
import { analyzePlantImage } from '../services/octopusApi';

export default function ScanScreen({ 
  plants = [],
  onNavigateToPlants, 
  onNavigateToAssistant, 
  targetPlant,
  onClearTargetPlant,
  onSaveDiagnosticToPlant 
}) {
  const [currentImage, setCurrentImage] = useState('/assets/sample_infected_leaf.jpg');
  // Le scan est inactif au chargement de la page : pas d'animation ni d'analyse automatique
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [hasSavedDiagnostic, setHasSavedDiagnostic] = useState(false);
  const [analysisResult, setAnalysisResult] = useState({
    status: 'malade',
    statusLabel: 'Maladie détectée',
    diseaseName: 'Tache foliaire (Cercospora)',
    confidence: '96.4%',
    pathogen: 'Cercospora capsici / solani',
    severity: 'Élevée',
    remedies: [
      'Supprimer immédiatement et brûler les feuilles nécrosées pour stopper la sporulation',
      'Arroser exclusivement au sol (goutte-à-goutte) sans jamais mouiller le feuillage',
      'Appliquer un traitement bio à base de décoction de prêle ou bouillie bordelaise diluée'
    ],
    comparison: {
      healthyImg: '/assets/comparaison_saine.jpg',
      infectedImg: '/assets/comparaison_malade.jpg'
    }
  });

  const [useCameraStream, setUseCameraStream] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);

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
          alert("Accès caméra indisponible ou refusé. Utilisation du mode fichier photo.");
          setUseCameraStream(false);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [useCameraStream]);

  // Nettoyage des ObjectURLs créés lors de l'import de fichiers
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  // Capture la frame actuelle du flux vidéo <video> dans un <canvas> et retourne un DataURL JPEG
  const captureVideoFrame = () => {
    const videoEl = videoRef.current;
    if (!videoEl || videoEl.readyState < 2) {
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  // Déclencher une analyse IA uniquement sur action explicite
  const handleTriggerScan = async (sampleType = 'default', specificImage = null) => {
    let imgToAnalyze = specificImage || currentImage;

    // Si la caméra en direct est active et qu'aucun échantillon spécifique n'est forcé, capturer la frame vidéo
    if (!specificImage && useCameraStream) {
      const capturedDataUrl = captureVideoFrame();
      if (capturedDataUrl) {
        imgToAnalyze = capturedDataUrl;
        setCurrentImage(capturedDataUrl);
        setUseCameraStream(false);
      }
    }

    setIsScanning(true);
    setScanProgress(15);
    setHasSavedDiagnostic(false);

    const pInterval = setInterval(() => {
      setScanProgress(prev => (prev < 90 ? prev + 18 : prev));
    }, 240);

    try {
      const isHealthy = sampleType === 'healthy';
      const result = await analyzePlantImage(imgToAnalyze, { forceHealthy: isHealthy });
      clearInterval(pInterval);
      setScanProgress(100);

      setTimeout(() => {
        setIsScanning(false);
        setHasScanned(true);
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
      }, 350);
    } catch (err) {
      clearInterval(pInterval);
      setIsScanning(false);
      alert("Erreur lors de l'analyse : " + err.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setCurrentImage(url);
      setUseCameraStream(false);
      handleTriggerScan('upload', url);
    }
  };

  const handleSelectSample = (type, imagePath) => {
    setUseCameraStream(false);
    setCurrentImage(imagePath);
    handleTriggerScan(type, imagePath);
  };

  return (
    <div className="web-page-container">
      {/* En-tête de section du site web */}
      <div className="web-page-header">
        <div>
          <div className="web-breadcrumb">
            <span>Accueil</span>
            <span>/</span>
            <span className="current">Diagnostic IA</span>
          </div>
          <h1 className="web-page-title">
            Laboratoire de Diagnostic Phytosanitaire par Vision IA
          </h1>
          <p className="web-page-subtitle">
            Numérisez ou téléversez une feuille pour détecter automatiquement les agents pathogènes, estimer la sévérité et obtenir les protocoles de soin adaptés.
          </p>
        </div>

        {targetPlant && (
          <div className="web-target-plant-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="web-target-icon">
                <Sprout size={20} />
              </div>
              <div>
                <span className="web-target-tag">Diagnostic ciblé</span>
                <strong className="web-target-title">{targetPlant.name} ({targetPlant.species})</strong>
                <span className="web-target-meta">{targetPlant.plot} • {targetPlant.variety}</span>
              </div>
            </div>
            {onClearTargetPlant && (
              <button 
                type="button" 
                className="web-btn-cancel-target"
                onClick={onClearTargetPlant}
                title="Annuler le ciblage"
              >
                ✕ Changer de culture
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grille principale 2 colonnes du site web */}
      <div className="web-scan-grid">
        {/* =========================================================
            COLONNE GAUCHE : ACQUISITION VISUELLE & CAPTURE
            ========================================================= */}
        <div className="web-card scan-left-card">
          <div className="card-section-header">
            <h3>Module de Capture & Viseur Caméra</h3>
            <span className="badge-model-info">Modèle Octopus Vision v2.4</span>
          </div>

          {/* Viseur Caméra / Preview */}
          <div className="web-viewfinder-box">
            {useCameraStream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="web-video-stream" 
              />
            ) : (
              <img 
                src={currentImage} 
                alt="Plante dans le viseur" 
                className="web-preview-img"
              />
            )}

            {/* HUD & Brackets de visée */}
            <div className="viewfinder-bracket bracket-tl" />
            <div className="viewfinder-bracket bracket-tr" />
            <div className="viewfinder-bracket bracket-bl" />
            <div className="viewfinder-bracket bracket-br" />

            {/* Le laser de numérisation n'apparaît UNIQUEMENT que lorsqu'une analyse est lancée */}
            {isScanning && <div className="scan-laser-line" />}

            {/* Overlay d'état en direct */}
            <div className="viewfinder-hud-overlay">
              <span className="hud-badge">
                {useCameraStream ? "● CAMÉRA DIRECTE ACTIVE" : "● LIVE HUD 4K"}
              </span>
              <span className="hud-badge">
                {isScanning ? "NUMÉRISATION EN COURS..." : hasScanned ? "ANALYSE EFFECTUÉE" : "PRÊT À NUMÉRISER"}
              </span>
            </div>
          </div>

          {/* Barre de contrôles sous le viseur */}
          <div className="viewfinder-actions-toolbar">
            <button 
              type="button" 
              className={`web-toolbar-btn ${useCameraStream ? 'active' : ''}`}
              onClick={() => setUseCameraStream(!useCameraStream)}
            >
              <Camera size={16} />
              <span>{useCameraStream ? "Arrêter la caméra" : "Activer la caméra directe"}</span>
            </button>

            <button 
              type="button" 
              className="web-toolbar-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              <span>Téléverser une image</span>
            </button>

            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
            />
          </div>

          {/* Barre de progression : affichée uniquement en cours de scan ou à la fin */}
          {isScanning ? (
            <div className="web-progress-block">
              <div className="web-progress-labels">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} className="progress-spinner" color="#10b981" />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Traitement par les réseaux neuronaux Octopus...
                  </span>
                </div>
                <span style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>
                  {scanProgress}%
                </span>
              </div>
              <div className="progress-track" style={{ height: '8px' }}>
                <div className="progress-bar-fill" style={{ width: `${scanProgress}%` }} />
              </div>
            </div>
          ) : hasScanned ? (
            <div className="web-progress-block completed">
              <div className="web-progress-labels">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#047857' }}>
                    Analyse spectrale complétée avec succès
                  </span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Précision {analysisResult.confidence}</span>
              </div>
            </div>
          ) : (
            <div className="web-progress-block ready-idle">
              <span style={{ fontSize: '0.84rem', color: '#475569' }}>
                {useCameraStream 
                  ? "Cadrez la feuille dans le viseur puis cliquez ci-dessous pour capturer et analyser l'image."
                  : "Sélectionnez une feuille ci-dessous ou cliquez sur le bouton pour lancer le diagnostic."}
              </span>
            </div>
          )}

          {/* Boutons d'action et tests rapides */}
          <div className="scan-action-triggers">
            <button 
              type="button" 
              className="web-btn-primary"
              onClick={() => handleTriggerScan('default')}
              disabled={isScanning}
            >
              <Camera size={18} />
              <span>
                {isScanning 
                  ? "Analyse en cours..." 
                  : useCameraStream
                    ? "Capturer la photo & lancer le diagnostic IA"
                    : hasScanned 
                      ? "Relancer une analyse" 
                      : "Lancer le diagnostic IA de cette feuille"}
              </span>
            </button>

            <div className="web-quick-tests-row">
              <span className="quick-tests-label">Échantillons de test :</span>
              <button 
                type="button" 
                className="web-btn-chip-sample"
                onClick={() => handleSelectSample('infected', '/assets/sample_infected_leaf.jpg')}
              >
                🍂 Feuille malade (Cercospora)
              </button>
              <button 
                type="button" 
                className="web-btn-chip-sample healthy"
                onClick={() => handleSelectSample('healthy', '/assets/comparaison_saine.jpg')}
              >
                🌿 Feuille saine (Tomate)
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================
            COLONNE DROITE : RÉSULTAT DU DIAGNOSTIC & ATLAS COMPARATIF
            ========================================================= */}
        <div className="web-scan-right-col">
          {/* Carte Résultat Principal */}
          {hasScanned || isScanning ? (
            <div className="web-card scan-result-card">
              <div className="result-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className={`status-icon-circle ${analysisResult.status === 'saine' ? 'success' : 'danger'}`}>
                    {analysisResult.status === 'saine' ? <CheckCircle2 size={22} /> : <ShieldAlert size={22} />}
                  </div>
                  <div>
                    <span className={analysisResult.status === 'saine' ? 'web-badge-success' : 'web-badge-danger'}>
                      {analysisResult.statusLabel}
                    </span>
                    <h2 className="disease-headline">{analysisResult.diseaseName}</h2>
                  </div>
                </div>

                <div className="confidence-gauge-box">
                  <span className="confidence-label">Degré de certitude</span>
                  <span className="confidence-value">{analysisResult.confidence}</span>
                </div>
              </div>

              {/* Caractéristiques agronomiques du pathogène */}
              <div className="pathogen-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Agent pathogène</span>
                  <strong className="spec-val">{analysisResult.pathogen}</strong>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Sévérité estimée</span>
                  <strong className="spec-val" style={{ color: analysisResult.status === 'saine' ? '#059669' : analysisResult.status === 'surveiller' ? '#d97706' : '#e11d48' }}>
                    {analysisResult.severity}
                  </strong>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Temps de calcul</span>
                  <strong className="spec-val">120 ms (Octopus Neural)</strong>
                </div>
              </div>

              {/* Recommandations d'interventions directes */}
              <div className="remedies-section">
                <h4 className="remedies-title">
                  <Activity size={17} color="#10b981" />
                  <span>Protocole d'intervention agronomique recommandé :</span>
                </h4>
                <ul className="remedies-list">
                  {analysisResult.remedies?.map((remedy, i) => (
                    <li key={i} className="remedy-item">
                      <div className="remedy-bullet">{i + 1}</div>
                      <span>{remedy}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions de navigation immédiates */}
              <div className="web-action-buttons-group">
                <button 
                  type="button" 
                  className="web-action-btn plants"
                  onClick={() => onNavigateToPlants && onNavigateToPlants({
                    plantId: targetPlant ? targetPlant.id : (plants?.[0]?.id || 'P-001'),
                    disease: analysisResult.diseaseName
                  })}
                >
                  <FolderHeart size={18} />
                  <div style={{ textAlign: 'left' }}>
                    <span className="btn-main-txt">Ouvrir le Dossier des Cultures</span>
                    <span className="btn-sub-txt">Consulter l'historique et la parcelle</span>
                  </div>
                  <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
                </button>

                <button 
                  type="button" 
                  className="web-action-btn assistant"
                  onClick={() => onNavigateToAssistant && onNavigateToAssistant({
                    initialQuery: `Comment traiter efficacement la maladie "${analysisResult.diseaseName}" (${analysisResult.pathogen}) détectée lors de mon diagnostic ?`
                  })}
                >
                  <Mic size={18} />
                  <div style={{ textAlign: 'left' }}>
                    <span className="btn-main-txt">Demander conseil à l'Assistant Vocal</span>
                    <span className="btn-sub-txt">Discussion multilingue et remèdes bio</span>
                  </div>
                  <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
                </button>
              </div>

              {/* Bouton d'enregistrement dans le carnet */}
              <button 
                type="button" 
                className={`web-btn-save-record ${hasSavedDiagnostic ? 'saved' : ''}`}
                onClick={() => {
                  setHasSavedDiagnostic(true);
                  if (onSaveDiagnosticToPlant) {
                    onSaveDiagnosticToPlant({
                      plantId: targetPlant ? targetPlant.id : (plants?.[0]?.id || 'P-001'),
                      status: analysisResult.status,
                      statusLabel: analysisResult.statusLabel,
                      diseaseName: analysisResult.diseaseName,
                      confidence: analysisResult.confidence,
                      remedies: analysisResult.remedies,
                      date: new Date().toLocaleDateString('fr-FR')
                    });
                  }
                }}
              >
                <BookmarkCheck size={18} />
                <span>
                  {hasSavedDiagnostic 
                    ? "Diagnostic enregistré avec succès dans le carnet de santé !" 
                    : "Enregistrer ce diagnostic dans le carnet de santé de la plante"}
                </span>
              </button>
            </div>
          ) : (
            <div className="web-card scan-awaiting-card">
              <div className="awaiting-icon-box">
                <ScanLine size={32} color="#10b981" />
              </div>
              <h3 className="awaiting-title">Prêt pour le diagnostic phytosanitaire</h3>
              <p className="awaiting-desc">
                Le système est en attente. Positionnez une feuille dans le viseur de gauche ou testez un échantillon, puis cliquez sur <strong>« Lancer le diagnostic IA de cette feuille »</strong>.
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button 
                  type="button" 
                  className="web-btn-chip-sample"
                  onClick={() => handleSelectSample('infected', '/assets/sample_infected_leaf.jpg')}
                >
                  🍂 Tester avec une feuille atteinte (Cercospora)
                </button>
                <button 
                  type="button" 
                  className="web-btn-chip-sample healthy"
                  onClick={() => handleSelectSample('healthy', '/assets/comparaison_saine.jpg')}
                >
                  🌿 Tester avec une feuille saine
                </button>
              </div>
            </div>
          )}

          {/* =========================================================
              ATLAS COMPARATIF DES SYMPTÔMES FOLIAIRES
              Images parfaitement cadrées, belles et sans dépassement
              ========================================================= */}
          <div className="web-card comparison-web-card">
            <div className="comparison-header">
              <h4 className="comparison-card-title">
                Atlas Comparatif des Symptômes Foliaires
              </h4>
              <span className="comparison-subtitle">
                Référence visuelle haute résolution pour validation terrain
              </span>
            </div>

            <div className="web-comparison-grid">
              {/* Feuille témoin saine */}
              <div className="web-compare-item">
                <div className="web-compare-img-wrapper">
                  <img 
                    src="/assets/comparaison_saine.jpg" 
                    alt="Feuille témoin saine" 
                    className="web-compare-img"
                  />
                </div>
                <div className="web-compare-badge healthy">
                  <Check size={13} />
                  <span>Feuille témoin saine</span>
                </div>
                <p className="web-compare-desc">
                  Tissu foliaire vert vigoureux, stomates ouverts, absence de nécrose ou de tache.
                </p>
              </div>

              {/* Feuille atteinte */}
              <div className="web-compare-item">
                <div className="web-compare-img-wrapper">
                  <img 
                    src="/assets/comparaison_malade.jpg" 
                    alt="Feuille atteinte (Infection active)" 
                    className="web-compare-img"
                  />
                </div>
                <div className="web-compare-badge infected">
                  <AlertTriangle size={13} />
                  <span>Feuille atteinte (Infection active)</span>
                </div>
                <p className="web-compare-desc">
                  Taches circulaires nécrotiques bordées de halos chlorotiques caractéristiques de Cercospora.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
