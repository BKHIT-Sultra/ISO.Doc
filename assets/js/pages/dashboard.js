/**
 * Dashboard Page Controller
 * --------------------------
 * - Summary cards
 * - Charts (by jenis & status)
 * - Tabel Daftar Klausul ISO (dengan search, filter bab, fullscreen modal)
 */
import { apiGet } from '../api.js';
import { formatDate, escapeHtml, debounce } from '../utils.js';

// ============================================================
// STATE
// ============================================================
let klausulData = [];
let klausulFilters = {
  q: '',
  bab: ''
};

// ============================================================
// INIT
// ============================================================
export async function initDashboard() {
  renderSkeleton();

  try {
    const results = await Promise.all([
      apiGet('getDashboardData'),
      apiGet('getKlausulSummary')
    ]);

    const data = results[0];
    const klausulList = results[1];

    renderSummary(data.summary);
    renderCharts(data);
    renderKlausulTable(klausulList || []);
    updateLastUpdated();

  } catch (e) {
    console.error('[Dashboard]', e);
    var container = document.getElementById('dashboardContent');
    if (container) {
      container.innerHTML =
        '<div class="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl">' +
          'Gagal memuat dashboard: ' + (e.message || 'Unknown error') +
        '</div>';
    }
  }
}

// ============================================================
// SKELETON LOADER
// ============================================================
function renderSkeleton() {
  var cards = document.getElementById('summaryCards');
  if (!cards) return;

  var html = '';
  for (var i = 0; i < 4; i++) {
    html +=
      '<div class="stat-card animate-pulse">' +
        '<div class="h-12 w-12 bg-slate-200 rounded-xl mb-4"></div>' +
        '<div class="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>' +
        '<div class="h-8 bg-slate-200 rounded w-1/2"></div>' +
      '</div>';
  }
  cards.innerHTML = html;

  var tbody = document.getElementById('klausulTableBody');
  if (tbody) {
    var rowsHtml = '';
    for (var j = 0; j < 6; j++) {
      rowsHtml +=
        '<tr>' +
          '<td class="p-4"><div class="h-5 bg-slate-200 rounded w-16 animate-pulse"></div></td>' +
          '<td class="p-4"><div class="h-4 bg-slate-200 rounded w-48 animate-pulse"></div></td>' +
          '<td class="p-4"><div class="h-4 bg-slate-200 rounded w-24 animate-pulse"></div></td>' +
          '<td class="p-4"><div class="h-5 bg-slate-200 rounded w-12 mx-auto animate-pulse"></div></td>' +
          '<td class="p-4"><div class="h-4 bg-slate-200 rounded w-12 ml-auto animate-pulse"></div></td>' +
        '</tr>';
    }
    tbody.innerHTML = rowsHtml;
  }
}

// ============================================================
// SUMMARY CARDS
// ============================================================
function renderSummary(summary) {
  var cards = [
    {
      label: 'Total Dokumen',
      value: summary.total_dokumen || 0,
      color: 'blue',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      label: 'Total Versi',
      value: summary.total_versi || 0,
      color: 'purple',
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
    },
    {
      label: 'Pending Approval',
      value: summary.pending_approval || 0,
      color: 'yellow',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Jatuh Tempo Review',
      value: summary.jatuh_tempo_review || 0,
      color: 'red',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    }
  ];

  var container = document.getElementById('summaryCards');
  if (!container) return;

  container.innerHTML = cards.map(function(c, i) {
    return '<div class="stat-card ' + c.color + ' fade-in-up fade-in-up-' + (i + 1) + '">' +
      '<div class="flex items-start justify-between mb-4">' +
        '<div class="stat-icon ' + c.color + '">' +
          '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="' + c.icon + '"/>' +
          '</svg>' +
        '</div>' +
      '</div>' +
      '<div class="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">' +
        c.label +
      '</div>' +
      '<div class="text-3xl font-extrabold text-slate-800">' + c.value + '</div>' +
    '</div>';
  }).join('');
}

// ============================================================
// CHARTS
// ============================================================
function renderCharts(data) {
  renderBarChartJenis(data.by_jenis || {});
  renderStatusBreakdown(data.by_status || {});
}

function renderBarChartJenis(byJenis) {
  var container = document.getElementById('chartJenis');
  if (!container) return;

  var entries = Object.entries(byJenis);
  if (!entries.length) {
    container.innerHTML = '<div class="text-sm text-slate-500 text-center py-4">Belum ada data</div>';
    return;
  }

  var max = Math.max.apply(null, entries.map(function(e) { return e[1]; }).concat([1]));
  var total = entries.reduce(function(s, e) { return s + e[1]; }, 0);

  var colorMap = {
    'Pedoman': 'blue',
    'Prosedur': 'purple',
    'IKK': 'yellow',
    'Formulir': 'green',
    'Eviden': 'red',
    'Lampiran': 'blue'
  };

  container.innerHTML = entries.map(function(entry) {
    var k = entry[0];
    var v = entry[1];
    var pct = total > 0 ? (v / total * 100) : 0;
    var color = colorMap[k] || 'blue';

    return '<div>' +
      '<div class="flex justify-between items-center mb-1.5">' +
        '<span class="text-sm font-semibold text-slate-700">' + k + '</span>' +
        '<span class="text-xs text-slate-500">' +
          '<span class="font-bold text-slate-800">' + v + '</span> &middot; ' +
          pct.toFixed(0) + '%' +
        '</span>' +
      '</div>' +
      '<div class="progress-bar">' +
        '<div class="progress-fill ' + color + '" ' +
             'style="width: ' + (v / max * 100) + '%"></div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderStatusBreakdown(byStatus) {
  var container = document.getElementById('chartStatus');
  if (!container) return;

  var entries = Object.entries(byStatus);
  var total = entries.reduce(function(s, e) { return s + e[1]; }, 0) || 1;

  var config = {
    'Draft':    { color: 'blue',   bg: 'bg-blue-500' },
    'Review':   { color: 'yellow', bg: 'bg-yellow-500' },
    'Approved': { color: 'green',  bg: 'bg-green-500' },
    'Obsolete': { color: 'red',    bg: 'bg-red-500' }
  };

  container.innerHTML = entries.map(function(entry) {
    var k = entry[0];
    var v = entry[1];
    var c = config[k] || { color: 'blue', bg: 'bg-slate-500' };
    var pct = (v / total * 100).toFixed(0);

    return '<div class="flex items-center gap-3">' +
      '<div class="w-3 h-3 rounded-full ' + c.bg + '"></div>' +
      '<div class="flex-1">' +
        '<div class="flex justify-between items-center mb-1">' +
          '<span class="text-sm font-semibold text-slate-700">' + k + '</span>' +
          '<span class="text-xs text-slate-500">' +
            '<span class="font-bold text-slate-800">' + v + '</span> &middot; ' + pct + '%' +
          '</span>' +
        '</div>' +
        '<div class="progress-bar">' +
          '<div class="progress-fill ' + c.color + '" style="width: ' + pct + '%"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ============================================================
// DAFTAR KLAUSUL — INIT
// ============================================================
function renderKlausulTable(items) {
  klausulData = items || [];

  var totalEl = document.getElementById('klausulTotalCount');
  if (totalEl) totalEl.textContent = klausulData.length;

  populateBabFilter(klausulData);
  attachKlausulEvents();
  applyKlausulFilter();

  // Attach tombol expand fullscreen
  var btnExpand = document.getElementById('btnExpandKlausul');
  if (btnExpand && !btnExpand.dataset.bound) {
    btnExpand.dataset.bound = '1';
    btnExpand.addEventListener('click', showKlausulFullscreen);
  }
}

function populateBabFilter(items) {
  var sel = document.getElementById('klausulFilterBab');
  if (!sel) return;

  var babs = [];
  items.forEach(function(k) {
    if (k.bab && babs.indexOf(k.bab) === -1) babs.push(k.bab);
  });
  babs.sort();

  sel.innerHTML = '<option value="">Semua Bab</option>' +
    babs.map(function(b) {
      return '<option value="' + escapeHtml(b) + '">' + escapeHtml(b) + '</option>';
    }).join('');
}

function attachKlausulEvents() {
  var searchBox = document.getElementById('klausulSearchBox');
  var filterBab = document.getElementById('klausulFilterBab');

  if (searchBox && !searchBox.dataset.bound) {
    searchBox.dataset.bound = '1';
    searchBox.addEventListener('input', debounce(function(e) {
      klausulFilters.q = e.target.value.trim().toLowerCase();
      applyKlausulFilter();
    }, 250));
  }

  if (filterBab && !filterBab.dataset.bound) {
    filterBab.dataset.bound = '1';
    filterBab.addEventListener('change', function(e) {
      klausulFilters.bab = e.target.value;
      applyKlausulFilter();
    });
  }
}

function applyKlausulFilter() {
  var filtered = klausulData.filter(function(k) {
    if (klausulFilters.q) {
      var hay = (String(k.klausul_id) + ' ' + String(k.judul_klausul || '')).toLowerCase();
      if (hay.indexOf(klausulFilters.q) === -1) return false;
    }
    if (klausulFilters.bab && k.bab !== klausulFilters.bab) return false;
    return true;
  });

  renderKlausulRows(filtered);
}

// ============================================================
// RENDER TABEL KLAUSUL (ROWS)
// ============================================================
function renderKlausulRows(items) {
  var tbody = document.getElementById('klausulTableBody');
  if (!tbody) return;

  // Empty state
  if (!items.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="p-12 text-center">' +
        '<div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-50 flex items-center justify-center">' +
          '<svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-semibold text-slate-700 mb-1">Tidak ada klausul yang cocok</div>' +
        '<div class="text-sm text-slate-500">Coba ubah filter atau kata kunci</div>' +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(function(k) {
    var hasDocs = k.total_dokumen > 0;

    var countCls = hasDocs
      ? 'bg-green-100 text-green-700 border-green-200'
      : 'bg-slate-100 text-slate-500 border-slate-200';

    var actionHtml = hasDocs
      ? '<button data-klausul-action="' + escapeHtml(k.klausul_id) + '" ' +
                'class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 ' +
                       'hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition">' +
          '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>' +
          '</svg>' +
          'Lihat' +
        '</button>'
      : '<span class="text-xs text-slate-300">-</span>';

    return '<tr class="' + (!hasDocs ? 'opacity-60' : '') + '">' +
      '<td>' +
        '<span class="inline-flex items-center gap-1 font-mono text-xs font-bold ' +
              'text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">' +
          '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>' +
          '</svg>' +
          escapeHtml(k.klausul_id) +
        '</span>' +
      '</td>' +
      '<td>' +
        '<div class="text-sm font-medium text-slate-700">' +
          escapeHtml(k.judul_klausul || '-') +
        '</div>' +
      '</td>' +
      '<td>' +
        '<span class="text-xs text-slate-500">' +
          escapeHtml(k.bab || '-') +
        '</span>' +
      '</td>' +
      '<td class="text-center">' +
        '<span class="inline-flex items-center justify-center gap-1 min-w-[52px] ' +
              'text-xs font-bold px-2.5 py-1 rounded-lg border ' + countCls + '">' +
          (hasDocs
            ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>' +
              '</svg>'
            : '') +
          k.total_dokumen +
        '</span>' +
      '</td>' +
      '<td class="text-right">' +
        actionHtml +
      '</td>' +
    '</tr>';
  }).join('');

  // Attach event listener ke tombol "Lihat"
  tbody.querySelectorAll('[data-klausul-action]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      showKlausulDetail(btn.dataset.klausulAction);
    });
  });
}

// ============================================================
// MODAL: DETAIL DOKUMEN PER KLAUSUL
// ============================================================
function showKlausulDetail(klausulId) {
  var klausul = klausulData.find(function(k) {
    return String(k.klausul_id) === String(klausulId);
  });

  if (!klausul) {
    console.error('[dashboard] Klausul tidak ditemukan:', klausulId);
    return;
  }

  var docs = klausul.documents || [];
  var judul = klausul.judul_klausul || '-';
  var bab = klausul.bab || '-';

  var content = '';

  // Info klausul
  content += '<div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-4">';
  content += '  <div class="flex items-center gap-3 mb-2">';
  content += '    <span class="inline-flex items-center gap-1 font-mono text-sm font-bold ' +
                    'text-blue-700 bg-white px-3 py-1 rounded-lg border border-blue-200">' +
                    '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">' +
                      '<path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>' +
                    '</svg>' +
                    escapeHtml(klausul.klausul_id) +
                  '</span>';
  content += '    <span class="text-xs text-slate-500">' + escapeHtml(bab) + '</span>';
  content += '  </div>';
  content += '  <div class="font-semibold text-slate-800">' + escapeHtml(judul) + '</div>';
  content += '</div>';

  // List dokumen
  if (!docs.length) {
    content += '<div class="p-8 text-center bg-slate-50 rounded-xl">';
    content += '  <svg class="w-12 h-12 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
    content += '    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>';
    content += '  </svg>';
    content += '  <div class="text-sm text-slate-500">Belum ada dokumen untuk klausul ini</div>';
    content += '</div>';
  } else {
    content += '<div class="mb-2 flex items-center justify-between">';
    content += '  <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">';
    content += '    ' + docs.length + ' Dokumen Terkait';
    content += '  </span>';
    content += '</div>';
    content += '<div class="space-y-2 max-h-[400px] overflow-y-auto">';

    docs.forEach(function(d) {
      var statusCls = {
        'Draft':    'bg-blue-100 text-blue-700',
        'Review':   'bg-yellow-100 text-yellow-700',
        'Approved': 'bg-green-100 text-green-700',
        'Obsolete': 'bg-red-100 text-red-700'
      }[d.status] || 'bg-slate-100 text-slate-700';

      var hasFile = d.drive_file_url && d.drive_file_url.length > 0;

      content += '<div class="bg-white border border-slate-200 rounded-xl p-3 ' +
                      'hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/10 ' +
                      'transition">';
      
      // Baris atas: info dokumen
      content += '  <div class="flex items-start gap-3 mb-3">';
      
      // Icon
      content += '    <div class="w-10 h-10 rounded-lg flex items-center justify-center ' +
                       'flex-shrink-0" style="background: linear-gradient(135deg, #dbeafe, #bfdbfe);">';
      content += '      <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" ' +
                       'viewBox="0 0 24 24" stroke-width="2">';
      content += '        <path stroke-linecap="round" stroke-linejoin="round" ' +
                       'd="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>';
      content += '      </svg>';
      content += '    </div>';
      
      // Info
      content += '    <div class="flex-1 min-w-0">';
      content += '      <div class="flex flex-wrap items-center gap-1.5 mb-1">';
      content += '        <span class="font-mono text-xs text-slate-500">' + escapeHtml(d.kode_dokumen) + '</span>';
      content += '        <span class="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">' + escapeHtml(d.jenis) + '</span>';
      content += '        <span class="text-xs px-1.5 py-0.5 rounded font-semibold ' + statusCls + '">' + escapeHtml(d.status) + '</span>';
      content += '      </div>';
      content += '      <div class="font-semibold text-sm text-slate-800 truncate">' +
                       escapeHtml(d.judul) + '</div>';
      content += '      <div class="text-xs text-slate-500 mt-0.5">' +
                       'v' + escapeHtml(d.versi_terkini || '01') + ' &middot; ' +
                       escapeHtml(d.pemilik_departemen || '-') + '</div>';
      content += '    </div>';
      
      content += '  </div>';
      
      // Baris bawah: 2 tombol aksi
      content += '  <div class="flex gap-2 pt-3 border-t border-slate-100">';
      
      // Tombol 1: Lihat Dokumen
      if (hasFile) {
        content += '<a href="' + d.drive_file_url + '" target="_blank" rel="noopener" ' +
                        'class="flex-1 inline-flex items-center justify-center gap-1.5 ' +
                               'px-3 py-2 text-xs font-semibold text-white rounded-lg ' +
                               'bg-gradient-to-br from-blue-600 to-indigo-600 ' +
                               'hover:shadow-lg hover:shadow-blue-500/30 transition">' +
          '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>' +
          '</svg>' +
          'Lihat Dokumen' +
        '</a>';
      } else {
        // Tombol disabled kalau tidak ada file
        content += '<button type="button" disabled ' +
                        'class="flex-1 inline-flex items-center justify-center gap-1.5 ' +
                               'px-3 py-2 text-xs font-semibold text-slate-400 rounded-lg ' +
                               'bg-slate-100 cursor-not-allowed">' +
          '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>' +
          '</svg>' +
          'Tidak ada file' +
        '</button>';
      }
      
      // Tombol 2: Detail
      content += '<a href="document-detail.html?id=' + d.doc_id + '" ' +
                      'class="flex-1 inline-flex items-center justify-center gap-1.5 ' +
                             'px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg ' +
                             'bg-slate-100 hover:bg-slate-200 transition">' +
        '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>' +
        '</svg>' +
        'Detail' +
      '</a>';
      
      content += '  </div>';
      content += '</div>';
    });

    content += '</div>';
  }

  showCustomModal({
    title: 'Dokumen dengan Klausul ' + klausul.klausul_id,
    subtitle: judul,
    content: content,
    size: 'md'
  });
}

// ============================================================
// FULLSCREEN MODAL: TABEL KLAUSUL MELAYANG
// ============================================================
function showKlausulFullscreen() {
  var existing = document.getElementById('klausulFullscreen');
  if (existing) existing.remove();

  var fsFilters = { q: '', bab: '' };

  var overlay = document.createElement('div');
  overlay.id = 'klausulFullscreen';
  overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] ' +
                      'flex items-center justify-center p-4 lg:p-6';

  overlay.innerHTML =
    '<div class="bg-white rounded-2xl shadow-2xl w-full h-full max-w-7xl ' +
                'flex flex-col overflow-hidden border border-slate-200">' +

      // Header
      '<div class="px-6 py-4 border-b border-slate-200 flex items-center ' +
                  'justify-between gap-4 flex-shrink-0 bg-gradient-to-br from-slate-50 to-white">' +
        '<div class="flex items-center gap-3 min-w-0">' +
          '<div class="w-11 h-11 rounded-xl bg-indigo-50 flex items-center ' +
                      'justify-center flex-shrink-0">' +
            '<svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" ' +
                 'viewBox="0 0 24 24" stroke-width="2">' +
              '<path stroke-linecap="round" stroke-linejoin="round" ' +
                    'd="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>' +
            '</svg>' +
          '</div>' +
          '<div class="min-w-0">' +
            '<h2 class="font-bold text-slate-800 text-lg truncate">Daftar Klausul ISO</h2>' +
            '<p class="text-xs text-slate-500">' +
              '<span id="fsKlausulCount">' + klausulData.length + '</span> klausul terdaftar' +
            '</p>' +
          '</div>' +
        '</div>' +

        '<div class="flex items-center gap-2 flex-shrink-0">' +
          // Search
          '<div class="relative hidden md:block">' +
            '<div class="absolute inset-y-0 left-0 pl-3 flex items-center ' +
                        'pointer-events-none text-slate-400">' +
              '<svg class="w-4 h-4" fill="none" stroke="currentColor" ' +
                   'viewBox="0 0 24 24" stroke-width="2">' +
                '<path stroke-linecap="round" stroke-linejoin="round" ' +
                      'd="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>' +
              '</svg>' +
            '</div>' +
            '<input id="fsKlausulSearch" type="text" placeholder="Cari klausul..." ' +
                   'class="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 ' +
                          'rounded-xl text-sm w-64 focus:outline-none ' +
                          'focus:border-blue-500 focus:bg-white transition">' +
          '</div>' +

          // Filter bab
          '<select id="fsKlausulFilterBab" ' +
                  'class="hidden md:block px-3 py-2.5 bg-slate-50 ' +
                         'border border-slate-200 rounded-xl text-sm ' +
                         'focus:outline-none focus:border-blue-500 focus:bg-white ' +
                         'transition cursor-pointer">' +
            '<option value="">Semua Bab</option>' +
          '</select>' +

          // Close
          '<button id="fsKlausulClose" ' +
                  'class="w-10 h-10 rounded-xl flex items-center justify-center ' +
                         'text-slate-500 hover:text-red-600 hover:bg-red-50 transition">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" ' +
                 'viewBox="0 0 24 24" stroke-width="2">' +
              '<path stroke-linecap="round" stroke-linejoin="round" ' +
                    'd="M6 18L18 6M6 6l12 12"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>' +

      // Body
      '<div class="flex-1 overflow-auto">' +
        '<table class="w-full">' +
          '<thead class="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">' +
            '<tr>' +
              '<th class="px-6 py-4 text-left text-xs font-bold text-slate-600 ' +
                    'uppercase tracking-wider w-32">Klausul</th>' +
              '<th class="px-6 py-4 text-left text-xs font-bold text-slate-600 ' +
                    'uppercase tracking-wider">Judul Klausul</th>' +
              '<th class="px-6 py-4 text-left text-xs font-bold text-slate-600 ' +
                    'uppercase tracking-wider w-48">Bab</th>' +
              '<th class="px-6 py-4 text-center text-xs font-bold text-slate-600 ' +
                    'uppercase tracking-wider w-32">Dokumen</th>' +
              '<th class="px-6 py-4 text-right text-xs font-bold text-slate-600 ' +
                    'uppercase tracking-wider w-40">Aksi</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="fsKlausulBody" class="divide-y divide-slate-100"></tbody>' +
        '</table>' +
      '</div>' +

      // Footer
      '<div class="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center ' +
                  'justify-between text-xs text-slate-500 flex-shrink-0">' +
        '<span>Tekan <kbd class="px-1.5 py-0.5 bg-white border border-slate-200 ' +
              'rounded text-[10px] font-mono">ESC</kbd> untuk menutup</span>' +
        '<span id="fsKlausulFooterInfo"></span>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Populate filter bab
  var babs = [];
  klausulData.forEach(function(k) {
    if (k.bab && babs.indexOf(k.bab) === -1) babs.push(k.bab);
  });
  babs.sort();

  var babSelect = document.getElementById('fsKlausulFilterBab');
  if (babSelect) {
    babs.forEach(function(b) {
      var opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      babSelect.appendChild(opt);
    });
  }

  function renderFS() {
    var filtered = klausulData.filter(function(k) {
      if (fsFilters.q) {
        var hay = (String(k.klausul_id) + ' ' + String(k.judul_klausul || '')).toLowerCase();
        if (hay.indexOf(fsFilters.q) === -1) return false;
      }
      if (fsFilters.bab && k.bab !== fsFilters.bab) return false;
      return true;
    });
    renderFSRows(filtered);

    var infoEl = document.getElementById('fsKlausulFooterInfo');
    if (infoEl) {
      infoEl.textContent = 'Menampilkan ' + filtered.length + ' dari ' + klausulData.length + ' klausul';
    }
  }

  function renderFSRows(items) {
    var tbody = document.getElementById('fsKlausulBody');
    if (!tbody) return;

    if (!items.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="p-16 text-center">' +
          '<div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-50 flex items-center justify-center">' +
            '<svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" ' +
                 'viewBox="0 0 24 24" stroke-width="2">' +
              '<path stroke-linecap="round" stroke-linejoin="round" ' +
                    'd="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>' +
            '</svg>' +
          '</div>' +
          '<div class="font-semibold text-slate-700 mb-1">Tidak ada klausul yang cocok</div>' +
          '<div class="text-sm text-slate-500">Coba ubah filter atau kata kunci</div>' +
        '</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(function(k) {
      var hasDocs = k.total_dokumen > 0;
      var countCls = hasDocs
        ? 'bg-green-100 text-green-700 border-green-200'
        : 'bg-slate-100 text-slate-500 border-slate-200';

      var actionHtml = hasDocs
        ? '<button data-fs-klausul="' + escapeHtml(k.klausul_id) + '" ' +
                  'class="inline-flex items-center gap-1.5 text-xs font-semibold ' +
                         'text-blue-600 hover:text-blue-700 hover:bg-blue-50 ' +
                         'px-3 py-1.5 rounded-lg transition">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" ' +
                 'viewBox="0 0 24 24" stroke-width="2">' +
              '<path stroke-linecap="round" stroke-linejoin="round" ' +
                    'd="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>' +
              '<path stroke-linecap="round" stroke-linejoin="round" ' +
                    'd="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>' +
            '</svg>' +
            'Lihat Dokumen' +
          '</button>'
        : '<span class="text-xs text-slate-300">-</span>';

      return '<tr class="hover:bg-slate-50 transition ' + (!hasDocs ? 'opacity-60' : '') + '">' +
        '<td class="px-6 py-4">' +
          '<span class="inline-flex items-center gap-1 font-mono text-xs font-bold ' +
                'text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">' +
            escapeHtml(k.klausul_id) +
          '</span>' +
        '</td>' +
        '<td class="px-6 py-4">' +
          '<div class="text-sm font-medium text-slate-700">' +
            escapeHtml(k.judul_klausul || '-') +
          '</div>' +
        '</td>' +
        '<td class="px-6 py-4">' +
          '<span class="text-xs text-slate-500">' +
            escapeHtml(k.bab || '-') +
          '</span>' +
        '</td>' +
        '<td class="px-6 py-4 text-center">' +
          '<span class="inline-flex items-center justify-center gap-1 min-w-[52px] ' +
                'text-xs font-bold px-2.5 py-1 rounded-lg border ' + countCls + '">' +
            (hasDocs
              ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" ' +
                     'viewBox="0 0 24 24" stroke-width="2">' +
                  '<path stroke-linecap="round" stroke-linejoin="round" ' +
                        'd="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>' +
                '</svg>'
              : '') +
            k.total_dokumen +
          '</span>' +
        '</td>' +
        '<td class="px-6 py-4 text-right">' + actionHtml + '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('[data-fs-klausul]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        showKlausulDetail(btn.dataset.fsKlausul);
      });
    });
  }

  // Attach events
  document.getElementById('fsKlausulClose').addEventListener('click', closeFS);

  var searchEl = document.getElementById('fsKlausulSearch');
  if (searchEl) {
    searchEl.addEventListener('input', debounce(function(e) {
      fsFilters.q = e.target.value.trim().toLowerCase();
      renderFS();
    }, 250));
  }

  if (babSelect) {
    babSelect.addEventListener('change', function(e) {
      fsFilters.bab = e.target.value;
      renderFS();
    });
  }

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeFS();
  });

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      closeFS();
      document.removeEventListener('keydown', onKeyDown);
    }
  }
  document.addEventListener('keydown', onKeyDown);

  function closeFS() {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.15s ease';
    setTimeout(function() {
      overlay.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    }, 150);
  }

  setTimeout(function() {
    if (searchEl) searchEl.focus();
  }, 200);

  renderFS();
}

// ============================================================
// CUSTOM MODAL HELPER
// ============================================================
function showCustomModal(opts) {
  var existing = document.getElementById('customModal');
  if (existing) existing.remove();

  var sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };
  var sizeClass = sizes[opts.size || 'md'];

  var overlay = document.createElement('div');
  overlay.id = 'customModal';
  overlay.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4';

  overlay.innerHTML =
    '<div class="bg-white rounded-2xl shadow-2xl w-full ' + sizeClass + ' max-h-[90vh] flex flex-col overflow-hidden">' +
      '<div class="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 flex-shrink-0">' +
        '<div class="min-w-0">' +
          '<h3 class="font-bold text-slate-800 text-base truncate">' + opts.title + '</h3>' +
          (opts.subtitle ? '<p class="text-xs text-slate-500 mt-0.5 truncate">' + opts.subtitle + '</p>' : '') +
        '</div>' +
        '<button data-close class="w-8 h-8 rounded-lg flex items-center justify-center ' +
               'text-slate-400 hover:text-red-600 hover:bg-red-50 transition flex-shrink-0">' +
          '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      '<div class="p-5 overflow-y-auto flex-1">' + opts.content + '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  function close() {
    overlay.remove();
    document.body.style.overflow = '';
  }

  overlay.querySelectorAll('[data-close]').forEach(function(el) {
    el.addEventListener('click', close);
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') close();
  });
}

// ============================================================
// LAST UPDATED
// ============================================================
function updateLastUpdated() {
  var el = document.getElementById('lastUpdated');
  if (!el) return;

  var now = new Date();
  var hh = String(now.getHours()).padStart(2, '0');
  var mm = String(now.getMinutes()).padStart(2, '0');
  el.textContent = hh + ':' + mm + ' WITA';
}
