import { apiGet } from '../api.js';
import { formatDate, escapeHtml } from '../utils.js';

export async function initReviewReminder(user) {
  await loadReminders(30);

  document.getElementById('fHari').onchange = (e) => {
    loadReminders(Number(e.target.value));
  };
}

async function loadReminders(hari) {
  const container = document.getElementById('reminderContent');
  container.innerHTML = '<div class="text-center py-10"><div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div></div>';

  try {
    const data = await apiGet('getReviewReminder', { hari });
    renderReminders(data, hari);
  } catch (e) {
    container.innerHTML = `<div class="text-red-600 p-4">Error: ${escapeHtml(e.message)}</div>`;
  }
}

function renderReminders(items, hari) {
  const container = document.getElementById('reminderContent');

  if (!items.length) {
    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
        <div class="text-5xl mb-3">✨</div>
        <div class="font-medium text-slate-700">Semua dokumen aman!</div>
        <div class="text-sm text-slate-500 mt-1">Tidak ada dokumen yang jatuh tempo dalam ${hari} hari ke depan.</div>
      </div>
    `;
    return;
  }

  const late = items.filter(i => i.selisih_hari < 0);
  const soon = items.filter(i => i.selisih_hari >= 0);

  container.innerHTML = `
    ${late.length ? `
      <div class="mb-6">
        <h2 class="font-semibold text-red-700 mb-3 flex items-center gap-2">
          <span>⚠️ Sudah Jatuh Tempo</span>
          <span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">${late.length}</span>
        </h2>
        <div class="space-y-2">
          ${late.map(renderItem).join('')}
        </div>
      </div>
    ` : ''}
    
    ${soon.length ? `
      <div>
        <h2 class="font-semibold text-yellow-700 mb-3 flex items-center gap-2">
          <span>⏰ Akan Jatuh Tempo</span>
          <span class="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">${soon.length}</span>
        </h2>
        <div class="space-y-2">
          ${soon.map(renderItem).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function renderItem(r) {
  const isLate = r.selisih_hari < 0;
  const days = Math.abs(r.selisih_hari);

  return `
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 
                hover:shadow-md transition flex items-center gap-4">
      <div class="w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0
                  ${isLate ? 'bg-red-100' : 'bg-yellow-100'}">
        ${isLate ? '⚠️' : '⏰'}
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-mono text-xs text-slate-500">${escapeHtml(r.kode_dokumen)}</div>
        <a href="document-detail.html?id=${r.doc_id}" 
           class="font-medium text-slate-800 hover:text-blue-600 truncate block">
          ${escapeHtml(r.judul)}
        </a>
        <div class="text-xs text-slate-500 mt-0.5">
          ${escapeHtml(r.pemilik_departemen || '-')} · ${escapeHtml(r.pemilik_email || '-')}
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <div class="text-xs text-slate-500">${formatDate(r.tgl_review_berikutnya)}</div>
        <div class="text-sm font-semibold ${isLate ? 'text-red-600' : 'text-yellow-600'}">
          ${isLate ? `Terlambat ${days} hari` : `${days} hari lagi`}
        </div>
      </div>
    </div>
  `;
}
