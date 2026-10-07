/**
 * API Wrapper - VERSI FIXED + LOADING BAR
 * ----------------------------------------
 * - Baca session.user dengan benar
 * - Top loading bar otomatis setiap request
 * - Handle error terpusat
 */
import { CONFIG } from './config.js';
import { getSession } from './auth.js';
import { showTopBar, hideTopBar } from './components/loader.js';

/**
 * Ambil user context dari session dengan aman
 */
function getUserContext() {
  const session = getSession();
  return {
    user_email: session?.user?.email || '',
    user_nama: session?.user?.nama || ''
  };
}

/**
 * ==================== REQUEST GET ====================
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
 * ==================== REQUEST POST ====================
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
      headers: {
        // Gunakan text/plain untuk hindari CORS preflight OPTIONS
        'Content-Type': 'text/plain;charset=utf-8'
      },
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
 * ==================== ERROR HANDLING ====================
 */
function handleApiError(json) {
  // Sesi berakhir
  if (json.code === 401) {
    if (typeof window !== 'undefined') {
      // Cegah multiple alert
      if (!window.__sessionExpiredHandled) {
        window.__sessionExpiredHandled = true;

        alert('Sesi Anda berakhir. Silakan login ulang.');
        localStorage.removeItem(CONFIG.SESSION_KEY);

        setTimeout(() => {
          location.href = 'login.html';
        }, 1000);
      }
    }
  }
}
