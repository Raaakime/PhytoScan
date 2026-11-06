const KEY = "phytoscan_profile_extras";

const readAll = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
};

export const getProfileExtras = (email) => readAll()[email?.toLowerCase()] || {};

export const saveProfileExtras = (email, data) => {
  const all = readAll();
  const k = email.trim().toLowerCase();
  all[k] = { ...(all[k] || {}), ...data };
  localStorage.setItem(KEY, JSON.stringify(all));
};