/**
 * Hasil Audit — List Page Controller
 * -----------------------------------
 * Fitur:
 * - List audit dengan filter (jenis, status, search)
 * - Stats: total audit, in progress, total temuan, open
 * - Create/Edit audit modal
 * - Cache daftar user untuk dropdown PIC/Verifikator
 */
import { requireAuth } from '../auth.js';
import { renderNavbar, attachNavbarEvents } from '../components/navbar.js';
import { renderSidebar } from '../components/sidebar.js';
import { apiGet, apiPost } from '../api.js';
import { formatDate, escapeHtml, debounce } from '../utils.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { btnLoading, btnReset } from '../components/loader.js';

// ============================================================
// STATE
// ============================================================
var state = {
  user: null,
  audits: [],
  filters: { q: '', jenis: '', status: '' }
};

// Cache daftar user untuk dropdown
var usersList = [];

// ============================================================
// INIT
// ============================================================
function initPage() {
  console.log('[audits] Init mulai...');

  var user = requireAuth();
  if (!user) return;
  state.user = user;

  // Render navbar & sidebar
  var navbarEl = document.getElementById('navbar');
  if (navbarEl) navbarEl.innerHTML = renderNavbar(user);

  var sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) sidebarEl.innerHTML = renderSidebar(user, 'audits');

  try { attachNavbarEvents(); } catch (e) { console.error(e); }

  // Load daftar user DULU (untuk dropdown PIC/Verifikator di modal)
  loadUsersList().then(function() {
    setupFilters();
    setupAddButton();
    loadAudits();
  });

  console.log('[audits] Init selesai');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}

// ============================================================
// LOAD USERS LIST (untuk dropdown)
// ============================================================
async function loadUsersList() {
  try {
    var data = await apiGet('getUsersSimple');
    usersList = data || [];
    console.log('[audits] Users loaded:', usersList.length);
  } catch (e) {
    console.warn('[audits] Gagal load users:', e);
    usersList = [];
  }
}

/**
 * Build options untuk dropdown user
 * @param {string} selected - value yang sudah dipilih (untuk edit mode)
 * @param {Array} filterRoles - filter role tertentu (opsional)
 * @returns {string} HTML options
 */
function buildUserOptions(selected, filterRoles) {
  var filtered = usersList;
  if (filterRoles && filterRoles.length) {
    filtered = usersList.filter(function(u) {
      return filterRoles.indexOf(u.role) !== -1;
    });
  }

  var options = '<option value="">-- Pilih --</option>';
  filtered.forEach(function(u) {
    var val = u.label;  // "Nama (email)"
    var isSelected = (selected === val) ? ' selected' : '';
    options += '<option value="' + escapeHtml(val) + '"' + isSelected + '>' +
               escapeHtml(u.nama) + ' - ' + escapeHtml(u.role) +
               '</option>';
  });
  return options;
}

// ============================================================
// FILTERS
// ============================================================
function setupFilters() {
  var fSearch = document.getElementById('fSearch');
  var fJenis = document.getElementById('fJenis');
  var fStatus = document.getElementById('fStatus');

  if (fSearch) {
    fSearch.addEventListener('input', debounce(function(e) {
      state.filters.q = e.target.value.trim();
      loadAudits();
    }, 300));
  }

  if (fJenis) {
    fJenis.addEventListener('change', function(e) {
      state.filters.jenis = e.target.value;
      loadAudits();
    });
  }

  if (fStatus) {
    fStatus.addEventListener('change', function(e) {
      state.filters.status = e.target.value;
      loadAudits();
    });
  }
}

// ============================================================
// LOAD AUDITS
// ============================================================
async function loadAudits() {
  var list = document.getElementById('auditList');
  if (!list) return;

  // Skeleton
  list.innerHTML = skeletonList();

  try {
    var data = await apiGet('getAudits', state.filters);
    state.audits = data || [];
    renderStats(state.audits);
    renderList(state.audits);
  } catch (e) {
    console.error('[audits] Load error:', e);
    list.innerHTML =
      '<div class="card-premium p-12 text-center">' +
        '<div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-50 flex items-center justify-center">' +
          '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-semibold text-slate-700 mb-1">Gagal memuat data</div>' +
        '<div class="text-sm text-slate-500 mb-4">' + escapeHtml(e.message) + '</div>' +
        '<button onclick="location.reload()" ' +
                'class="text-blue-600 hover:text-blue-700 font-semibold text-sm">' +
          'Muat Ulang' +
        '</button>' +
      '</div>';
  }
}

// ============================================================
// SKELETON
// ============================================================
function skeletonList() {
  var html = '';
  for (var i = 0; i < 4; i++) {
    html +=
      '<div class="card-premium !p-5 animate-pulse">' +
        '<div class="flex items-start gap-3">' +
          '<div class="w-11 h-11 bg-slate-200 rounded-xl flex-shrink-0"></div>' +
          '<div class="flex-1 space-y-2">' +
            '<div class="h-3 bg-slate-200 rounded w-1/4"></div>' +
            '<div class="h-5 bg-slate-200 rounded w-2/3"></div>' +
            '<div class="h-3 bg-slate-200 rounded w-1/2"></div>' +
          '</div>' +
          '<div class="w-24 h-10 bg-slate-200 rounded-lg"></div>' +
        '</div>' +
      '</div>';
  }
  return html;
}

// ============================================================
// STATS
// ============================================================
function renderStats(audits) {
  var c = document.getElementById('auditStats');
  if (!c) return;

  var total = audits.length;
  var inProgress = audits.filter(function(a) { return a.status === 'In Progress'; }).length;
  var totalTemuan = audits.reduce(function(s, a) { return s + (a.total_temuan || 0); }, 0);
  var totalOpen = audits.reduce(function(s, a) { return s + (a.temuan_open || 0); }, 0);

  var stats = [
    {
      label: 'Total Audit',
      value: total,
      color: 'blue',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
    },
    {
      label: 'In Progress',
      value: inProgress,
      color: 'yellow',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Total Temuan',
      value: totalTemuan,
      color: 'purple',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    },
    {
      label: 'Temuan Open',
      value: totalOpen,
      color: 'red',
      icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  ];

  c.innerHTML = stats.map(function(s, i) {
    return '<div class="stat-card ' + s.color + ' fade-in-up fade-in-up-' + (i + 1) + ' !p-4">' +
      '<div class="flex items-center gap-3">' +
        '<div class="stat-icon ' + s.color + ' !w-10 !h-10">' +
          '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="' + s.icon + '"/>' +
          '</svg>' +
        '</div>' +
        '<div class="min-w-0">' +
          '<div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">' +
            s.label +
          '</div>' +
          '<div class="text-2xl font-extrabold text-slate-800 leading-tight">' +
            s.value +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ============================================================
// RENDER LIST
// ============================================================
function renderList(audits) {
  var list = document.getElementById('auditList');
  if (!list) return;

  // Empty state
  if (!audits.length) {
    list.innerHTML =
      '<div class="card-premium p-16 text-center">' +
        '<div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center">' +
          '<svg class="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-bold text-slate-700 text-lg mb-1">Belum ada audit</div>' +
        '<div class="text-sm text-slate-500 mb-5">' +
          'Klik "Tambah Audit" untuk mulai mendokumentasikan hasil audit' +
        '</div>' +
        '<button onclick="document.getElementById(\'btnAddAudit\').click()" class="btn-gradient inline-flex">' +
          '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>' +
          '</svg>' +
          'Tambah Audit' +
        '</button>' +
      '</div>';
    return;
  }

  var STATUS_STYLE = {
    'Scheduled':   'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Completed':   'bg-green-100 text-green-700 border-green-200',
    'Closed':      'bg-slate-100 text-slate-600 border-slate-200'
  };

  list.innerHTML = audits.map(function(a) {
    var cls = STATUS_STYLE[a.status] || 'bg-slate-100 text-slate-600 border-slate-200';
    var hasOpen = (a.temuan_open || 0) > 0;

    return '<div class="card-premium !p-5 hover:shadow-md transition fade-in-up">' +
      '<div class="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">' +

        // LEFT: Info audit
        '<div class="flex items-start gap-3 flex-1 min-w-0">' +
          '<div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" ' +
               'style="background: linear-gradient(135deg, #ede9fe, #ddd6fe);">' +
            '<svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>' +
            '</svg>' +
          '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex flex-wrap items-center gap-2 mb-1">' +
              '<span class="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">' +
                escapeHtml(a.audit_id) +
              '</span>' +
              '<span class="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">' +
                escapeHtml(a.jenis || '-') +
              '</span>' +
              '<span class="text-xs px-2 py-0.5 rounded-md border font-semibold ' + cls + '">' +
                escapeHtml(a.status || '-') +
              '</span>' +
            '</div>' +
            '<a href="audit-detail.html?id=' + encodeURIComponent(a.audit_id) + '" ' +
               'class="font-bold text-slate-800 hover:text-blue-600 transition truncate block">' +
              escapeHtml(a.judul || '-') +
            '</a>' +
            '<div class="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">' +
              '<span class="flex items-center gap-1">' +
                '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
                  '<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>' +
                '</svg>' +
                formatDate(a.tanggal_audit) +
              '</span>' +
              (a.auditor ?
                '<span class="flex items-center gap-1">' +
                  '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>' +
                  '</svg>' +
                  escapeHtml(a.auditor) +
                '</span>' : '') +
              (a.area_diaudit ?
                '<span class="flex items-center gap-1">' +
                  '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>' +
                    '<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>' +
                  '</svg>' +
                  escapeHtml(a.area_diaudit) +
                '</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +

        // RIGHT: Stats temuan + Aksi
        '<div class="flex items-center gap-3 flex-shrink-0">' +
          '<div class="text-right px-3 py-1.5 rounded-xl ' +
               (hasOpen ? 'bg-red-50' : 'bg-green-50') + '">' +
            '<div class="text-xs text-slate-500 font-semibold">Temuan</div>' +
            '<div class="font-bold text-lg leading-tight ' +
                 (hasOpen ? 'text-red-600' : 'text-green-600') + '">' +
              (a.temuan_open || 0) + ' / ' + (a.total_temuan || 0) +
            '</div>' +
            '<div class="text-xs text-slate-400 leading-tight">open / total</div>' +
          '</div>' +
          '<a href="audit-detail.html?id=' + encodeURIComponent(a.audit_id) + '" ' +
             'class="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 ' +
                    'hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition">' +
            'Detail' +
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>' +
            '</svg>' +
          '</a>' +
        '</div>' +

      '</div>' +
    '</div>';
  }).join('');
}

// ============================================================
// ADD BUTTON
// ============================================================
function setupAddButton() {
  var btn = document.getElementById('btnAddAudit');
  if (!btn) return;
  btn.addEventListener('click', function() {
    showAuditModal(null);
  });
}

// ============================================================
// MODAL CREATE/EDIT AUDIT
// ============================================================
function showAuditModal(existing) {
  var isEdit = !!existing;
  var a = existing || {};

  var content =
    '<div class="space-y-3">' +

      // Judul
      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
          'Judul Audit <span class="text-red-500">*</span>' +
        '</label>' +
        '<input id="ma-judul" type="text" value="' + escapeHtml(a.judul || '') + '" ' +
               'placeholder="Contoh: Audit Internal ISO 9001 2026" ' +
               'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                      'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">' +
      '</div>' +

      // Jenis & Tanggal
      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Jenis</label>' +
          '<select id="ma-jenis" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                  'focus:outline-none focus:border-blue-500">' +
            ['Internal', 'Eksternal', 'Surveillance'].map(function(j) {
              return '<option value="' + j + '"' + (a.jenis === j ? ' selected' : '') + '>' + j + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
            'Tanggal <span class="text-red-500">*</span>' +
          '</label>' +
          '<input id="ma-tgl" type="date" ' +
                 'value="' + (a.tanggal_audit ? new Date(a.tanggal_audit).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]) + '" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500">' +
        '</div>' +
      '</div>' +

      // Auditor & Area
      '<div class="grid grid-cols-2 gap-3">' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Auditor</label>' +
          '<input id="ma-auditor" type="text" value="' + escapeHtml(a.auditor || '') + '" ' +
                 'placeholder="Nama / Tim Auditor" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500">' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Area Diaudit</label>' +
          '<input id="ma-area" type="text" value="' + escapeHtml(a.area_diaudit || '') + '" ' +
                 'placeholder="QC, Produksi" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500">' +
        '</div>' +
      '</div>' +

      // Status (kalau edit)
      (isEdit ?
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Status</label>' +
          '<select id="ma-status" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                  'focus:outline-none focus:border-blue-500">' +
            ['Scheduled', 'In Progress', 'Completed', 'Closed'].map(function(s) {
              return '<option value="' + s + '"' + (a.status === s ? ' selected' : '') + '>' + s + '</option>';
            }).join('') +
          '</select>' +
        '</div>' : '') +

      // Keterangan
      '<div>' +
        '<label class="block text-sm font-semibold text-slate-700 mb-1">Keterangan</label>' +
        '<textarea id="ma-ket" rows="2" ' +
                  'placeholder="Catatan tambahan (opsional)..." ' +
                  'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl resize-none ' +
                         'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">' +
          escapeHtml(a.keterangan || '') +
        '</textarea>' +
      '</div>' +

    '</div>';

  showModal({
    title: isEdit ? 'Edit Audit' : 'Tambah Audit Baru',
    content: content,
    confirmText: isEdit ? 'Simpan' : 'Tambah',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');

      var payload = {
        judul: overlay.querySelector('#ma-judul').value.trim(),
        jenis: overlay.querySelector('#ma-jenis').value,
        tanggal_audit: overlay.querySelector('#ma-tgl').value,
        auditor: overlay.querySelector('#ma-auditor').value.trim(),
        area_diaudit: overlay.querySelector('#ma-area').value.trim(),
        keterangan: overlay.querySelector('#ma-ket').value.trim()
      };

      if (isEdit) {
        payload.status = overlay.querySelector('#ma-status').value;
      }

      // Validasi
      if (!payload.judul) {
        showToast('Judul audit wajib diisi', 'warning');
        return;
      }
      if (!payload.tanggal_audit) {
        showToast('Tanggal audit wajib diisi', 'warning');
        return;
      }

      btnLoading(confirmBtn, 'Menyimpan...');

      try {
        if (isEdit) {
          payload.audit_id = a.audit_id;
          await apiPost('updateAudit', payload);
          showToast('Audit berhasil diupdate', 'success');
        } else {
          await apiPost('createAudit', payload);
          showToast('Audit berhasil dibuat', 'success');
        }

        overlay.remove();
        setTimeout(loadAudits, 500);

      } catch (e) {
        console.error('[audits] Save error:', e);
        btnReset(confirmBtn);
        showToast(e.message || 'Gagal menyimpan', 'error');
      }
    }
  });
}
