/**
 * Reset Password Page Controller
 */
import { apiGet, apiPost } from '../api.js';

// State
var token = '';
var email = '';
var passwordStrength = 0;

var loadingState = document.getElementById('loadingState');
var invalidState = document.getElementById('invalidState');
var formState = document.getElementById('formState');
var successState = document.getElementById('successState');
var invalidMessage = document.getElementById('invalidMessage');

var form = document.getElementById('resetForm');
var btn = document.getElementById('btnSubmit');
var btnText = document.getElementById('btnText');
var newPassword = document.getElementById('newPassword');
var confirmPassword = document.getElementById('confirmPassword');
var errBox = document.getElementById('errorBox');
var errText = document.getElementById('errorText');
var strengthText = document.getElementById('strengthText');

// ===== Ambil token & email dari URL =====
var params = new URLSearchParams(location.search);
token = params.get('token') || '';
email = params.get('email') || '';

// ===== Validate & show form =====
async function init() {
  if (!token || !email) {
    showInvalid('Link tidak lengkap. Pastikan Anda mengklik link dari email.');
    return;
  }

  try {
    var result = await apiGet('validateResetToken', { token: token, email: email });

    if (!result || !result.valid) {
      showInvalid('Token tidak valid');
      return;
    }

    document.getElementById('displayEmail').textContent = email;
    showForm();

  } catch (e) {
    console.error('[reset]', e);
    showInvalid(e.message || 'Token tidak valid atau sudah kadaluarsa');
  }
}

function showInvalid(msg) {
  loadingState.classList.add('hidden');
  formState.classList.add('hidden');
  successState.classList.add('hidden');
  invalidState.classList.remove('hidden');
  invalidMessage.textContent = msg;
}

function showForm() {
  loadingState.classList.add('hidden');
  invalidState.classList.add('hidden');
  successState.classList.add('hidden');
  formState.classList.remove('hidden');
}

function showSuccess() {
  loadingState.classList.add('hidden');
  invalidState.classList.add('hidden');
  formState.classList.add('hidden');
  successState.classList.remove('hidden');
}

// ===== Toggle password visibility =====
document.getElementById('toggleNewPassword').addEventListener('click', function() {
  var type = newPassword.type === 'password' ? 'text' : 'password';
  newPassword.type = type;
  confirmPassword.type = type;
});

// ===== Password strength =====
newPassword.addEventListener('input', function() {
  var pwd = newPassword.value;
  var strength = 0;

  if (pwd.length >= 6) strength++;
  if (pwd.length >= 10) strength++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++;
  if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) strength++;

  passwordStrength = strength;

  var colors = ['#e2e8f0', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  var labels = ['-', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];

  document.querySelectorAll('[data-strength]').forEach(function(bar, i) {
    bar.style.background = (i < strength) ? colors[strength] : '#e2e8f0';
  });

  strengthText.textContent = labels[strength];
  strengthText.style.color = colors[strength];
});

// ===== Helpers =====
function setLoading(isLoading) {
  btn.disabled = isLoading;
  btnText.textContent = isLoading ? 'Menyimpan...' : 'Reset Password';
}

function showError(msg) {
  errText.textContent = msg;
  errBox.classList.remove('hidden');
  form.classList.add('animate-shake');
  setTimeout(function() { form.classList.remove('animate-shake'); }, 500);
}

// ===== Submit =====
form.addEventListener('submit', async function(e) {
  e.preventDefault();

  var pwd = newPassword.value;
  var confirm = confirmPassword.value;

  if (pwd.length < 6) {
    showError('Password minimal 6 karakter');
    return;
  }

  if (pwd !== confirm) {
    showError('Konfirmasi password tidak cocok');
    return;
  }

  errBox.classList.add('hidden');
  setLoading(true);

  try {
    await apiPost('resetPassword', {
      token: token,
      email: email,
      new_password: pwd
    });

    showSuccess();

  } catch (err) {
    console.error('[reset-password]', err);
    setLoading(false);
    showError(err.message || 'Gagal reset password');
  }
});

init();
