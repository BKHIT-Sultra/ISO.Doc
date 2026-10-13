/**
 * Audit Detail Page Controller
 * -----------------------------
 * Fitur:
 * - Tampilkan detail audit + list temuan
 * - Modal tambah/edit temuan (dropdown PIC)
 * - Modal update progress perbaikan (dropdown Verifikator)
 * - Filter temuan (search, jenis, status)
 */
import { requireAuth } from '../auth.js';
import { renderNavbar, attachNavbarEvents } from '../components/navbar.js';
import { renderSidebar } from '../components/sidebar.js';
import { apiGet, apiPost } from '../api.js';
import { formatDate, formatDateTime, escapeHtml, debounce, getQuery } from '../utils.js';
import { showToast } from '../components/toast.js';
import { showModal, confirmDialog } from '../components/modal.js';
import { btnLoading, btnReset } from '../components/loader.js';

// ============================================================
// STATE
// ============================================================
var state = {
  user: null,
  auditId: null,
  audit: null,
  temuan: [],
  filtered: [],
  filters: { q: '', jenis: '', status: '' }
};

var usersList = [];
var klausulList = [];   // ← TAMBAH INI

// ============================================================
// CONSTANTS
// ============================================================
var JENIS_STYLE = {
  'Major':      { border: '#ef4444', bg: 'bg-red-100 text-red-700 border-red-200',   label: 'Major' },
  'Minor':      { border: '#f59e0b', bg: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Minor' },
  'OFI':        { border: '#3b82f6', bg: 'bg-blue-100 text-blue-700 border-blue-200', label: 'OFI' },
  'Observasi':  { border: '#94a3b8', bg: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Observasi' }
};

var STATUS_STYLE = {
  'Open':        'bg-red-100 text-red-700 border-red-200',
  'In Progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Closed':      'bg-green-100 text-green-700 border-green-200'
};

var AUDIT_STATUS_STYLE = {
  'Scheduled':   'bg-blue-100 text-blue-700 border-blue-200',
  'In Progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Completed':   'bg-green-100 text-green-700 border-green-200',
  'Closed':      'bg-slate-100 text-slate-600 border-slate-200'
};

// ============================================================
// INIT
// ============================================================
function initPage() {
  console.log('[audit-detail] Init mulai...');

  var user = requireAuth();
  if (!user) return;
  state.user = user;

  // Render navbar & sidebar
  var navbarEl = document.getElementById('navbar');
  if (navbarEl) navbarEl.innerHTML = renderNavbar(user);

  var sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) sidebarEl.innerHTML = renderSidebar(user, 'audits');

  try { attachNavbarEvents(); } catch (e) { console.error(e); }

  // Ambil audit_id dari URL
  state.auditId = getQuery('id');
  if (!state.auditId) {
    showError('ID audit tidak ditemukan di URL.');
    return;
  }

  // Load data parallel
  Promise.all([
    loadUsersList(),
    loadKlausulList(),    // ← TAMBAH
    loadAuditDetail()
  ]).then(function() {
    setupEvents();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}

// ============================================================
// LOAD USERS (untuk dropdown)
// ============================================================
async function loadUsersList() {
  try {
    var data = await apiGet('getUsersSimple');
    usersList = data || [];
    console.log('[audit-detail] Users loaded:', usersList.length);
  } catch (e) {
    console.warn('[audit-detail] Gagal load users:', e);
    usersList = [];
  }
}

// ============================================================
// LOAD KLAUSUL MASTER (untuk dropdown)
// ============================================================
async function loadKlausulList() {
  try {
    var data = await apiGet('getKlausul');
    klausulList = data || [];
    // Sort numeric (4.1 < 4.5 < 4.5.1 < 9.2)
    klausulList.sort(function(a, b) {
      return String(a.klausul_id || '').localeCompare(
        String(b.klausul_id || ''), undefined, { numeric: true }
      );
    });
    console.log('[audit-detail] Klausul loaded:', klausulList.length);
  } catch (e) {
    console.warn('[audit-detail] Gagal load klausul:', e);
    klausulList = [];
  }
}

/**
 * Build options untuk dropdown klausul
 */
function buildKlausulOptions(selected) {
  var options = '<option value="">-- Pilih Klausul --</option>';
  klausulList.forEach(function(k) {
    var val = k.klausul_id;
    var isSelected = (selected === val) ? ' selected' : '';
    options += '<option value="' + escapeHtml(val) + '"' + isSelected + '>' +
               escapeHtml(k.klausul_id) + ' - ' + escapeHtml(k.judul_klausul || '') +
               '</option>';
  });
  return options;
}

// ============================================================
// LOAD AUDIT DETAIL
// ============================================================
async function loadAuditDetail() {
  try {
    var data = await apiGet('getAuditById', { audit_id: state.auditId });
    state.audit = data.audit;
    state.temuan = data.temuan || [];
    state.filtered = state.temuan;

    console.log('[audit-detail] Loaded:', state.audit.judul, '| Temuan:', state.temuan.length);

    renderHeader();
    renderInfoCards();
    renderTemuanList();

    // Update counter
    var countEl = document.getElementById('temuanCount');
    if (countEl) countEl.textContent = state.temuan.length;

    // Show content
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('contentState').classList.remove('hidden');

  } catch (e) {
    console.error('[audit-detail] Load error:', e);
    showError(e.message || 'Gagal memuat data audit');
  }
}

function showError(msg) {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('contentState').classList.add('hidden');
  var errEl = document.getElementById('errorState');
  errEl.classList.remove('hidden');
  errEl.innerHTML =
    '<div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">' +
      '<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
      '</svg>' +
    '</div>' +
    '<div class="font-bold text-slate-700 text-lg mb-1">Terjadi Kesalahan</div>' +
    '<div class="text-sm text-slate-500 mb-5">' + escapeHtml(msg) + '</div>' +
    '<a href="audits.html" class="btn-gradient inline-flex">Kembali ke Hasil Audit</a>';
}

// ============================================================
// RENDER HEADER AUDIT
// ============================================================
function renderHeader() {
  var a = state.audit;
  var el = document.getElementById('auditHeader');
  if (!el) return;

  var statusCls = AUDIT_STATUS_STYLE[a.status] || 'bg-slate-100 text-slate-600 border-slate-200';

  el.innerHTML =
    '<div class="flex flex-wrap items-start gap-4">' +
      '<div class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" ' +
           'style="background: linear-gradient(135deg, #7c3aed, #a855f7);">' +
        '<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>' +
        '</svg>' +
      '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<div class="font-mono text-xs text-slate-500 mb-1">' + escapeHtml(a.audit_id) + '</div>' +
        '<h1 class="text-2xl lg:text-3xl font-extrabold text-slate-800 leading-tight mb-3">' +
          escapeHtml(a.judul || '-') +
        '</h1>' +
        '<div class="flex flex-wrap items-center gap-2">' +
          '<span class="badge ' + statusCls + '">' +
            '<span class="w-1.5 h-1.5 rounded-full bg-current"></span>' +
            escapeHtml(a.status || '-') +
          '</span>' +
          '<span class="badge bg-slate-100 text-slate-700">' + escapeHtml(a.jenis || '-') + '</span>' +
          (a.standar ? '<span class="badge bg-purple-100 text-purple-700">' + escapeHtml(a.standar) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<button data-action="edit-audit" class="btn-secondary flex-shrink-0">' +
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>' +
        '</svg>' +
        'Edit Audit' +
      '</button>' +
    '</div>';
}

// ============================================================
// RENDER INFO CARDS
// ============================================================
function renderInfoCards() {
  var a = state.audit;
  var el = document.getElementById('infoCards');
  if (!el) return;

  // Hitung progress
  var total = state.temuan.length;
  var closed = state.temuan.filter(function(t) { return t.status_perbaikan === 'Closed'; }).length;
  var open = total - closed;
  var pct = total > 0 ? Math.round((closed / total) * 100) : 0;

  el.innerHTML =
    // Tanggal
    '<div class="card-premium !p-4">' +
      '<div class="flex items-center gap-2 mb-1">' +
        '<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>' +
        '</svg>' +
        '<span class="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tanggal</span>' +
      '</div>' +
      '<div class="font-bold text-slate-800 text-sm">' + formatDate(a.tanggal_audit) + '</div>' +
    '</div>' +

    // Auditor
    '<div class="card-premium !p-4">' +
      '<div class="flex items-center gap-2 mb-1">' +
        '<svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>' +
        '</svg>' +
        '<span class="text-xs text-slate-500 font-semibold uppercase tracking-wider">Auditor</span>' +
      '</div>' +
      '<div class="font-bold text-slate-800 text-sm">' + escapeHtml(a.auditor || '-') + '</div>' +
    '</div>' +

    // Area
    '<div class="card-premium !p-4">' +
      '<div class="flex items-center gap-2 mb-1">' +
        '<svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>' +
        '</svg>' +
        '<span class="text-xs text-slate-500 font-semibold uppercase tracking-wider">Area</span>' +
      '</div>' +
      '<div class="font-bold text-slate-800 text-sm">' + escapeHtml(a.area_diaudit || '-') + '</div>' +
    '</div>' +

    // Progress
    '<div class="card-premium !p-4">' +
      '<div class="flex items-center gap-2 mb-1">' +
        '<svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
        '</svg>' +
        '<span class="text-xs text-slate-500 font-semibold uppercase tracking-wider">Progress</span>' +
      '</div>' +
      '<div class="font-bold text-slate-800 text-sm mb-1">' +
        closed + '/' + total + ' <span class="text-slate-400 font-normal">(' + pct + '%)</span>' +
      '</div>' +
      '<div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">' +
        '<div class="h-full rounded-full transition-all" ' +
             'style="width: ' + pct + '%; background: linear-gradient(90deg, #3b82f6, #6366f1);"></div>' +
      '</div>' +
    '</div>';
}

// ============================================================
// SETUP EVENTS
// ============================================================
function setupEvents() {
  // Tombol edit audit
  var btnEdit = document.querySelector('[data-action="edit-audit"]');
  if (btnEdit) {
    btnEdit.addEventListener('click', function() {
      showAuditEditModal();
    });
  }

  // Tombol tambah temuan
  var btnAdd = document.getElementById('btnAddTemuan');
  if (btnAdd) {
    btnAdd.addEventListener('click', function() {
      showTemuanModal(null);
    });
  }

  // Filter
  var fSearch = document.getElementById('fTemuanSearch');
  var fJenis = document.getElementById('fTemuanJenis');
  var fStatus = document.getElementById('fTemuanStatus');

  if (fSearch) {
    fSearch.addEventListener('input', debounce(function(e) {
      state.filters.q = e.target.value.trim().toLowerCase();
      applyFilter();
    }, 300));
  }
  if (fJenis) {
    fJenis.addEventListener('change', function(e) {
      state.filters.jenis = e.target.value;
      applyFilter();
    });
  }
  if (fStatus) {
    fStatus.addEventListener('change', function(e) {
      state.filters.status = e.target.value;
      applyFilter();
    });
  }
}

function applyFilter() {
  var f = state.filters;
  state.filtered = state.temuan.filter(function(t) {
    if (f.q) {
      var hay = (String(t.deskripsi || '') + ' ' + String(t.klausul || '')).toLowerCase();
      if (hay.indexOf(f.q) === -1) return false;
    }
    if (f.jenis && t.jenis_temuan !== f.jenis) return false;
    if (f.status && t.status_perbaikan !== f.status) return false;
    return true;
  });
  renderTemuanList();
}

// ============================================================
// RENDER TEMUAN LIST
// ============================================================
function renderTemuanList() {
  var list = document.getElementById('temuanList');
  if (!list) return;

  // Empty state
  if (!state.filtered.length) {
    var isEmpty = state.temuan.length === 0;
    list.innerHTML =
      '<div class="p-12 text-center">' +
        '<div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-50 flex items-center justify-center">' +
          '<svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-semibold text-slate-700 mb-1">' +
          (isEmpty ? 'Belum ada temuan' : 'Tidak ada temuan yang cocok') +
        '</div>' +
        '<div class="text-sm text-slate-500">' +
          (isEmpty ? 'Klik "Tambah Temuan" untuk mulai mencatat hasil audit' : 'Coba ubah filter') +
        '</div>' +
      '</div>';
    return;
  }

  list.innerHTML = state.filtered.map(function(t) {
    var jenisStyle = JENIS_STYLE[t.jenis_temuan] || JENIS_STYLE['Observasi'];
    var statusCls = STATUS_STYLE[t.status_perbaikan] || 'bg-slate-100 text-slate-600 border-slate-200';
    var isOverdue = t.target_selesai && t.status_perbaikan !== 'Closed' &&
                    new Date(t.target_selesai) < new Date();

    return '<div class="bg-white border border-slate-200 rounded-xl overflow-hidden ' +
                'hover:shadow-md transition" ' +
         'style="border-left: 4px solid ' + jenisStyle.border + ';">' +

      '<div class="p-4">' +

        // Header baris
        '<div class="flex flex-wrap items-center justify-between gap-2 mb-3">' +
          '<div class="flex flex-wrap items-center gap-2">' +
            '<span class="font-mono text-xs font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md">' +
              escapeHtml(t.temuan_id) +
            '</span>' +
            '<span class="badge ' + jenisStyle.bg + '">' +
              escapeHtml(t.jenis_temuan || '-') +
            '</span>' +
            '<span class="badge ' + statusCls + '">' +
              '<span class="w-1.5 h-1.5 rounded-full bg-current"></span>' +
              escapeHtml(t.status_perbaikan || '-') +
            '</span>' +
            (isOverdue ?
              '<span class="badge bg-red-100 text-red-700 border-red-200">' +
                '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">' +
                  '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01"/>' +
                '</svg>' +
                'Overdue' +
              '</span>' : '') +
          '</div>' +
          '<div class="text-xs text-slate-500 flex items-center gap-3">' +
            (t.klausul ? '<span class="font-mono">Klausul ' + escapeHtml(t.klausul) + '</span>' : '') +
            (t.target_selesai ? '<span>Target: ' + formatDate(t.target_selesai) + '</span>' : '') +
          '</div>' +
        '</div>' +

        // Deskripsi
        '<div class="mb-3">' +
          '<div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Deskripsi</div>' +
          '<div class="text-sm text-slate-800 leading-relaxed">' +
            escapeHtml(t.deskripsi || '-').replace(/\n/g, '<br>') +
          '</div>' +
        '</div>' +

        // Rekomendasi
        (t.rekomendasi ?
          '<div class="mb-3 bg-blue-50 border-l-2 border-blue-400 rounded-r-lg p-2.5">' +
            '<div class="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-0.5">Rekomendasi</div>' +
            '<div class="text-xs text-slate-700 italic">' + escapeHtml(t.rekomendasi) + '</div>' +
          '</div>' : '') +

        // Tindakan (kalau ada)
        (t.tindakan_perbaikan ?
          '<div class="mb-3 bg-green-50 border-l-2 border-green-400 rounded-r-lg p-2.5">' +
            '<div class="text-xs font-semibold text-green-700 uppercase tracking-wider mb-0.5">Tindakan Perbaikan</div>' +
            '<div class="text-xs text-slate-700">' + escapeHtml(t.tindakan_perbaikan) + '</div>' +
          '</div>' : '') +

        // Footer: PIC + Verifikator + Actions
        '<div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">' +

          '<div class="flex flex-wrap items-center gap-4 text-xs">' +
            // PIC
            (t.pic ?
              '<div class="flex items-center gap-1.5">' +
                '<div class="w-6 h-6 rounded-lg flex items-center justify-center ' +
                            'text-white text-xs font-bold flex-shrink-0" ' +
                     'style="background: linear-gradient(135deg, #2563eb, #6366f1);">' +
                  (t.pic || 'U').charAt(0).toUpperCase() +
                '</div>' +
                '<div>' +
                  '<div class="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">PIC</div>' +
                  '<div class="text-slate-700 font-medium">' + escapeHtml(t.pic) + '</div>' +
                '</div>' +
              '</div>' : '') +
            // Verifikator
            (t.verifikator ?
              '<div class="flex items-center gap-1.5">' +
                '<div class="w-6 h-6 rounded-lg flex items-center justify-center ' +
                            'text-white text-xs font-bold flex-shrink-0" ' +
                     'style="background: linear-gradient(135deg, #8b5cf6, #6366f1);">' +
                  (t.verifikator || 'V').charAt(0).toUpperCase() +
                '</div>' +
                '<div>' +
                  '<div class="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Verifikator</div>' +
                  '<div class="text-slate-700 font-medium">' + escapeHtml(t.verifikator) + '</div>' +
                '</div>' +
              '</div>' : '') +
          '</div>' +

          '<div class="flex items-center gap-2">' +
            '<button data-action="update-progress" data-id="' + escapeHtml(t.temuan_id) + '" ' +
                    'class="inline-flex items-center gap-1 text-xs font-semibold ' +
                           'text-blue-600 hover:text-blue-700 hover:bg-blue-50 ' +
                           'px-3 py-1.5 rounded-lg transition">' +
              '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>' +
              '</svg>' +
              'Update Progress' +
            '</button>' +
            '<button data-action="edit-temuan" data-id="' + escapeHtml(t.temuan_id) + '" ' +
                    'class="inline-flex items-center gap-1 text-xs font-semibold ' +
                           'text-slate-500 hover:text-slate-700 hover:bg-slate-100 ' +
                           'px-2.5 py-1.5 rounded-lg transition" title="Edit">' +
              '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>' +
              '</svg>' +
            '</button>' +
            '<button data-action="delete-temuan" data-id="' + escapeHtml(t.temuan_id) + '" ' +
                    'class="inline-flex items-center gap-1 text-xs font-semibold ' +
                           'text-red-500 hover:text-red-700 hover:bg-red-50 ' +
                           'px-2.5 py-1.5 rounded-lg transition" title="Hapus">' +
              '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +

        '</div>' +

      '</div>' +
    '</div>';
  }).join('');

  // Attach events ke tombol aksi
  list.querySelectorAll('[data-action]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var action = btn.dataset.action;
      var id = btn.dataset.id;
      var t = state.temuan.find(function(x) { return x.temuan_id === id; });
      if (!t) return;

      if (action === 'update-progress') showProgressModal(t);
      else if (action === 'edit-temuan') showTemuanModal(t);
      else if (action === 'delete-temuan') deleteTemuan(t);
    });
  });
}

// ============================================================
// HELPER: BUILD USER OPTIONS
// ============================================================
function buildUserOptions(selected, filterRoles) {
  var filtered = usersList;
  if (filterRoles && filterRoles.length) {
    filtered = usersList.filter(function(u) {
      return filterRoles.indexOf(u.role) !== -1;
    });
  }

  var options = '<option value="">-- Pilih --</option>';
  filtered.forEach(function(u) {
    var val = u.label;
    var isSelected = (selected === val) ? ' selected' : '';
    options += '<option value="' + escapeHtml(val) + '"' + isSelected + '>' +
               escapeHtml(u.nama) + ' - ' + escapeHtml(u.role) +
               '</option>';
  });
  return options;
}

// ============================================================
// MODAL: TAMBAH / EDIT TEMUAN
// ============================================================
function showTemuanModal(existing) {
  var isEdit = !!existing;
  var t = existing || {};

  var content =
    '<div class="space-y-3">' +

      // Klausul + Jenis
      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
            'Klausul ISO' +
          '</label>' +
          '<select id="mt-klausul" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                  'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">' +
            buildKlausulOptions(t.klausul) +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Jenis Temuan</label>' +
          '<select id="mt-jenis" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                  'focus:outline-none focus:border-blue-500">' +
            ['Major', 'Minor', 'OFI', 'Observasi'].map(function(j) {
              return '<option value="' + j + '"' + (t.jenis_temuan === j ? ' selected' : '') + '>' + j + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
      '</div>' +

      // Deskripsi
      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
          'Deskripsi Temuan <span class="text-red-500">*</span>' +
        '</label>' +
        '<textarea id="mt-deskripsi" rows="3" placeholder="Jelaskan temuan secara detail..." ' +
                  'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl resize-none ' +
                         'focus:outline-none focus:border-blue-500">' +
          escapeHtml(t.deskripsi || '') +
        '</textarea>' +
      '</div>' +

      // Rekomendasi
      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">Rekomendasi Perbaikan</label>' +
        '<textarea id="mt-rekomendasi" rows="2" placeholder="Saran perbaikan..." ' +
                  'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl resize-none ' +
                         'focus:outline-none focus:border-blue-500">' +
          escapeHtml(t.rekomendasi || '') +
        '</textarea>' +
      '</div>' +

      // PIC + Target
      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
            'PIC <span class="text-red-500">*</span>' +
          '</label>' +
          '<select id="mt-pic" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                  'focus:outline-none focus:border-blue-500">' +
            buildUserOptions(t.pic, null) +
          '</select>' +
          '<div class="text-xs text-slate-500 mt-1">Penanggung jawab perbaikan</div>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Target Selesai</label>' +
          '<input id="mt-target" type="date" ' +
                 'value="' + (t.target_selesai ? new Date(t.target_selesai).toISOString().split('T')[0] : '') + '" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500">' +
        '</div>' +
      '</div>' +

    '</div>';

  showModal({
    title: isEdit ? 'Edit Temuan' : 'Tambah Temuan Baru',
    content: content,
    confirmText: isEdit ? 'Simpan' : 'Tambah',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');

      var payload = {
        audit_id: state.auditId,
        klausul: overlay.querySelector('#mt-klausul').value.trim(),
        jenis_temuan: overlay.querySelector('#mt-jenis').value,
        deskripsi: overlay.querySelector('#mt-deskripsi').value.trim(),
        rekomendasi: overlay.querySelector('#mt-rekomendasi').value.trim(),
        pic: overlay.querySelector('#mt-pic').value,
        target_selesai: overlay.querySelector('#mt-target').value
      };

      // Validasi
      if (!payload.deskripsi) {
        showToast('Deskripsi temuan wajib diisi', 'warning');
        return;
      }
      if (!payload.pic) {
        showToast('PIC wajib dipilih', 'warning');
        return;
      }

      btnLoading(confirmBtn, 'Menyimpan...');

      try {
        if (isEdit) {
          payload.temuan_id = t.temuan_id;
          await apiPost('updateTemuan', payload);
          showToast('Temuan berhasil diupdate', 'success');
        } else {
          await apiPost('createTemuan', payload);
          showToast('Temuan berhasil ditambahkan', 'success');
        }

        overlay.remove();
        setTimeout(function() { loadAuditDetail(); }, 500);

      } catch (e) {
        console.error('[audit-detail] Save error:', e);
        btnReset(confirmBtn);
        showToast(e.message || 'Gagal menyimpan', 'error');
      }
    }
  });
}

// ============================================================
// MODAL: UPDATE PROGRESS
// ============================================================
function showProgressModal(t) {
  var content =
    '<div class="space-y-3">' +

      // Info temuan
      '<div class="bg-slate-50 border border-slate-200 rounded-xl p-3">' +
        '<div class="flex items-center gap-2 mb-1.5">' +
          '<span class="font-mono text-xs font-bold text-slate-600">' + escapeHtml(t.temuan_id) + '</span>' +
          '<span class="badge ' + (JENIS_STYLE[t.jenis_temuan] || JENIS_STYLE['Observasi']).bg + '">' +
            escapeHtml(t.jenis_temuan) +
          '</span>' +
        '</div>' +
        '<div class="text-xs text-slate-600 line-clamp-3">' + escapeHtml(t.deskripsi) + '</div>' +
      '</div>' +

      // Status
      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
          'Status Perbaikan <span class="text-red-500">*</span>' +
        '</label>' +
        '<select id="mp-status" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                'focus:outline-none focus:border-blue-500">' +
          ['Open', 'In Progress', 'Closed'].map(function(s) {
            return '<option value="' + s + '"' + (t.status_perbaikan === s ? ' selected' : '') + '>' + s + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +

      // Tindakan
      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
          'Tindakan Perbaikan <span class="text-red-500">*</span>' +
        '</label>' +
        '<textarea id="mp-tindakan" rows="3" placeholder="Jelaskan tindakan yang sudah dilakukan..." ' +
                  'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl resize-none ' +
                         'focus:outline-none focus:border-blue-500">' +
          escapeHtml(t.tindakan_perbaikan || '') +
        '</textarea>' +
      '</div>' +

      // Tanggal tindakan
      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">Tanggal Tindakan</label>' +
        '<input id="mp-tgl" type="date" ' +
               'value="' + (t.tgl_tindakan ? new Date(t.tgl_tindakan).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]) + '" ' +
               'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                      'focus:outline-none focus:border-blue-500">' +
      '</div>' +

      // Divider
      '<div class="pt-3 border-t border-slate-100">' +
        '<div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">' +
          'Verifikasi (Opsional)' +
        '</div>' +
      '</div>' +

      // Verifikator
      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">Verifikator</label>' +
        '<select id="mp-verifikator" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                'focus:outline-none focus:border-blue-500">' +
          buildUserOptions(t.verifikator, ['Reviewer', 'Admin']) +
        '</select>' +
        '<div class="text-xs text-slate-500 mt-1">User dengan role Reviewer / Admin</div>' +
      '</div>' +

      // Status verifikasi
      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">Status Verifikasi</label>' +
        '<select id="mp-status-verif" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                'focus:outline-none focus:border-blue-500">' +
          ['Pending', 'Verified', 'Rejected'].map(function(s) {
            return '<option value="' + s + '"' + (t.status_verifikasi === s ? ' selected' : '') + '>' + s + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +

      // Catatan verifikasi
      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">Catatan Verifikasi</label>' +
        '<textarea id="mp-catatan" rows="2" placeholder="Catatan dari verifikator..." ' +
                  'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl resize-none ' +
                         'focus:outline-none focus:border-blue-500">' +
          escapeHtml(t.catatan_verifikasi || '') +
        '</textarea>' +
      '</div>' +

    '</div>';

  showModal({
    title: 'Update Progress Perbaikan',
    subtitle: t.temuan_id + ' · ' + t.jenis_temuan,
    content: content,
    confirmText: 'Simpan',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');

      var payload = {
        temuan_id: t.temuan_id,
        status_perbaikan: overlay.querySelector('#mp-status').value,
        tindakan_perbaikan: overlay.querySelector('#mp-tindakan').value.trim(),
        tgl_tindakan: overlay.querySelector('#mp-tgl').value,
        verifikator: overlay.querySelector('#mp-verifikator').value,
        status_verifikasi: overlay.querySelector('#mp-status-verif').value,
        catatan_verifikasi: overlay.querySelector('#mp-catatan').value.trim()
      };

      if (!payload.tindakan_perbaikan) {
        showToast('Tindakan perbaikan wajib diisi', 'warning');
        return;
      }

      btnLoading(confirmBtn, 'Menyimpan...');

      try {
        await apiPost('updateTemuan', payload);
        showToast('Progress berhasil diupdate', 'success');
        overlay.remove();
        setTimeout(function() { loadAuditDetail(); }, 500);
      } catch (e) {
        console.error('[audit-detail] Update progress error:', e);
        btnReset(confirmBtn);
        showToast(e.message || 'Gagal menyimpan', 'error');
      }
    }
  });
}

// ============================================================
// DELETE TEMUAN
// ============================================================
function deleteTemuan(t) {
  confirmDialog(
    'Hapus temuan <b>' + escapeHtml(t.temuan_id) + '</b>? Tindakan ini tidak dapat dibatalkan.',
    async function() {
      try {
        await apiPost('deleteTemuan', { temuan_id: t.temuan_id });
        showToast('Temuan dihapus', 'success');
        setTimeout(function() { loadAuditDetail(); }, 500);
      } catch (e) {
        showToast(e.message || 'Gagal menghapus', 'error');
      }
    },
    { confirmText: 'Hapus', title: 'Konfirmasi Hapus' }
  );
}

// ============================================================
// EDIT AUDIT MODAL
// ============================================================
function showAuditEditModal() {
  var a = state.audit;

  var content =
    '<div class="space-y-3">' +
      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
          'Judul Audit <span class="text-red-500">*</span>' +
        '</label>' +
        '<input id="ae-judul" type="text" value="' + escapeHtml(a.judul || '') + '" ' +
               'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500">' +
      '</div>' +

      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Jenis</label>' +
          '<select id="ae-jenis" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500">' +
            ['Internal', 'Eksternal', 'Surveillance'].map(function(j) {
              return '<option value="' + j + '"' + (a.jenis === j ? ' selected' : '') + '>' + j + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
            'Tanggal <span class="text-red-500">*</span>' +
          '</label>' +
          '<input id="ae-tgl" type="date" ' +
                 'value="' + (a.tanggal_audit ? new Date(a.tanggal_audit).toISOString().split('T')[0] : '') + '" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500">' +
        '</div>' +
      '</div>' +

      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Auditor</label>' +
          '<input id="ae-auditor" type="text" value="' + escapeHtml(a.auditor || '') + '" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500">' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Area</label>' +
          '<input id="ae-area" type="text" value="' + escapeHtml(a.area_diaudit || '') + '" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500">' +
        '</div>' +
      '</div>' +

      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">Status</label>' +
        '<select id="ae-status" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500">' +
          ['Scheduled', 'In Progress', 'Completed', 'Closed'].map(function(s) {
            return '<option value="' + s + '"' + (a.status === s ? ' selected' : '') + '>' + s + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +

      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">Keterangan</label>' +
        '<textarea id="ae-ket" rows="2" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl resize-none focus:outline-none focus:border-blue-500">' +
          escapeHtml(a.keterangan || '') +
        '</textarea>' +
      '</div>' +
    '</div>';

  showModal({
    title: 'Edit Audit',
    content: content,
    confirmText: 'Simpan',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');

      var payload = {
        audit_id: a.audit_id,
        judul: overlay.querySelector('#ae-judul').value.trim(),
        jenis: overlay.querySelector('#ae-jenis').value,
        tanggal_audit: overlay.querySelector('#ae-tgl').value,
        auditor: overlay.querySelector('#ae-auditor').value.trim(),
        area_diaudit: overlay.querySelector('#ae-area').value.trim(),
        status: overlay.querySelector('#ae-status').value,
        keterangan: overlay.querySelector('#ae-ket').value.trim()
      };

      if (!payload.judul || !payload.tanggal_audit) {
        showToast('Judul dan tanggal wajib diisi', 'warning');
        return;
      }

      btnLoading(confirmBtn, 'Menyimpan...');

      try {
        await apiPost('updateAudit', payload);
        showToast('Audit berhasil diupdate', 'success');
        overlay.remove();
        setTimeout(function() { loadAuditDetail(); }, 500);
      } catch (e) {
        btnReset(confirmBtn);
        showToast(e.message || 'Gagal menyimpan', 'error');
      }
    }
  });
}
