/**
 * Review Reminder Page Controller
 * -------------------------------
 * Premium version, ASCII-safe, konsisten dengan design system.
 */
import { requireAuth } from '../auth.js';
import { renderNavbar, attachNavbarEvents } from '../components/navbar.js';
import { renderSidebar } from '../components/sidebar.js';
import { apiGet } from '../api.js';
import { formatDate, escapeHtml } from '../utils.js';

// ============================================================
// STATE
// ============================================================
var state = {
  user: null,
  hari: 30,
  items: []
};

// ============================================================
// INIT
// ============================================================
function initPage() {
  console.log('[reminder] Init mulai...');

  var user = requireAuth();
  if (!user) return;
  state.user = user;

  // Render navbar & sidebar
  var navbarEl = document.getElementById('navbar');
  if (navbarEl) navbarEl.innerHTML = renderNavbar(user);

  var sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) sidebarEl.innerHTML = renderSidebar(user, 'review-reminder');

  try { attachNavbarEvents(); } catch (e) { console.error(e); }

  // Setup filter periode
  setupPeriodeFilter();

  // Load data
  loadReminders(state.hari);

  console.log('[reminder] Init selesai');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}

// ============================================================
// FILTER PERIODE
// ============================================================
function setupPeriodeFilter() {
  var buttons = document.querySelectorAll('.periode-btn');
  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var hari = Number(btn.dataset.hari);
      if (hari === state.hari) return;

      state.hari = hari;

      // Update active state
      buttons.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      loadReminders(hari);
    });
  });
}

// ============================================================
// LOAD DATA
// ============================================================
async function loadReminders(hari) {
  var container = document.getElementById('reminderContent');
  if (!container) return;

  container.innerHTML = skeletonList();

  try {
    var data = await apiGet('getReviewReminder', { hari: hari });
    state.items = data || [];

    renderStats(state.items);
    renderList(state.items, hari);

  } catch (e) {
    console.error('[reminder] Load error:', e);
    container.innerHTML =
      '<div class="card-premium p-12 text-center">' +
        '<div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">' +
          '<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-bold text-slate-700 mb-1">Gagal Memuat Data</div>' +
        '<div class="text-sm text-slate-500 mb-5">' + escapeHtml(e.message) + '</div>' +
        '<button onclick="location.reload()" class="btn-gradient inline-flex">' +
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
      '<div class="card-premium !p-5 animate-pulse mb-3">' +
        '<div class="flex items-center gap-4">' +
          '<div class="w-12 h-12 bg-slate-200 rounded-xl flex-shrink-0"></div>' +
          '<div class="flex-1 space-y-2">' +
            '<div class="h-3 bg-slate-200 rounded w-1/4"></div>' +
            '<div class="h-5 bg-slate-200 rounded w-2/3"></div>' +
            '<div class="h-3 bg-slate-200 rounded w-1/3"></div>' +
          '</div>' +
          '<div class="w-24 h-12 bg-slate-200 rounded-lg"></div>' +
        '</div>' +
      '</div>';
  }
  return html;
}

// ============================================================
// STATS
// ============================================================
function renderStats(items) {
  var container = document.getElementById('reminderStats');
  if (!container) return;

  var late = items.filter(function(i) { return i.selisih_hari < 0; }).length;
  var soon = items.filter(function(i) { 
    return i.selisih_hari >= 0 && i.selisih_hari <= 7; 
  }).length;
  var upcoming = items.filter(function(i) { 
    return i.selisih_hari > 7; 
  }).length;

  var stats = [
    {
      label: 'Terlambat',
      value: late,
      color: 'red',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    },
    {
      label: 'Segera (<=7 hari)',
      value: soon,
      color: 'yellow',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Akan Datang',
      value: upcoming,
      color: 'blue',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
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
// RENDER LIST
// ============================================================
function renderList(items, hari) {
  var container = document.getElementById('reminderContent');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = renderEmptyState(hari);
    return;
  }

  var late = items.filter(function(i) { return i.selisih_hari < 0; });
  var soon = items.filter(function(i) { return i.selisih_hari >= 0; });

  var html = '';

  if (late.length) {
    html += renderGroupSection(
      'Sudah Jatuh Tempo',
      late.length,
      'red',
      'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      late
    );
  }

  if (soon.length) {
    html += renderGroupSection(
      'Akan Jatuh Tempo',
      soon.length,
      'yellow',
      'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      soon
    );
  }

  container.innerHTML = html;
}

function renderGroupSection(title, count, color, icon, items) {
  var colorConfig = {
    red: {
      header: 'text-red-700',
      badge: 'bg-red-100 text-red-700',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600'
    },
    yellow: {
      header: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600'
    }
  };

  var c = colorConfig[color];

  var html = '<div class="mb-8 fade-in-up">';
  
  html += '  <div class="flex items-center gap-3 mb-4">';
  html += '    <div class="w-9 h-9 rounded-xl ' + c.iconBg + ' flex items-center justify-center">';
  html += '      <svg class="w-4 h-4 ' + c.iconColor + '" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '        <path stroke-linecap="round" stroke-linejoin="round" d="' + icon + '"/>';
  html += '      </svg>';
  html += '    </div>';
  html += '    <h2 class="font-bold text-lg ' + c.header + '">' + title + '</h2>';
  html += '    <span class="text-xs font-bold px-2.5 py-1 rounded-full ' + c.badge + '">' + count + '</span>';
  html += '  </div>';

  html += '  <div class="space-y-3">';
  html +=      items.map(function(item) { return renderItem(item, color); }).join('');
  html += '  </div>';

  html += '</div>';
  return html;
}

// ============================================================
// RENDER ITEM
// ============================================================
function renderItem(r, groupColor) {
  var isLate = r.selisih_hari < 0;
  var days = Math.abs(r.selisih_hari);

  var accentColor = isLate ? '#ef4444' : '#f59e0b';
  var iconBg = isLate ? 'bg-red-50' : 'bg-amber-50';
  var iconColor = isLate ? 'text-red-600' : 'text-amber-600';
  var textColor = isLate ? 'text-red-600' : 'text-amber-600';
  var iconPath = isLate
    ? 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    : 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';

  var html = '';

  html += '<div class="card-premium !p-4 fade-in-up" ';
  html += '     style="border-left: 4px solid ' + accentColor + ';">';

  html += '  <div class="flex items-center gap-4 flex-wrap sm:flex-nowrap">';

  // Icon
  html += '    <div class="w-12 h-12 rounded-xl ' + iconBg + ' flex items-center justify-center flex-shrink-0">';
  html += '      <svg class="w-5 h-5 ' + iconColor + '" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '        <path stroke-linecap="round" stroke-linejoin="round" d="' + iconPath + '"/>';
  html += '      </svg>';
  html += '    </div>';

  // Content
  html += '    <div class="flex-1 min-w-0">';
  html += '      <div class="flex items-center gap-2 flex-wrap mb-1">';
  html += '        <span class="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">' +
                  escapeHtml(r.kode_dokumen || '-') +
                '</span>';
  html += '        <span class="badge bg-slate-100 text-slate-700">' +
                  escapeHtml(r.jenis || '-') +
                '</span>';
  html += '      </div>';
  
  html += '      <a href="document-detail.html?id=' + escapeHtml(r.doc_id) + '" ';
  html += '         class="font-semibold text-slate-800 hover:text-blue-600 transition truncate block">';
  html +=          escapeHtml(r.judul || '-');
  html += '      </a>';
  
  html += '      <div class="text-xs text-slate-500 mt-0.5">' +
              escapeHtml(r.pemilik_departemen || '-') +
              ' &middot; ' +
              escapeHtml(r.pemilik_email || '-') +
            '</div>';
  html += '    </div>';

  // Right: date & days
  html += '    <div class="text-right flex-shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">';
  html += '      <div class="text-xs text-slate-500 flex items-center justify-end gap-1">';
  html += '        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>';
  html += '        </svg>';
  html +=          formatDate(r.tgl_review_berikutnya);
  html += '      </div>';
  html += '      <div class="text-sm font-bold ' + textColor + ' mt-1">';
  html +=          (isLate ? 'Terlambat ' + days + ' hari' : days + ' hari lagi');
  html += '      </div>';
  html += '    </div>';

  html += '  </div>';
  html += '</div>';

  return html;
}

// ============================================================
// EMPTY STATE
// ============================================================
function renderEmptyState(hari) {
  return '<div class="card-premium p-16 text-center fade-in-up">' +
    '<div class="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center" ' +
         'style="background: linear-gradient(135deg, #d1fae5, #a7f3d0);">' +
      '<svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
      '</svg>' +
    '</div>' +
    '<div class="font-bold text-slate-700 text-lg mb-1">' +
      'Semua Dokumen Aman' +
    '</div>' +
    '<div class="text-sm text-slate-500 mb-5">' +
      'Tidak ada dokumen yang jatuh tempo dalam ' + hari + ' hari ke depan.' +
    '</div>' +
    '<a href="documents.html" class="btn-secondary inline-flex">' +
      'Lihat Semua Dokumen' +
    '</a>' +
  '</div>';
}
