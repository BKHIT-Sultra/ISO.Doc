/**
 * API Wrapper - VERSI FIXED
 * --------------------------
 * ✅ TIDAK import auth.js (hindari circular dependency)
 * ✅ Baca session langsung dari localStorage
 * ✅ Top loading bar otomatis
 */
import { CONFIG } from './config.js';
import { showTopBar, hideTopBar } from './components/loader.js';

/**
 * Baca user context langsung dari localStorage
 * (tanpa lewat auth.js → tidak ada circular dependency)
 */
function getUserContext() {
  try {
    const raw = localStorage.getItem(CONFIG.SESSION_KEY);
    if (!raw) return { user_email: '', user_nama: '' };
    const session = JSON.parse(raw);
    return {
      user_email: session?.user?.email || '',
      user_nama: session?.user?.nama || ''
    };
  } catch (e) {
    return { user_email: '', user_nama: '' };
  }
}

/**
 * ==================== GET ====================
 */
export async function apiGet(action, params = {}) {
  const ctx = getUserContext();
  const query = new URLSearchParams({
    action,
    apiKey: CONFIG.API_KEY,
    ...ctx,
    ...params
  });

  showTopBar();

  try {
    const res = await fetch(`${CONFIG.API_URL}?${query}`, {
      method: 'GET',
      mode: 'cors'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (!json.success) {
      handleApiError(json);
      throw new Error(json.error || 'Request gagal');
    }

    return json.data;

  } catch (err) {
    console.error('[apiGet]', action, err);
    throw err;
  } finally {
    hideTopBar();
  }
}

/**
 * ==================== POST ====================
 */
export async function apiPost(action, payload = {}) {
  const ctx = getUserContext();
  const body = {
    action,
    apiKey: CONFIG.API_KEY,
    ...ctx,
    ...payload
  };

  showTopBar();

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (!json.success) {
      handleApiError(json);
      throw new Error(json.error || 'Request gagal');
    }

    return json.data;

  } catch (err) {
    console.error('[apiPost]', action, err);
    throw err;
  } finally {
    hideTopBar();
  }
}

/**
 * ==================== ERROR HANDLER ====================
 */
function handleApiError(json) {
  if (json.code === 401) {
    if (!window.__sessionExpiredHandled) {
      window.__sessionExpiredHandled = true;
      alert('Sesi Anda berakhir. Silakan login ulang.');
      localStorage.removeItem(CONFIG.SESSION_KEY);
      setTimeout(() => location.href = 'login.html', 1000);
    }
  }
}
