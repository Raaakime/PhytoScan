// Base de données locale et données pour PhytoScan AI

export const INITIAL_PLANTS = [
  {
    id: "P-001",
    name: "Plante 1",
    species: "Tomate (Solanum lycopersicum)",
    variety: "Roma VF",
    status: "saine", // 'saine' | 'surveiller' | 'malade'
    statusLabel: "Saine",
    growthStage: "Floraison & Fructification",
    plantingDate: "12 mars 2025",
    lastObservation: "20 avril 2025",
    plot: "Parcelle A3 - Serre 1",
    waterSchedule: "Goutte-à-goutte (2x / jour)",
    image: "/assets/plante_1.jpg",
    healthScore: 98,
    details: {
      yieldEstimate: "4.5 kg / pied",
      soilMoisture: "65%",
      temperature: "24°C",
      notes: "Croissance vigoureuse, feuillage bien vert sans aucune lésion apparente."
    },
    history: [
      { date: "20 avril 2025", type: "Scan IA", result: "Feuillage sain (99.2%)", notes: "Aucun agent pathogène détecté." },
      { date: "05 avril 2025", type: "Taille", result: "Égourmandage", notes: "Retrait des gourmands bas." },
      { date: "12 mars 2025", type: "Plantation", result: "Repiquage réussi", notes: "Terreau enrichi en compost bio." }
    ],
    care: [
      { task: "Arrosage matinal", frequency: "Quotidien", status: "Effectué" },
      { task: "Apport purin d'ortie", frequency: "Tous les 14 jours", status: "Prévu le 25 avril" },
      { task: "Paillage au pied", frequency: "Une fois par mois", status: "En place" }
    ],
    observations: [
      { date: "20 avril 2025", author: "Agriculteur", text: "Fleurs abondantes, pollinisation en bonne voie." },
      { date: "10 avril 2025", author: "Conseiller agricole", text: "Très bon développement végétatif." }
    ]
  },
  {
    id: "P-002",
    name: "Plante 2",
    species: "Aubergine (Solanum melongena)",
    variety: "Black Beauty",
    status: "surveiller",
    statusLabel: "À surveiller",
    growthStage: "Végétatif avancé",
    plantingDate: "02 mars 2025",
    lastObservation: "22 avril 2025",
    plot: "Parcelle B1 - Plein champ",
    waterSchedule: "Arrosage au pied (tous les 2 jours)",
    image: "/assets/plante_2.jpg",
    healthScore: 74,
    alert: "Premiers signes d'oïdium et jaunissement léger sur feuilles inférieures.",
    details: {
      yieldEstimate: "3.2 kg / pied",
      soilMoisture: "52%",
      temperature: "27°C",
      notes: "Apparition de légers voiles blanchâtres sur les feuilles basses. Risque de propagation si humidité élevée."
    },
    history: [
      { date: "22 avril 2025", type: "Scan IA", result: "Suspicion Oïdium (78%)", notes: "Intervention préventive conseillée." },
      { date: "14 avril 2025", type: "Fertilisation", result: "Engrais organique potassium", notes: "Bonne reprise." }
    ],
    care: [
      { task: "Traitement bicarbonate ou soufre", frequency: "Immédiat", status: "Urgent (24h)" },
      { task: "Aération du rang", frequency: "Une fois", status: "À faire" }
    ],
    observations: [
      { date: "22 avril 2025", author: "Système PhytoScan", text: "Dégradation légère détectée par rapport au scan précédent." }
    ]
  },
  {
    id: "P-003",
    name: "Plante 3",
    species: "Piment (Capsicum chinense)",
    variety: "Antillais / Habanero",
    status: "malade",
    statusLabel: "Malade",
    growthStage: "Début floraison",
    plantingDate: "15 février 2025",
    lastObservation: "23 avril 2025",
    plot: "Parcelle C2 - Planche 4",
    waterSchedule: "Manuel le soir",
    image: "/assets/plante_3.jpg",
    healthScore: 41,
    alert: "Attaque sévère de Cercosporiose (Taches foliaires nécrotiques). Traitement d'urgence requis.",
    details: {
      yieldEstimate: "1.8 kg / pied",
      soilMoisture: "48%",
      temperature: "29°C",
      notes: "Multiples taches brunes circulaires avec halo jaunâtre. Chute prématurée des feuilles touchées."
    },
    history: [
      { date: "23 avril 2025", type: "Scan IA", result: "Tache foliaire (Cercospora) confirmée (96.4%)", notes: "Isoler la plante et traiter." },
      { date: "18 avril 2025", type: "Scan IA", result: "Anomalie foliaire détectée (62%)", notes: "Surveillance accrue recommandée." }
    ],
    care: [
      { task: "Suppression des feuilles atteintes", frequency: "Immédiat", status: "Urgent" },
      { task: "Application fongicide cuivre / décoction de prêle", frequency: "Sous 24h", status: "Recommandé" },
      { task: "Désinfection du sécateur", frequency: "Après chaque coupe", status: "Impératif" }
    ],
    observations: [
      { date: "23 avril 2025", author: "Agent Octopus IA", text: "Propagation fongique rapide favorisée par la rosée matinale." }
    ]
  }
];

export const COMMON_DISEASES = {
  cercospora: {
    name: "Tache foliaire (Cercospora)",
    pathogen: "Cercospora spp. (Champignon)",
    severity: "Élevée",
    confidence: "96.4%",
    description: "Infection fongique caractérisée par de petites taches circulaires brunes avec un centre grisâtre et un halo chlorotique jaune.",
    symptoms: [
      "Taches nécrotiques circulaires sur les feuilles",
      "Halo jaune vif entourant les lésions",
      "Dessèchement et chute précoce des feuilles basses"
    ],
    remedies: [
      "Éliminer et brûler ou évacuer les feuilles contaminées",
      "Éviter d'arroser le feuillage (préférer le goutte-à-goutte)",
      "Appliquer une solution de bouillie bordelaise ou un fongicide cuprique bio",
      "Traiter préventivement avec purin de prêle ou décoction d'ail"
    ],
    healthyComparison: "Feuillage d'un vert uniforme, cuticule intacte, nervures fermes sans chlorose.",
    infectedComparison: "Multiples lésions circulaires brun foncé, contours jaunis, début de nécrose foliaire."
  },
  mildew: {
    name: "Mildiou (Phytophthora infestans)",
    pathogen: "Oomycète fongique",
    severity: "Très Élevée",
    confidence: "94.8%",
    description: "Maladie fulgurante créant des taches huileuses brun-vert devenant brunes et desséchées avec feutrage blanc au revers.",
    symptoms: [
      "Taches huileuses sur la face supérieure",
      "Duvet blanc/grisâtre au dos de la feuille",
      "Nécrose rapide des tiges et fruits"
    ],
    remedies: [
      "Couper immédiatement les parties touchées",
      "Aérer les serres et espacer les plants",
      "Traitement au cuivre avant la pluie"
    ]
  },
  healthy: {
    name: "Plante Saine",
    pathogen: "Aucun",
    severity: "Nulle",
    confidence: "98.9%",
    description: "La plante présente une vigueur optimale, une photosynthèse efficace et aucun signe d'attaque parasitaire ou cryptogamique.",
    symptoms: [
      "Couleur vert profond homogène",
      "Nervures et limbe bien formés",
      "Absence de taches, parasites ou déformations"
    ],
    remedies: [
      "Poursuivre le programme de fertilisation et d'arrosage actuel",
      "Maintenir une veille sanitaire régulière via PhytoScan AI"
    ]
  }
};

// Langues de l'assistant écrit ; la voix est disponible en français et en anglais.
export const ASSISTANT_LANGUAGES = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "wo", name: "Wolof (écrit)", flag: "🇸🇳" },
  { code: "en", name: "English", flag: "🇬🇧" }
];

export const SAMPLE_QUESTIONS = {
  fr: [
    "Quelle est la santé de la plante 2 ?",
    "Comment traiter la tache foliaire (Cercospora) ?",
    "Quelles plantes sont actuellement malades ?",
    "Conseils d'arrosage pour mes tomates par forte chaleur"
  ],
  wo: [
    "Naka la wàllu garab 2 gi deme ?",
    "Nan lañuy fajee tàcc yu ñuul ci xobi tomate ?",
    "Ban garab ñoo feebar leegi ?",
    "Ñaata yoon laay suub xob yi bu tàngoor baree ?"
  ],
  en: [
    "What is the health status of plant 2?",
    "How do I treat Cercospora leaf spot?",
    "Which crops need urgent attention today?",
    "Watering tips for tomatoes during hot weather"
  ]
};
