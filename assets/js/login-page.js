/**
 * Login Page Controller dengan hCaptcha
 * --------------------------------------
 */
import { login, getSession } from '../auth.js';

// ============================================================
// STATE
// ============================================================
var captchaToken = null;

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
// ★ hCaptcha CALLBACKS
// ============================================================
window.onCaptchaSuccess = function(token) {
  captchaToken = token;
  console.log('[login] hCaptcha verified ✅');
  hideError();
};

window.onCaptchaExpired = function() {
  captchaToken = null;
  console.warn('[login] hCaptcha expired');
  showError('Verifikasi hCaptcha sudah kadaluarsa. Silakan ulangi.');
};

window.onCaptchaError = function(errorCode) {
  captchaToken = null;
  console.error('[login] hCaptcha error:', errorCode);
  showError('Terjadi kesalahan pada verifikasi hCaptcha. Silakan muat ulang halaman.');
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
  setTimeout(function() { form.classList.remove('animate-shake'); }, 500);
}
function hideError() {
  errBox.classList.add('hidden');
  errText.textContent = '';
}

// ============================================================
// RESET CAPTCHA
// ============================================================
function resetCaptcha() {
  captchaToken = null;
  // hCaptcha reset menggunakan window.hcaptcha.reset()
  if (window.hcaptcha) {
    try {
      window.hcaptcha.reset();
      console.log('[login] hCaptcha reset');
    } catch (e) {
      console.warn('[login] Gagal reset hCaptcha:', e);
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

  if (!email || !password) {
    showError('Email dan password wajib diisi');
    return;
  }
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError('Format email tidak valid');
    return;
  }
  // ★ Validasi hCaptcha
  if (!captchaToken) {
    showError('Silakan selesaikan verifikasi hCaptcha terlebih dahulu');
    return;
  }

  hideError();
  setLoading(true);

  try {
    var user = await login(email, password, captchaToken);

    if (document.getElementById('remember').checked) {
      localStorage.setItem('iso_doc_remember_email', email);
    } else {
      localStorage.removeItem('iso_doc_remember_email');
    }
    btnText.textContent = 'Berhasil! Mengalihkan...';
    setTimeout(function() { location.href = 'dashboard.html'; }, 600);

  } catch (err) {
    console.error('[Login Error]', err);
    setLoading(false);
    showError(err.message || 'Login gagal. Periksa email dan password Anda.');
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
