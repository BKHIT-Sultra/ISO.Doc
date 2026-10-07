/**
 * Halaman Daftar Dokumen
 * ----------------------
 * Premium version dengan mini stats, tabel modern, dan skeleton loader
 */
import { apiGet } from '../api.js';
import { formatDate, escapeHtml, debounce } from '../utils.js';
import { STATUS_BADGE, CONFIG, JENIS, JENIS_BADGE, JENIS_ICON } from '../config.js';
import { skeletonTable } from '../components/loader.js';

// ============================================================
// STATE
// ============================================================
let state = {
  page: 1,
  limit: CONFIG.ITEMS_PER_PAGE,
  filters: {
    jenis: '',
    status: '',
    klausul: '',
    q: ''
  },
  allStats: null
};

// ============================================================
// INIT
// ============================================================
export async function initDocuments(user) {
  // Populate dropdown jenis
  const selJenis = document.getElementById('filterJenis');
  if (selJenis) {
    JENIS.forEach(function(j) {
      const opt = document.createElement('option');
      opt.value = j;
      opt.textContent = j;
      selJenis.appendChild(opt);
    });
  }

  // Load mini stats (sekali saja)
  loadMiniStats();

  // Load dokumen pertama kali
  await loadDocuments();

  // ===== Event listener filter =====
  selJenis && selJenis.addEventListener('change', function() {
    state.filters.jenis = selJenis.value;
    state.page = 1;
    loadDocuments();
  });

  const fStatus = document.getElementById('filterStatus');
  fStatus && fStatus.addEventListener('change', function(e) {
    state.filters.status = e.target.value;
    state.page = 1;
    loadDocuments();
  });

  const fKlausul = document.getElementById('filterKlausul');
  fKlausul && fKlausul.addEventListener('change', function(e) {
    state.filters.klausul = e.target.value;
    state.page = 1;
    loadDocuments();
  });

  const searchBox = document.getElementById('searchBox');
  if (searchBox) {
    searchBox.addEventListener('input', debounce(function(e) {
      state.filters.q = e.target.value.trim();
      state.page = 1;
      loadDocuments();
    }, 400));
  }

  // ===== Reset =====
  const btnReset = document.getElementById('btnReset');
  btnReset && btnReset.addEventListener('click', function() {
    state.filters = { jenis: '', status: '', klausul: '', q: '' };
    state.page = 1;

    if (selJenis) selJenis.value = '';
    if (fStatus) fStatus.value = '';
    if (fKlausul) fKlausul.value = '';
    if (searchBox) searchBox.value = '';

    loadDocuments();
  });
}

// ============================================================
// MINI STATS
// ============================================================
async function loadMiniStats() {
  try {
    const stats = await apiGet('getDocumentStats');
    state.allStats = stats;
    renderMiniStats(stats);
  } catch (e) {
    console.warn('[MiniStats]', e);
  }
}

function renderMiniStats(stats) {
  const container = document.getElementById('miniStats');
  if (!container) return;

  const items = [
    { 
      label: 'Total', 
      value: stats.total || 0, 
      color: 'blue',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    { 
      label: 'Approved', 
      value: (stats.by_status && stats.by_status.Approved) || 0, 
      color: 'green',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    { 
      label: 'Review', 
      value: (stats.by_status && stats.by_status.Review) || 0, 
      color: 'yellow',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    { 
      label: 'Draft', 
      value: (stats.by_status && stats.by_status.Draft) || 0, 
      color: 'purple',
      icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
    }
  ];

  container.innerHTML = items.map(function(c) {
    return '<div class="stat-card ' + c.color + ' !p-4">' +
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
// LOAD DOKUMEN
// ============================================================
async function loadDocuments() {
  const tbody = document.getElementById('docTableBody');
  if (!tbody) return;

  // Skeleton
  tbody.innerHTML = skeletonTable(7, 5);

  try {
    const result = await apiGet('getDocuments', {
      ...state.filters,
      page: state.page,
      limit: state.limit
    });

    renderTable(result.data);
    renderPagination(result.pagination);

    const totalEl = document.getElementById('totalDocs');
    if (totalEl) totalEl.textContent = result.pagination.total;

  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="p-12 text-center">' +
        '<div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-50 flex items-center justify-center">' +
          '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-semibold text-slate-700 mb-1">Gagal memuat dokumen</div>' +
        '<div class="text-sm text-slate-500 mb-4">' + escapeHtml(e.message) + '</div>' +
        '<button onclick="location.reload()" ' +
                'class="text-blue-600 hover:text-blue-700 font-semibold text-sm">' +
          'Muat Ulang' +
        '</button>' +
      '</td></tr>';
  }
}

/**
 * Tentukan apakah user boleh edit dokumen ini
 * Rule:
 *  - Admin: selalu bisa
 *  - Editor: hanya bisa saat status Draft atau Review
 *  - Role lain: tidak bisa
 */
function canEditDocument(doc) {
  var user = state.user; // pastikan state.user tersedia
  if (!user) return false;
  
  // Admin selalu bisa
  if (user.role === 'Admin') return true;
  
  // Editor: Draft atau Review saja
  if (user.role === 'Editor') {
    return doc.status === 'Draft' || doc.status === 'Review';
  }
  
  return false;
}

/**
 * Render tombol edit atau tombol terkunci
 */
function renderEditButton(d) {
  var allowed = canEditDocument(d);
  
  if (allowed) {
    return '<a href="upload.html?id=' + d.doc_id + '" ' +
             'class="w-8 h-8 rounded-lg flex items-center justify-center ' +
                    'text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition" ' +
             'title="Edit">' +
           '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
             '<path stroke-linecap="round" stroke-linejoin="round" ' +
                   'd="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>' +
           '</svg>' +
         '</a>';
  }
  
  // Tombol terkunci - disabled + tooltip
  var tooltip = d.status === 'Approved'
    ? 'Dokumen sudah disetujui (read-only). Hanya Admin yang dapat mengubah.'
    : 'Anda tidak punya akses untuk edit dokumen ini.';
  
  return '<span class="w-8 h-8 rounded-lg flex items-center justify-center ' +
               'text-slate-300 cursor-not-allowed" ' +
               'title="' + tooltip + '">' +
           '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
             '<path stroke-linecap="round" stroke-linejoin="round" ' +
                   'd="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>' +
           '</svg>' +
         '</span>';
}

// ============================================================
// RENDER TABEL
// ============================================================
function renderTable(docs) {
  const tbody = document.getElementById('docTableBody');
  if (!tbody) return;

  if (!docs || docs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="p-16 text-center">' +
        '<div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">' +
          '<svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" ' +
                  'd="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-bold text-slate-700 text-lg mb-1">Belum ada dokumen</div>' +
        '<div class="text-sm text-slate-500 mb-5">' +
          'Coba ubah filter atau tambah dokumen baru' +
        '</div>' +
        '<a href="upload.html" class="btn-gradient">' +
          '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>' +
          '</svg>' +
          'Tambah Dokumen Pertama' +
        '</a>' +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = docs.map(function(d) {
    const statusCls = STATUS_BADGE[d.status] || 'bg-slate-100 text-slate-700';
    const jenisCls = JENIS_BADGE[d.jenis] || 'bg-slate-100 text-slate-700';
    const jenisIcon = JENIS_ICON[d.jenis] || 'M9 12h6m-6 4h6';
    const isLate = d.tgl_review_berikutnya && new Date(d.tgl_review_berikutnya) < new Date();

    return '<tr>' +
      // Kode
      '<td>' +
        '<span class="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-md">' +
          escapeHtml(d.kode_dokumen || '-') +
        '</span>' +
      '</td>' +

      // Judul
      '<td class="min-w-[240px]">' +
        '<a href="document-detail.html?id=' + d.doc_id + '" ' +
           'class="font-semibold text-slate-800 hover:text-blue-600 transition">' +
          escapeHtml(d.judul || '-') +
        '</a>' +
        '<div class="text-xs text-slate-500 mt-0.5 flex items-center gap-1">' +
          '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" ' +
                  'd="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>' +
          '</svg>' +
          escapeHtml(d.pemilik_departemen || '-') +
        '</div>' +
      '</td>' +

      // Klausul ISO
      '<td>' +
        '<div class="flex flex-col gap-1">' +
          '<span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ' +
                'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 border border-blue-100 w-fit">' +
            '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>' +
            '</svg>' +
            escapeHtml(d.sub_klausul || d.klausul_utama || '-') +
          '</span>' +
          (d.jenis 
            ? '<span class="text-[10px] text-slate-400 font-medium">' + escapeHtml(d.jenis) + '</span>'
            : '') +
        '</div>' +
      '</td>' +

      // Versi
      '<td class="text-center">' +
        '<span class="inline-flex items-center gap-1 text-xs font-bold text-slate-700 ' +
                     'bg-gradient-to-br from-blue-50 to-indigo-50 ' +
                     'border border-blue-100 px-2 py-1 rounded-lg">' +
          'v' + escapeHtml(d.versi_terkini || '01') +
        '</span>' +
      '</td>' +

      // Status
      '<td>' +
        '<span class="badge ' + statusCls + '">' +
          '<span class="w-1.5 h-1.5 rounded-full bg-current"></span>' +
          escapeHtml(d.status) +
        '</span>' +
      '</td>' +

      // Terbit
      '<td class="whitespace-nowrap">' +
        '<div class="text-xs text-slate-600 font-medium">' + formatDate(d.tgl_terbit) + '</div>' +
        (d.tgl_review_berikutnya ?
          '<div class="text-xs mt-0.5 ' + (isLate ? 'text-red-500' : 'text-slate-400') + '">' +
            'Review: ' + formatDate(d.tgl_review_berikutnya) +
          '</div>' : '') +
      '</td>' +

      // Aksi
      '<td class="text-right whitespace-nowrap">' +
        '<div class="inline-flex items-center gap-1">' +
          
          // Tombol Lihat (selalu ada)
          '<a href="document-detail.html?id=' + d.doc_id + '" ' +
             'class="w-8 h-8 rounded-lg flex items-center justify-center ' +
                    'text-blue-600 hover:bg-blue-50 transition" ' +
             'title="Lihat detail">' +
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>' +
            '</svg>' +
          '</a>' +
          
          // Tombol Edit - HANYA jika BOLEH
          renderEditButton(d) +
          
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}

// ============================================================
// PAGINATION
// ============================================================
function renderPagination(p) {
  const el = document.getElementById('pagination');
  if (!el) return;

  const page = p.page;
  const total = p.total;
  const totalPages = p.totalPages;

  if (totalPages <= 1) {
    el.innerHTML =
      '<div class="text-sm text-slate-500">' +
        'Menampilkan <b class="text-slate-700">' + total + '</b> dokumen' +
      '</div>';
    return;
  }

  let html = '';

  // Prev
  html += navBtn(page - 1, page <= 1, 'prev');

  // Halaman 1 + ellipsis
  if (page > 3) {
    html += numBtn(1, page === 1);
    if (page > 4) html += '<span class="px-1.5 text-slate-400">...</span>';
  }

  // Range sekitar current
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) {
    html += numBtn(i, i === page);
  }

  // Ellipsis + terakhir
  if (page < totalPages - 2) {
    if (page < totalPages - 3) {
      html += '<span class="px-1.5 text-slate-400">...</span>';
    }
    html += numBtn(totalPages, page === totalPages);
  }

  // Next
  html += navBtn(page + 1, page >= totalPages, 'next');

  // Ringkasan
  html += '<span class="ml-3 text-xs text-slate-500 self-center">' +
            total + ' dokumen · Hal ' + page + '/' + totalPages +
          '</span>';

  el.innerHTML = html;

  // Attach events
  el.querySelectorAll('[data-page]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const p = Number(btn.dataset.page);
      if (p >= 1 && p <= totalPages && p !== page) {
        state.page = p;
        loadDocuments();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

function numBtn(num, active) {
  const cls = active
    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/30'
    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
  return '<button data-page="' + num + '" ' +
                'class="min-w-[36px] h-9 px-3 border rounded-lg text-sm font-semibold transition ' + cls + '">' +
           num +
         '</button>';
}

function navBtn(num, disabled, dir) {
  const icon = dir === 'prev'
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
