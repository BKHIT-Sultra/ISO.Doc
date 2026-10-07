/**
 * Login Page Controller
 * ---------------------
 * Dipisah dari HTML agar tidak ada masalah karakter escape.
 */
import { login, getSession } from './auth.js';

// ============================================================
// Redirect kalau sudah login
// ============================================================
if (getSession()) {
  location.href = 'dashboard.html';
}

// ============================================================
// Element refs
// ============================================================
const form = document.getElementById('loginForm');
const btn = document.getElementById('btnLogin');
const btnText = document.getElementById('btnText');
const errBox = document.getElementById('errorBox');
const errText = document.getElementById('errorText');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const toggleBtn = document.getElementById('togglePassword');
const eyeOpen = document.getElementById('eyeOpen');
const eyeClosed = document.getElementById('eyeClosed');

// ============================================================
// Toggle Password Visibility
// ============================================================
toggleBtn.addEventListener('click', function() {
  const isHidden = passInput.type === 'password';
  passInput.type = isHidden ? 'text' : 'password';
  eyeOpen.classList.toggle('hidden', isHidden);
  eyeClosed.classList.toggle('hidden', !isHidden);
});

// ============================================================
// Loading state
// ============================================================
function setLoading(isLoading) {
  btn.disabled = isLoading;
  
  if (isLoading) {
    btnText.textContent = 'Memverifikasi...';
    const spinner = document.createElement('div');
    spinner.id = 'btnSpinner';
    spinner.className = 'animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full';
    btn.insertBefore(spinner, btnText);
  } else {
    btnText.textContent = 'Masuk ke Sistem';
    const spinner = document.getElementById('btnSpinner');
    if (spinner) spinner.remove();
  }
}

// ============================================================
// Error handling
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
// Submit
// ============================================================
form.addEventListener('submit', async function(e) {
  e.preventDefault();
  e.stopPropagation();

  const email = emailInput.value.trim().toLowerCase();
  const password = passInput.value;

  if (!email || !password) {
    showError('Email dan password wajib diisi');
    return;
  }

  hideError();
  setLoading(true);

  try {
    const user = await login(email, password);

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
  }
});

// ============================================================
// Auto-fill remembered email
// ============================================================
const remembered = localStorage.getItem('iso_doc_remember_email');
if (remembered) {
  emailInput.value = remembered;
  document.getElementById('remember').checked = true;
  setTimeout(function() { passInput.focus(); }, 300);
} else {
  setTimeout(function() { emailInput.focus(); }, 300);
}
