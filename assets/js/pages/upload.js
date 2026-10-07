/**
 * Upload Page Controller
 * ----------------------
 * Handle form upload dan edit dokumen.
 * ASCII-safe: no emoji, string concat, no template literal.
 */
import { requireAuth } from '../auth.js';
import { renderNavbar, attachNavbarEvents } from '../components/navbar.js';
import { renderSidebar } from '../components/sidebar.js';
import { apiPost, apiGet } from '../api.js';
import { fileToBase64, validateFile, getQuery } from '../utils.js';
import { showToast } from '../components/toast.js';
import { btnLoading, btnReset, showOverlay, hideOverlay, updateOverlayProgress } from '../components/loader.js';

// ============================================================
// STATE
// ============================================================
var state = {
  user: null,
  mode: 'create', // 'create' | 'edit'
  docId: null,
  selectedFile: null,
  existingDoc: null
};

// ============================================================
// INIT
// ============================================================
var user = requireAuth();
if (!user) throw new Error('No auth');

state.user = user;

document.getElementById('navbar').innerHTML = renderNavbar(user);
document.getElementById('sidebar').innerHTML = renderSidebar(user, 'upload');
attachNavbarEvents();

// Set default tanggal terbit = hari ini
document.getElementById('tgl_terbit').valueAsDate = new Date();

// Cek mode: edit kalau ada ?id=
state.docId = getQuery('id');
if (state.docId) {
  state.mode = 'edit';
  loadExistingDocument();
}

// Setup drag-drop
setupDropZone();

// Setup step indicator
setupStepIndicator();

// Setup submit
setupSubmit();

// ============================================================
// LOAD EXISTING DOC (EDIT MODE)
// ============================================================
async function loadExistingDocument() {
  try {
    showOverlay('Memuat dokumen', 'Mohon tunggu...');

    var data = await apiGet('getDocumentById', { doc_id: state.docId });
    state.existingDoc = data.document;

    // Update UI header
    document.getElementById('pageTitle').textContent = 'Edit Dokumen';
    document.getElementById('pageSubtitle').textContent =
      'Perbarui data dokumen ' + state.existingDoc.kode_dokumen;
    document.querySelector('#btnSubmit span').textContent = 'Simpan Perubahan';

    // Fill form
    fillForm(state.existingDoc);

    hideOverlay();
  } catch (e) {
    hideOverlay();
    showToast('Gagal memuat dokumen: ' + e.message, 'error');
  }
}

function fillForm(d) {
  setValue('jenis', d.jenis || '');
  setValue('sub_jenis', d.sub_jenis || '');
  setValue('kode_dokumen', d.kode_dokumen || '');
  setValue('judul', d.judul || '');
  setValue('sub_klausul', d.sub_klausul || '');
  setValue('pemilik_departemen', d.pemilik_departemen || '');
  setValue('pemilik_email', d.pemilik_email || '');
  setValue('kata_kunci', d.kata_kunci || '');
  setValue('keterangan', d.keterangan || '');
  setValue('frekuensi_review_bulan', d.frekuensi_review_bulan || 12);

  // Tanggal
  if (d.tgl_terbit) {
    var tgl = new Date(d.tgl_terbit);
    if (!isNaN(tgl.getTime())) {
      document.getElementById('tgl_terbit').value = tgl.toISOString().split('T')[0];
    }
  }

  // Standar checkboxes
  var standarArr = String(d.standar || '').split(',').map(function(s) { return s.trim(); });
  document.querySelectorAll('.standar-cb').forEach(function(cb) {
    cb.checked = standarArr.indexOf(cb.value) !== -1;
  });

  // Kode dokumen readonly saat edit
  document.getElementById('kode_dokumen').setAttribute('readonly', 'readonly');
  document.getElementById('kode_dokumen').classList.add('bg-slate-100', 'cursor-not-allowed');
}

function setValue(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = val;
}

// ============================================================
// DROP ZONE
// ============================================================
function setupDropZone() {
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var filePreview = document.getElementById('filePreview');
  var btnClear = document.getElementById('btnClearFile');

  dropZone.addEventListener('click', function() { fileInput.click(); });

  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  ['dragleave', 'dragend'].forEach(function(evt) {
    dropZone.addEventListener(evt, function() {
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', function() {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  btnClear.addEventListener('click', function(e) {
    e.stopPropagation();
    state.selectedFile = null;
    fileInput.value = '';
    filePreview.classList.add('hidden');
    dropZone.classList.remove('hidden');
  });
}

function handleFile(file) {
  var v = validateFile(file);
  if (!v.valid) {
    showToast(v.error, 'error');
    return;
  }

  state.selectedFile = file;
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = formatSize(file.size);
  document.getElementById('filePreview').classList.remove('hidden');
  document.getElementById('dropZone').classList.add('hidden');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ============================================================
// STEP INDICATOR (visual feedback saat scroll)
// ============================================================
function setupStepIndicator() {
  var sections = ['section1', 'section2', 'section3', 'section4'];
  var dots = document.querySelectorAll('.step-dot');

  if (!('IntersectionObserver' in window)) return;

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var idx = sections.indexOf(entry.target.id);
        dots.forEach(function(dot, i) {
          dot.classList.remove('active');
          if (i === idx) dot.classList.add('active');
          if (i < idx) dot.classList.add('completed');
          else dot.classList.remove('completed');
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

// ============================================================
// SUBMIT
// ============================================================
function setupSubmit() {
  document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Validasi
    var err = validateForm();
    if (err) {
      showToast(err, 'error');
      return;
    }

    if (state.mode === 'create' && !state.selectedFile) {
      showToast('File dokumen wajib diupload', 'error');
      return;
    }

    var btn = document.getElementById('btnSubmit');
    btnLoading(btn, state.mode === 'edit' ? 'Menyimpan...' : 'Mengupload...');

    try {
      if (state.mode === 'create') {
        await createDocument();
      } else {
        await updateDocument();
      }
    } catch (err) {
      btnReset(btn);
    }
  });
}

function validateForm() {
  var required = [
    { id: 'jenis', label: 'Jenis Dokumen' },
    { id: 'kode_dokumen', label: 'Kode Dokumen' },
    { id: 'judul', label: 'Judul Dokumen' },
    { id: 'sub_klausul', label: 'Klausul ISO' },
    { id: 'pemilik_departemen', label: 'Departemen Pemilik' },
    { id: 'tgl_terbit', label: 'Tanggal Terbit' }
  ];

  for (var i = 0; i < required.length; i++) {
    var el = document.getElementById(required[i].id);
    if (!el || !el.value.trim()) {
      el && el.focus();
      return required[i].label + ' wajib diisi';
    }
  }

  // Standar minimal 1 dipilih
  var standarCount = document.querySelectorAll('.standar-cb:checked').length;
  if (standarCount === 0) {
    return 'Pilih minimal 1 standar';
  }

  return null;
}

// ============================================================
// CREATE
// ============================================================
async function createDocument() {
  showOverlay('Menyimpan dokumen', 'Jangan tutup halaman...');

  try {
    updateOverlayProgress(15, 'Membaca file...');
    var base64 = await fileToBase64(state.selectedFile);

    updateOverlayProgress(40, 'Menyiapkan data...');
    var payload = buildPayload();
    payload.fileName = state.selectedFile.name;
    payload.mimeType = state.selectedFile.type;
    payload.fileBase64 = base64;

    updateOverlayProgress(65, 'Mengupload ke server...');
    var result = await apiPost('createDocument', payload);

    updateOverlayProgress(100, 'Berhasil!');
    await delay(500);

    hideOverlay();
    showToast('Dokumen berhasil disimpan', 'success');

    setTimeout(function() {
      location.href = 'documents.html';
    }, 1000);

  } catch (err) {
    hideOverlay();
    throw err;
  }
}

// ============================================================
// UPDATE
// ============================================================
async function updateDocument() {
  showOverlay('Menyimpan perubahan', 'Jangan tutup halaman...');

  try {
    var payload = buildPayload();
    payload.doc_id = state.docId;

    // Kalau ada file baru
    if (state.selectedFile) {
      updateOverlayProgress(20, 'Membaca file...');
      payload.fileBase64 = await fileToBase64(state.selectedFile);
      payload.fileName = state.selectedFile.name;
      payload.mimeType = state.selectedFile.type;
    }

    updateOverlayProgress(60, 'Menyimpan...');
    await apiPost('updateDocument', payload);

    updateOverlayProgress(100, 'Berhasil!');
    await delay(500);

    hideOverlay();
    showToast('Perubahan berhasil disimpan', 'success');

    setTimeout(function() {
      location.href = 'document-detail.html?id=' + state.docId;
    }, 1000);

  } catch (err) {
    hideOverlay();
    throw err;
  }
}

// ============================================================
// BUILD PAYLOAD
// ============================================================
function buildPayload() {
  var klausulFull = document.getElementById('sub_klausul').value.trim();
  var klausulUtama = klausulFull.split('.')[0] || '';

  var standar = Array.prototype.slice.call(document.querySelectorAll('.standar-cb:checked'))
    .map(function(cb) { return cb.value; })
    .join(',');

  return {
    kode_dokumen: document.getElementById('kode_dokumen').value.trim(),
    judul: document.getElementById('judul').value.trim(),
    jenis: document.getElementById('jenis').value,
    sub_jenis: document.getElementById('sub_jenis').value,
    klausul_utama: klausulUtama,
    sub_klausul: klausulFull,
    standar: standar,
    pemilik_departemen: document.getElementById('pemilik_departemen').value.trim(),
    pemilik_email: document.getElementById('pemilik_email').value.trim(),
    tgl_terbit: document.getElementById('tgl_terbit').value,
    frekuensi_review_bulan: Number(document.getElementById('frekuensi_review_bulan').value) || 12,
    kata_kunci: document.getElementById('kata_kunci').value.trim(),
    keterangan: document.getElementById('keterangan').value.trim()
  };
}

// ============================================================
// HELPERS
// ============================================================
function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}
