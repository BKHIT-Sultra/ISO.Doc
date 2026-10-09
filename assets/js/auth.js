/**
 * Modul Autentikasi & Session
 * ----------------------------
 * Fitur:
 * - Session dengan idle timeout 30 menit
 * - Absolute timeout 12 jam
 * - Auto-extend activity tracking
 */
import { CONFIG } from './config.js';
import { apiPost } from './api.js';

// ===== KONFIGURASI SESSION =====
var SESSION_CONFIG = {
  IDLE_TIMEOUT_MS: 30 * 60 * 1000,        // 30 menit
  ABSOLUTE_TIMEOUT_MS: 12 * 60 * 60 * 1000, // 12 jam
  WARNING_BEFORE_MS: 2 * 60 * 1000         // Warning 2 menit sebelum idle logout
};

var activityTimer = null;
var warningShown = false;

// ============================================================
// SAVE SESSION
// ============================================================
export function saveSession(data) {
  var now = new Date().toISOString();
  localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify({
    ...data,
    loginAt: now,
    lastActivity: now
  }));

  // Mulai tracking activity
  startActivityTracking();
}

// ============================================================
// GET SESSION (dengan validasi timeout)
// ============================================================
export function getSession() {
  try {
    var raw = localStorage.getItem(CONFIG.SESSION_KEY);
    if (!raw) return null;

    var session = JSON.parse(raw);

    // ===== Cek absolute timeout =====
    if (session.loginAt) {
      var loginTime = new Date(session.loginAt).getTime();
      var now = Date.now();
      if (now - loginTime > SESSION_CONFIG.ABSOLUTE_TIMEOUT_MS) {
        console.warn('[auth] Absolute timeout — auto logout');
        clearSession();
        return null;
      }
    }

    // ===== Cek idle timeout =====
    if (session.lastActivity) {
      var lastAct = new Date(session.lastActivity).getTime();
      var now2 = Date.now();
      if (now2 - lastAct > SESSION_CONFIG.IDLE_TIMEOUT_MS) {
        console.warn('[auth] Idle timeout — auto logout');
        clearSession();
        return null;
      }
    }

    return session;
  } catch (e) {
    return null;
  }
}

// ============================================================
// UPDATE ACTIVITY (reset idle timer)
// ============================================================
export function touchSession() {
  try {
    var raw = localStorage.getItem(CONFIG.SESSION_KEY);
    if (!raw) return;
    var session = JSON.parse(raw);
    session.lastActivity = new Date().toISOString();
    localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
    warningShown = false;
  } catch (e) {}
}

// ============================================================
// CLEAR SESSION
// ============================================================
export function clearSession() {
  localStorage.removeItem(CONFIG.SESSION_KEY);
  stopActivityTracking();
}

// ============================================================
// REQUIRE AUTH (redirect kalau tidak ada session)
// ============================================================
export function requireAuth() {
  var session = getSession();
  if (!session || !session.user || !session.token) {
    location.href = 'login.html';
    return null;
  }

  // Mulai tracking kalau belum
  startActivityTracking();

  return session.user;
}

// ============================================================
// LOGIN
// ============================================================
export async function login(email, password) {
  var result = await apiPost('login', { email, password });
  saveSession(result);
  return result.user;
}

// ============================================================
// LOGOUT
// ============================================================
export async function logout() {
  var session = getSession();
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

// ============================================================
// HAS ROLE
// ============================================================
export function hasRole(user, allowedRoles) {
  return allowedRoles.includes(user.role);
}

// ============================================================
// ACTIVITY TRACKING (internal)
// ============================================================
function startActivityTracking() {
  // Hapus listener lama kalau ada
  stopActivityTracking();

  // Touch session setiap 1 menit
  activityTimer = setInterval(function() {
    var session = getSession(); // getSession sudah cek timeout

    if (!session) {
      // Session sudah expired
      if (activityTimer) {
        clearInterval(activityTimer);
        activityTimer = null;
      }
      return;
    }

    // Cek apakah mendekati idle timeout (warning)
    var lastAct = new Date(session.lastActivity).getTime();
    var idleDuration = Date.now() - lastAct;

    if (idleDuration > SESSION_CONFIG.IDLE_TIMEOUT_MS - SESSION_CONFIG.WARNING_BEFORE_MS) {
      if (!warningShown) {
        warningShown = true;
        showIdleWarning();
      }
    }
  }, 60000); // cek tiap 1 menit

  // Attach listener untuk user activity
  var events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
  var handler = debounceTouch();

  events.forEach(function(evt) {
    document.addEventListener(evt, handler, { passive: true });
  });
}

function stopActivityTracking() {
  if (activityTimer) {
    clearInterval(activityTimer);
    activityTimer = null;
  }
}

// ============================================================
// DEBOUNCE TOUCH (biar tidak spam)
// ============================================================
function debounceTouch() {
  var lastTouch = 0;
  return function() {
    var now = Date.now();
    // Update lastActivity max 1x per 30 detik
    if (now - lastTouch > 30000) {
      lastTouch = now;
      touchSession();
    }
  };
}

// ============================================================
// IDLE WARNING (munculkan alert sebelum logout)
// ============================================================
function showIdleWarning() {
  // Cek apakah session masih ada
  var session = getSession();
  if (!session) return;

  // Tampilkan konfirmasi
  var confirmed = window.confirm(
    '⚠️ Sesi Anda akan berakhir dalam 2 menit karena tidak ada aktivitas.\n\n' +
    'Klik OK untuk tetap login, atau Cancel untuk logout sekarang.'
  );

  if (confirmed) {
    touchSession();
    warningShown = false;
  } else {
    logout();
  }
}
