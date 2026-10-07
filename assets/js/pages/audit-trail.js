import { apiGet } from '../api.js';
import { formatDateTime, escapeHtml, skeletonRows, debounce } from '../utils.js';
import { showToast } from '../components/toast.js';

let state = { page: 1, limit: 50, filters: {}, allData: [] };

const AKSI_COLORS = {
  LOGIN:    'bg-slate-100 text-slate-700',
  LOGOUT:   'bg-slate-100 text-slate-700',
  CREATE:   'bg-green-100 text-green-700',
  UPDATE:   'bg-blue-100 text-blue-700',
  DELETE:   'bg-red-100 text-red-700',
  APPROVE:  'bg-green-100 text-green-700',
  REJECT:   'bg-red-100 text-red-700',
  SUBMIT:   'bg-yellow-100 text-yellow-700',
  VIEW:     'bg-slate-100 text-slate-600',
  DOWNLOAD: 'bg-purple-100 text-purple-700'
};

export async function initAuditTrail(user) {
  await loadLogs();

  // Filter events
  document.getElementById('fEmail').oninput = debounce((e) => {
    state.filters.user_email = e.target.value.trim();
    state.page = 1;
    loadLogs();
  }, 500);

  document.getElementById('fAksi').onchange = (e) => {
    state.filters.aksi = e.target.value;
    state.page = 1;
    loadLogs();
  };

  document.getElementById('fDari').onchange = (e) => {
    state.filters.tgl_dari = e.target.value;
    state.page = 1;
    loadLogs();
  };

  document.getElementById('fSampai').onchange = (e) => {
    state.filters.tgl_sampai = e.target.value;
    state.page = 1;
    loadLogs();
  };

  document.getElementById('btnReset').onclick = () => {
    state.filters = {};
    state.page = 1;
    document.getElementById('fEmail').value = '';
    document.getElementById('fAksi').value = '';
    document.getElementById('fDari').value = '';
    document.getElementById('fSampai').value = '';
    loadLogs();
  };

  document.getElementById('btnExport').onclick = exportCSV;
}

async function loadLogs() {
  const tbody = document.getElementById('auditBody');
  tbody.innerHTML = skeletonRows(5);

  try {
    const result = await apiGet('getAuditTrail', {
      ...state.filters,
      page: state.page,
      limit: state.limit
    });
    state.allData = result.data;
    renderTable(result.data);
    renderPagination(result.pagination);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-red-600">Error: ${escapeHtml(e.message)}</td></tr>`;
  }
}

function renderTable(logs) {
  const tbody = document.getElementById('auditBody');

  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">📭 Belum ada log.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(l => `
    <tr class="border-b border-slate-100 hover:bg-slate-50">
      <td class="p-3 text-xs text-slate-600 whitespace-nowrap">${formatDateTime(l.timestamp)}</td>
      <td class="p-3">
        <div class="text-sm text-slate-800">${escapeHtml(l.user_nama || '-')}</div>
        <div class="text-xs text-slate-500">${escapeHtml(l.user_email || '-')}</div>
      </td>
      <td class="p-3">
        <span class="text-xs px-2 py-1 rounded font-medium ${AKSI_COLORS[l.aksi] || 'bg-slate-100 text-slate-700'}">
          ${escapeHtml(l.aksi || '-')}
        </span>
      </td>
      <td class="p-3">
        <div class="text-xs font-mono text-slate-600">${escapeHtml(l.kode_dokumen || '-')}</div>
      </td>
      <td class="p-3 text-xs text-slate-600 max-w-xs truncate" title="${escapeHtml(l.detail)}">
        ${escapeHtml(l.detail || '-')}
      </td>
    </tr>
  `).join('');
}

function renderPagination({ page, limit, total, totalPages }) {
  const el = document.getElementById('pagination');
  if (totalPages <= 1) {
    el.innerHTML = `<div class="text-sm text-slate-500">${total} log</div>`;
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
  html += `<span class="ml-3 text-sm text-slate-500">${total} log</span>`;
  html += '</div>';

  el.innerHTML = html;

  el.querySelectorAll('[data-page]').forEach(btn => {
    btn.onclick = () => {
      const p = Number(btn.dataset.page);
      if (p >= 1 && p <= totalPages) {
        state.page = p;
        loadLogs();
      }
    };
  });
}

function exportCSV() {
  if (!state.allData.length) {
    showToast('Tidak ada data untuk diexport', 'warning');
    return;
  }

  const headers = ['timestamp', 'user_email', 'user_nama', 'aksi', 'kode_dokumen', 'detail'];
  const rows = state.allData.map(l => headers.map(h => `"${String(l[h] || '').replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('✅ Export berhasil', 'success');
}
