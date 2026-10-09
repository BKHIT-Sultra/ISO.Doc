/**
 * Login Page Controller dengan Turnstile CAPTCHA
 * -----------------------------------------------
 * - Verifikasi CAPTCHA wajib sebelum login
 * - Reset CAPTCHA otomatis setelah error
 * - Auto-fill email jika "Remember Me" dicentang
 */
import { login, getSession } from '../auth.js';

// ============================================================
// STATE
// ============================================================
var captchaToken = null;
var captchaReady = false;

// ============================================================
// INIT
// ============================================================
if (getSession()) {
  location.href = 'dashboard.html';
}

// Element refs
var form = document.getElementById('loginForm');
var btn = document.getElementById('btnLogin');
var btnText = document.getElementById('btnText');
var errBox = document.getElementById('errorBox');
var errText = document.getElementById('errorText');
var emailInput = document.getElementById('email');
var passInput = document.getElementById('password');
var toggleBtn = document.getElementById('togglePassword');
var eyeOpen = document.getElementById('eyeOpen');
var eyeClosed = document.getElementById('eyeClosed');

// ============================================================
// CAPTCHA CALLBACKS — Dipanggil oleh Cloudflare Turnstile
// ============================================================
window.onCaptchaSuccess = function(token) {
  captchaToken = token;
  captchaReady = true;
  console.log('[login] CAPTCHA verified ✅');
  hideError();
};

window.onCaptchaExpired = function() {
  captchaToken = null;
  captchaReady = false;
  console.warn('[login] CAPTCHA expired');
  showError('CAPTCHA sudah kadaluarsa. Silakan verifikasi ulang.');
};

window.onCaptchaError = function(errorCode) {
  captchaToken = null;
  captchaReady = false;
  console.error('[login] CAPTCHA error:', errorCode);
  showError('Terjadi kesalahan pada CAPTCHA. Silakan refresh halaman.');
};

// ============================================================
// TOGGLE PASSWORD VISIBILITY
// ============================================================
if (toggleBtn) {
  toggleBtn.addEventListener('click', function() {
    var isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    eyeOpen.classList.toggle('hidden', isHidden);
    eyeClosed.classList.toggle('hidden', !isHidden);
  });
}

// ============================================================
// LOADING STATE
// ============================================================
function setLoading(isLoading) {
  btn.disabled = isLoading;

  if (isLoading) {
    btnText.textContent = 'Memverifikasi...';
    var spinner = document.createElement('div');
    spinner.id = 'btnSpinner';
    spinner.className = 'animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full';
    btn.insertBefore(spinner, btnText);
  } else {
    btnText.textContent = 'Masuk ke Sistem';
    var sp = document.getElementById('btnSpinner');
    if (sp) sp.remove();
  }
}

// ============================================================
// ERROR HANDLING
// ============================================================
function showError(msg) {
  errText.textContent = msg;
  errBox.classList.remove('hidden');
  form.classList.add('animate-shake');
  setTimeout(function() {
    form.classList.remove('animate-shake');
  }, 500);
}

function hideError() {
  errBox.classList.add('hidden');
  errText.textContent = '';
}

// ============================================================
// RESET CAPTCHA — setelah error
// ============================================================
function resetCaptcha() {
  captchaToken = null;
  captchaReady = false;
  if (window.turnstile) {
    try {
      window.turnstile.reset();
      console.log('[login] CAPTCHA reset');
    } catch (e) {
      console.warn('[login] Gagal reset CAPTCHA:', e);
    }
  }
}

// ============================================================
// SUBMIT HANDLER
// ============================================================
form.addEventListener('submit', async function(e) {
  e.preventDefault();
  e.stopPropagation();

  var email = emailInput.value.trim().toLowerCase();
  var password = passInput.value;

  // Validasi dasar
  if (!email || !password) {
    showError('Email dan password wajib diisi');
    return;
  }

  // Validasi email format
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError('Format email tidak valid');
    return;
  }

  // ★ Validasi CAPTCHA
  if (!captchaToken) {
    showError('Silakan selesaikan verifikasi CAPTCHA terlebih dahulu');
    return;
  }

  hideError();
  setLoading(true);

  try {
    var user = await login(email, password, captchaToken);

    // Simpan preferensi "remember me"
    if (document.getElementById('remember').checked) {
      localStorage.setItem('iso_doc_remember_email', email);
    } else {
      localStorage.removeItem('iso_doc_remember_email');
    }

    btnText.textContent = 'Berhasil! Mengalihkan...';

    setTimeout(function() {
      location.href = 'dashboard.html';
    }, 600);

  } catch (err) {
    console.error('[Login Error]', err);
    setLoading(false);
    showError(err.message || 'Login gagal. Periksa email dan password Anda.');

    // ★ Reset CAPTCHA setiap kali error
    resetCaptcha();
  }
});

// ============================================================
// AUTO-FILL REMEMBERED EMAIL
// ============================================================
var remembered = localStorage.getItem('iso_doc_remember_email');
if (remembered) {
  emailInput.value = remembered;
  document.getElementById('remember').checked = true;
  setTimeout(function() { passInput.focus(); }, 300);
} else {
  setTimeout(function() { emailInput.focus(); }, 300);
}

// ============================================================
// WATCHDOG: Cek CAPTCHA setelah 3 detik
// ============================================================
setTimeout(function() {
  var widget = document.querySelector('.cf-turnstile');
  if (widget && !widget.querySelector('iframe')) {
    console.warn('[login] CAPTCHA widget belum ter-load. Cek koneksi internet.');
  }
}, 3000);
