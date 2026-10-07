/**
 * Halaman Daftar Dokumen
 * -----------------------
 * Fitur: filter, search, pagination, skeleton loader
 */
import { apiGet } from '../api.js';
import { formatDate, escapeHtml, debounce } from '../utils.js';
import { STATUS_BADGE, CONFIG, JENIS } from '../config.js';
import { skeletonTable } from '../components/loader.js';
import { showToast } from '../components/toast.js';

// ===== State global halaman =====
let state = {
  page: 1,
  limit: CONFIG.ITEMS_PER_PAGE,
  filters: {
    jenis: '',
    status: '',
    klausul: '',
    q: ''
  }
};

/**
 * ==================== INIT ====================
 */
export async function initDocuments(user) {
  // Isi dropdown jenis
  const selJenis = document.getElementById('filterJenis');
  if (selJenis) {
    JENIS.forEach(j => {
      const opt = document.createElement('option');
      opt.value = j;
      opt.textContent = j;
      selJenis.appendChild(opt);
    });
  }

  // Load data pertama kali
  await loadDocuments();

  // ===== Event listener filter =====
  selJenis?.addEventListener('change', () => {
    state.filters.jenis = selJenis.value;
    state.page = 1;
    loadDocuments();
  });

  document.getElementById('filterStatus')?.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    state.page = 1;
    loadDocuments();
  });

  document.getElementById('filterKlausul')?.addEventListener('change', (e) => {
    state.filters.klausul = e.target.value;
    state.page = 1;
    loadDocuments();
  });

  const searchBox = document.getElementById('searchBox');
  if (searchBox) {
    searchBox.addEventListener('input', debounce((e) => {
      state.filters.q = e.target.value.trim();
      state.page = 1;
      loadDocuments();
    }, 400));
  }

  // ===== Tombol reset =====
  document.getElementById('btnReset')?.addEventListener('click', () => {
    state.filters = { jenis: '', status: '', klausul: '', q: '' };
    state.page = 1;

    if (selJenis) selJenis.value = '';
    const fStatus = document.getElementById('filterStatus');
    if (fStatus) fStatus.value = '';
    const fKlausul = document.getElementById('filterKlausul');
    if (fKlausul) fKlausul.value = '';
    if (searchBox) searchBox.value = '';

    loadDocuments();
  });
}

/**
 * ==================== LOAD DATA ====================
 */
async function loadDocuments() {
  const tbody = document.getElementById('docTableBody');
  if (!tbody) return;

  // Tampilkan skeleton (kolom ada 7: kode, judul, jenis, versi, status, terbit, aksi)
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
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center">
          <div class="text-red-600 mb-2">❌ Gagal memuat dokumen</div>
          <div class="text-sm text-slate-500 mb-3">${escapeHtml(e.message)}</div>
          <button onclick="location.reload()" 
                  class="text-blue-600 hover:underline text-sm">
            🔄 Muat Ulang
          </button>
        </td>
      </tr>
    `;
  }
}

/**
 * ==================== RENDER TABEL ====================
 */
function renderTable(docs) {
  const tbody = document.getElementById('docTableBody');
  if (!tbody) return;

  // Empty state
  if (!docs || docs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-12 text-center">
          <div class="text-5xl mb-3">📭</div>
          <div class="font-medium text-slate-700">Tidak ada dokumen</div>
          <div class="text-sm text-slate-500 mt-1">
            Coba ubah filter atau tambah dokumen baru
          </div>
          <a href="upload.html" 
             class="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            + Tambah Dokumen
          </a>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = docs.map(d => {
    const statusClass = STATUS_BADGE[d.status] || 'bg-slate-100 text-slate-700';

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
        <td class="p-3 font-mono text-xs text-slate-600">
          ${escapeHtml(d.kode_dokumen || '-')}
        </td>
        <td class="p-3">
          <a href="document-detail.html?id=${d.doc_id}" 
             class="font-medium text-slate-800 hover:text-blue-600 transition">
            ${escapeHtml(d.judul)}
          </a>
          <div class="text-xs text-slate-500 mt-0.5">
            ${escapeHtml(d.pemilik_departemen || '')}
          </div>
        </td>
        <td class="p-3">
          <span class="text-xs bg-slate-100 px-2 py-1 rounded">
            ${escapeHtml(d.jenis)}
          </span>
        </td>
        <td class="p-3 text-xs text-slate-600">
          v${escapeHtml(d.versi_terkini || '01')}
        </td>
        <td class="p-3">
          <span class="text-xs px-2 py-1 rounded font-semibold ${statusClass}">
            ${escapeHtml(d.status)}
          </span>
        </td>
        <td class="p-3 text-xs text-slate-500 whitespace-nowrap">
          ${formatDate(d.tgl_terbit)}
        </td>
        <td class="p-3 text-right whitespace-nowrap">
          <a href="document-detail.html?id=${d.doc_id}" 
             class="text-blue-600 hover:text-blue-800 text-lg mr-1" 
             title="Detail">👁️</a>
          <a href="upload.html?id=${d.doc_id}" 
             class="text-slate-500 hover:text-slate-700 text-lg" 
             title="Edit">✏️</a>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * ==================== RENDER PAGINATION ====================
 */
function renderPagination({ page, limit, total, totalPages }) {
  const el = document.getElementById('pagination');
  if (!el) return;

  // Kalau cuma 1 halaman, tampilkan ringkasan saja
  if (totalPages <= 1) {
    el.innerHTML = `
      <div class="text-sm text-slate-500">
        Menampilkan <b>${total}</b> dokumen
      </div>
    `;
    return;
  }

  let html = '<div class="flex items-center gap-2 flex-wrap justify-center">';

  // Tombol prev
  html += `
    <button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} 
            class="px-3 py-1.5 border border-slate-200 rounded-lg text-sm 
                   hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed 
                   transition">
      ←
    </button>
  `;

  // Halaman 1
  if (page > 3) {
    html += pageBtn(1, page);
    if (page > 4) {
      html += `<span class="px-2 text-slate-400">...</span>`;
    }
  }

  // Halaman sekitar current
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) {
    html += pageBtn(i, page);
  }

  // Halaman terakhir
  if (page < totalPages - 2) {
    if (page < totalPages - 3) {
      html += `<span class="px-2 text-slate-400">...</span>`;
    }
    html += pageBtn(totalPages, page);
  }

  // Tombol next
  html += `
    <button data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} 
            class="px-3 py-1.5 border border-slate-200 rounded-lg text-sm 
                   hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed 
                   transition">
      →
    </button>
  `;

  html += `
    <span class="ml-3 text-sm text-slate-500">
      ${total} dokumen · Hal ${page}/${totalPages}
    </span>
  `;

  html += '</div>';

  el.innerHTML = html;

  // Attach event listener
  el.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = Number(btn.dataset.page);
      if (p >= 1 && p <= totalPages && p !== page) {
        state.page = p;
        loadDocuments();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

function pageBtn(num, current) {
  const isActive = num === current;
  const cls = isActive
    ? 'bg-blue-600 text-white border-blue-600'
    : 'border-slate-200 hover:bg-slate-50 text-slate-700';
  return `
    <button data-page="${num}" 
            class="px-3 py-1.5 border rounded-lg text-sm transition ${cls}">
      ${num}
    </button>
  `;
}
