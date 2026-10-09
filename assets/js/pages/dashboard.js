/**
 * Dashboard Page Controller
 * --------------------------
 * - Summary cards
 * - Charts (by jenis & status)
 * - Tabel Daftar Klausul ISO (dengan search & filter bab)
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
    // Load paralel: dashboard data + klausul summary
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

  // Skeleton tabel klausul
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
// DAFTAR KLAUSUL
// ============================================================
function renderKlausulTable(items) {
  klausulData = items || [];

  // Update counter
  var totalEl = document.getElementById('klausulTotalCount');
  if (totalEl) totalEl.textContent = klausulData.length;

  // Populate filter bab
  populateBabFilter(klausulData);

  // Attach event listeners
  attachKlausulEvents();

  // Render tabel
  applyKlausulFilter();
}

function populateBabFilter(items) {
  var sel = document.getElementById('klausulFilterBab');
  if (!sel) return;

  // Ambil unique bab
  var babs = [];
  items.forEach(function(k) {
    if (k.bab && babs.indexOf(k.bab) === -1) babs.push(k.bab);
  });
  babs.sort();

  // Reset options
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
    // Filter search
    if (klausulFilters.q) {
      var hay = (String(k.klausul_id) + ' ' + String(k.judul_klausul || '')).toLowerCase();
      if (hay.indexOf(klausulFilters.q) === -1) return false;
    }
    // Filter bab
    if (klausulFilters.bab && k.bab !== klausulFilters.bab) return false;
    return true;
  });

  renderKlausulRows(filtered);
}

function renderKlausulRows(items) {
  var tbody = document.getElementById('klausulTableBody');
  if (!tbody) return;

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
    
    // Warna badge count: hijau kalau ada, abu kalau kosong
    var countCls = hasDocs
      ? 'bg-green-100 text-green-700 border-green-200'
      : 'bg-slate-100 text-slate-500 border-slate-200';

    // Aksi: link ke documents.html dengan filter klausul
    var actionHtml = hasDocs
      ? '<a href="documents.html?klausul=' + encodeURIComponent(k.klausul_id) + '" ' +
             'class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 ' +
                    'hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition">' +
          '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>' +
          '</svg>' +
          'Lihat' +
        '</a>'
      : '<span class="text-xs text-slate-300">-</span>';

    return '<tr class="' + (!hasDocs ? 'opacity-60' : '') + '">' +
      // Klausul ID
      '<td>' +
        '<span class="inline-flex items-center gap-1 font-mono text-xs font-bold ' +
              'text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">' +
          '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>' +
          '</svg>' +
          escapeHtml(k.klausul_id) +
        '</span>' +
      '</td>' +
      
      // Judul Klausul
      '<td>' +
        '<div class="text-sm font-medium text-slate-700">' +
          escapeHtml(k.judul_klausul || '-') +
        '</div>' +
      '</td>' +
      
      // Bab
      '<td>' +
        '<span class="text-xs text-slate-500">' +
          escapeHtml(k.bab || '-') +
        '</span>' +
      '</td>' +
      
      // Total Dokumen
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
      
      // Aksi
      '<td class="text-right">' +
        actionHtml +
      '</td>' +
    '</tr>';
  }).join('');
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
