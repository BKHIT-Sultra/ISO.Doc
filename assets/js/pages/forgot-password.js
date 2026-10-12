/**
 * Forgot Password Page Controller
 */
import { apiPost } from '../api.js';

var form = document.getElementById('resetForm');
var btn = document.getElementById('btnSubmit');
var btnText = document.getElementById('btnText');
var emailInput = document.getElementById('email');
var errBox = document.getElementById('errorBox');
var errText = document.getElementById('errorText');
var successBox = document.getElementById('successBox');
var successText = document.getElementById('successText');

function setLoading(isLoading) {
  btn.disabled = isLoading;
  btnText.textContent = isLoading ? 'Mengirim...' : 'Kirim Link Reset';
}

function showError(msg) {
  errText.textContent = msg;
  errBox.classList.remove('hidden');
  successBox.classList.add('hidden');
  form.classList.add('animate-shake');
  setTimeout(function() { form.classList.remove('animate-shake'); }, 500);
}

function hideError() {
  errBox.classList.add('hidden');
}

function showSuccess(msg) {
  successText.textContent = msg;
  successBox.classList.remove('hidden');
  errBox.classList.add('hidden');
}

form.addEventListener('submit', async function(e) {
  e.preventDefault();

  var email = emailInput.value.trim().toLowerCase();
  if (!email) {
    showError('Email wajib diisi');
    return;
  }

  hideError();
  setLoading(true);

  try {
    var result = await apiPost('requestPasswordReset', { email: email });

    showSuccess(
      'Jika email terdaftar, Anda akan menerima link reset password dalam beberapa menit. ' +
      'Cek folder Spam jika tidak menemukannya di Inbox.'
    );

    form.reset();
    btn.disabled = false;
    btnText.textContent = 'Kirim Link Reset';

  } catch (err) {
    console.error('[forgot-password]', err);
    setLoading(false);
    showError(err.message || 'Gagal mengirim permintaan');
  }
});
