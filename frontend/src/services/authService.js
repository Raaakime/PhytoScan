// Service d'authentification et gestion des utilisateurs PhytoScan AI

const USERS_STORAGE_KEY = 'phytoscan_users_db';
const AUTH_USER_KEY = 'phytoscan_auth_user';

// Utilisateur de démonstration par défaut
const DEFAULT_DEMO_USER = {
  id: 'usr_demo_01',
  name: 'Amadou Diallo',
  email: 'amadou.diallo@ferme-bio.sn',
  password: 'password123',
  role: 'Maraîcher / Exploitant Agricole',
  farmName: 'Ferme Agro-Écologique des Niayes',
  location: 'Dakar / Thiès, Sénégal',
  avatarColor: '#10b981',
  createdAt: '2025-01-15'
};

/**
 * Récupère tous les utilisateurs enregistrés dans le localStorage
 */
export const getStoredUsers = () => {
  try {
    const data = localStorage.getItem(USERS_STORAGE_KEY);
    if (!data) {
      const initialUsers = [DEFAULT_DEMO_USER];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_DEMO_USER];
  } catch (err) {
    console.error('Erreur lecture utilisateurs:', err);
    return [DEFAULT_DEMO_USER];
  }
};

/**
 * Sauvegarde la liste des utilisateurs dans le localStorage
 */
const saveUsers = (users) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Erreur sauvegarde utilisateurs:', err);
  }
};

/**
 * Récupère l'utilisateur actuellement connecté
 */
export const getCurrentUser = () => {
  try {
    const data = localStorage.getItem(AUTH_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * Inscription d'un nouvel utilisateur
 */
export const registerUser = ({ name, email, password, farmName, role }) => {
  if (!name || !email || !password) {
    return { success: false, message: 'Veuillez remplir tous les champs obligatoires.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = getStoredUsers();

  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return { success: false, message: 'Un compte avec cette adresse email existe déjà.' };
  }

  const newUser = {
    id: `usr_${Date.now().toString(36)}`,
    name: name.trim(),
    email: cleanEmail,
    password, // En environnement de démo client-side
    role: role || 'Agriculteur / Maraîcher',
    farmName: farmName ? farmName.trim() : 'Exploitation Agricole',
    avatarColor: ['#10b981', '#059669', '#0d9488', '#16a34a', '#2563eb'][Math.floor(Math.random() * 5)],
    createdAt: new Date().toLocaleDateString('fr-FR')
  };

  users.push(newUser);
  saveUsers(users);

  // Connexion automatique après inscription réussie
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
  } catch (err) {
    console.error('Erreur stockage session:', err);
  }

  return { success: true, user: newUser };
};

/**
 * Connexion d'un utilisateur existant
 */
export const loginUser = (email, password) => {
  if (!email || !password) {
    return { success: false, message: 'Veuillez saisir votre email et votre mot de passe.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = getStoredUsers();

  const user = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return { success: false, message: 'Aucun compte trouvé avec cet email.' };
  }

  if (user.password !== password) {
    return { success: false, message: 'Mot de passe incorrect. Veuillez réessayer.' };
  }

  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Erreur stockage session:', err);
  }

  return { success: true, user };
};

/**
 * Déconnexion
 */
export const logoutUser = () => {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
  } catch (err) {
    console.error('Erreur déconnexion:', err);
  }
};

/**
 * Utilisateur de démonstration prêt à l'emploi
 */
export const DEMO_CREDENTIALS = {
  email: DEFAULT_DEMO_USER.email,
  password: DEFAULT_DEMO_USER.password
};

