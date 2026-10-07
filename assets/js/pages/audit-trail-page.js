/**
 * Audit Trail Page Controller
 * ---------------------------
 * Premium version, ASCII-safe, konsisten dengan design system.
 */
import { requireAuth } from '../auth.js';
import { renderNavbar, attachNavbarEvents } from '../components/navbar.js';
import { renderSidebar } from '../components/sidebar.js';
import { apiGet } from '../api.js';
import { formatDateTime, escapeHtml, debounce } from '../utils.js';
import { showToast } from '../components/toast.js';

// ============================================================
// STATE
// ============================================================
var state = {
  user: null,
  page: 1,
  limit: 50,
  filters: {},
  allData: [],
  pagination: null
};

// ============================================================
// WARNA & ICON PER AKSI
// ============================================================
var AKSI_STYLE = {
  'LOGIN':    { cls: 'bg-slate-100 text-slate-700 border-slate-200',   icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1' },
  'LOGOUT':   { cls: 'bg-slate-100 text-slate-700 border-slate-200',   icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' },
  'CREATE':   { cls: 'bg-green-100 text-green-700 border-green-200',  icon: 'M12 4v16m8-8H4' },
  'UPDATE':   { cls: 'bg-blue-100 text-blue-700 border-blue-200',     icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  'DELETE':   { cls: 'bg-red-100 text-red-700 border-red-200',        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
  'APPROVE':  { cls: 'bg-green-100 text-green-700 border-green-200',  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  'REJECT':   { cls: 'bg-red-100 text-red-700 border-red-200',        icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  'SUBMIT':   { cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
  'VIEW':     { cls: 'bg-slate-100 text-slate-600 border-slate-200',  icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  'DOWNLOAD': { cls: 'bg-purple-100 text-purple-700 border-purple-200', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' }
};

// ============================================================
// HELPERS
// ============================================================
function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function skeletonRows(cols, rows) {
  cols = cols || 5;
  rows = rows || 5;
  var html = '';
  for (var i = 0; i < rows; i++) {
    html += '<tr>';
    for (var j = 0; j < cols; j++) {
      html += '<td class="p-4">' +
        '<div class="h-4 bg-slate-200 rounded animate-pulse" ' +
             'style="width: ' + (40 + Math.random() * 60) + '%"></div>' +
        '</td>';
    }
    html += '</tr>';
  }
  return html;
}

// ============================================================
// INIT
// ============================================================
function initPage() {
  console.log('[audit] Init mulai...');

  var user = requireAuth();
  if (!user) return;
  state.user = user;

  // Render navbar & sidebar
  var navbarEl = document.getElementById('navbar');
  if (navbarEl) navbarEl.innerHTML = renderNavbar(user);

  var sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) sidebarEl.innerHTML = renderSidebar(user, 'audit-trail');

  try { attachNavbarEvents(); } catch (e) { console.error(e); }

  // Setup filter events
  setupFilters();

  // Load logs
  loadLogs();

  console.log('[audit] Init selesai');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}

// ============================================================
// FILTER EVENTS
// ============================================================
function setupFilters() {
  var fEmail = document.getElementById('fEmail');
  var fAksi = document.getElementById('fAksi');
  var fDari = document.getElementById('fDari');
  var fSampai = document.getElementById('fSampai');
  var btnReset = document.getElementById('btnReset');
  var btnExport = document.getElementById('btnExport');

  if (fEmail) {
    fEmail.addEventListener('input', debounce(function(e) {
      state.filters.user_email = e.target.value.trim();
      state.page = 1;
      loadLogs();
    }, 500));
  }

  if (fAksi) {
    fAksi.addEventListener('change', function(e) {
      state.filters.aksi = e.target.value;
      state.page = 1;
      loadLogs();
    });
  }

  if (fDari) {
    fDari.addEventListener('change', function(e) {
      state.filters.tgl_dari = e.target.value;
      state.page = 1;
      loadLogs();
    });
  }

  if (fSampai) {
    fSampai.addEventListener('change', function(e) {
      state.filters.tgl_sampai = e.target.value;
      state.page = 1;
      loadLogs();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', function() {
      state.filters = {};
      state.page = 1;
      if (fEmail) fEmail.value = '';
      if (fAksi) fAksi.value = '';
      if (fDari) fDari.value = '';
      if (fSampai) fSampai.value = '';
      loadLogs();
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', exportCSV);
  }
}

// ============================================================
// LOAD LOGS
// ============================================================
async function loadLogs() {
  var tbody = document.getElementById('auditBody');
  if (!tbody) return;

  tbody.innerHTML = skeletonRows(5, 5);

  try {
    var result = await apiGet('getAuditTrail', Object.assign({}, state.filters, {
      page: state.page,
      limit: state.limit
    }));

    state.allData = result.data || [];
    state.pagination = result.pagination;

    renderStats(state.allData, result.pagination);
    renderTable(state.allData);
    renderPagination(result.pagination);

  } catch (e) {
    console.error('[audit] Load error:', e);
    tbody.innerHTML =
      '<tr><td colspan="5" class="p-12 text-center">' +
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
      '</td></tr>';
  }
}

// ============================================================
// MINI STATS
// ============================================================
function renderStats(logs, pagination) {
  var container = document.getElementById('auditStats');
  if (!container) return;

  // Hitung distribusi dari data yang ada
  var counts = {};
  logs.forEach(function(l) {
    counts[l.aksi] = (counts[l.aksi] || 0) + 1;
  });

  var stats = [
    {
      label: 'Total Log',
      value: (pagination && pagination.total) || logs.length,
      color: 'blue',
      icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2'
    },
    {
      label: 'Create / Update',
      value: (counts.CREATE || 0) + (counts.UPDATE || 0),
      color: 'green',
      icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
    },
    {
      label: 'Approve / Reject',
      value: (counts.APPROVE || 0) + (counts.REJECT || 0),
      color: 'purple',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Login Aktivitas',
      value: counts.LOGIN || 0,
      color: 'yellow',
      icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1'
    }
  ];

  container.innerHTML = stats.map(function(c, i) {
    return '<div class="stat-card ' + c.color + ' fade-in-up fade-in-up-' + (i + 1) + ' !p-4">' +
      '<div class="flex items-center gap-3">' +
        '<div class="stat-icon ' + c.color + ' !w-10 !h-10">' +
          '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="' + c.icon + '"/>' +
          '</svg>' +
        '</div>' +
        '<div class="min-w-0">' +
          '<div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">' +
            c.label +
          '</div>' +
          '<div class="text-2xl font-extrabold text-slate-800 leading-tight">' +
            c.value +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ============================================================
// RENDER TABLE
// ============================================================
function renderTable(logs) {
  var tbody = document.getElementById('auditBody');
  if (!tbody) return;

  if (!logs.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="p-16 text-center">' +
        '<div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">' +
          '<svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-bold text-slate-700 text-lg mb-1">Belum Ada Log</div>' +
        '<div class="text-sm text-slate-500">' +
          'Tidak ada aktivitas yang tercatat dengan filter ini.' +
        '</div>' +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(function(l) {
    var style = AKSI_STYLE[l.aksi] || AKSI_STYLE.VIEW;

    var html = '<tr>';

    // Waktu
    html += '<td class="whitespace-nowrap">';
    html += '  <div class="text-xs font-semibold text-slate-700">' + 
                formatDateTime(l.timestamp).split(' ')[0] + 
              '</div>';
    html += '  <div class="text-xs text-slate-500">' + 
                (formatDateTime(l.timestamp).split(' ')[1] || '') + 
              '</div>';
    html += '</td>';

    // User
    html += '<td>';
    html += '  <div class="flex items-center gap-2">';
    html += '    <div class="w-7 h-7 rounded-lg flex items-center justify-center ' +
                  'text-white text-xs font-bold flex-shrink-0" ';
    html += '         style="background: linear-gradient(135deg, #2563eb, #6366f1);">';
    html +=        (l.user_nama || 'U').charAt(0).toUpperCase();
    html += '    </div>';
    html += '    <div class="min-w-0">';
    html += '      <div class="text-sm font-semibold text-slate-800 truncate">' + 
                    escapeHtml(l.user_nama || '-') + 
                  '</div>';
    html += '      <div class="text-xs text-slate-500 truncate">' + 
                    escapeHtml(l.user_email || '-') + 
                  '</div>';
    html += '    </div>';
    html += '  </div>';
    html += '</td>';

    // Aksi
    html += '<td>';
    html += '  <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 ' +
                  'rounded-lg border ' + style.cls + '">';
    html += '    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">';
    html += '      <path stroke-linecap="round" stroke-linejoin="round" d="' + style.icon + '"/>';
    html += '    </svg>';
    html +=      escapeHtml(l.aksi || '-');
    html += '  </span>';
    html += '</td>';

    // Dokumen
    html += '<td>';
    if (l.kode_dokumen) {
      html += '<span class="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-md">' +
                escapeHtml(l.kode_dokumen) + 
              '</span>';
    } else {
      html += '<span class="text-xs text-slate-400">-</span>';
    }
    html += '</td>';

    // Detail
    html += '<td class="max-w-md">';
    html += '  <div class="text-xs text-slate-600 line-clamp-2" ' +
                'title="' + escapeHtml(l.detail || '') + '">' +
                escapeHtml(l.detail || '-') +
              '</div>';
    html += '</td>';

    html += '</tr>';
    return html;
  }).join('');
}

// ============================================================
// PAGINATION
// ============================================================
function renderPagination(p) {
  var el = document.getElementById('pagination');
  if (!el) return;
  if (!p) return;

  var page = p.page;
  var total = p.total;
  var totalPages = p.totalPages;

  if (totalPages <= 1) {
    el.innerHTML = '<div class="text-sm text-slate-500">' +
      'Menampilkan <b class="text-slate-700">' + total + '</b> log' +
    '</div>';
    return;
  }

  var html = '';

  // Prev
  html += navBtn(page - 1, page <= 1, 'prev');

  // Halaman 1 + ellipsis
  if (page > 3) {
    html += numBtn(1, page === 1);
    if (page > 4) html += '<span class="px-1.5 text-slate-400 self-center">...</span>';
  }

  // Range
  var start = Math.max(1, page - 2);
  var end = Math.min(totalPages, page + 2);
  for (var i = start; i <= end; i++) {
    html += numBtn(i, i === page);
  }

  // Ellipsis + last
  if (page < totalPages - 2) {
    if (page < totalPages - 3) {
      html += '<span class="px-1.5 text-slate-400 self-center">...</span>';
    }
    html += numBtn(totalPages, page === totalPages);
  }

  // Next
  html += navBtn(page + 1, page >= totalPages, 'next');

  // Summary
  html += '<span class="ml-3 text-xs text-slate-500 self-center">' +
            total + ' log &middot; Hal ' + page + '/' + totalPages +
          '</span>';

  el.innerHTML = html;

  // Attach events
  el.querySelectorAll('[data-page]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var p = Number(btn.dataset.page);
      if (p >= 1 && p <= totalPages && p !== page) {
        state.page = p;
        loadLogs();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

function numBtn(num, active) {
  var cls = active
    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/30'
    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
  return '<button data-page="' + num + '" ' +
                'class="min-w-[36px] h-9 px-3 border rounded-lg text-sm font-semibold transition ' + cls + '">' +
           num +
         '</button>';
}

function navBtn(num, disabled, dir) {
  var icon = dir === 'prev'
    ? '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>'
    : '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>';

  return '<button data-page="' + num + '" ' + (disabled ? 'disabled' : '') + ' ' +
                'class="w-9 h-9 flex items-center justify-center border border-slate-200 ' +
                       'rounded-lg bg-white hover:bg-slate-50 text-slate-600 ' +
                       'disabled:opacity-30 disabled:cursor-not-allowed transition">' +
           '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
             icon +
           '</svg>' +
         '</button>';
}

// ============================================================
// EXPORT CSV
// ============================================================
function exportCSV() {
  if (!state.allData || !state.allData.length) {
    showToast('Tidak ada data untuk diexport', 'warning');
    return;
  }

  try {
    var headers = ['timestamp', 'user_email', 'user_nama', 'aksi', 'kode_dokumen', 'detail'];

    var rows = state.allData.map(function(l) {
      return headers.map(function(h) {
        var val = l[h] === null || l[h] === undefined ? '' : String(l[h]);
        return '"' + val.replace(/"/g, '""') + '"';
      }).join(',');
    });

    var csv = [headers.join(',')].concat(rows).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = 'audit_trail_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Export CSV berhasil (' + state.allData.length + ' baris)', 'success');
  } catch (e) {
    console.error('[audit] Export error:', e);
    showToast('Gagal export: ' + e.message, 'error');
  }
}
