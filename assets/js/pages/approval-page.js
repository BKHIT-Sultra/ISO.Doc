/**
 * Approval Page Controller
 * ------------------------
 * Premium version, konsisten dengan design system.
 * ASCII-safe: no emoji, string concat, no template literal.
 */
import { requireAuth } from '../auth.js';
import { renderNavbar, attachNavbarEvents } from '../components/navbar.js';
import { renderSidebar } from '../components/sidebar.js';
import { apiGet, apiPost } from '../api.js';
import { formatDateTime, escapeHtml } from '../utils.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { btnLoading, btnReset } from '../components/loader.js';

// ============================================================
// STATE
// ============================================================
var state = {
  user: null,
  items: []
};

// ============================================================
// LOCAL HELPERS (tidak bergantung utils)
// ============================================================
function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function skeletonCards(count) {
  var html = '';
  for (var i = 0; i < count; i++) {
    html +=
      '<div class="card-premium !p-5 animate-pulse">' +
        '<div class="flex items-start gap-4">' +
          '<div class="w-12 h-12 bg-slate-200 rounded-xl flex-shrink-0"></div>' +
          '<div class="flex-1 space-y-2">' +
            '<div class="h-3 bg-slate-200 rounded w-1/3"></div>' +
            '<div class="h-5 bg-slate-200 rounded w-2/3"></div>' +
            '<div class="h-3 bg-slate-200 rounded w-1/2"></div>' +
          '</div>' +
          '<div class="w-32 h-9 bg-slate-200 rounded-lg"></div>' +
        '</div>' +
      '</div>';
  }
  return html;
}

// ============================================================
// INIT
// ============================================================
function initPage() {
  console.log('[approval] Init mulai...');

  var user = requireAuth();
  if (!user) return;
  state.user = user;

  // Render navbar & sidebar
  var navbarEl = document.getElementById('navbar');
  if (navbarEl) navbarEl.innerHTML = renderNavbar(user);

  var sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) sidebarEl.innerHTML = renderSidebar(user, 'approval');

  try { attachNavbarEvents(); } catch (e) { console.error(e); }

  // Cek role
  if (user.role !== 'Admin' && user.role !== 'Reviewer') {
    document.getElementById('approvalList').innerHTML =
      '<div class="card-premium p-12 text-center">' +
        '<div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">' +
          '<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-bold text-slate-700 text-lg mb-1">Akses Ditolak</div>' +
        '<div class="text-sm text-slate-500">' +
          'Halaman ini hanya untuk Admin & Reviewer.' +
        '</div>' +
      '</div>';
    return;
  }

  loadApprovals();
  console.log('[approval] Init selesai');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}

// ============================================================
// LOAD DATA
// ============================================================
async function loadApprovals() {
  var container = document.getElementById('approvalList');
  if (!container) return;

  container.innerHTML = skeletonCards(3);

  try {
    var data = await apiGet('getPendingApprovals', {
      user_email: state.user.email
    });

    state.items = data || [];

    renderStats(state.items);

    if (state.items.length === 0) {
      container.innerHTML = renderEmptyState();
      return;
    }

    container.innerHTML = state.items.map(renderItem).join('');
    attachItemEvents();

  } catch (e) {
    console.error('[approval] Load error:', e);
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
// STATS
// ============================================================
function renderStats(items) {
  var container = document.getElementById('approvalStats');
  if (!container) return;

  var reviewCount = items.filter(function(i) { 
    return i.status_review === 'Pending'; 
  }).length;
  
  var approvalCount = items.filter(function(i) { 
    return i.status_approval === 'Pending' && i.status_review === 'Disetujui'; 
  }).length;

  var total = items.length;

  var stats = [
    {
      label: 'Total Pending',
      value: total,
      color: 'blue',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      label: 'Tahap Review',
      value: reviewCount,
      color: 'yellow',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Tahap Approval',
      value: approvalCount,
      color: 'green',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
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
// EMPTY STATE
// ============================================================
function renderEmptyState() {
  return '<div class="card-premium p-16 text-center">' +
    '<div class="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center" ' +
         'style="background: linear-gradient(135deg, #d1fae5, #a7f3d0);">' +
      '<svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
      '</svg>' +
    '</div>' +
    '<div class="font-bold text-slate-700 text-lg mb-1">' +
      'Tidak ada dokumen yang menunggu approval' +
    '</div>' +
    '<div class="text-sm text-slate-500 mb-5">' +
      'Semua dokumen sudah ditinjau. Kerja bagus!' +
    '</div>' +
    '<a href="documents.html" class="btn-secondary inline-flex">' +
      'Lihat Semua Dokumen' +
    '</a>' +
  '</div>';
}

// ============================================================
// RENDER ITEM
// ============================================================
function renderItem(a) {
  var isReviewStage = a.status_review === 'Pending';
  var stageLabel = isReviewStage ? 'Tahap Review' : 'Tahap Approval';
  var stageBg = isReviewStage ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
  var accentColor = isReviewStage ? '#f59e0b' : '#2563eb';

  var html = '';

  html += '<div class="card-premium !p-5 fade-in-up" data-item="' + escapeHtml(a.approval_id) + '" ';
  html += '     style="border-left: 4px solid ' + accentColor + ';">';
  
  html += '  <div class="flex flex-col md:flex-row md:items-center gap-4 justify-between">';
  
  // LEFT: Info
  html += '    <div class="flex items-start gap-4 flex-1 min-w-0">';
  
  // Icon
  html += '      <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" ';
  html += '           style="background: linear-gradient(135deg, #dbeafe, #bfdbfe);">';
  html += '        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>';
  html += '        </svg>';
  html += '      </div>';

  // Content
  html += '      <div class="flex-1 min-w-0">';
  
  // Badges row
  html += '        <div class="flex flex-wrap items-center gap-2 mb-1.5">';
  html += '          <span class="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">' + 
                  escapeHtml(a.kode_dokumen || '-') + 
                '</span>';
  html += '          <span class="badge bg-slate-100 text-slate-700">' + 
                  escapeHtml(a.jenis || '-') + 
                '</span>';
  html += '          <span class="badge bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 border border-blue-100">' +
                  'v' + escapeHtml(a.versi || '01') + 
                '</span>';
  html += '          <span class="badge ' + stageBg + '">' +
                  '<span class="w-1.5 h-1.5 rounded-full bg-current"></span>' +
                  stageLabel +
                '</span>';
  html += '        </div>';
  
  // Title
  html += '        <div class="font-bold text-slate-800 text-base lg:text-lg leading-tight truncate">' +
                escapeHtml(a.judul || 'Tanpa Judul') +
              '</div>';
  
  // Meta
  html += '        <div class="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 flex-wrap">';
  html += '          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>';
  html += '          </svg>';
  html +=            escapeHtml(a.pengaju || '-');
  html += '          <span class="text-slate-300">&middot;</span>';
  html += '          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>';
  html += '          </svg>';
  html +=            formatDateTime(a.tgl_pengajuan);
  html += '        </div>';

  // Comment (kalau ada)
  if (a.komentar_review) {
    html += '        <div class="mt-2.5 text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border-l-2 border-blue-400">';
    html += '          "' + escapeHtml(a.komentar_review) + '"';
    html += '        </div>';
  }

  html += '      </div>';
  html += '    </div>';

  // RIGHT: Actions
  html += '    <div class="flex gap-2 flex-shrink-0 flex-wrap md:flex-nowrap">';
  
  html += '      <a href="document-detail.html?id=' + escapeHtml(a.doc_id) + '" ';
  html += '         class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold ';
  html += '                text-slate-600 bg-white border-2 border-slate-200 rounded-xl ';
  html += '                hover:bg-slate-50 hover:border-slate-300 transition">';
  html += '        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>';
  html += '          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>';
  html += '        </svg>';
  html += '        Lihat';
  html += '      </a>';

  html += '      <button data-action="approve" ';
  html += '              data-id="' + escapeHtml(a.approval_id) + '" ';
  html += '              data-doc="' + escapeHtml(a.doc_id) + '" ';
  html += '              class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold ';
  html += '                     text-white rounded-xl transition ';
  html += '                     bg-gradient-to-br from-green-600 to-emerald-600 ';
  html += '                     hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-50">';
  html += '        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">';
  html += '          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>';
  html += '        </svg>';
  html += '        Setujui';
  html += '      </button>';

  html += '      <button data-action="reject" ';
  html += '              data-id="' + escapeHtml(a.approval_id) + '" ';
  html += '              data-doc="' + escapeHtml(a.doc_id) + '" ';
  html += '              class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold ';
  html += '                     text-red-700 bg-red-50 border-2 border-red-200 rounded-xl ';
  html += '                     hover:bg-red-100 transition disabled:opacity-50">';
  html += '        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">';
  html += '          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>';
  html += '        </svg>';
  html += '        Tolak';
  html += '      </button>';

  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  return html;
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function attachItemEvents() {
  document.querySelectorAll('[data-action="approve"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      approveItem(btn.dataset.id, btn.dataset.doc);
    });
  });

  document.querySelectorAll('[data-action="reject"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      rejectItem(btn.dataset.id, btn.dataset.doc);
    });
  });
}

// ============================================================
// APPROVE MODAL
// ============================================================
function approveItem(approvalId, docId) {
  var item = state.items.find(function(x) { return x.approval_id === approvalId; });
  var judul = item ? item.judul : 'Dokumen ini';
  var kode = item ? item.kode_dokumen : '-';

  showModal({
    title: 'Setujui Dokumen',
    content:
      '<div class="space-y-3">' +
        '<div class="bg-blue-50 border border-blue-200 rounded-xl p-3">' +
          '<div class="font-semibold text-slate-800 text-sm">' + escapeHtml(judul) + '</div>' +
          '<div class="text-xs text-slate-500 mt-1 font-mono">Kode: ' + escapeHtml(kode) + '</div>' +
        '</div>' +

        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Tanggal Berlaku</label>' +
          '<input id="m-tgl" type="date" value="' + new Date().toISOString().split('T')[0] + '" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">' +
        '</div>' +

        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Komentar (opsional)</label>' +
          '<textarea id="m-komentar" rows="3" placeholder="Contoh: Dokumen sudah sesuai..." ' +
                    'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                           'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"></textarea>' +
        '</div>' +
      '</div>',
    confirmText: 'Setujui',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');
      var tglBerlaku = overlay.querySelector('#m-tgl').value;
      var komentar = overlay.querySelector('#m-komentar').value.trim();

      if (!tglBerlaku) {
        showToast('Tanggal berlaku wajib diisi', 'warning');
        return;
      }

      btnLoading(confirmBtn, 'Menyimpan...');

      try {
        await apiPost('approveDocument', {
          doc_id: docId,
          approval_id: approvalId,
          komentar: komentar,
          tgl_berlaku: tglBerlaku
        });

        overlay.remove();
        showToast('Dokumen berhasil disetujui', 'success');

        await delay(300);
        loadApprovals();

      } catch (e) {
        btnReset(confirmBtn);
        showToast(e.message || 'Gagal approve', 'error');
      }
    }
  });
}

// ============================================================
// REJECT MODAL
// ============================================================
function rejectItem(approvalId, docId) {
  var item = state.items.find(function(x) { return x.approval_id === approvalId; });
  var judul = item ? item.judul : 'Dokumen ini';
  var kode = item ? item.kode_dokumen : '-';

  showModal({
    title: 'Tolak Dokumen',
    content:
      '<div class="space-y-3">' +
        '<div class="bg-red-50 border border-red-200 rounded-xl p-3">' +
          '<div class="font-semibold text-slate-800 text-sm">' + escapeHtml(judul) + '</div>' +
          '<div class="text-xs text-slate-500 mt-1 font-mono">Kode: ' + escapeHtml(kode) + '</div>' +
        '</div>' +

        '<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">' +
          'Dokumen akan dikembalikan ke status <b>Draft</b> dan penyusun akan menerima notifikasi.' +
        '</div>' +

        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
            'Alasan Penolakan <span class="text-red-500">*</span>' +
          '</label>' +
          '<textarea id="m-alasan" rows="4" required ' +
                    'placeholder="Contoh: Perlu revisi pada bagian 3.2 karena..." ' +
                    'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                           'focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 resize-none"></textarea>' +
        '</div>' +
      '</div>',
    confirmText: 'Tolak',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');
      var alasan = overlay.querySelector('#m-alasan').value.trim();

      if (!alasan) {
        showToast('Alasan penolakan wajib diisi', 'warning');
        overlay.querySelector('#m-alasan').focus();
        return;
      }

      if (alasan.length < 10) {
        showToast('Alasan minimal 10 karakter', 'warning');
        return;
      }

      btnLoading(confirmBtn, 'Mengirim...');

      try {
        await apiPost('rejectDocument', {
          doc_id: docId,
          approval_id: approvalId,
          alasan: alasan
        });

        overlay.remove();
        showToast('Dokumen ditolak', 'success');

        await delay(300);
        loadApprovals();

      } catch (e) {
        btnReset(confirmBtn);
        showToast(e.message || 'Gagal reject', 'error');
      }
    }
  });
}
