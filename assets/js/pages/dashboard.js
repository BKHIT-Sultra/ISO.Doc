/**
 * Dashboard Page Controller
 * --------------------------
 * Dipanggil dari dashboard.html via initDashboard()
 */
import { apiGet } from '../api.js';
import { formatDate } from '../utils.js';

/**
 * Entry point - dipanggil setelah navbar & sidebar ter-render
 */
export async function initDashboard() {
  renderSkeleton();

  try {
    const data = await apiGet('getDashboardData');
    renderSummary(data.summary);
    renderCharts(data);
    renderReminders(data.review_jatuh_tempo, data.review_akan_jatuh_tempo);
    updateLastUpdated();
  } catch (e) {
    console.error('[Dashboard]', e);
    document.getElementById('dashboardContent').innerHTML =
      '<div class="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl">' +
      'Gagal memuat dashboard: ' + (e.message || 'Unknown error') +
      '</div>';
  }
}

/**
 * ============================================================
 * SKELETON LOADER
 * ============================================================
 */
function renderSkeleton() {
  const cards = document.getElementById('summaryCards');
  if (!cards) return;

  let html = '';
  for (let i = 0; i < 4; i++) {
    html +=
      '<div class="stat-card animate-pulse">' +
        '<div class="h-12 w-12 bg-slate-200 rounded-xl mb-4"></div>' +
        '<div class="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>' +
        '<div class="h-8 bg-slate-200 rounded w-1/2"></div>' +
      '</div>';
  }
  cards.innerHTML = html;
}

/**
 * ============================================================
 * SUMMARY CARDS
 * ============================================================
 */
function renderSummary(summary) {
  const cards = [
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

  const container = document.getElementById('summaryCards');
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

/**
 * ============================================================
 * CHARTS
 * ============================================================
 */
function renderCharts(data) {
  renderBarChartJenis(data.by_jenis || {});
  renderStatusBreakdown(data.by_status || {});
}

function renderBarChartJenis(byJenis) {
  const container = document.getElementById('chartJenis');
  if (!container) return;

  const entries = Object.entries(byJenis);
  if (!entries.length) {
    container.innerHTML = '<div class="text-sm text-slate-500 text-center py-4">Belum ada data</div>';
    return;
  }

  const max = Math.max.apply(null, entries.map(function(e) { return e[1]; }).concat([1]));
  const total = entries.reduce(function(s, e) { return s + e[1]; }, 0);

  const colorMap = {
    'Pedoman': 'blue',
    'Prosedur': 'purple',
    'IKK': 'yellow',
    'Formulir': 'green',
    'Eviden': 'red',
    'Lampiran': 'blue'
  };

  container.innerHTML = entries.map(function(entry) {
    const k = entry[0];
    const v = entry[1];
    const pct = total > 0 ? (v / total * 100) : 0;
    const color = colorMap[k] || 'blue';

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
  const container = document.getElementById('chartStatus');
  if (!container) return;

  const entries = Object.entries(byStatus);
  const total = entries.reduce(function(s, e) { return s + e[1]; }, 0) || 1;

  const config = {
    'Draft':    { color: 'blue',   bg: 'bg-blue-500' },
    'Review':   { color: 'yellow', bg: 'bg-yellow-500' },
    'Approved': { color: 'green',  bg: 'bg-green-500' },
    'Obsolete': { color: 'red',    bg: 'bg-red-500' }
  };

  container.innerHTML = entries.map(function(entry) {
    const k = entry[0];
    const v = entry[1];
    const c = config[k] || { color: 'blue', bg: 'bg-slate-500' };
    const pct = (v / total * 100).toFixed(0);

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

/**
 * ============================================================
 * REMINDERS
 * ============================================================
 */
function renderReminders(jatuhTempo, akanJatuhTempo) {
  const container = document.getElementById('reminders');
  if (!container) return;

  const all = (jatuhTempo || []).concat(akanJatuhTempo || []).slice(0, 10);

  if (!all.length) {
    container.innerHTML =
      '<div class="p-12 text-center">' +
        '<div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-green-50 flex items-center justify-center">' +
          '<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-semibold text-slate-700">Semua dokumen aman</div>' +
        '<div class="text-sm text-slate-500 mt-1">' +
          'Tidak ada dokumen yang perlu direview dalam 30 hari ke depan.' +
        '</div>' +
      '</div>';
    return;
  }

  container.innerHTML = all.map(function(r) {
    const isLate = r.selisih_hari < 0;
    const days = Math.abs(r.selisih_hari);
    const borderColor = isLate ? 'border-l-red-500' : 'border-l-yellow-500';
    const bgColor = isLate ? 'bg-red-50' : 'bg-yellow-50';
    const textColor = isLate ? 'text-red-700' : 'text-yellow-700';

    return '<div class="flex items-center gap-4 px-6 py-4 border-b border-slate-100 ' +
                'last:border-b-0 hover:bg-slate-50 transition border-l-4 ' + borderColor + '">' +
      '<div class="w-10 h-10 rounded-xl ' + bgColor + ' flex items-center justify-center flex-shrink-0">' +
        '<svg class="w-5 h-5 ' + textColor + '" fill="none" stroke="currentColor" ' +
             'viewBox="0 0 24 24" stroke-width="2">' +
          '<path stroke-linecap="round" stroke-linejoin="round" ' +
                'd="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
        '</svg>' +
      '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<div class="font-mono text-xs text-slate-500 mb-0.5">' +
          (r.kode_dokumen || '-') +
        '</div>' +
        '<a href="document-detail.html?id=' + r.doc_id + '" ' +
           'class="font-semibold text-slate-800 hover:text-blue-600 transition truncate block">' +
          (r.judul || '-') +
        '</a>' +
        '<div class="text-xs text-slate-500 mt-0.5">' + (r.jenis || '') + '</div>' +
      '</div>' +
      '<div class="text-right flex-shrink-0">' +
        '<div class="text-xs text-slate-500 mb-1">' +
          formatDate(r.tgl_review_berikutnya) +
        '</div>' +
        '<div class="text-sm font-bold ' + textColor + '">' +
          (isLate ? 'Terlambat ' + days + ' hari' : days + ' hari lagi') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

/**
 * ============================================================
 * LAST UPDATED
 * ============================================================
 */
function updateLastUpdated() {
  const el = document.getElementById('lastUpdated');
  if (!el) return;

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  el.textContent = hh + ':' + mm + ' WITA';
}
