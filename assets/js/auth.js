/**
 * Modul Autentikasi & Session
 */
import { CONFIG } from './config.js';
import { apiPost } from './api.js';

/**
 * Simpan session ke localStorage
 */
export function saveSession(data) {
  localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify({
    ...data,
    loginAt: new Date().toISOString()
  }));
}

/**
 * Ambil session aktif
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(CONFIG.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Hapus session
 */
export function clearSession() {
  localStorage.removeItem(CONFIG.SESSION_KEY);
}

/**
 * Cek apakah user login. Jika tidak → redirect ke login.
 */
export function requireAuth() {
  const session = getSession();
  if (!session || !session.user || !session.token) {
    location.href = 'login.html';
    return null;
  }
  return session.user;
}

/**
 * Login via API
 */
export async function login(email, password) {
  const result = await apiPost('login', { email, password });
  saveSession(result);
  return result.user;
}

/**
 * Logout
 */
export async function logout() {
  const session = getSession();
  try {
    if (session) {
      await apiPost('logout', {
        user_email: session.user.email,
        user_nama: session.user.nama
      });
    }
  } catch (e) {
    console.warn('Logout API gagal, tetap clear session');
  } finally {
    clearSession();
    location.href = 'login.html';
  }
}

/**
 * Cek apakah role user punya akses ke halaman tertentu
 */
export function hasRole(user, allowedRoles) {
  return allowedRoles.includes(user.role);
}
