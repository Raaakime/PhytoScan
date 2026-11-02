import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Calendar, 
  Clock, 
  Sprout, 
  Activity, 
  Plus, 
  ChevronRight, 
  Check, 
  AlertCircle,
  FileText,
  HeartPulse
} from 'lucide-react';
import { INITIAL_PLANTS } from '../data/mockData';

export default function PlantRecordsScreen({ onSelectPlantForScan }) {
  const [plants, setPlants] = useState(INITIAL_PLANTS);
  const [selectedPlantId, setSelectedPlantId] = useState('P-001');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'history' | 'care' | 'observations'
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Nouvelle plante form state
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantSpecies, setNewPlantSpecies] = useState('Tomate');

  const selectedPlant = plants.find(p => p.id === selectedPlantId) || plants[0];

  const filteredPlants = plants.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPlant = (e) => {
    e.preventDefault();
    if (!newPlantName.trim()) return;

    const newId = `P-00${plants.length + 1}`;
    const newPlantObj = {
      id: newId,
      name: newPlantName,
      species: newPlantSpecies,
      variety: "Sélection locale",
      status: "saine",
      statusLabel: "Saine",
      growthStage: "Semis / Croissance",
      plantingDate: new Date().toLocaleDateString("fr-FR"),
      lastObservation: new Date().toLocaleDateString("fr-FR"),
      plot: "Parcelle D",
      waterSchedule: "Quotidien",
      image: "/assets/plante_1.jpg",
      healthScore: 95,
      details: {
        yieldEstimate: "Non évalué",
        soilMoisture: "60%",
        temperature: "25°C",
        notes: "Nouvelle culture enregistrée dans le carnet numérique."
      },
      history: [
        { date: new Date().toLocaleDateString("fr-FR"), type: "Enregistrement", result: "Plante créée", notes: "Culture initialisée." }
      ],
      care: [
        { task: "Arrosage", frequency: "Quotidien", status: "En cours" }
      ],
      observations: [
        { date: new Date().toLocaleDateString("fr-FR"), author: "Agriculteur", text: "Plantation effectuée dans de bonnes conditions." }
      ]
    };

    setPlants([newPlantObj, ...plants]);
    setSelectedPlantId(newId);
    setShowAddModal(false);
    setNewPlantName('');
  };

  return (
    <div className="screen-scroll-body" id="plants-screen-container">
      {/* Titre de section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
          Mes plantes
        </h2>
        <button 
          type="button" 
          className="btn-pill-glass"
          style={{ background: '#d1fae5', color: '#065f46', border: 'none' }}
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={14} />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="plants-search-bar">
        <Search size={16} color="#94a3b8" />
        <input 
          type="text" 
          className="search-input" 
          placeholder="Rechercher une plante..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="button" className="btn-filter-icon" title="Filtrer">
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* Carrousel des vignettes de plantes (comme sur la capture) */}
      <div className="plants-mini-carousel">
        {filteredPlants.map((plant) => (
          <div 
            key={plant.id} 
            className={`plant-thumb-card ${selectedPlant.id === plant.id ? 'active' : ''}`}
            onClick={() => setSelectedPlantId(plant.id)}
          >
            <img src={plant.image} alt={plant.name} className="plant-thumb-img" />
            <span className="plant-thumb-name">{plant.name}</span>
            <div className="plant-status-badge">
              <span className={
                plant.status === 'saine' ? 'status-dot-green' : 
                plant.status === 'surveiller' ? 'status-dot-orange' : 'status-dot-red'
              } />
              <span style={{ 
                color: plant.status === 'saine' ? '#047857' : plant.status === 'surveiller' ? '#b45309' : '#b91c1c' 
              }}>
                {plant.statusLabel}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Fiche détaillée de la plante sélectionnée */}
      <div className="plant-detail-main-card">
        {/* Entête avec photo, nom et statut */}
        <div className="plant-hero-row">
          <img 
            src={selectedPlant.image} 
            alt={selectedPlant.name} 
            className="plant-hero-avatar"
          />
          <div className="plant-hero-titles">
            <h3>{selectedPlant.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span className={
                selectedPlant.status === 'saine' ? 'badge-healthy' : 'badge-disease-alert'
              }>
                ● {selectedPlant.statusLabel}
              </span>
              <span className="plant-hero-id">ID : {selectedPlant.id}</span>
            </div>
          </div>
        </div>

        {/* Alerte si la plante nécessite une intervention */}
        {selectedPlant.alert && (
          <div style={{ 
            background: '#fff1f2', 
            border: '1px solid #fecdd3', 
            borderRadius: '8px', 
            padding: '8px 10px', 
            fontSize: '0.78rem', 
            color: '#9f1239',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={14} color="#e11d48" />
            <span>{selectedPlant.alert}</span>
          </div>
        )}

        {/* Navigation par onglets (Détails / Historique / Soins / Observations) */}
        <div className="plant-tabs-nav">
          <button 
            type="button" 
            className={`plant-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Détails
          </button>
          <button 
            type="button" 
            className={`plant-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Historique
          </button>
          <button 
            type="button" 
            className={`plant-tab-btn ${activeTab === 'care' ? 'active' : ''}`}
            onClick={() => setActiveTab('care')}
          >
            Soins
          </button>
          <button 
            type="button" 
            className={`plant-tab-btn ${activeTab === 'observations' ? 'active' : ''}`}
            onClick={() => setActiveTab('observations')}
          >
            Observations
          </button>
        </div>

        {/* Contenu de l'onglet Détails */}
        {activeTab === 'details' && (
          <div className="plant-meta-list">
            <div className="meta-item-row">
              <Sprout size={18} className="meta-item-icon" />
              <div className="meta-item-content">
                <span className="meta-label">Espèce</span>
                <span className="meta-value">{selectedPlant.species} ({selectedPlant.variety})</span>
              </div>
            </div>

            <div className="meta-item-row">
              <Activity size={18} className="meta-item-icon" />
              <div className="meta-item-content">
                <span className="meta-label">Stade de croissance</span>
                <span className="meta-value">{selectedPlant.growthStage}</span>
              </div>
            </div>

            <div className="meta-item-row">
              <Calendar size={18} className="meta-item-icon" />
              <div className="meta-item-content">
                <span className="meta-label">Date de plantation</span>
                <span className="meta-value">{selectedPlant.plantingDate}</span>
              </div>
            </div>

            <div className="meta-item-row">
              <Clock size={18} className="meta-item-icon" />
              <div className="meta-item-content">
                <span className="meta-label">Dernière observation</span>
                <span className="meta-value">{selectedPlant.lastObservation}</span>
              </div>
            </div>

            <div className="meta-item-row">
              <HeartPulse size={18} className="meta-item-icon" />
              <div className="meta-item-content">
                <span className="meta-label">Indice de santé globale</span>
                <span className="meta-value">{selectedPlant.healthScore} / 100</span>
              </div>
            </div>
          </div>
        )}

        {/* Contenu de l'onglet Historique */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedPlant.history?.map((h, i) => (
              <div key={i} style={{ borderLeft: '2px solid #10b981', paddingLeft: '10px', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{h.date} — {h.type}</div>
                <div style={{ color: '#059669', fontWeight: 600 }}>{h.result}</div>
                <div style={{ color: '#64748b' }}>{h.notes}</div>
              </div>
            ))}
          </div>
        )}

        {/* Contenu de l'onglet Soins */}
        {activeTab === 'care' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedPlant.care?.map((c, i) => (
              <div key={i} style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.task}</div>
                  <div style={{ color: '#64748b', fontSize: '0.74rem' }}>{c.frequency}</div>
                </div>
                <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Contenu de l'onglet Observations */}
        {activeTab === 'observations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedPlant.observations?.map((o, i) => (
              <div key={i} style={{ background: '#f1f5f9', padding: '8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.74rem', marginBottom: '2px' }}>
                  <span>{o.author}</span>
                  <span>{o.date}</span>
                </div>
                <div style={{ color: '#1e293b' }}>{o.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bouton Voir l'historique complet (comme sur l'image) */}
      <button 
        type="button" 
        className="btn-primary-action"
        onClick={() => setShowHistoryModal(true)}
      >
        <span>Voir l'historique complet</span>
        <ChevronRight size={18} />
      </button>

      {/* Modal Historique Complet */}
      {showHistoryModal && (
        <div className="modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText color="#10b981" />
                <h3 className="modal-title">Carnet de santé : {selectedPlant.name}</h3>
              </div>
              <button 
                className="screen-app-btn-icon" 
                onClick={() => setShowHistoryModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>
                <strong>ID Culture :</strong> {selectedPlant.id} | <strong>Parcelle :</strong> {selectedPlant.plot}
                <br />
                <strong>Rendement estimé :</strong> {selectedPlant.details.yieldEstimate}
              </div>

              <h4 style={{ fontSize: '0.9rem', color: '#0f172a' }}>Historique chronologique des événements :</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedPlant.history.map((h, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderLeft: '3px solid #10b981', background: '#f8fafc' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{h.date} — {h.type}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{h.result}</div>
                    <div style={{ fontSize: '0.8rem', color: '#334155' }}>{h.notes}</div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              className="btn-primary-action"
              style={{ marginTop: '10px' }}
              onClick={() => setShowHistoryModal(false)}
            >
              Fermer le carnet
            </button>
          </div>
        </div>
      )}

      {/* Modal Ajouter une Plante */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Ajouter une plante au dossier</h3>
              <button className="screen-app-btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddPlant} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nom du plant / planche</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Plante 4 (Piment rouge)"
                  value={newPlantName}
                  onChange={(e) => setNewPlantName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Espèce</label>
                <select 
                  className="form-input"
                  value={newPlantSpecies}
                  onChange={(e) => setNewPlantSpecies(e.target.value)}
                >
                  <option value="Tomate">Tomate (Solanum lycopersicum)</option>
                  <option value="Aubergine">Aubergine (Solanum melongena)</option>
                  <option value="Piment">Piment (Capsicum)</option>
                  <option value="Gombo">Gombo (Abelmoschus esculentus)</option>
                  <option value="Oignon">Oignon (Allium cepa)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary-action" style={{ flex: 1 }}>
                  Enregistrer la plante
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
