import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Calendar, 
  Clock, 
  Sprout, 
  Activity, 
  Plus, 
  AlertCircle, 
  FileText, 
  Camera, 
  Mic, 
  ArrowRight,
  Droplets,
  Thermometer,
  MapPin,
  TrendingUp,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
   MoreVertical
} from 'lucide-react';
import { INITIAL_PLANTS } from '../data/mockData';
import { ClimateAgronomyPanel, ClimateHistoryHint, ClimateCarePanel } from '../components/ClimatePanels';
import { useClimateRisks } from '../hooks/useClimateRisks';

const API_BASE_URL = "https://phytoscan-sn.onrender.com";

const getPlantImage = (plant) => {
  const imagePath =
    plant?.image_url ||
    plant?.imageUrl ||
    plant?.image ||
    "";

  const finalUrl =
    !imagePath ||
    ["string", "null", "undefined"].includes(
      String(imagePath).trim().toLowerCase()
    )
      ? "/assets/plante_1.jpg"
      : imagePath.startsWith("http://") ||
        imagePath.startsWith("https://") ||
        imagePath.startsWith("/assets/")
        ? imagePath
        : `${API_BASE_URL}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;

  return finalUrl;
};

const getLatestDiagnosticImage = (plant) => {
  const latestScan = plant?.history?.find(
    (h) => h.type === "Scan IA" && h.imageUrl
  );

  return latestScan
    ? getPlantImage({ imageUrl: latestScan.imageUrl })
    : getPlantImage(plant);
};


export default function PlantRecordsScreen({ 
  plants = INITIAL_PLANTS, 
  onCreatePlant,
  initialPlantId = 'P-001',
  onNavigateToScan, 
  onNavigateToAssistant,
  onUpdatePlant,
  onDeletePlant
}) {
  const [plantList, setPlantList] = useState(plants);
  const [selectedPlantId, setSelectedPlantId] = useState(initialPlantId || 'P-001');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'alerts' | 'healthy'
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'history' | 'care' | 'observations'
  
  // États "Voir plus" pour épurer chaque onglet
  const [expandDetails, setExpandDetails] = useState(false);
  const [expandHistory, setExpandHistory] = useState(false);
  const [expandCare, setExpandCare] = useState(false);
  const [expandObs, setExpandObs] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSavingPlant, setIsSavingPlant] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [airHumidity, setAirHumidity] = useState('');

  // Edition & Suppression
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', species: '', variety: '', plot: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Formulaire d'ajout
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantSpecies, setNewPlantSpecies] = useState('Tomate (Solanum lycopersicum)');
  const [newPlantVariety, setNewPlantVariety] = useState('Roma VF');
  const [newPlantPlot, setNewPlantPlot] = useState('Parcelle C2');
  const { weather } = useClimateRisks();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


    useEffect(() => {
    setMenuOpen(false);
  }, [selectedPlantId]);



  useEffect(() => {
    if (weather && airHumidity === '') setAirHumidity(String(Math.round(weather.humidity)));
  }, [weather]);

  useEffect(() => {
    if (initialPlantId) {
      setSelectedPlantId(initialPlantId);
    }
  }, [initialPlantId]);

  useEffect(() => {
    if (plants) {
      setPlantList(plants);
    }
  }, [plants]);

  // Réinitialiser les "Voir plus" quand on change de plante
  useEffect(() => {
    setExpandDetails(false);
    setExpandHistory(false);
    setExpandCare(false);
    setExpandObs(false);
  }, [selectedPlantId]);

  const selectedPlant = plantList.find(p => p.id === selectedPlantId) || plantList[0] || null;

  // Statistiques Dashboard rapides
  const totalCount = plantList.length;
  const healthyCount = plantList.filter(p => p.status === 'saine' && !p.alert).length;
  const alertCount = totalCount - healthyCount;

  const openEditModal = (plant) => {
    if (!plant) return;
    setEditForm({
      name: plant.name || '',
      species: plant.species || '',
      variety: plant.variety || '',
      plot: plant.plot || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlant || !editForm.name.trim()) return;
    setIsSavingPlant(true);
    try {
      if (onUpdatePlant) {
        const updated = await onUpdatePlant(selectedPlant.id, editForm);
        setPlantList(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      } else {
        setPlantList(prev =>
          prev.map(p => (p.id === selectedPlant.id ? { ...p, ...editForm } : p))
        );
      }
      setShowEditModal(false);
    } finally {
      setIsSavingPlant(false);
    }
  };

  const handleDeleteClick = async (plant) => {
    if (!plant) return;
    if (!window.confirm(`Voulez-vous vraiment supprimer "${plant.name}" (${plant.id}) ?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      if (onDeletePlant) {
        await onDeletePlant(plant.id);
      }
      const remaining = plantList.filter(p => p.id !== plant.id);
      setPlantList(remaining);
      setSelectedPlantId(remaining[0]?.id || '');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPlants = plantList.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.plot.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'healthy') return p.status === 'saine' && !p.alert;
    if (statusFilter === 'alerts') return p.status !== 'saine' || Boolean(p.alert);
    return true;
  });

  const handleAddPlant = async (e) => {
    e.preventDefault();
    if (!newPlantName.trim() || !onCreatePlant) return;

    const speciesImage = newPlantSpecies.toLowerCase().includes("tomate")
      ? "/assets/plante_2.jpg"
      : newPlantSpecies.toLowerCase().includes("pomme de terre") || newPlantSpecies.toLowerCase().includes("poivron")
        ? "/assets/plante_3.jpg"
        : "/assets/plante_1.jpg";
    setIsSavingPlant(true);
    setSaveError('');
    try {
      const createdPlant = await onCreatePlant({
        name: newPlantName.trim(),
        species: newPlantSpecies,
        variety: newPlantVariety.trim() || null,
        plot: newPlantPlot.trim() || null,
        image: speciesImage
      });
      setPlantList(previous => [createdPlant, ...previous]);
      setSelectedPlantId(createdPlant.id);
      setShowAddModal(false);
      setNewPlantName('');
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSavingPlant(false);
    }
  };

  const historyList = selectedPlant?.history || [];
  const visibleHistory = expandHistory ? historyList : historyList.slice(0, 2);

  const careList = selectedPlant?.care || [];
  const visibleCare = expandCare ? careList : careList.slice(0, 2);

  const obsList = selectedPlant?.observations || [];
  const visibleObs = expandObs ? obsList : obsList.slice(0, 2);

  return (
    <div className="web-page-container">
      {/* En-tête épuré */}
      <div className="web-page-header">
        <div>
          <div className="web-breadcrumb">
            <span>Accueil</span>
            <span>/</span>
            <span className="current">Dossier des cultures</span>
          </div>
          <h1 className="web-page-title">Tableau de Bord des Cultures</h1>
          <p className="web-page-subtitle">
            Sélectionnez une plante à gauche pour voir son état de santé, lancer un scan ou demander conseil.
          </p>
        </div>

        <button 
          type="button" 
          className="web-btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} />
          <span>Nouvelle culture</span>
        </button>
      </div>

      {/* Synthèse Dashboard 3 KPIs */}
      <div className="ux-kpi-strip">
        <div 
          className={`ux-kpi-card ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="ux-kpi-icon neutral">
            <Sprout size={20} />
          </div>
          <div>
            <span className="ux-kpi-value">{totalCount}</span>
            <span className="ux-kpi-label">Cultures suivies</span>
          </div>
        </div>

        <div 
          className={`ux-kpi-card ${statusFilter === 'healthy' ? 'active' : ''}`}
          onClick={() => setStatusFilter('healthy')}
        >
          <div className="ux-kpi-icon success">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="ux-kpi-value">{healthyCount}</span>
            <span className="ux-kpi-label">En bonne santé</span>
          </div>
        </div>

        <div 
      
          className={`ux-kpi-card ${statusFilter === 'alerts' ? 'active' : ''}`}
          onClick={() => setStatusFilter('alerts')}
        >
          <div className="ux-kpi-icon danger">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="ux-kpi-value">{alertCount}</span>
            <span className="ux-kpi-label">À surveiller / Malades</span>
          </div>
        </div>
      </div>

      {/* Grille principale 2 colonnes */}
      <div className="web-plants-grid">
        {/* COLONNE GAUCHE : LISTE SIMPLIFIÉE */}
        <div className="web-card plants-sidebar-card">
          <div className="sidebar-header-row">
            <h3>Vos cultures</h3>
            <span className="sidebar-count">{filteredPlants.length} affichée{filteredPlants.length > 1 ? 's' : ''}</span>
          </div>

          <div className="web-search-bar">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              className="web-search-input" 
              placeholder="Chercher une plante ou parcelle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filtres rapides en 1 clic */}
          <div className="ux-filter-pills">
            <button 
              type="button" 
              className={`ux-filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Toutes ({totalCount})
            </button>
            <button 
              type="button" 
              className={`ux-filter-pill ${statusFilter === 'alerts' ? 'active' : ''}`}
              onClick={() => setStatusFilter('alerts')}
            >
              Alertes ({alertCount})
            </button>
            <button 
              type="button" 
              className={`ux-filter-pill ${statusFilter === 'healthy' ? 'active' : ''}`}
              onClick={() => setStatusFilter('healthy')}
            >
              Saines ({healthyCount})
            </button>
          </div>

          <div className="web-plants-list">
            {filteredPlants.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.88rem', padding: '20px 0' }}>
                Aucune culture ne correspond à ce filtre.
              </p>
            ) : (
              filteredPlants.map((plant) => (
                <div 
                  key={plant.id} 
                  className={`web-plant-list-item ${selectedPlant?.id === plant.id ? 'active' : ''}`}
                  onClick={() => setSelectedPlantId(plant.id)}
                >
                  <img
                    src={getLatestDiagnosticImage(plant)}
                    alt={plant.name || plant.id}
                    className="item-avatar-img"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/assets/plante_1.jpg";
                    }}
                  />
                  <div className="item-info-col">
                    <div className="item-title-row">
                      <span className="item-name">{plant.name}</span>
                      <span className={`status-pill-small ${plant.status}`}>
                        ● {plant.statusLabel}
                      </span>
                    </div>
                    <span className="item-species">{(plant.species || '').split('(')[0].trim()}</span>
                    <div className="item-meta-row">
                      <span className="item-plot">
                        <MapPin size={11} /> {plant.plot}
                      </span>
                      <span className="item-id-pill">{plant.id}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNE DROITE : FICHE CLAIRE ET GUIDÉE */}
        <div className="web-plant-main-dossier">
          {!selectedPlant ? (
            <div className="web-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
              <Sprout size={48} color="#10b981" style={{ margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '8px' }}>Aucune culture sélectionnée</h3>
              <p style={{ maxWidth: '420px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
                Choisissez une plante dans la liste à gauche ou ajoutez-en une nouvelle.
              </p>
              <button 
                type="button" 
                className="web-btn-primary"
                style={{ margin: '0 auto' }}
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} />
                <span>Ajouter une culture</span>
              </button>
            </div>
          ) : (
            <>
              {/* Carte identité + actions intégrées proprement */}
              <div className="web-card plant-hero-web-card">
               {/* Modifier / Supprimer rangés dans un menu */}
                               <div className="ps-menu-wrap" ref={menuRef}>
                                 <button
                                   type="button"
                                   className="ps-btn ps-btn--ghost ps-btn--icon"
                                   aria-label="Plus d'actions"
                                   aria-expanded={menuOpen}
                                   onClick={() => setMenuOpen(o => !o)}
                                 >
                                   <MoreVertical size={18} />
                                 </button>
                                 {menuOpen && (
                                   <div className="ps-menu" role="menu">
                                     <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); openEditModal(selectedPlant); }}>
                                       <Edit3 size={16} /> Modifier la culture
                                     </button>
                                     <button
                                       type="button" role="menuitem" className="is-danger" disabled={isDeleting}
                                       onClick={() => { setMenuOpen(false); handleDeleteClick(selectedPlant); }}
                                     >
                                       <Trash2 size={16} /> {isDeleting ? 'Suppression...' : 'Supprimer la culture'}
                                     </button>
                                   </div>
                                 )}
                               </div>

                <div className="plant-hero-content-row">
                  <img 
                    src={getLatestDiagnosticImage(selectedPlant)}
                    alt={selectedPlant.id || "Image de la plante"}
                    className='plant-hero-web-img'
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/assets/plante_1.jpg";
                    }}
                  />
            
                  <div className="plant-hero-web-info">
                    <h2 className="plant-display-title">{selectedPlant.name}</h2>
                    <p className="plant-display-species">
                      {selectedPlant.species} {selectedPlant.variety ? `• Variété ${selectedPlant.variety}` : ''}
                    </p>

                    <div className="health-score-inline-bar">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, color: '#475569' }}>État de santé global</span>
                        <strong style={{ color: selectedPlant.healthScore > 80 ? '#059669' : '#e11d48' }}>
                          {selectedPlant.healthScore} / 100
                        </strong>
                      </div>
                      <div className="progress-track" style={{ height: '8px' }}>
                        <div 
                          className="progress-bar-fill" 
                          style={{ 
                            width: `${selectedPlant.healthScore}%`,
                            background: selectedPlant.healthScore > 80 ? '#10b981' : selectedPlant.healthScore > 60 ? '#f59e0b' : '#ef4444' 
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alerte sanitaire claire */}
                {selectedPlant.alert && (
                  <div className="web-plant-alert-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertCircle size={20} color="#e11d48" />
                      <div>
                        <strong style={{ display: 'block', color: '#9f1239', fontSize: '0.9rem' }}>
                          Attention requise
                        </strong>
                        <span style={{ color: '#be123c', fontSize: '0.84rem' }}>{selectedPlant.alert}</span>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      className="web-btn-chip-action danger"
                      onClick={() => onNavigateToAssistant && onNavigateToAssistant({
                        initialQuery: `Alerte sur ${selectedPlant.name} (${selectedPlant.species}) : "${selectedPlant.alert}". Que dois-je faire tout de suite ?`
                      })}
                    >
                      <Mic size={14} />
                      <span>Demander le traitement</span>
                    </button>
                  </div>
                )}

                {/* Deux actions principales simples */}
                <div className="plant-dossier-actions-bar">
                  <button 
                    type="button" 
                    className="web-action-btn plants"
                    onClick={() => onNavigateToScan && onNavigateToScan({ targetPlant: selectedPlant })}
                  >
                    <Camera size={20} />
                    <div style={{ textAlign: 'left'}}>
                      <span className="btn-main-txt">Scanner une feuille</span>
                      <span className="btn-sub-txt">Vérifier par model EfficientNetB0 v3</span>
                    </div>
                    <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
                  </button>

                  <button 
                    type="button" 
                    className="web-action-btn assistant"
                    onClick={() => onNavigateToAssistant && onNavigateToAssistant({
                      initialQuery: `Quels soins dois-je apporter à ma culture "${selectedPlant.name}" (${selectedPlant.species}) ?`
                    })}
                  >
                    <Mic size={20} />
                    <div style={{ textAlign: 'left' }}>
                      <span className="btn-main-txt">Poser une question à l'assistant IA</span>
                      <span className="btn-sub-txt">Conseils vocaux ou écrits</span>
                    </div>
                    <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
                  </button>
                </div>
              </div>

              {/* Onglets avec affichage progressif ("Voir plus") */}
              <div className="web-card plant-tabs-web-card">
                <div className="web-tabs-header">
                  <button 
                    type="button" 
                    className={`web-tab-nav-btn ${activeTab === 'details' ? 'active' : ''}`}
                    onClick={() => setActiveTab('details')}
                  >
                    <FileText size={16} />
                    <span>Infos & Climat</span>
                  </button>

                  <button 
                    type="button" 
                    className={`web-tab-nav-btn ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                  >
                    <Activity size={16} />
                    <span>Historique ({historyList.length})</span>
                  </button>

                  <button 
                    type="button" 
                    className={`web-tab-nav-btn ${activeTab === 'care' ? 'active' : ''}`}
                    onClick={() => setActiveTab('care')}
                  >
                    <Droplets size={16} />
                    <span>Soins prévus ({careList.length})</span>
                  </button>

                  <button 
                    type="button" 
                    className={`web-tab-nav-btn ${activeTab === 'observations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('observations')}
                  >
                    <Clock size={16} />
                    <span>Notes terrain ({obsList.length})</span>
                  </button>
                </div>

                {/* ONGLET 1 : INFOS & CLIMAT (3 premières infos + Voir plus) */}
                {activeTab === 'details' && (
                  <div className="tab-pane-content">
                    <div className="web-meta-cards-grid">
                      <div className="meta-card-item">
                        <div className="meta-icon-box"><Sprout size={18} /></div>
                        <div>
                          <span className="meta-card-label">Stade actuel</span>
                          <strong className="meta-card-val">{selectedPlant.growthStage}</strong>
                        </div>
                      </div>

                      <div className="meta-card-item">
                        <div className="meta-icon-box"><Droplets size={18} /></div>
                        <div>
                          <span className="meta-card-label">Humidité de l'air</span>
                          <strong className="meta-card-val">{weather ? `${Math.round(weather.humidity)} °C` : (selectedPlant.details?.soilMoisture || 'N/A')}</strong>
                        </div>
                      </div>

                      <div className="meta-card-item">
                        <div className="meta-icon-box"><Thermometer size={18} /></div>
                        <div>
                          <span className="meta-card-label">Température</span>
                          <strong className="meta-card-val">
                            {weather ? `${Math.round(weather.temperature)} °C` : (selectedPlant.details?.temperature || 'N/A')}
                          </strong>
                        </div>
                      </div>

                      {expandDetails && (
                        <>
                          <div className="meta-card-item">
                            <div className="meta-icon-box"><Calendar size={18} /></div>
                            <div>
                              <span className="meta-card-label">Plantation</span>
                              <strong className="meta-card-val">{selectedPlant.plantingDate}</strong>
                            </div>
                          </div>

                          {/* <div className="meta-card-item">
                            <div className="meta-icon-box"><TrendingUp size={18} /></div>
                            <div>
                              <span className="meta-card-label">Rendement estimé</span>
                              <strong className="meta-card-val">{selectedPlant.details?.yieldEstimate || 'N/A'}</strong>
                            </div>
                          </div> */}



                          <div className="meta-card-item">
                            <div className="meta-icon-box"><Clock size={18} /></div>
                            <div>
                              <span className="meta-card-label">Dernier suivi</span>
                              <strong className="meta-card-val">{selectedPlant.lastObservation || 'N/A'}</strong>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {expandDetails && (
                      <div className="meta-notes-box">
                        <ClimateAgronomyPanel plant={selectedPlant} humidity={airHumidity} onHumidityChange={setAirHumidity} />
                        <div style={{ marginTop: '14px' }}>
                          <span className="notes-heading">Notes de suivi :</span>
                          <p style={{ fontSize: '0.9rem', color: '#334155' }}>
                            {selectedPlant.details?.notes || 'Aucune note particulière.'}
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="ux-see-more-btn"
                      onClick={() => setExpandDetails(prev => !prev)}
                    >
                      {expandDetails ? (
                        <>
                          <ChevronUp size={16} />
                          <span>Voir moins de détails</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={16} />
                          <span>Voir plus (Climat, rendement & notes)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* ONGLET 2 : HISTORIQUE (2 premiers éléments + Voir plus) */}
                {activeTab === 'history' && (
                  <div className="tab-pane-content">
                    {historyList.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Aucun diagnostic enregistré pour cette culture.</p>
                    ) : (
                      <>
                        <div className="web-timeline">
                          {visibleHistory.map((h, i) => (
                            <div key={h.id ?? i} className="timeline-entry">
                              <div className="timeline-bullet" />
                              <div className="timeline-card">
                                <div className="timeline-top">
                                  <span className="timeline-date">{h.date}</span>
                                  <span className="timeline-badge">{h.type}</span>
                                </div>
                                <h4 className="timeline-result">{h.result}</h4>
                                <p className="timeline-notes">{h.notes}</p>

                                {h.imageUrl && (
                                  <div className="timeline-image-container">
                                    <img
                                      src={getPlantImage({ imageUrl: h.imageUrl })}
                                      alt={selectedPlant.name || selectedPlant.id}
                                      className="timeline-history-image"
                                      loading="lazy"
                                      decoding="async"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = "/assets/plante_1.jpg";
                                      }}
                                    />
                                  </div>
                                )}

                                <ClimateHistoryHint plant={selectedPlant} entry={h} />
                              </div>
                            </div>
                          ))}
                        </div>

                        {historyList.length > 2 && (
                          <button
                            type="button"
                            className="ux-see-more-btn"
                            onClick={() => setExpandHistory(prev => !prev)}
                          >
                            {expandHistory ? (
                              <>
                                <ChevronUp size={16} />
                                <span>Voir moins</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={16} />
                                <span>Voir plus ({historyList.length - 2} autre{historyList.length - 2 > 1 ? 's' : ''})</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ONGLET 3 : SOINS PRÉVUS (2 premiers soins + Voir plus) */}
                {activeTab === 'care' && (
                  <div className="tab-pane-content">
                    <div className="care-tasks-grid">
                      {visibleCare.map((c, i) => (
                        <div key={i} className="care-task-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Droplets size={18} color="#059669" />
                            <div>
                              <strong className="task-name">{c.task}</strong>
                              <span className="task-freq">Fréquence : {c.frequency}</span>
                            </div>
                          </div>
                          <span className="task-status-pill">{c.status}</span>
                        </div>
                      ))}
                    </div>

                    {expandCare && (
                      <ClimateCarePanel plant={selectedPlant} humidity={airHumidity} onHumidityChange={setAirHumidity} />
                    )}

                    {(careList.length > 2 || !expandCare) && (
                      <button
                        type="button"
                        className="ux-see-more-btn"
                        onClick={() => setExpandCare(prev => !prev)}
                      >
                        {expandCare ? (
                          <>
                            <ChevronUp size={16} />
                            <span>Voir moins</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                            <span>
                              Voir plus {careList.length > 2 ? `(${careList.length - 2} soin${careList.length - 2 > 1 ? 's' : ''} & vigilance)` : '(Vigilance climatique)'}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* ONGLET 4 : OBSERVATIONS (2 premières notes + Voir plus) */}
                {activeTab === 'observations' && (
                  <div className="tab-pane-content">
                    {obsList.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Aucune observation enregistrée.</p>
                    ) : (
                      <>
                        <div className="observations-list">
                          {visibleObs.map((o, i) => (
                            <div key={i} className="observation-bubble">
                              <div className="obs-header">
                                <strong className="obs-author">{o.author}</strong>
                                <span className="obs-date">{o.date}</span>
                              </div>
                              <p className="obs-text">{o.text}</p>
                            </div>
                          ))}
                        </div>

                        {obsList.length > 2 && (
                          <button
                            type="button"
                            className="ux-see-more-btn"
                            onClick={() => setExpandObs(prev => !prev)}
                          >
                            {expandObs ? (
                              <>
                                <ChevronUp size={16} />
                                <span>Voir moins</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={16} />
                                <span>Voir plus ({obsList.length - 2} autre{obsList.length - 2 > 1 ? 's' : ''})</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sprout color="#10b981" />
                <h3 className="modal-title">Ajouter une nouvelle culture</h3>
              </div>
              <button className="screen-app-btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddPlant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {saveError && <div className="auth-alert-box danger" role="alert">{saveError}</div>}
              <div className="form-group">
                <label className="form-label">Nom de la culture *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Tomate Parcelle Nord"
                  value={newPlantName}
                  onChange={e => setNewPlantName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Espèce</label>
                <select 
                  className="form-input"
                  value={newPlantSpecies}
                  onChange={e => setNewPlantSpecies(e.target.value)}
                >
                  <option value="Tomate (Solanum lycopersicum)">Tomate (Solanum lycopersicum)</option>
                  <option value="Poivron (Capsicum annuum)">Poivron (Capsicum annuum)</option>
                  <option value="Pomme de terre (Solanum tuberosum)">Pomme de terre (Solanum tuberosum)</option>
                  <option value="Autre">Autre culture</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Variété</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newPlantVariety}
                    onChange={e => setNewPlantVariety(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Parcelle</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newPlantPlot}
                    onChange={e => setNewPlantPlot(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="web-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isSavingPlant}>
                  {isSavingPlant ? 'Enregistrement...' : 'Créer la fiche'}
                </button>
                <button 
                  type="button" 
                  className="mode-tab-btn" 
                  style={{ border: '1px solid #cbd5e1' }}
                  onClick={() => setShowAddModal(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de modification */}
      {showEditModal && selectedPlant && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} color="#10b981" />
                <h3 className="modal-title">Modifier {selectedPlant.name}</h3>
              </div>
              <button 
                type="button" 
                className="screen-app-btn-icon" 
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nom de la culture *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Espèce</label>
                <select 
                  className="form-input"
                  value={editForm.species}
                  onChange={(e) => setEditForm({ ...editForm, species: e.target.value })}
                >
                  <option value="Tomate (Solanum lycopersicum)">Tomate (Solanum lycopersicum)</option>
                  <option value="Poivron (Capsicum annuum)">Poivron (Capsicum annuum)</option>
                  <option value="Pomme de terre (Solanum tuberosum)">Pomme de terre (Solanum tuberosum)</option>
                  <option value="Autre">Autre culture</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Variété</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.variety}
                    onChange={(e) => setEditForm({ ...editForm, variety: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Parcelle</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.plot}
                    onChange={(e) => setEditForm({ ...editForm, plot: e.target.value })}
                  />
                </div>
              </div>

              {saveError && (
                <div className="auth-alert-box danger" style={{ fontSize: '0.82rem' }}>
                  {saveError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button 
                  type="submit" 
                  className="web-btn-primary" 
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={isSavingPlant}
                >
                  <span>{isSavingPlant ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
                <button
                  type="button"
                  className="mode-tab-btn"
                  style={{ border: '1px solid #cbd5e1', padding: '8px 16px' }}
                  onClick={() => setShowEditModal(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
