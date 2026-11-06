const AUTH_USER_KEY = 'phytoscan_auth_user';
const LEGACY_USERS_KEY = 'phytoscan_users_db';
import { apiRequest, clearTokens, getAccessToken, saveTokenPair } from './apiClient';

const normalizeUser = (user) => ({
  ...user,
  name: user.fullName || user.name || user.email,
  farmName: user.farmName || '',
  role: user.agriculturalRole || user.role || 'Agriculteur',
  avatarColor: '#10b981'
});

const storeUser = (user, rememberMe = true) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  const otherStorage = rememberMe ? sessionStorage : localStorage;
  otherStorage.removeItem(AUTH_USER_KEY);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(normalizeUser(user)));
  return normalizeUser(user);
};

/**
 * Récupère l'utilisateur actuellement connecté
 */
export const getCurrentUser = () => {
  try {
    localStorage.removeItem(LEGACY_USERS_KEY);
    if (!getAccessToken()) {
      localStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
    const data = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const registerUser = async ({ name, email, password, farmName, role }) => {
  try {
    await apiRequest('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        fullName: name.trim(),
        farmName: farmName.trim() || null,
        agriculturalRole: role
      })
    });
    return await loginUser(email, password);
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const loginUser = async (email, password, rememberMe = true) => {
  if (!email || !password) {
    return { success: false, message: 'Veuillez saisir votre email et votre mot de passe.' };
  }

  try {
    const formData = new URLSearchParams({ username: email.trim().toLowerCase(), password });
    const tokens = await apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    saveTokenPair(tokens, rememberMe);
    const user = await apiRequest('/auth/me');
    return { success: true, user: storeUser(user, rememberMe) };
  } catch (error) {
    clearTokens();
    return { success: false, message: error.message };
  }
};

export const logoutUser = () => {
  clearTokens();
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
};



