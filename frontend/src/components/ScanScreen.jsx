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
  ScanLine,
  ChevronDown,
  ChevronUp
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
  const [currentImage, setCurrentImage] = useState('/assets/sample_infected_leaf.png');
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [hasSavedDiagnostic, setHasSavedDiagnostic] = useState(false);
  const [isSavingDiagnostic, setIsSavingDiagnostic] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Choix direct de la culture cible si aucune n'est pré-sélectionnée
  const [selectedTargetId, setSelectedTargetId] = useState(
    targetPlant?.id || plants[0]?.id || ''
  );

  // Affichage progressif (Voir plus / Atlas repliable)
  const [showFullResult, setShowFullResult] = useState(false);
  const [showAtlas, setShowAtlas] = useState(false);

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
    if (targetPlant?.id) {
      setSelectedTargetId(targetPlant.id);
    } else if (!selectedTargetId && plants.length > 0) {
      setSelectedTargetId(plants[0].id);
    }
  }, [targetPlant, plants]);

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

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

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

  const handleTriggerScan = async (sampleType = 'default', specificImage = null) => {
    let imgToAnalyze = specificImage || currentImage;

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
    setShowFullResult(false);

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

  const handleSampleDropdown = (e) => {
    const val = e.target.value;
    if (!val) return;
    setUseCameraStream(false);
    if (val === 'infected') {
      setCurrentImage('/assets/sample_infected_leaf.jpg');
      handleTriggerScan('infected', '/assets/sample_infected_leaf.jpg');
    } else if (val === 'healthy') {
      setCurrentImage('/assets/comparaison_saine.jpg');
      handleTriggerScan('healthy', '/assets/comparaison_saine.jpg');
    }
    e.target.value = '';
  };

  const activePlantObj = targetPlant || plants.find(p => p.id === selectedTargetId) || plants[0] || null;

  const handleSaveDiagnostic = async () => {
    if (!onSaveDiagnosticToPlant || isSavingDiagnostic) return;

    const plantIdToSave = activePlantObj?.id || 'P-001';
    setIsSavingDiagnostic(true);
    setSaveError('');
    try {
      await onSaveDiagnosticToPlant({
        plantId: plantIdToSave,
        status: analysisResult.status,
        statusLabel: analysisResult.statusLabel,
        diseaseName: analysisResult.diseaseName,
        confidence: analysisResult.confidence,
        remedies: analysisResult.remedies,
        date: new Date().toLocaleDateString('fr-FR')
      });
      setHasSavedDiagnostic(true);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSavingDiagnostic(false);
    }
  };

  const allRemedies = analysisResult.remedies || [];
  const visibleRemedies = showFullResult ? allRemedies : allRemedies.slice(0, 1);

  return (
    <div className="web-page-container">
      {/* En-tête simple */}
      <div className="web-page-header">
        <div>
          <div className="web-breadcrumb">
            <span>Accueil</span>
            <span>/</span>
            <span className="current">Diagnostic IA</span>
          </div>
          <h1 className="web-page-title">Scanner une feuille</h1>
          <p className="web-page-subtitle">
            Prenez une photo ou choisissez une image de feuille pour vérifier si votre plante est en bonne santé.
          </p>
        </div>

        {/* Sélecteur de culture cible clair */}
        {targetPlant ? (
          <div className="web-target-plant-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="web-target-icon">
                <Sprout size={20} />
              </div>
              <div>
                <span className="web-target-tag">Culture sélectionnée</span>
                <strong className="web-target-title">{targetPlant.name}</strong>
                <span className="web-target-meta">{targetPlant.plot}</span>
              </div>
            </div>
            {onClearTargetPlant && (
              <button 
                type="button" 
                className="web-btn-change-clt"
                onClick={onClearTargetPlant}
                title="Changer de culture"
              >
                ✕ Changer
              </button>
            )}
          </div>
        ) : plants.length > 0 && (
          <div className="ux-scan-plant-picker">
            <Sprout size={18} color="#059669" />
            <label htmlFor="scan-target-select" className="lang-label">Culture :</label>
            <select
              id="scan-target-select"
              className="ux-lang-select"
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.plot})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grille 2 colonnes */}
      <div className="web-scan-grid">
        {/* COLONNE GAUCHE : PHOTO & LANCEMENT */}
        <div className="web-card scan-left-card">
          <div className="card-section-header">
            <h3>1. Image de la feuille</h3>
            <span className="badge-model-info">
              {isScanning ? "Analyse..." : hasScanned ? "Terminé" : "Prêt"}
            </span>
          </div>

          {/* Viseur épuré */}
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
                alt="Feuille à analyser" 
                className="web-preview-img"
              />
            )}

            <div className="viewfinder-bracket bracket-tl" />
            <div className="viewfinder-bracket bracket-tr" />
            <div className="viewfinder-bracket bracket-bl" />
            <div className="viewfinder-bracket bracket-br" />

            {isScanning && <div className="scan-laser-line" />}

            <div className="viewfinder-hud-overlay">
              <span className="hud-badge">
                {useCameraStream ? "● Caméra directe" : "● Aperçu photo"}
              </span>
            </div>
          </div>

          {/* Boutons Caméra / Galerie */}
          <div className="viewfinder-actions-toolbar">
            <button 
              type="button" 
              className={`web-toolbar-btn ${useCameraStream ? 'active' : ''}`}
              onClick={() => setUseCameraStream(!useCameraStream)}
            >
              <Camera size={16} />
              <span>{useCameraStream ? "Fermer caméra" : "Utiliser caméra"}</span>
            </button>

            <button 
              type="button" 
              className="web-toolbar-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              <span>Choisir une photo</span>
            </button>

            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
            />
          </div>

          {/* Barre de progression simple */}
          {isScanning && (
            <div className="web-progress-block">
              <div className="web-progress-labels">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} className="progress-spinner" color="#10b981" />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Examen de la feuille en cours...
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
          )}

          {/* Bouton principal */}
          <div className="scan-action-triggers">
            <button 
              type="button" 
              className="web-btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => handleTriggerScan('default')}
              disabled={isScanning}
            >
              <Camera size={18} />
              <span>
                {isScanning 
                  ? "Analyse en cours..." 
                  : useCameraStream
                    ? "Capturer et analyser"
                    : hasScanned 
                      ? "Analyser à nouveau" 
                      : "Lancer le diagnostic"}
              </span>
            </button>

            {/* Menu déroulant discret pour tester un exemple */}
            <div className="ux-sample-dropdown-row">
              <select
                aria-label="Tester avec une image d'exemple"
                className="ux-sample-select"
                defaultValue=""
                onChange={handleSampleDropdown}
                disabled={isScanning}
              >
                <option value="" disabled>Essayer avec un exemple de feuille...</option>
                <option value="infected">🍂 Exemple : Feuille malade (Ex: Tomate)</option>
                <option value="healthy">🌿 Exemple : Feuille saine (Ex: Tomate)</option>
              </select>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : RÉSULTAT CLAIR & PROGRESSIF */}
        <div className="web-scan-right-col">
          {hasScanned || isScanning ? (
            <div className="web-card scan-result-card">
              <div className="result-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className={`status-icon-circle ${analysisResult.status === 'saine' ? 'success' : 'danger'}`}>
                    {analysisResult.status === 'saine' ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
                  </div>
                  <div>
                    <span className={analysisResult.status === 'saine' ? 'web-badge-success' : 'web-badge-danger'}>
                      {analysisResult.statusLabel}
                    </span>
                    <h2 className="disease-headline">{analysisResult.diseaseName}</h2>
                  </div>
                </div>

                <div className="confidence-gauge-box">
                  <span className="confidence-label">Fiabilité</span>
                  <span className="confidence-value">{analysisResult.confidence}</span>
                </div>
              </div>

              {/* Action prioritaire (1er conseil) */}
              <div className="remedies-section">
                <h4 className="remedies-title">
                  <Activity size={17} color="#10b981" />
                  <span>{showFullResult ? 'Conseils et actions recommandées :' : 'Action prioritaire recommandée :'}</span>
                </h4>
                <ul className="remedies-list">
                  {visibleRemedies.map((remedy, i) => (
                    <li key={i} className="remedy-item">
                      <div className="remedy-bullet">{i + 1}</div>
                      <span>{remedy}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Détails techniques masqués par défaut */}
              {showFullResult && (
                <div className="pathogen-specs-grid">
                  <div className="spec-item">
                    <span className="spec-label">Cause identifiée</span>
                    <strong className="spec-val">{analysisResult.pathogen}</strong>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Niveau de risque</span>
                    <strong className="spec-val" style={{ color: analysisResult.status === 'saine' ? '#059669' : analysisResult.status === 'surveiller' ? '#d97706' : '#e11d48' }}>
                      {analysisResult.severity}
                    </strong>
                  </div>
                </div>
              )}

              {(allRemedies.length > 1 || analysisResult.pathogen) && (
                <button
                  type="button"
                  className="ux-see-more-btn"
                  onClick={() => setShowFullResult(prev => !prev)}
                >
                  {showFullResult ? (
                    <><ChevronUp size={15} /><span>Masquer les détails</span></>
                  ) : (
                    <><ChevronDown size={15} /><span>Voir plus ({allRemedies.length - 1} autre{allRemedies.length - 1 > 1 ? 's' : ''} conseil{allRemedies.length - 1 > 1 ? 's' : ''} & détails)</span></>
                  )}
                </button>
              )}

              {/* Bouton d'enregistrement principal */}
              <button 
                type="button" 
                className={`web-btn-save-record ${hasSavedDiagnostic ? 'saved' : ''}`}
                onClick={handleSaveDiagnostic}
                disabled={isSavingDiagnostic || hasSavedDiagnostic || (!activePlantObj && plants.length === 0)}
              >
                <BookmarkCheck size={18} />
                <span>
                  {isSavingDiagnostic
                    ? 'Enregistrement en cours...'
                    : hasSavedDiagnostic
                      ? `Enregistré dans la fiche de ${activePlantObj?.name || 'la culture'} !` 
                      : `Enregistrer dans la fiche (${activePlantObj?.name || 'Culture'})`}
                </span>
              </button>
              {saveError && <div className="auth-alert-box danger" role="alert">{saveError}</div>}

              {/* Raccourcis secondaires */}
              <div className="web-action-buttons-group">
                <button 
                  type="button" 
                  className="web-action-btn assistant"
                  onClick={() => onNavigateToAssistant && onNavigateToAssistant({
                    initialQuery: `Comment soigner "${analysisResult.diseaseName}" sur ma culture ?`
                  })}
                >
                  <Mic size={18} />
                  <div style={{ textAlign: 'left' }}>
                    <span className="btn-main-txt">Demander à l'assistant</span>
                    <span className="btn-sub-txt">Explications vocales</span>
                  </div>
                  <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
                </button>

                <button 
                  type="button" 
                  className="web-action-btn plants"
                  onClick={() => onNavigateToPlants && onNavigateToPlants({
                    plantId: activePlantObj?.id || 'P-001',
                    disease: analysisResult.diseaseName
                  })}
                >
                  <FolderHeart size={18} />
                  <div style={{ textAlign: 'left' }}>
                    <span className="btn-main-txt">Voir le dossier</span>
                    <span className="btn-sub-txt">Historique de la plante</span>
                  </div>
                  <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
                </button>
              </div>
            </div>
          ) : (
            /* Guide simple en 3 étapes avant le premier scan */
            <div className="web-card scan-awaiting-card">
              <div className="awaiting-icon-box">
                <ScanLine size={30} color="#10b981" />
              </div>
              <h3 className="awaiting-title">Comment faire un diagnostic ?</h3>
              <div className="ux-scan-steps">
                <div className="ux-scan-step-item">
                  <span className="ux-step-num">1</span>
                  <span>Prenez une photo nette d'une feuille ou choisissez une image à gauche.</span>
                </div>
                <div className="ux-scan-step-item">
                  <span className="ux-step-num">2</span>
                  <span>Appuyez sur le bouton vert <strong>« Lancer le diagnostic »</strong>.</span>
                </div>
                <div className="ux-scan-step-item">
                  <span className="ux-step-num">3</span>
                  <span>Découvrez l'état de la plante et enregistrez le résultat dans son carnet.</span>
                </div>
              </div>
            </div>
          )}

          {/* Atlas comparatif repliable pour alléger l'écran */}
          <div className="web-card comparison-web-card">
            <button
              type="button"
              className="ux-atlas-toggle-btn"
              onClick={() => setShowAtlas(prev => !prev)}
              aria-expanded={showAtlas}
            >
              <div style={{ textAlign: 'left' }}>
                <h4 className="comparison-card-title" style={{ margin: 0 }}>
                  Comparer avec des feuilles témoins
                </h4>
                <span className="comparison-subtitle">
                  Exemple visuel entre une feuille saine et une feuille malade
                </span>
              </div>
              {showAtlas ? <ChevronUp size={20} color="#059669" /> : <ChevronDown size={20} color="#059669" />}
            </button>

            {showAtlas && (
              <div className="web-comparison-grid" style={{ marginTop: '12px' }}>
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
                    <span>Feuille saine</span>
                  </div>
                  <p className="web-compare-desc">
                    Couleur verte uniforme, sans tache ni jaunissement.
                  </p>
                </div>

                <div className="web-compare-item">
                  <div className="web-compare-img-wrapper">
                    <img 
                      src="/assets/comparaison_malade.jpg" 
                      alt="Feuille atteinte" 
                      className="web-compare-img"
                    />
                  </div>
                  <div className="web-compare-badge infected">
                    <AlertTriangle size={13} />
                    <span>Feuille malade</span>
                  </div>
                  <p className="web-compare-desc">
                    Présence de taches brunes entourées d'un halo jaune.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
