# 🌿 PhytoScan AI — Documentation Technique & Architecture (En Développement)

> **Plateforme intelligente de diagnostic phytosanitaire et d'assistance vocale multilingue (Français, Anglais, Wolof).**  
> **URL de démonstration (HTTPS) :** `https://phytoscan-ago.duckdns.org`  
> **Dépôt GitHub :** `https://github.com/Raaakime/PhytoScan`

---

## 1. Vue d'ensemble du Projet

**PhytoScan AI** permet aux agriculteurs et techniciens agricoles de diagnostiquer l'état de santé de leurs cultures par analyse d'images, de tenir un carnet de suivi numérique par parcelle, et d'interagir à la voix dans leur langue locale (**Wolof**, **Français** ou **Anglais**).


-   Analyser une photographie de plante ou de feuille.
-   Identifier une maladie probable ou indiquer que la plante paraît
    saine.
-   Présenter un résultat de diagnostic et un niveau de confiance.
-   Fournir des informations phytosanitaires et des recommandations.
-   Conserver les analyses dans un carnet de santé des cultures.
-   Permettre des échanges écrits et vocaux avec un assistant agricole.
-   Rendre les informations disponibles en français, en anglais et,
    selon les contenus et modèles disponibles, en wolof.

> **Important :** PhytoScan est un outil d'aide au diagnostic. Une
> prédiction IA ne remplace pas l'examen d'un spécialiste
> phytosanitaire, notamment lorsque les symptômes sont ambigus ou que
> les conséquences d'un traitement sont importantes.

L'architecture repose sur **trois briques découplées** hébergées sur un même serveur privé virtuel (VPS) sous **Ubuntu 24.04 LTS** :
1. **Frontend Web (SPA) :** Interface utilisateur réactive et installable (PWA-ready).
2. **Backend Principal (API REST) :** Gestion métier, base de données, stockage des médias, diagnostic IA et passerelle vocale.
3. **Microservice IA Vocale Wolof :** Reconnaissance vocale (STT) et synthèse vocale (TTS) dédiées au Wolof sans dépendance à des API externes payantes.

---


## 2. Public cible et contexte agricole

### Public cible

-   Agriculteurs et exploitants agricoles.
-   Conseillers et techniciens agricoles.
-   Organisations paysannes et coopératives.
-   Structures d'accompagnement et projets agricoles.
-   Acteurs de la recherche et de la vulgarisation agricole.

### Cultures mentionnées dans le cadrage

La documentation cite notamment :

-   Tomate.
-   Poivron.
-   Pomme de terre.

La liste effective des cultures reconnues en production dépend des
données d'entraînement, du classificateur et des configurations
réellement déployées. La présence d'une culture dans la liste des
priorités ne garantit donc pas, à elle seule, qu'elle soit déjà prise en
charge par le modèle de production.


## 3. Fonctionnalités principales

### 3.1 Diagnostic phytosanitaire par image

Le parcours fonctionnel prévu est le suivant :

1.  L'utilisateur sélectionne ou prend une photo d'une plante ou d'une
    feuille.
2.  Le frontend transmet l'image à l'API.
3.  Le backend valide et enregistre le fichier.
4.  Le service de diagnostic exécute le pipeline IA configuré.
5.  Le système associe le résultat à une maladie connue lorsque cela est
    possible.
6.  L'API renvoie les informations du diagnostic.
7.  Si une plante est sélectionnée ou associée, le résultat peut être
    ajouté à son historique.

Les informations de résultat observées comprennent notamment :

-   État du diagnostic et libellé du statut.
-   Indication plante saine ou malade.
-   Nom et code de la maladie.
-   Agent pathogène, lorsque renseigné.
-   Niveau de confiance et sévérité.
-   Description et recommandations.
-   Identifiant d'analyse, date et heure.
-   Nom du modèle et temps de traitement.
-   URL de l'image analysée.

Le score de confiance est une mesure technique et ne constitue pas une
garantie de diagnostic exact.

### 3.2 Carnet de santé des cultures

Le module de suivi centralise les informations d'une plante ou d'une
parcelle :

-   Identifiant, nom, espèce et variété.
-   Statut sanitaire et stade de croissance.
-   Date de plantation et dernière observation.
-   Parcelle, programme d'arrosage et score de santé.
-   Alertes et détails complémentaires.
-   Historique des diagnostics.
-   Soins, tâches et observations.

Lorsqu'un scan est rattaché à une plante, le backend peut créer une
entrée `PlantHistory` de type `Scan IA`, enregistrer le résultat, les
notes, l'identifiant d'analyse et le chemin de l'image.

### 3.3 Assistant agricole conversationnel

L'assistant permet de poser des questions sur les plantes, les symptômes
et les pratiques culturales. Les thèmes cités dans les travaux du projet
comprennent :

-   Compréhension des symptômes.
-   Questions sur les maladies.
-   Conseils d'entretien et d'arrosage.
-   Informations relatives aux plantes suivies.
-   Accompagnement en français, wolof et anglais.

Les réponses doivent distinguer les informations confirmées des
hypothèses et éviter les recommandations dangereuses ou inadaptées.

### 3.4 Interface multilingue

Les langues visées sont :

-   Français (`fr`).
-   Wolof (`wo`).
-   Anglais (`en`).

Pour les fiches de maladies, le français sert de langue de repli lorsque
la traduction demandée n'existe pas. Si aucune traduction n'est
disponible, le système peut lever une erreur explicite plutôt que
provoquer une erreur d'indexation.

**État documenté au 21 novembre 2026 :** 13 maladies disposaient d'une
traduction française et anglaise. Une traduction wolof existait pour
certaines entrées, notamment `cercospora`. En l'absence d'une traduction
wolof, le système retombait sur le français. Un test de 13 maladies × 3
langues, soit 39 lectures, a réussi après correction.

### 3.5 Écrans frontend identifiés

-   `ScanScreen` : diagnostic par image.
-   `PlantRecordsScreen` : carnet de santé et historique des plantes.
-   `VoiceAssistantScreen` : interface de l'assistant vocal.
-   `LoginScreen` : connexion.
-   `RegisterScreen` : création de compte.
-   `OctopusConfigModal` : configuration de l'intégration de diagnostic
   .

D'autres composants concernent la navigation, les panneaux
climatiques/agronomiques et les éléments d'interface réutilisables.

## 4. Architecture technique

PhytoScan sépare le frontend, l'API backend, la persistance des données
et les composants d'intelligence artificielle.

``` text
Navigateur web / utilisateur
          |
          v
Frontend React + Vite
          |
          | HTTPS / JSON / multipart
          v
Nginx (reverse proxy et fichiers statiques)
          |
          +----------------------+
          |                      |
          v                      v
      API FastAPI           Fichiers /media/
          |
          +------------------------------+
          |              |               |
          v              v               v
    Services métier  Base SQLite     Pipeline IA
          |                              |
          v                              v
    Modèles SQLAlchemy          Classificateur / modèle
          |
          v
Historique des plantes, scans,
utilisateurs, maladies et traductions
```

### 4.1 Frontend

Technologies identifiées :

-   React.
-   Vite.
-   JavaScript / JSX.
-   `lucide-react` pour les icônes.
-   CSS et composants React.
-   `localStorage` pour certaines configurations frontend.

Fichiers et modules identifiés :

  -----------------------------------------------------------------------
  Fichier / module                    Responsabilité connue
  ----------------------------------- -----------------------------------
  `App.jsx`                           Assemblage de l'application,
                                      navigation et gestion des écrans

  `ScanScreen`                        Interface du diagnostic par image

  `PlantRecordsScreen.jsx`            Fiches plantes, historique et
                                      affichage des images

  `VoiceAssistantScreen.jsx`          Interface de l'assistant vocal

  `LoginScreen`                       Authentification utilisateur

  `RegisterScreen`                    Inscription utilisateur

  `OctopusConfigModal.jsx`            Configuration de l'API ou du modèle
                                      Octopus

  `services/apiClient.js`             Client HTTP commun et configuration
                                      de l'URL API

  `services/octopusApi.js`            Appels liés au diagnostic Octopus

  `services/phytoscanApi`             Accès aux fonctions API PhytoScan

  `services/authService`              Fonctions d'authentification

  `components/ClimatePanels`          Panneaux climatiques/agronomiques

  `hooks/useClimateRisks`             Hook relatif aux risques
                                      climatiques

  `data/mockData`                     Données de démonstration ou de
                                      secours
  -----------------------------------------------------------------------

Configuration frontend de production observée :

``` env
VITE_API_BASE_URL=/phytoscan/v1
```

L'utilisation d'un chemin relatif permet au navigateur de communiquer
avec l'API sur le même domaine que le frontend.

### 4.2 Backend

Technologies identifiées :

-   Python.
-   FastAPI.
-   SQLAlchemy.
-   SQLite dans l'environnement de production observé.
-   Pydantic.
-   Uvicorn.
-   Alembic pour les migrations de base de données.

Répertoire connu :

``` text
backend/
├── app/
│   ├── main.py
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── db/
│   └── ...
├── uploads/
│   └── scans/
├── phytoscan.db
├── venv/
└── ...
```

Modules identifiés :

  -------------------------------------------------------------------------
  Module                                Responsabilité connue
  ------------------------------------- -----------------------------------
  `app/main.py`                         Création de FastAPI, inclusion des
                                        routes et montage des médias

  `app/models/`                         Modèles SQLAlchemy

  `app/models/disease.py`               Modèle de maladie et récupération
                                        des traductions

  `app/schemas/scan.py`                 Schémas de données du diagnostic

  `app/schemas/plant.py`                Schémas des plantes et de leur
                                        historique

  `app/services/scan_service.py`        Validation, orchestration du
                                        diagnostic et construction du
                                        résultat

  `app/services/plant_service.py`       Gestion des plantes, sérialisation
                                        et rattachement des scans

  `app/db/seed_phytoscan_diseases.py`   Initialisation et complément des
                                        données de maladies

  `app/core/exceptions.py`              Exceptions applicatives
  -------------------------------------------------------------------------

Le routeur API est monté sous le préfixe observé en production :

``` text
/phytoscan/v1
```

Exemple de route de diagnostic :

``` text
POST /phytoscan/v1/scan/diagnose
```

La requête reçoit une image en `multipart/form-data` et peut recevoir
des paramètres comme la langue et l'identifiant de plante selon la
route.

### 4.3 Base de données

La base observée sur le VPS est :

``` text
backend/phytoscan.db
```

Entités et tables repérées :

-   `users`
-   `diseases`
-   `disease_translations`
-   `plants`
-   `scans`
-   `plant_history`
-   `messages`


### 4.4 Gestion des images

Les images de diagnostic sont stockées dans :

``` text
backend/uploads/scans/
```

Le backend expose ce répertoire sous :

``` text
/media/
```

Exemple de chemin d'image :

``` text
/media/scans/<identifiant_image>.jpg
```

En production, Nginx possède une règle d'alias connue :

``` nginx
location /media/ {
    alias /var/ww/PhytoScanVPS/backend/uploads/;
}
```

**Règle importante :** le frontend ne doit pas construire les URL
d'images à partir de `http://localhost:8000`. Dans le navigateur d'un
utilisateur, `localhost` désigne son propre appareil et non le VPS. Les
chemins relatifs `/media/...` doivent être résolus sur le domaine
courant ou sur une origine publique HTTPS explicitement configurée.

## 5. Intelligence artificielle et diagnostic

Le projet utilise une architecture de diagnostic par image avec une
couche de service et une correspondance entre les classes prédites et
les maladies référencées dans la base.

Les éléments repérés comprennent :

-   Un service de diagnostic (`scan_service.py`).
-   Un classificateur personnalisé (`custom_classifier.py`).
-   Des poids de modèle et ressources ML dans le dépôt.
-   Une correspondance de classe, par exemple `Tomato_Leaf_Mold` vers le
    code maladie `leaf_mold`.
-   Un nom de modèle configurable, avec une référence observée à
    `phytoscan_v1.0`.
-   Une intégration appelée Octopus dans le frontend et les services
    API.

### Pipeline logique

``` text
Image envoyée
     |
     v
Validation du fichier
     |
     v
Enregistrement dans uploads/scans/
     |
     v
Inférence du modèle / classificateur
     |
     v
Correspondance classe -> maladie
     |
     v
Récupération des informations et traductions
     |
     v
Construction du résultat de diagnostic
     |
     v
Réponse API et rattachement éventuel à une plante
```

**Limite documentaire :** les informations disponibles ne permettent pas
de certifier le nom exact de l'architecture du réseau neuronal, la
version précise de TensorFlow/PyTorch/TFLite utilisée en production, ni
la provenance et la licence de chaque poids de modèle. Ces éléments
doivent être confirmés dans le code ML et les artefacts déployés.

### Catalogue phytosanitaire

Le catalogue comprenait 13 entrées au moment des vérifications de
novembre 2026 :

-   `healthy`
-   `cercospora`
-   `mildew`
-   `powdery_mildew`
-   `early_blight`
-   `late_blight`
-   `bacterial_spot`
-   `leaf_mold`
-   `septoria`
-   `spider_mites`
-   `target_spot`
-   `tylcv`
-   `tomato_mosaic`

Le script de seed complète les traductions manquantes sans dupliquer
celles déjà présentes.

## 6. Assistant vocal et langues

Le projet a fait l'objet de travaux spécifiques sur l'assistant vocal,
particulièrement pour la prise en charge du wolof.

Composants identifiés :

-   `VoiceAssistantScreen.jsx` côté frontend.
-   Des routes et services backend dédiés à l'assistant.
-   Des fichiers `assistant.py`, `assistant_service.py` et `router.py`
    dans les échanges de développement.
-   Une configuration vocale avec `VOICE_ENABLED`, STT et TTS.
-   Des essais autour de Faster-Whisper.
-   Des travaux de modèles STT/TTS wolof.

### Terminologie

-   **STT (Speech-to-Text)** : reconnaissance de la parole et conversion
    de la voix en texte.
-   **TTS (Text-to-Speech)** : conversion du texte en voix.
-   **Assistant conversationnel** : interprétation de la question et
    formulation d'une réponse.



## 6. Authentification et sécurité applicative

Le frontend comprend des écrans de connexion et d'inscription. Les
services d'authentification et les appels API utilisent une logique de
session et des requêtes authentifiées.

Éléments identifiés :

-   `authService`
-   `authFetch`
-   `SESSION_EVENT`
-   `AUTH_REQUIRED`



## 7. Déploiement et infrastructure de production

### 7.1 Environnement observé

-   VPS sous Ubuntu.
-   Nginx 1.24.0 observé dans les journaux.
-   Python et environnement virtuel.
-   Application FastAPI servie par Uvicorn.
-   Frontend compilé dans `frontend/dist`.
-   Certificat TLS Let's Encrypt.
-   Domaine : `phytoscan-ago.duckdns.org`.



### 7.2 Flux des requêtes

-   Le navigateur accède au site en HTTPS.
-   Nginx sert les fichiers frontend depuis `frontend/dist`.
-   Les requêtes `/phytoscan/` sont transmises au backend sur
    `localhost:8000`.
-   Les requêtes `/media/` sont servies depuis `backend/uploads/`.

### 7.3 Processus backend

Des vérifications antérieures ont relevé plusieurs processus Uvicorn sur
les ports `8000` et `8001` à un moment donné. Il faut confirmer quel
processus est réellement utilisé par Nginx, quelle commande démarre
l'application et quel fichier ASGI est chargé.

Ne pas arrêter ou redémarrer un processus en production sans avoir
identifié son gestionnaire (systemd, supervisor ou autre) et le port
réellement utilisé.

## 8. Configuration et variables d'environnement

Les variables exactes peuvent varier selon l'environnement.

### Frontend

Variable observée dans `frontend/.env` :

``` env
VITE_API_BASE_URL=/phytoscan/v1
```

### Backend

Paramètres repérés dans un exemple de configuration de développement :

``` env
ENVIRONMENT=dev
DATABASE_URL=sqlite:///./phytoscan.db
AUTO_CREATE_TABLES=true
SEED_ON_STARTUP=true
SEED_DEMO_PLANTS=true
```

Ces valeurs proviennent d'un exemple de configuration de développement
et ne doivent pas être copiées automatiquement en production.

Les options de création automatique de tables et de données de
démonstration doivent être examinées avec prudence en production. Les
clés STT/TTS, mots de passe, clés d'API et secrets d'authentification
doivent rester confidentiels.

## 9. Git et organisation du code

Dépôt distant :

``` text
https://github.com/Raaakime/PhytoScan
```

Branche de production observée :





## 13. Feuille de route technique recommandée

Cette feuille de route est une proposition de travail et non une liste
de fonctionnalités déclarées comme déjà terminées.

### Priorité 1 --- Stabilisation de la production

-   Terminer et tester le correctif des URL d'images.
-   Vérifier le port backend utilisé par Nginx et identifier les
    processus ambigus.
-   Mettre en place une procédure documentée de sauvegarde SQLite et des
    fichiers médias.
-   Vérifier les permissions d'accès aux images et aux données des
    utilisateurs.
-   Centraliser les journaux et surveiller les erreurs API.

### Priorité 2 --- Fiabilité du diagnostic

-   Évaluer les performances par culture et par maladie.
-   Mesurer précision, rappel, F1-score et matrice de confusion sur un
    jeu de test indépendant.
-   Documenter les limites du modèle et les cas de faible confiance.
-   Vérifier la robustesse aux photos floues, à la lumière variable et
    aux arrière-plans complexes.
-   Mettre en place une procédure de mise à jour contrôlée du modèle.

### Priorité 3 --- Assistant multilingue

-   Finaliser le parcours STT/TTS en français, wolof et anglais.
-   Évaluer la reconnaissance de la parole wolof avec des locuteurs et
    accents variés.
-   Vérifier la qualité de la synthèse vocale et la latence.
-   Prévoir un mode texte de secours si la voix n'est pas disponible.
-   Séparer clairement les réponses agronomiques documentées des
    réponses générées.

### Priorité 4 --- Données agronomiques

-   Documenter les sources et licences des images.
-   Élargir et équilibrer les données par culture, maladie, région et
    conditions de prise de vue.
-   Faire valider les fiches phytosanitaires et recommandations par des
    spécialistes.
-   Développer progressivement le carnet de santé et les alertes
    agronomiques.

## 14. Glossaire

  -----------------------------------------------------------------------
  Terme                               Signification
  ----------------------------------- -----------------------------------
  API                                 Interface permettant au frontend et
                                      aux autres clients de communiquer
                                      avec le backend

  FastAPI                             Framework Python utilisé pour
                                      construire l'API

  React                               Bibliothèque JavaScript de
                                      construction d'interfaces

  Vite                                Outil de développement et de
                                      compilation du frontend

  SQLAlchemy                          ORM Python utilisé pour accéder à
                                      la base de données

  SQLite                              Base de données relationnelle sous
                                      forme de fichier

  Alembic                             Outil de migrations de schéma
                                      SQLAlchemy

  Uvicorn                             Serveur ASGI utilisé pour exécuter
                                      FastAPI

  Nginx                               Serveur web, terminaison HTTPS et
                                      reverse proxy

  STT                                 Speech-to-Text, reconnaissance
                                      vocale

  TTS                                 Text-to-Speech, synthèse vocale

  IA / ML                             Intelligence artificielle /
                                      apprentissage automatique

  Scan                                Analyse d'une image de plante

  `analysis_id`                       Identifiant reliant une analyse à
                                      son historique

  `/media/`                           Chemin utilisé pour accéder aux
                                      fichiers images

  HTTPS                               Protocole HTTP chiffré par TLS
  -----------------------------------------------------------------------

## 15. Conclusion

PhytoScan associe une interface web, une API Python, une base de
données, un pipeline de diagnostic par image et des modules
d'accompagnement agricole. Le projet vise à rendre l'information
phytosanitaire plus accessible, notamment dans le contexte sénégalais,
grâce au suivi des cultures et à une approche multilingue.

Cette synthèse rassemble les éléments techniques et fonctionnels
documentés au 22 novembre 2026. Elle distingue les éléments vérifiés des
fonctionnalités ou configurations qui restent à contrôler directement
dans le dépôt et sur le serveur.

Elle doit être mise à jour à chaque évolution importante de
l'architecture, du modèle IA, des données ou du déploiement.
