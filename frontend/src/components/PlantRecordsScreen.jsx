import { useState, useEffect } from 'react';
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
  TrendingUp
} from 'lucide-react';
import { INITIAL_PLANTS } from '../data/mockData';

export default function PlantRecordsScreen({ 
  plants = INITIAL_PLANTS, 
  onUpdatePlants,
  initialPlantId = 'P-001',
  onNavigateToScan, 
  onNavigateToAssistant 
}) {
  const [plantList, setPlantList] = useState(plants);
  const [selectedPlantId, setSelectedPlantId] = useState(initialPlantId || 'P-001');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'history' | 'care' | 'observations'
  const [showAddModal, setShowAddModal] = useState(false);

  // Formulaire d'ajout
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantSpecies, setNewPlantSpecies] = useState('Tomate (Solanum lycopersicum)');
  const [newPlantVariety, setNewPlantVariety] = useState('Roma VF');
  const [newPlantPlot, setNewPlantPlot] = useState('Parcelle C2');

  useEffect(() => {
    if (initialPlantId) {
      setSelectedPlantId(initialPlantId);
    }
  }, [initialPlantId]);

  useEffect(() => {
    if (plants && plants.length > 0) {
      setPlantList(plants);
    }
  }, [plants]);

  const selectedPlant = plantList.find(p => p.id === selectedPlantId) || plantList[0] || null;

  const filteredPlants = plantList.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.plot.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPlant = (e) => {
    e.preventDefault();
    if (!newPlantName.trim()) return;

    const nextNum = plantList.length + 1;
    const newId = `P-${String(nextNum).padStart(3, "0")}`;
    const speciesImage = newPlantSpecies.toLowerCase().includes("aubergine")
      ? "/assets/plante_2.jpg"
      : newPlantSpecies.toLowerCase().includes("piment") || newPlantSpecies.toLowerCase().includes("poivron")
        ? "/assets/plante_3.jpg"
        : "/assets/plante_1.jpg";
    const newPlantObj = {
      id: newId,
      name: newPlantName,
      species: newPlantSpecies,
      variety: newPlantVariety,
      status: "saine",
      statusLabel: "Saine",
      growthStage: "Semis / Végétatif",
      plantingDate: new Date().toLocaleDateString("fr-FR"),
      lastObservation: new Date().toLocaleDateString("fr-FR"),
      plot: newPlantPlot,
      waterSchedule: "Goutte-à-goutte (quotidien)",
      image: speciesImage,
      healthScore: 96,
      details: {
        yieldEstimate: "4.0 kg / pied",
        soilMoisture: "62%",
        temperature: "24°C",
        notes: "Culture enregistrée dans le carnet agronomique PhytoScan."
      },
      history: [
        { date: new Date().toLocaleDateString("fr-FR"), type: "Enregistrement", result: "Culture initialisée", notes: "Semis et repiquage validés." }
      ],
      care: [
        { task: "Arrosage matinal", frequency: "Quotidien", status: "En cours" },
        { task: "Paillage racinaire", frequency: "Mensuel", status: "À prévoir" }
      ],
      observations: [
        { date: new Date().toLocaleDateString("fr-FR"), author: "Agriculteur", text: "Plantation réalisée en conditions optimales." }
      ]
    };

    const updated = [newPlantObj, ...plantList];
    setPlantList(updated);
    if (onUpdatePlants) onUpdatePlants(updated);
    setSelectedPlantId(newId);
    setShowAddModal(false);
    setNewPlantName('');
  };

  return (
    <div className="web-page-container">
      {/* En-tête de page du site web */}
      <div className="web-page-header">
        <div>
          <div className="web-breadcrumb">
            <span>Accueil</span>
            <span>/</span>
            <span className="current">Dossier des cultures</span>
          </div>
          <h1 className="web-page-title">
            Dossier Numérique & Carnet de Santé des Cultures
          </h1>
          <p className="web-page-subtitle">
            Consultez le dossier individuel de vos parcelles, suivez les paramètres agronomiques en temps réel et planifiez vos interventions.
          </p>
        </div>

        <button 
          type="button" 
          className="web-btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} />
          <span>Ajouter une culture</span>
        </button>
      </div>

      {/* Grille principale 2 colonnes du site web */}
      <div className="web-plants-grid">
        {/* =========================================================
            COLONNE GAUCHE : RÉPERTOIRE DES PLANTES ET FILTRES
            ========================================================= */}
        <div className="web-card plants-sidebar-card">
          <div className="sidebar-header-row">
            <div>
              <h3>Répertoire des cultures</h3>
              <span className="sidebar-count">{filteredPlants.length} cultures suivies</span>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="web-search-bar">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              className="web-search-input" 
              placeholder="Rechercher par nom, espèce ou parcelle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Liste des cultures défilante */}
          <div className="web-plants-list">
            {filteredPlants.map((plant) => (
              <div 
                key={plant.id} 
                className={`web-plant-list-item ${selectedPlant?.id === plant.id ? 'active' : ''}`}
                onClick={() => setSelectedPlantId(plant.id)}
              >
                <img src={plant.image} alt={plant.name} className="item-avatar-img" />
                <div className="item-info-col">
                  <div className="item-title-row">
                    <span className="item-name">{plant.name}</span>
                    <span className="item-id-pill">{plant.id}</span>
                  </div>
                  <span className="item-species">{plant.species}</span>
                  <div className="item-meta-row">
                    <span className="item-plot">
                      <MapPin size={11} /> {plant.plot}
                    </span>
                    <span className={`status-pill-small ${plant.status}`}>
                      ● {plant.statusLabel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =========================================================
            COLONNE DROITE : FICHE AGRONOMIQUE DÉTAILLÉE
            ========================================================= */}
        <div className="web-plant-main-dossier">
          {!selectedPlant ? (
            <div className="web-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
              <Sprout size={48} color="#10b981" style={{ margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '8px' }}>Aucune culture sélectionnée</h3>
              <p style={{ maxWidth: '420px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
                Sélectionnez une plante dans la liste de gauche ou ajoutez-en une nouvelle pour consulter son carnet agronomique complet.
              </p>
              <button 
                type="button" 
                className="web-btn-primary"
                style={{ margin: '0 auto' }}
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} />
                <span>Enregistrer une nouvelle culture</span>
              </button>
            </div>
          ) : (
            <>
          {/* Hero Banner de la plante sélectionnée */}
          <div className="web-card plant-hero-web-card">
            <div className="plant-hero-content-row">
              <img 
                src={selectedPlant.image} 
                alt={selectedPlant.name} 
                className="plant-hero-web-img"
              />
              <div className="plant-hero-web-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className={`status-pill-large ${selectedPlant.status}`}>
                    ● {selectedPlant.statusLabel}
                  </span>
                  <span className="plant-id-badge">ID : {selectedPlant.id}</span>
                  <span className="plant-plot-badge">
                    <MapPin size={13} /> {selectedPlant.plot}
                  </span>
                </div>

                <h2 className="plant-display-title">{selectedPlant.name}</h2>
                <p className="plant-display-species">
                  {selectedPlant.species} — Variété : <strong>{selectedPlant.variety}</strong>
                </p>

                {/* Score de santé globale */}
                <div className="health-score-inline-bar">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Indice de santé globale de la culture</span>
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

            {/* Alerte si la plante a un risque phytosanitaire */}
            {selectedPlant.alert && (
              <div className="web-plant-alert-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={20} color="#e11d48" />
                  <div>
                    <strong style={{ display: 'block', color: '#9f1239', fontSize: '0.9rem' }}>
                      Alerte sanitaire active
                    </strong>
                    <span style={{ color: '#be123c', fontSize: '0.84rem' }}>{selectedPlant.alert}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                  <button 
                    type="button" 
                    className="web-btn-chip-action danger"
                    onClick={() => onNavigateToAssistant && onNavigateToAssistant({
                      initialQuery: `Alerte sur ${selectedPlant.name} (${selectedPlant.species}) : "${selectedPlant.alert}". Quels remèdes et protocoles appliquer immédiatement ?`
                    })}
                  >
                    <Mic size={14} />
                    <span>Demander le protocole</span>
                  </button>
                  <button 
                    type="button" 
                    className="web-btn-chip-action scan"
                    onClick={() => onNavigateToScan && onNavigateToScan({ targetPlant: selectedPlant })}
                  >
                    <Camera size={14} />
                    <span>Scanner une feuille</span>
                  </button>
                </div>
              </div>
            )}

            {/* Barre d'actions principales pour cette culture */}
            <div className="plant-dossier-actions-bar">
              <button 
                type="button" 
                className="web-action-btn plants"
                onClick={() => onNavigateToScan && onNavigateToScan({ targetPlant: selectedPlant })}
              >
                <Camera size={18} />
                <div style={{ textAlign: 'left' }}>
                  <span className="btn-main-txt">Diagnostiquer par Scan IA</span>
                  <span className="btn-sub-txt">Vérifier l'état d'une feuille de cette culture</span>
                </div>
                <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
              </button>

              <button 
                type="button" 
                className="web-action-btn assistant"
                onClick={() => onNavigateToAssistant && onNavigateToAssistant({
                  initialQuery: `Quels sont les soins et recommandations pour ma plante "${selectedPlant.name}" (${selectedPlant.species}) en parcelle "${selectedPlant.plot}" ?`
                })}
              >
                <Mic size={18} />
                <div style={{ textAlign: 'left' }}>
                  <span className="btn-main-txt">Consulter l'Assistant Vocal</span>
                  <span className="btn-sub-txt">Conseils agronomiques personnalisés</span>
                </div>
                <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
              </button>
            </div>
          </div>

          {/* Onglets de contenu détaillé du dossier */}
          <div className="web-card plant-tabs-web-card">
            <div className="web-tabs-header">
              <button 
                type="button" 
                className={`web-tab-nav-btn ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                <FileText size={16} />
                <span>Paramètres Agronomiques</span>
              </button>

              <button 
                type="button" 
                className={`web-tab-nav-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <Activity size={16} />
                <span>Carnet de Santé & Diagnostics ({selectedPlant.history?.length || 0})</span>
              </button>

              <button 
                type="button" 
                className={`web-tab-nav-btn ${activeTab === 'care' ? 'active' : ''}`}
                onClick={() => setActiveTab('care')}
              >
                <Droplets size={16} />
                <span>Calendrier des Soins</span>
              </button>

              <button 
                type="button" 
                className={`web-tab-nav-btn ${activeTab === 'observations' ? 'active' : ''}`}
                onClick={() => setActiveTab('observations')}
              >
                <Clock size={16} />
                <span>Observations Terrain</span>
              </button>
            </div>

            {/* Contenu : Paramètres agronomiques */}
            {activeTab === 'details' && (
              <div className="tab-pane-content">
                <div className="web-meta-cards-grid">
                  <div className="meta-card-item">
                    <div className="meta-icon-box">
                      <Sprout size={18} />
                    </div>
                    <div>
                      <span className="meta-card-label">Stade phénologique</span>
                      <strong className="meta-card-val">{selectedPlant.growthStage}</strong>
                    </div>
                  </div>

                  <div className="meta-card-item">
                    <div className="meta-icon-box">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <span className="meta-card-label">Date de mise en terre</span>
                      <strong className="meta-card-val">{selectedPlant.plantingDate}</strong>
                    </div>
                  </div>

                  <div className="meta-card-item">
                    <div className="meta-icon-box">
                      <Droplets size={18} />
                    </div>
                    <div>
                      <span className="meta-card-label">Humidité du substrat</span>
                      <strong className="meta-card-val">{selectedPlant.details?.soilMoisture || 'N/A'}</strong>
                    </div>
                  </div>

                  <div className="meta-card-item">
                    <div className="meta-icon-box">
                      <Thermometer size={18} />
                    </div>
                    <div>
                      <span className="meta-card-label">Température mesurée</span>
                      <strong className="meta-card-val">{selectedPlant.details?.temperature || 'N/A'}</strong>
                    </div>
                  </div>

                  <div className="meta-card-item">
                    <div className="meta-icon-box">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <span className="meta-card-label">Rendement estimé</span>
                      <strong className="meta-card-val">{selectedPlant.details?.yieldEstimate || 'N/A'}</strong>
                    </div>
                  </div>

                  <div className="meta-card-item">
                    <div className="meta-icon-box">
                      <Clock size={18} />
                    </div>
                    <div>
                      <span className="meta-card-label">Dernière observation</span>
                      <strong className="meta-card-val">{selectedPlant.lastObservation || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                <div className="meta-notes-box">
                  <span className="notes-heading">Notes agronomiques générales :</span>
                  <p>{selectedPlant.details?.notes || 'Aucune note particulière.'}</p>
                </div>
              </div>
            )}

            {/* Contenu : Carnet de santé & Timeline */}
            {activeTab === 'history' && (
              <div className="tab-pane-content">
                <div className="web-timeline">
                  {selectedPlant.history?.map((h, i) => (
                    <div key={i} className="timeline-entry">
                      <div className="timeline-bullet" />
                      <div className="timeline-card">
                        <div className="timeline-top">
                          <span className="timeline-date">{h.date}</span>
                          <span className="timeline-badge">{h.type}</span>
                        </div>
                        <h4 className="timeline-result">{h.result}</h4>
                        <p className="timeline-notes">{h.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contenu : Soins & Arrosage */}
            {activeTab === 'care' && (
              <div className="tab-pane-content">
                <div className="care-tasks-grid">
                  {selectedPlant.care?.map((c, i) => (
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
              </div>
            )}

            {/* Contenu : Observations */}
            {activeTab === 'observations' && (
              <div className="tab-pane-content">
                <div className="observations-list">
                  {selectedPlant.observations?.map((o, i) => (
                    <div key={i} className="observation-bubble">
                      <div className="obs-header">
                        <strong className="obs-author">{o.author}</strong>
                        <span className="obs-date">{o.date}</span>
                      </div>
                      <p className="obs-text">{o.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Modal d'ajout d'une nouvelle plante */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sprout color="#10b981" />
                <h3 className="modal-title">Enregistrer une nouvelle culture</h3>
              </div>
              <button className="screen-app-btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddPlant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nom usuel de la plante *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Plante 4 / Tomate Cœur de Bœuf"
                  value={newPlantName}
                  onChange={e => setNewPlantName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Espèce botanique</label>
                <select 
                  className="form-input"
                  value={newPlantSpecies}
                  onChange={e => setNewPlantSpecies(e.target.value)}
                >
                  <option value="Tomate (Solanum lycopersicum)">Tomate (Solanum lycopersicum)</option>
                  <option value="Aubergine (Solanum melongena)">Aubergine (Solanum melongena)</option>
                  <option value="Piment (Capsicum annuum)">Piment (Capsicum annuum)</option>
                  <option value="Poivron (Capsicum annuum)">Poivron (Capsicum annuum)</option>
                  <option value="Manioc (Manihot esculenta)">Manioc (Manihot esculenta)</option>
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
                  <label className="form-label">Parcelle / Serre</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newPlantPlot}
                    onChange={e => setNewPlantPlot(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="web-btn-primary" style={{ flex: 1 }}>
                  Confirmer et créer la fiche
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
    </div>
  );
}
