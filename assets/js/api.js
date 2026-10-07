/**
 * API Wrapper - VERSI FIXED
 * -------------------------
 * Perbaikan: baca session.user dengan benar
 */
import { CONFIG } from './config.js';
import { getSession } from './auth.js';

/**
 * Ambil user_email & user_nama dari session dengan aman
 */
function getUserContext() {
  const session = getSession();
  return {
    user_email: session?.user?.email || '',
    user_nama: session?.user?.nama || ''
  };
}

/**
 * Request GET
 */
export async function apiGet(action, params = {}) {
  const ctx = getUserContext();

  const query = new URLSearchParams({
    action,
    apiKey: CONFIG.API_KEY,
    ...ctx,
    ...params
  });

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
  }
}

/**
 * Request POST
 */
export async function apiPost(action, payload = {}) {
  const ctx = getUserContext();

  const body = {
    action,
    apiKey: CONFIG.API_KEY,
    ...ctx,
    ...payload
  };

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
  }
}

/**
 * Handle error terpusat
 */
function handleApiError(json) {
  if (json.code === 401) {
    alert('Sesi Anda berakhir. Silakan login ulang.');
    localStorage.removeItem(CONFIG.SESSION_KEY);
    setTimeout(() => location.href = 'login.html', 1000);
  }
}
