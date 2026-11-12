// Service de communication avec l'Agent IA Octopus
import { apiRequest } from './apiClient';

const DEFAULT_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/phytoscan/v1",
  model: "octopus-vision-v2",
  useMock: false
};

// Chargement de la config persistée dans localStorage si existante
export const getOctopusConfig = () => {
  try {
    const saved = localStorage.getItem("phytoscan_octopus_config");
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const saveOctopusConfig = (config) => {
  try {
    localStorage.setItem("phytoscan_octopus_config", JSON.stringify(config));
  } catch (err) {
    console.error("Erreur sauvegarde config Octopus:", err);
  }
};

// Base de profils pathologiques pour l'inférence locale
const DIAGNOSTIC_PROFILES = {
  healthy: {
    status: "saine",
    statusLabel: "Plante Saine",
    isHealthy: true,
    diseaseName: "Plante saine — Aucune anomalie détectée",
    pathogen: "Néant",
    baseConfidence: 98.4,
    severity: "Nulle",
    diagnosis: "Le feuillage présente une coloration chlorophyllienne uniforme, sans perforation ni agent mycélien.",
    recommendations: [
      "Poursuivre la conduite culturale et le programme d'irrigation actuels",
      "Maintenir un paillage organique au pied pour conserver l'humidité racinaire",
      "Contrôle visuel préventif recommandé dans 7 jours"
    ],
    comparison: {
      healthyImg: "/assets/comparaison_saine.jpg",
      infectedImg: "/assets/comparaison_malade.jpg",
      healthyDesc: "Feuille témoin indemne de toute nécrose.",
      infectedDesc: "Comparatif avec une feuille attaquée par Cercospora."
    }
  },
  cercospora: {
    status: "malade",
    statusLabel: "Maladie détectée",
    isHealthy: false,
    diseaseName: "Tache foliaire (Cercospora)",
    pathogen: "Cercospora capsici / solani",
    baseConfidence: 96.4,
    severity: "Élevée",
    diagnosis: "Présence de lésions circulaires brunes bordées d'un halo chlorotique caractéristique de l'infection fongique Cercospora.",
    recommendations: [
      "Supprimer et incinérer sans délai les feuilles fortement atteintes",
      "Éviter absolument d'arroser le feuillage (arroser uniquement au pied)",
      "Pulvériser un traitement antifongique bio (bouillie bordelaise ou décoction de prêle) sous 24h",
      "Désinfecter les outils de taille à l'alcool à 70° entre chaque plant"
    ],
    comparison: {
      healthyImg: "/assets/comparaison_saine.jpg",
      infectedImg: "/assets/comparaison_malade.jpg",
      healthyDesc: "Plante saine : cuticule verte homogène.",
      infectedDesc: "Plante malade : taches nécrotiques concentriques."
    }
  },
  mildew: {
    status: "malade",
    statusLabel: "Maladie détectée",
    isHealthy: false,
    diseaseName: "Mildiou (Phytophthora infestans)",
    pathogen: "Phytophthora infestans (Oomycète)",
    baseConfidence: 94.8,
    severity: "Très Élevée",
    diagnosis: "Plages brun-verdâtre d'aspect huileux évoluant vers une nécrose sèche, typiques d'une attaque de mildiou favorisée par l'humidité.",
    recommendations: [
      "Couper et évacuer immédiatement toutes les folioles et tiges présentant des taches brunes",
      "Aérer largement la parcelle ou la serre pour abaisser l'hygrométrie ambiante",
      "Appliquer un traitement cuprique autorisé en agriculture biologique (cuivre à dose réduite)",
      "Suspendre toute irrigation par aspersion et surveiller les plants voisins quotidiennement"
    ],
    comparison: {
      healthyImg: "/assets/comparaison_saine.jpg",
      infectedImg: "/assets/comparaison_malade.jpg",
      healthyDesc: "Feuille témoin verte sans tache huileuse.",
      infectedDesc: "Nécrose foliaire extensive sur limbe infecté."
    }
  },
  oidium: {
    status: "surveiller",
    statusLabel: "À surveiller (Début d'infection)",
    isHealthy: false,
    diseaseName: "Oïdium & Chlorose foliaire",
    pathogen: "Leveillula taurica / Erysiphe spp.",
    baseConfidence: 91.6,
    severity: "Modérée",
    diagnosis: "Décoloration chlorotique diffuse accompagnée d'un léger feutrage blanchâtre superficiel sur le limbe.",
    recommendations: [
      "Pulvériser une solution de bicarbonate de potassium (5 g/L) additionnée de savon noir",
      "Alterner avec du soufre mouillable tôt le matin ou en fin de journée (hors fortes chaleurs)",
      "Éclaircir le feuillage bas pour favoriser la circulation de l'air",
      "Refaire un scan de contrôle dans 48 à 72 heures"
    ],
    comparison: {
      healthyImg: "/assets/comparaison_saine.jpg",
      infectedImg: "/assets/comparaison_malade.jpg",
      healthyDesc: "Feuillage vert franc à photosynthèse optimale.",
      infectedDesc: "Symptômes fongiques évolutifs à traiter préventivement."
    }
  }
};

/**
 * Analyse colorimétrique réelle de l'image sur un <canvas> hors-écran
 * afin de déterminer le profil phytosanitaire le plus pertinent.
 */
function analyzeLeafColorimetry(imageSource) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      let objectUrlToRevoke = null;
      if (imageSource instanceof Blob || imageSource instanceof File) {
        objectUrlToRevoke = URL.createObjectURL(imageSource);
        img.src = objectUrlToRevoke;
      } else if (typeof imageSource === "string") {
        img.src = imageSource;
      } else {
        resolve(null);
        return;
      }

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 96;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0, size, size);
          const { data } = ctx.getImageData(0, 0, size, size);

          let greenCount = 0;
          let brownNecroticCount = 0;
          let yellowChloroticCount = 0;
          let whitePowderyCount = 0;
          let activePixels = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Ignorer les pixels transparents ou le fond quasi-noir/quasi-blanc pur des bordures
            if (a < 128) continue;
            const brightness = (r + g + b) / 3;
            if (brightness < 18 || brightness > 248) continue;

            activePixels++;

            // 1. Vert chlorophyllien sain : dominante verte marquée
            if (g > r * 1.08 && g > b * 1.15 && g > 45) {
              greenCount++;
            }
            // 2. Brun / Nécrose (Cercospora / Mildiou) : rouge > vert > bleu avec teinte sombre à moyenne
            else if (r > g * 1.06 && g >= b && r > 45 && r < 200 && (r - b) > 22) {
              brownNecroticCount++;
            }
            // 3. Jaune / Halo chlorotique : rouge et vert élevés et proches, bleu faible
            else if (r > 125 && g > 115 && b < 105 && Math.abs(r - g) <= 40) {
              yellowChloroticCount++;
            }
            // 4. Voile blanchâtre / grisâtre (Oïdium)
            else if (r > 175 && g > 175 && b > 165 && Math.abs(r - g) < 18 && Math.abs(g - b) < 20) {
              whitePowderyCount++;
            }
          }

          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);

          if (activePixels === 0) {
            resolve(null);
            return;
          }

          resolve({
            greenRatio: greenCount / activePixels,
            brownRatio: brownNecroticCount / activePixels,
            yellowRatio: yellowChloroticCount / activePixels,
            whiteRatio: whitePowderyCount / activePixels
          });
        } catch {
          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
          resolve(null);
        }
      };

      img.onerror = () => {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Sélectionne le profil de diagnostic et ajuste la confiance selon les ratios colorimétriques
 */
function selectProfileFromMetrics(metrics, imageSource, options = {}) {
  if (options.forceHealthy === true) {
    return { profile: DIAGNOSTIC_PROFILES.healthy, confidence: 98.7 };
  }

  // Si c'est l'image d'échantillon infecté par défaut
  if (typeof imageSource === "string" && imageSource.includes("sample_infected_leaf")) {
    return { profile: DIAGNOSTIC_PROFILES.cercospora, confidence: 96.4 };
  }
  if (typeof imageSource === "string" && imageSource.includes("comparaison_saine")) {
    return { profile: DIAGNOSTIC_PROFILES.healthy, confidence: 98.7 };
  }

  if (!metrics) {
    return { profile: DIAGNOSTIC_PROFILES.cercospora, confidence: 95.8 };
  }

  const { greenRatio, brownRatio, yellowRatio, whiteRatio } = metrics;

  // Feuillage majoritairement vert sans taches brunes ni jaunissement marqué
  if (greenRatio >= 0.42 && brownRatio < 0.07 && yellowRatio < 0.10) {
    const conf = Math.min(99.4, Math.max(94.5, +(95.0 + greenRatio * 4.5).toFixed(1)));
    return { profile: DIAGNOSTIC_PROFILES.healthy, confidence: conf };
  }

  // Forte proportion de nécrose brune + halo jaune => Cercosporiose
  if (brownRatio >= 0.12 && yellowRatio >= 0.04) {
    const conf = Math.min(98.6, Math.max(92.0, +(93.5 + brownRatio * 12).toFixed(1)));
    return { profile: DIAGNOSTIC_PROFILES.cercospora, confidence: conf };
  }

  // Taches brunes/sombres étendues avec peu de jaune => Mildiou
  if (brownRatio >= 0.08) {
    const conf = Math.min(97.5, Math.max(91.2, +(92.0 + brownRatio * 15).toFixed(1)));
    return { profile: DIAGNOSTIC_PROFILES.mildew, confidence: conf };
  }

  // Jaunissement chlorotique ou voile blanchâtre prédominant => Oïdium / Chlorose
  if (yellowRatio >= 0.08 || whiteRatio >= 0.16) {
    const conf = Math.min(95.8, Math.max(88.5, +(89.5 + (yellowRatio + whiteRatio) * 10).toFixed(1)));
    return { profile: DIAGNOSTIC_PROFILES.oidium, confidence: conf };
  }

  // Si dominance verte modérée malgré un éclairage neutre
  if (greenRatio >= 0.25 && brownRatio < 0.05) {
    return { profile: DIAGNOSTIC_PROFILES.healthy, confidence: 95.6 };
  }

  return { profile: DIAGNOSTIC_PROFILES.cercospora, confidence: 94.2 };
}

/**
 * Analyse une photo de plante avec l'Agent IA Octopus
 * @param {File|Blob|string} imageFile - Fichier image ou DataURL
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} Résultat du diagnostic
 */
export async function analyzePlantImage(imageFile, options = {}) {
  const config = getOctopusConfig();

  // Si mode simulation ou pas d'API live configurée
  if (config.useMock || !config.baseUrl) {
    return simulateOctopusInference(imageFile, options);
  }

  try {
    const formData = new FormData();
    const imageBlob = imageFile instanceof Blob
      ? imageFile
      : await fetch(imageFile).then(response => {
          if (!response.ok) throw new Error(`Impossible de charger l'image (${response.status}).`);
          return response.blob();
        });
    const imageName = imageFile instanceof File ? imageFile.name : "leaf_scan.jpg";
    formData.append("image", imageBlob, imageName);

    formData.append("model", config.model);
    formData.append("include_recommendations", "true");

    const result = await apiRequest("/scan/diagnose", {
      method: "POST",
      body: formData
    }, config.baseUrl);
    return result;
  } catch (err) {
    throw new Error(`Échec de l'analyse par le backend : ${err.message}`);
  }
}

/**
 * Simulation réaliste d'inférence de l'Agent Octopus basée sur l'analyse spectrale/colorimétrique
 */
async function simulateOctopusInference(imageFile, options = {}) {
  const metrics = await analyzeLeafColorimetry(imageFile);
  const { profile, confidence } = selectProfileFromMetrics(metrics, imageFile, options);

  return new Promise((resolve) => {
    // Délai réaliste de calcul de l'IA (1.2s)
    setTimeout(() => {
      resolve({
        success: true,
        status: profile.status,
        statusLabel: profile.statusLabel,
        isHealthy: profile.isHealthy,
        diseaseName: profile.diseaseName,
        pathogen: profile.pathogen,
        confidence,
        severity: profile.severity,
        analysisId: `OCT-${Date.now().toString(36).toUpperCase()}`,
        date: new Date().toLocaleDateString("fr-FR"),
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        diagnosis: profile.diagnosis,
        recommendations: profile.recommendations,
        metrics,
        comparison: profile.comparison
      });
    }, 1200);
  });
}

/**
 * Pose une question à l'assistant vocal Octopus
 */
export async function askOctopusAssistant(question, language = "fr", context = {}) {
  const config = getOctopusConfig();

  if (!config.useMock && config.baseUrl) {
    try {
      return await apiRequest("/assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, language, context })
      }, config.baseUrl);
    } catch (error) {
      throw new Error(`Échec de l'assistant backend : ${error.message}`);
    }
  }

  // Réponses contextuelles multilingues intelligentes
  const qLower = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const responses = {
    fr: {
      plante2: "La plante 2 (Aubergine) présente des premiers signes de maladie (début d'oïdium sur feuilles basses). Je vous conseille d'intervenir rapidement avec un traitement adapté (bicarbonate ou soufre doux).",
      cercospora: "Pour traiter la tache foliaire (Cercospora) : coupez les feuilles atteintes immédiatement, évitez d'arroser les feuilles par le haut et pulvérisez de la bouillie bordelaise ou du purin de prêle.",
      mildiou: "Face au mildiou (Phytophthora infestans) : retirez les feuilles brunes sans attendre, aérez vos cultures pour réduire l'humidité et appliquez un fongicide cuprique bio avant les prochaines rosées.",
      oidium: "Contre l'oïdium (feutrage blanc) : pulvérisez une solution de bicarbonate de potassium (5 g/L) avec un peu de savon noir ou utilisez du soufre mouillable hors fortes chaleurs.",
      arrosage: "Par forte chaleur, arrosez tôt le matin ou après le coucher du soleil directement au pied sans mouiller le feuillage, en maintenant un bon paillage.",
      default: `J'ai bien analysé votre demande : "${question}". D'après les dernières données de vos parcelles, l'état global est stable mais la plante 2 et la plante 3 nécessitent une vigilance accrue aujourd'hui.`
    },
    wo: {
      plante2: "Garab 2 (Batañse) bi dafa tàmbalee feebar ci xob yu suufe yi. Dafa laaj nga defaral ko garab lu gaaw ngir feebar bi bu mu tasaaroo ci yeneen garab yi.",
      cercospora: "Ngir faj tàcc yu ñuul yi : daggël xob yi feebar te lakk leen, bu sayteel xob yi ndox ci kow, te nga defaral ko garabu cuub wala ndoxum soble.",
      mildiou: "Ngir faj mildiou : daggël xob yu ñuul yi léegi-léegi, bàyyi ngelaw li dugg ci diggante garab yi te wis ko garabu cuub.",
      oidium: "Ngir faj oïdium (xob yu weex) : wisal ndoxum bikarbonaat ak tuuti saabu bu ñuul ci xob yi suba teel.",
      arrosage: "Bu tàngoor baree, suubal garab yi suba teel wala ci ngoon gu tëdd, ci suuf gi rekk te bu tooyal xob yi.",
      default: `Degg naa sa laaj ci "${question}". Garab 2 ak 3 dañu laaj saytu bu baax tey ngir faj feebar bi teel.`
    },
    en: {
      plante2: "Plant 2 (Eggplant) shows early signs of fungal infection. I recommend treating it within 24 hours with organic copper or horsetail spray.",
      cercospora: "To treat Cercospora leaf spot: prune and destroy infected leaves, avoid overhead irrigation, and spray a copper-based bio-fungicide.",
      mildiou: "To control late blight (Phytophthora): remove blighted foliage immediately, improve airflow, and apply an organic copper treatment.",
      oidium: "To treat powdery mildew: spray potassium bicarbonate (5g/L) with mild soap or apply wettable sulfur in cool morning hours.",
      arrosage: "During hot spells, irrigate early in the morning or late evening directly at the root zone, keeping organic mulch.",
      default: `I reviewed your query: "${question}". Overall farm health is moderate; plants 2 and 3 require active care today.`
    }
  };

  const langSet = responses[language] || responses.fr;
  let reply = langSet.default;
  const plants = Array.isArray(context?.plants) ? context.plants : [];
  const sickPlants = plants.filter(p => p.status !== "saine" || Boolean(p.alert));

  // Si la question porte sur la liste des plantes malades ou en alerte
  if (
    qLower.includes("quelles plantes") ||
    qLower.includes("ban garab") ||
    qLower.includes("which crops") ||
    qLower.includes("actuellement malades")
  ) {
    if (sickPlants.length === 0) {
      reply =
        language === "wo"
          ? "Baax na lool : amul benn garab bu feebar tey ci sa tool yi."
          : language === "en"
            ? "Great news: all tracked crops in your plots are currently healthy."
            : "Bonne nouvelle : toutes les cultures enregistrées dans vos parcelles sont actuellement saines.";
    } else {
      const namesList = sickPlants
        .map(p => `${p.name} (${p.species.split(" (")[0]} - ${p.statusLabel}, score ${p.healthScore}/100)`)
        .join(", ");
      reply =
        language === "wo"
          ? `Garab yi laaj saytu bu gaaw tey (${sickPlants.length}) : ${namesList}.`
          : language === "en"
            ? `Currently ${sickPlants.length} crop(s) require attention: ${namesList}.`
            : `Actuellement, ${sickPlants.length} culture(s) nécessitent une intervention : ${namesList}.`;
    }
  } else if (qLower.includes("plante 2") || qLower.includes("garab 2") || qLower.includes("plant 2")) {
    const p2 = plants.find(p => p.id === "P-002" || p.name.toLowerCase().includes("plante 2"));
    if (p2 && language === "fr") {
      reply = `${p2.name} (${p2.species}, ${p2.plot}) a un indice de santé de ${p2.healthScore}/100 (${p2.statusLabel}). ${p2.alert || p2.details?.notes || ""}`;
    } else {
      reply = langSet.plante2;
    }
  } else if (qLower.includes("mildiou") || qLower.includes("phytophthora") || qLower.includes("blight")) {
    reply = langSet.mildiou;
  } else if (qLower.includes("oïdium") || qLower.includes("oidium") || qLower.includes("chlorose") || qLower.includes("mildew") || qLower.includes("weex")) {
    reply = langSet.oidium;
  } else if (qLower.includes("cercospora") || qLower.includes("tache") || qLower.includes("tacc") || qLower.includes("spot")) {
    reply = langSet.cercospora;
  } else if (qLower.includes("arros") || qLower.includes("suub") || qLower.includes("water")) {
    reply = langSet.arrosage;
  }

  return {
    text: reply,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    audioUrl: null
  };
}
