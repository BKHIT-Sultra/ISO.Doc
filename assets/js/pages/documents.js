import { apiGet, apiPost } from '../api.js';
import { formatDate, escapeHtml, skeletonRows, debounce } from '../utils.js';
import { STATUS_BADGE, CONFIG, JENIS } from '../config.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let state = {
  page: 1,
  limit: CONFIG.ITEMS_PER_PAGE,
  filters: { jenis: '', status: '', klausul: '', q: '' }
};

export async function initDocuments(user) {
  // Isi dropdown jenis
  const selJenis = document.getElementById('filterJenis');
  JENIS.forEach(j => selJenis.innerHTML += `<option value="${j}">${j}</option>`);

  // Load data pertama kali
  await loadDocuments();

  // Event listener filter
  selJenis.onchange = () => { state.filters.jenis = selJenis.value; state.page = 1; loadDocuments(); };
  document.getElementById('filterStatus').onchange = (e) => { state.filters.status = e.target.value; state.page = 1; loadDocuments(); };
  document.getElementById('filterKlausul').onchange = (e) => { state.filters.klausul = e.target.value; state.page = 1; loadDocuments(); };

  document.getElementById('searchBox').oninput = debounce((e) => {
    state.filters.q = e.target.value.trim();
    state.page = 1;
    loadDocuments();
  }, 400);

  // Tombol reset
  document.getElementById('btnReset').onclick = () => {
    state.filters = { jenis: '', status: '', klausul: '', q: '' };
    state.page = 1;
    selJenis.value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterKlausul').value = '';
    document.getElementById('searchBox').value = '';
    loadDocuments();
  };
}

async function loadDocuments() {
  const tbody = document.getElementById('docTableBody');
  tbody.innerHTML = skeletonRows(6);

  try {
    const result = await apiGet('getDocuments', {
      ...state.filters,
      page: state.page,
      limit: state.limit
    });
    renderTable(result.data);
    renderPagination(result.pagination);
    document.getElementById('totalDocs').textContent = result.pagination.total;
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-red-600">Error: ${e.message}</td></tr>`;
  }
}

function renderTable(docs) {
  const tbody = document.getElementById('docTableBody');

  if (!docs.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500">
      📭 Tidak ada dokumen yang cocok dengan filter.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = docs.map(d => `
    <tr class="border-b border-slate-100 hover:bg-slate-50">
      <td class="p-3 font-mono text-xs">${escapeHtml(d.kode_dokumen)}</td>
      <td class="p-3">
        <a href="document-detail.html?id=${d.doc_id}" class="font-medium text-slate-800 hover:text-blue-600">
          ${escapeHtml(d.judul)}
        </a>
        <div class="text-xs text-slate-500">${escapeHtml(d.pemilik_departemen || '')}</div>
      </td>
      <td class="p-3"><span class="text-xs bg-slate-100 px-2 py-1 rounded">${escapeHtml(d.jenis)}</span></td>
      <td class="p-3 text-xs text-slate-600">v${escapeHtml(d.versi_terkini)}</td>
      <td class="p-3">
        <span class="text-xs px-2 py-1 rounded font-semibold ${STATUS_BADGE[d.status]}">
          ${escapeHtml(d.status)}
        </span>
      </td>
      <td class="p-3 text-xs text-slate-500">${formatDate(d.tgl_terbit)}</td>
      <td class="p-3 text-right">
        <a href="document-detail.html?id=${d.doc_id}" 
           class="text-blue-600 hover:text-blue-800 text-sm mr-2" title="Detail">👁️</a>
        <a href="upload.html?id=${d.doc_id}" 
           class="text-slate-600 hover:text-slate-800 text-sm" title="Edit">✏️</a>
      </td>
    </tr>
  `).join('');
}

function renderPagination({ page, limit, total, totalPages }) {
  const el = document.getElementById('pagination');
  if (totalPages <= 1) {
    el.innerHTML = `<div class="text-sm text-slate-500">Menampilkan ${total} dokumen</div>`;
    return;
  }

  let html = '<div class="flex items-center gap-2">';
  html += `<button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} 
                   class="px-3 py-1 border rounded disabled:opacity-40">←</button>`;

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) {
    html += `<button data-page="${i}" 
                     class="px-3 py-1 border rounded ${i === page ? 'bg-blue-600 text-white' : ''}">${i}</button>`;
  }

  html += `<button data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} 
                   class="px-3 py-1 border rounded disabled:opacity-40">→</button>`;
  html += `<span class="ml-3 text-sm text-slate-500">${total} total</span>`;
  html += '</div>';

  el.innerHTML = html;

  el.querySelectorAll('[data-page]').forEach(btn => {
    btn.onclick = () => {
      const p = Number(btn.dataset.page);
      if (p >= 1 && p <= totalPages) {
        state.page = p;
        loadDocuments();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
  });
}
