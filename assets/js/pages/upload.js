/**
 * Upload Page Controller - FULL ROBUST
 * -------------------------------------
 * - Semua helper kritis didefinisikan lokal (tidak bergantung utils)
 * - Init dibungkus try/catch dengan console.log detail
 * - Navbar/sidebar render duluan sebelum yang lain
 */
import { requireAuth } from '../auth.js';
import { renderNavbar, attachNavbarEvents } from '../components/navbar.js';
import { renderSidebar } from '../components/sidebar.js';
import { apiPost, apiGet } from '../api.js';
import { fileToBase64, validateFile, getQuery } from '../utils.js';
import { showToast } from '../components/toast.js';
import { btnLoading, btnReset, showOverlay, hideOverlay, updateOverlayProgress } from '../components/loader.js';

// ============================================================
// LOCAL HELPERS (tidak bergantung utils)
// ============================================================
function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ============================================================
// KONFIGURASI
// ============================================================
var SUB_JENIS_MAP = {
  'Eviden':   ['K3', 'SMAP', 'SMM'],
  'Formulir': ['FK3', 'FMM', 'FAP']
};

var SUB_JENIS_HINT = {
  'Eviden':   'Pilih jenis bukti: K3 (keselamatan), SMAP (lingkungan), SMM (mutu)',
  'Formulir': 'Pilih jenis formulir: FK3, FMM, atau FAP'
};

var KODE_PLACEHOLDER = {
  'Pedoman':  'PM BKHIT Sultra',
  'Prosedur': 'P9.2.1.1',
  'IKK':      'IKK 1',
  'Eviden':   'E-FMM 1/E-FAP 1/E-FK3 1',
  'Formulir': 'FMM 1/FAP 1/FK3 1',
  'Lampiran': 'Lampiran 1'
};

var KODE_FORMAT_HINT = {
  'Pedoman':  'Format: Pedoman-UPT (contoh: PM BKHIT Sultra)',
  'Prosedur': 'Format: Prosedur-Kode Kalusul-Nomor urut (contoh: P9.2.1.1)',
  'IKK':      'Format: IKK-Nomor Urut (contoh: IKK 1)',
  'Eviden':   'Format: Eviden-Kode Eviden-Nomor Urut (contoh: E-FK3 1)',
  'Formulir': 'Format: Kode Formulir-Nomor urut (contoh: FMM 1)',
  'Lampiran': 'Format: Lampiran-Nomor urut (contoh: Lampiran 1)'
};

function deriveStandar(jenis, subJenis) {
  if (jenis === 'Formulir') {
    if (subJenis === 'FMM') return 'SMM';
    if (subJenis === 'FK3') return 'K3';
    if (subJenis === 'FAP') return 'SMAP-AP';
  }
  if (jenis === 'Eviden') {
    if (subJenis === 'K3')   return 'K3';
    if (subJenis === 'SMAP') return 'SMAP';
    if (subJenis === 'SMM')  return 'SMM';
  }
  return 'SMM,SMAP,K3,SMAP-AP';
}

// ============================================================
// STATE
// ============================================================
var state = {
  user: null,
  mode: 'create',
  docId: null,
  selectedFile: null,
  existingDoc: null,
  klausulMaster: [],           // ← BARU: semua klausul dari Master
  selectedKlausul: []          // ← BARU: klausul yang dipilih user
};

// ============================================================
// INIT
// ============================================================
async function initPage() {
  console.log('[upload] ==========================================');
  console.log('[upload] Init mulai...');

  // ===== STEP 1: AUTH =====
  var user;
  try {
    user = requireAuth();
    console.log('[upload] requireAuth() returned:', user);
  } catch (e) {
    console.error('[upload] requireAuth() GAGAL:', e);
    return;
  }

  if (!user) {
    console.warn('[upload] No user, redirect happened di requireAuth()');
    return;
  }
  state.user = user;
  console.log('[upload] ✅ User OK:', user.email, '| Role:', user.role);

  // ===== STEP 2: RENDER NAVBAR =====
  var navbarEl = document.getElementById('navbar');
  if (navbarEl) {
    try {
      navbarEl.innerHTML = renderNavbar(user);
      console.log('[upload] ✅ Navbar rendered');
    } catch (e) {
      console.error('[upload] ❌ renderNavbar GAGAL:', e);
    }
  } else {
    console.error('[upload] ❌ #navbar element TIDAK DITEMUKAN di HTML');
  }

  // ===== STEP 3: RENDER SIDEBAR =====
  var sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) {
    try {
      sidebarEl.innerHTML = renderSidebar(user, 'upload');
      console.log('[upload] ✅ Sidebar rendered');
    } catch (e) {
      console.error('[upload] ❌ renderSidebar GAGAL:', e);
    }
  } else {
    console.error('[upload] ❌ #sidebar element TIDAK DITEMUKAN di HTML');
  }

  // ===== STEP 4: NAVBAR EVENTS =====
  try {
    attachNavbarEvents();
    console.log('[upload] ✅ Navbar events attached');
  } catch (e) {
    console.error('[upload] ❌ attachNavbarEvents GAGAL:', e);
  }

  // ===== STEP 5: DEFAULT TANGGAL =====
  var tglEl = document.getElementById('tgl_terbit');
  if (tglEl) {
    tglEl.valueAsDate = new Date();
    console.log('[upload] ✅ Tanggal default di-set');
  }

  // ===== STEP 6: MODE EDIT =====
  state.docId = getQuery('id');
  if (state.docId) {
    state.mode = 'edit';
    console.log('[upload] Mode EDIT, docId:', state.docId);
    loadExistingDocument();
  }

  // ===== STEP 7: SETUP EVENTS =====
  try {
    setupJenisChange();
    console.log('[upload] ✅ Jenis change listener terpasang');
  } catch (e) {
    console.error('[upload] ❌ setupJenisChange GAGAL:', e);
  }

  // ★ Set state awal (sub jenis hidden)
  try {
    updateSubJenis('');
  } catch (e) {
    console.error('[upload] ❌ Init sub jenis GAGAL:', e);
  }

  try {
    setupDropZone();
    console.log('[upload] ✅ Drop zone terpasang');
  } catch (e) {
    console.error('[upload] ❌ setupDropZone GAGAL:', e);
  }

  try {
    setupStepIndicator();
    console.log('[upload] ✅ Step indicator terpasang');
  } catch (e) {
    console.error('[upload] ❌ setupStepIndicator GAGAL:', e);
  }

  try {
    setupSubmit();
    console.log('[upload] ✅ Submit handler terpasang');
  } catch (e) {
    console.error('[upload] ❌ setupSubmit GAGAL:', e);
  }

  // ===== STEP 8: MULTI-KLAUSUL =====
  try {
    await loadKlausulMaster();
    setupKlausulPicker();
    console.log('[upload] ✅ Klausul picker terpasang');
  } catch (e) {
    console.error('[upload] ❌ Klausul picker GAGAL:', e);
  }

  console.log('[upload] ========== INIT SELESAI ✅ ==========');
}

// Jalankan init setelah DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}

// ============================================================
// LOAD KLAUSUL MASTER
// ============================================================
async function loadKlausulMaster() {
  try {
    var data = await apiGet('getKlausul');
    state.klausulMaster = data || [];
    console.log('[upload] Klausul master loaded:', state.klausulMaster.length, 'items');
  } catch (e) {
    console.error('[upload] Gagal load klausul:', e);
    state.klausulMaster = [];
  }
}

// ============================================================
// SETUP KLAUSUL PICKER
// ============================================================
function setupKlausulPicker() {
  var picker = document.getElementById('klausulChips');
  var dropdown = document.getElementById('klausulDropdown');
  var chevron = document.getElementById('klausulChevron');
  var search = document.getElementById('klausulSearch');
  var clearBtn = document.getElementById('klausulClear');

  if (!picker || !dropdown) {
    console.error('[upload] Klausul picker elements tidak ditemukan');
    return;
  }

  // Toggle dropdown
  picker.addEventListener('click', function(e) {
    if (e.target.closest('[data-chip-remove]')) return; // skip kalau klik tombol X
    var isOpen = !dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden');
    if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    if (!isOpen) setTimeout(function() { search && search.focus(); }, 100);
  });

  // Search
  if (search) {
    search.addEventListener('input', function() {
      renderKlausulList(search.value.trim());
    });
  }

  // Clear all
  if (clearBtn) {
    clearBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      state.selectedKlausul = [];
      renderKlausulChips();
      renderKlausulList(search ? search.value.trim() : '');
    });
  }

  // Click outside → close
  document.addEventListener('click', function(e) {
    var wrapper = document.getElementById('klausulWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      dropdown.classList.add('hidden');
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
  });

  // Render awal
  renderKlausulChips();
  renderKlausulList('');
}

// ============================================================
// RENDER KLAUSUL LIST (di dropdown)
// ============================================================
function renderKlausulList(filter) {
  var list = document.getElementById('klausulList');
  if (!list) return;

  filter = (filter || '').toLowerCase();

  var items = state.klausulMaster.filter(function(k) {
    if (!filter) return true;
    var hay = (String(k.klausul_id) + ' ' + String(k.judul_klausul || '')).toLowerCase();
    return hay.indexOf(filter) !== -1;
  });

  if (!items.length) {
    list.innerHTML = '<div class="p-4 text-sm text-slate-500 text-center">' +
      'Tidak ada klausul yang cocok</div>';
    return;
  }

  // Group by bab
  var grouped = {};
  items.forEach(function(k) {
    var bab = k.bab || 'Lainnya';
    if (!grouped[bab]) grouped[bab] = [];
    grouped[bab].push(k);
  });

  var html = '';
  Object.keys(grouped).forEach(function(bab) {
    html += '<div class="px-3 py-1.5 text-[10px] font-bold text-slate-400 ' +
                  'uppercase tracking-wider bg-slate-50 sticky top-0">' +
              bab +
            '</div>';
    grouped[bab].forEach(function(k) {
      var isSelected = state.selectedKlausul.indexOf(String(k.klausul_id)) !== -1;
      html += '<label class="flex items-start gap-2.5 px-3 py-2 rounded-lg ' +
                    'hover:bg-slate-50 cursor-pointer transition">' +
        '<input type="checkbox" data-klausul-id="' + escapeAttr(k.klausul_id) + '" ' +
               (isSelected ? 'checked ' : '') +
               'class="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 ' +
                      'focus:ring-blue-500 focus:ring-2 cursor-pointer flex-shrink-0">' +
        '<div class="min-w-0 flex-1">' +
          '<div class="flex items-center gap-2">' +
            '<span class="font-mono font-bold text-blue-600 text-xs">' +
              escapeHtml(k.klausul_id) +
            '</span>' +
          '</div>' +
          '<div class="text-xs text-slate-600 mt-0.5 truncate">' +
            escapeHtml(k.judul_klausul || '-') +
          '</div>' +
        '</div>' +
      '</label>';
    });
  });

  list.innerHTML = html;

  // Attach change handler
  list.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      toggleKlausul(cb.dataset.klausulId, cb.checked);
    });
  });
}

// ============================================================
// TOGGLE KLAUSUL (add/remove)
// ============================================================
function toggleKlausul(klausulId, checked) {
  var id = String(klausulId);
  var idx = state.selectedKlausul.indexOf(id);

  if (checked && idx === -1) {
    state.selectedKlausul.push(id);
  } else if (!checked && idx !== -1) {
    state.selectedKlausul.splice(idx, 1);
  }

  renderKlausulChips();
  updateKlausulCount();
}

// ============================================================
// RENDER CHIPS
// ============================================================
function renderKlausulChips() {
  var container = document.getElementById('klausulChips');
  var placeholder = document.getElementById('klausulPlaceholder');
  if (!container) return;

  // Hapus chips lama
  container.querySelectorAll('[data-chip]').forEach(function(el) { el.remove(); });

  if (!state.selectedKlausul.length) {
    if (placeholder) placeholder.style.display = '';
    updateKlausulCount();
    return;
  }

  if (placeholder) placeholder.style.display = 'none';

  // Ambil judul klausul dari master
  state.selectedKlausul.forEach(function(kId) {
    var master = state.klausulMaster.find(function(k) {
      return String(k.klausul_id) === kId;
    });
    var judul = master ? master.judul_klausul : '';

    var chip = document.createElement('span');
    chip.setAttribute('data-chip', kId);
    chip.className = 'inline-flex items-center gap-1 pl-2 pr-1 py-1 ' +
                     'bg-blue-100 text-blue-700 rounded-md text-xs font-semibold';
    chip.innerHTML =
      '<span class="font-mono">' + escapeHtml(kId) + '</span>' +
      (judul ? '<span class="text-blue-500 font-normal truncate max-w-[140px]">' + 
               escapeHtml(judul) + '</span>' : '') +
      '<button type="button" data-chip-remove="' + escapeAttr(kId) + '" ' +
              'class="w-4 h-4 rounded flex items-center justify-center ' +
                     'hover:bg-blue-200 transition flex-shrink-0">' +
        '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>' +
        '</svg>' +
      '</button>';
    container.appendChild(chip);
  });

  // Attach remove handler
  container.querySelectorAll('[data-chip-remove]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var kId = btn.dataset.chipRemove;
      var idx = state.selectedKlausul.indexOf(kId);
      if (idx !== -1) {
        state.selectedKlausul.splice(idx, 1);
        renderKlausulChips();
        renderKlausulList(document.getElementById('klausulSearch')?.value.trim() || '');
      }
    });
  });

  updateKlausulCount();
}

// ============================================================
// UPDATE COUNTER DI FOOTER DROPDOWN
// ============================================================
function updateKlausulCount() {
  var el = document.getElementById('klausulCount');
  if (el) el.textContent = state.selectedKlausul.length;
}

// ============================================================
// ESCAPE HELPERS (untuk atribut HTML)
// ============================================================
function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// JENIS → SUB JENIS
// ============================================================
function setupJenisChange() {
  var selJenis = document.getElementById('jenis');
  if (!selJenis) {
    console.error('[upload] #jenis tidak ditemukan');
    return;
  }

  selJenis.addEventListener('change', function() {
    var jenis = selJenis.value;
    console.log('[upload] Jenis berubah:', jenis);

    // Update placeholder kode
    var kodeInput = document.getElementById('kode_dokumen');
    if (kodeInput) {
      kodeInput.placeholder = KODE_PLACEHOLDER[jenis]
        ? 'Contoh: ' + KODE_PLACEHOLDER[jenis]
        : 'Contoh: FMM-4.5.1-01';
    }

    var kodeHint = document.getElementById('kodeHint');
    if (kodeHint) {
      kodeHint.textContent = KODE_FORMAT_HINT[jenis] || 'Format: PREFIX-KLAUSUL-NOMOR';
    }

    updateSubJenis(jenis);
  });
}

function updateSubJenis(jenis) {
  var wrapper = document.getElementById('subJenisWrapper');
  var sel = document.getElementById('sub_jenis');
  var hint = document.getElementById('subJenisHint');
  var kodeWrapper = document.getElementById('kodeWrapper');

  if (!wrapper || !sel) {
    console.error('[upload] subJenisWrapper atau sub_jenis tidak ada');
    return;
  }

  var options = SUB_JENIS_MAP[jenis];
  console.log('[upload] updateSubJenis:', jenis, '→', options);

  if (!options) {
    // ===== SEMBUNYIKAN SUB JENIS =====
    wrapper.classList.add('hidden');
    sel.value = '';
    sel.innerHTML = '<option value="">-- Pilih Sub Jenis --</option>';
    if (hint) hint.textContent = '';
    sel.removeAttribute('required');

    // ★ Kode ambil lebar penuh (8 cols)
    if (kodeWrapper) {
      kodeWrapper.classList.remove('md:col-span-4');
      kodeWrapper.classList.add('md:col-span-8');
    }
    return;
  }

  // ===== TAMPILKAN SUB JENIS =====
  wrapper.classList.remove('hidden');
  sel.innerHTML = '<option value="">-- Pilih Sub Jenis --</option>' +
    options.map(function(o) {
      return '<option value="' + o + '">' + o + '</option>';
    }).join('');
  sel.setAttribute('required', 'required');
  if (hint) hint.textContent = SUB_JENIS_HINT[jenis] || '';

  // ★ Kode mengecil (4 cols) supaya bisa sekamar dengan Sub Jenis
  if (kodeWrapper) {
    kodeWrapper.classList.remove('md:col-span-8');
    kodeWrapper.classList.add('md:col-span-4');
  }
}

// ============================================================
// LOAD EXISTING (EDIT)
// ============================================================
async function loadExistingDocument() {
  try {
    showOverlay('Memuat dokumen', 'Mohon tunggu...');
    var data = await apiGet('getDocumentById', { doc_id: state.docId });
    var doc = data.document;

    // ===== CEK IZIN EDIT =====
    if (!canEditThisDoc(doc)) {
      hideOverlay();
      renderAccessDenied(doc);
      return;
    }

    state.existingDoc = doc;

    document.getElementById('pageTitle').textContent = 'Edit Dokumen';
    document.getElementById('pageSubtitle').textContent =
      'Perbarui data dokumen ' + doc.kode_dokumen;
    var btnSpan = document.querySelector('#btnSubmit span');
    if (btnSpan) btnSpan.textContent = 'Simpan Perubahan';

    fillForm(doc);
    hideOverlay();
  } catch (e) {
    hideOverlay();
    showToast('Gagal memuat dokumen: ' + e.message, 'error');
  }
}

/**
 * Cek apakah user boleh edit dokumen ini
 */
function canEditThisDoc(doc) {
  var u = state.user;
  if (!u) return false;
  
  // Admin selalu bisa
  if (u.role === 'Admin') return true;
  
  // Editor: Draft atau Review saja
  if (u.role === 'Editor') {
    return doc.status === 'Draft' || doc.status === 'Review';
  }
  
  return false;
}

/**
 * Tampilkan halaman akses ditolak
 */
function renderAccessDenied(doc) {
  var form = document.getElementById('uploadForm');
  if (!form) return;
  
  var reason = '';
  if (doc.status === 'Approved') {
    reason = 'Dokumen ini sudah <b>disetujui</b> dan tidak dapat diedit lagi. ' +
             'Hanya <b>Admin</b> yang dapat mengubah dokumen yang sudah disetujui.';
  } else if (doc.status === 'Obsolete') {
    reason = 'Dokumen ini sudah <b>obsolete</b> dan tidak dapat diedit.';
  } else {
    reason = 'Anda tidak memiliki akses untuk mengedit dokumen ini.';
  }
  
  form.innerHTML =
    '<div class="card-premium p-12 text-center fade-in-up">' +
      '<div class="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center" ' +
           'style="background: linear-gradient(135deg, #fee2e2, #fecaca);">' +
        '<svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>' +
        '</svg>' +
      '</div>' +
      '<div class="font-bold text-slate-800 text-xl mb-2">Dokumen Terkunci</div>' +
      '<div class="text-sm text-slate-500 mb-1">' +
        'Kode: <b class="font-mono text-slate-700">' + escapeHtml(doc.kode_dokumen) + '</b>' +
      '</div>' +
      '<div class="text-sm text-slate-600 max-w-md mx-auto mb-6">' +
        reason +
      '</div>' +
      '<div class="flex flex-wrap gap-2 justify-center">' +
        '<a href="document-detail.html?id=' + doc.doc_id + '" class="btn-secondary">' +
          'Lihat Detail' +
        '</a>' +
        '<a href="documents.html" class="btn-gradient">' +
          'Kembali ke Daftar' +
        '</a>' +
      '</div>' +
    '</div>';
}

function fillForm(d) {
  setValue('jenis', d.jenis || '');

  if (d.jenis && SUB_JENIS_MAP[d.jenis]) {
    updateSubJenis(d.jenis);
    setTimeout(function() {
      setValue('sub_jenis', d.sub_jenis || '');
    }, 50);
  }

  setValue('kode_dokumen', d.kode_dokumen || '');
  setValue('judul', d.judul || '');
  setValue('kata_kunci', d.kata_kunci || '');
  setValue('keterangan', d.keterangan || '');

  // ★ Parse multi klausul
  var klausulRaw = String(d.sub_klausul || d.klausul_utama || '').trim();
  state.selectedKlausul = klausulRaw
    ? klausulRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean)
    : [];

  // Re-render chips
  renderKlausulChips();
  renderKlausulList('');

  if (d.tgl_terbit) {
    var tgl = new Date(d.tgl_terbit);
    if (!isNaN(tgl.getTime())) {
      document.getElementById('tgl_terbit').value = tgl.toISOString().split('T')[0];
    }
  }

  var kodeEl = document.getElementById('kode_dokumen');
  if (kodeEl) {
    kodeEl.setAttribute('readonly', 'readonly');
    kodeEl.classList.add('bg-slate-100', 'cursor-not-allowed');
  }
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

  if (!dropZone || !fileInput) return;

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

  if (btnClear) {
    btnClear.addEventListener('click', function(e) {
      e.stopPropagation();
      state.selectedFile = null;
      fileInput.value = '';
      if (filePreview) filePreview.classList.add('hidden');
      dropZone.classList.remove('hidden');
    });
  }
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

// ============================================================
// STEP INDICATOR
// ============================================================
function setupStepIndicator() {
  var sections = ['section1', 'section2', 'section3'];
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
  var form = document.getElementById('uploadForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

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
    { id: 'jenis',        label: 'Jenis Dokumen' },
    { id: 'kode_dokumen', label: 'Kode Dokumen' },
    { id: 'judul',        label: 'Judul Dokumen' },
    { id: 'tgl_terbit',   label: 'Tanggal Terbit' }
  ];

  for (var i = 0; i < required.length; i++) {
    var el = document.getElementById(required[i].id);
    if (!el || !el.value.trim()) {
      el && el.focus();
      return required[i].label + ' wajib diisi';
    }
  }

  // ★ Validasi minimal 1 klausul dipilih
  if (state.selectedKlausul.length === 0) {
    showToast('Pilih minimal 1 Klausul ISO', 'warning');
    return 'Klausul ISO wajib dipilih';
  }

  // Validasi sub jenis (kalau visible)
  var subWrapper = document.getElementById('subJenisWrapper');
  if (subWrapper && !subWrapper.classList.contains('hidden')) {
    var sub = document.getElementById('sub_jenis').value;
    if (!sub) {
      showToast('Sub Jenis wajib dipilih untuk jenis ini', 'error');
      document.getElementById('sub_jenis').focus();
      return 'Sub Jenis wajib dipilih';
    }
  }

  return null;
}

// ============================================================
// CREATE / UPDATE
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
    await apiPost('createDocument', payload);

    updateOverlayProgress(100, 'Berhasil!');
    await delay(500);

    hideOverlay();
    showToast('Dokumen berhasil disimpan', 'success');
    setTimeout(function() { location.href = 'documents.html'; }, 1000);
  } catch (err) {
    hideOverlay();
    throw err;
  }
}

async function updateDocument() {
  showOverlay('Menyimpan perubahan', 'Jangan tutup halaman...');
  try {
    var payload = buildPayload();
    payload.doc_id = state.docId;

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

function buildPayload() {
  var jenis = document.getElementById('jenis').value;
  var subJenis = document.getElementById('sub_jenis').value || '';

  // ★ Multi klausul
  var klausulStr = state.selectedKlausul.join(',');
  var klausulUtama = state.selectedKlausul.length > 0 
    ? state.selectedKlausul[0].split('.')[0] 
    : '';

  return {
    kode_dokumen:           document.getElementById('kode_dokumen').value.trim(),
    judul:                  document.getElementById('judul').value.trim(),
    jenis:                  jenis,
    sub_jenis:              subJenis,
    klausul_utama:          klausulUtama,
    sub_klausul:            klausulStr,       // ← "4.5.1,4.5.2,9.2"
    standar:                deriveStandar(jenis, subJenis),
    pemilik_departemen:     '-',
    pemilik_email:          '',
    tgl_terbit:             document.getElementById('tgl_terbit').value,
    frekuensi_review_bulan: 12,
    kata_kunci:             document.getElementById('kata_kunci').value.trim(),
    keterangan:             document.getElementById('keterangan').value.trim()
  };
}
