import { apiGet } from '../api.js';
import { formatDate } from '../utils.js';

export async function initDashboard() {
  try {
    const data = await apiGet('getDashboardData');
    renderSummary(data.summary);
    renderCharts(data);
    renderReminders(data.review_jatuh_tempo, data.review_akan_jatuh_tempo);
  } catch (e) {
    document.getElementById('dashboardContent').innerHTML =
      '<div class="text-red-600 p-4">Gagal memuat dashboard: ' + e.message + '</div>';
  }
}

function renderSummary(summary) {
  const cards = [
    { label: 'Total Dokumen',    value: summary.total_dokumen,    icon: '📘', color: 'blue' },
    { label: 'Total Versi',      value: summary.total_versi,      icon: '📚', color: 'purple' },
    { label: 'Pending Approval', value: summary.pending_approval, icon: '⏳', color: 'yellow' },
    { label: 'Jatuh Tempo Review', value: summary.jatuh_tempo_review, icon: '⚠️', color: 'red' }
  ];

  document.getElementById('summaryCards').innerHTML = cards.map(c => `
    <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-slate-500">${c.label}</div>
          <div class="text-3xl font-bold text-slate-800 mt-1">${c.value}</div>
        </div>
        <div class="text-3xl">${c.icon}</div>
      </div>
    </div>
  `).join('');
}

function renderCharts(data) {
  // Distribusi per jenis (bar chart horizontal sederhana)
  const maxJenis = Math.max(...Object.values(data.by_jenis), 1);
  document.getElementById('chartJenis').innerHTML = Object.entries(data.by_jenis).map(([k, v]) => `
    <div class="mb-2">
      <div class="flex justify-between text-sm mb-1">
        <span class="font-medium text-slate-700">${k}</span>
        <span class="text-slate-500">${v}</span>
      </div>
      <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div class="h-full bg-blue-500 rounded-full transition-all" 
             style="width: ${(v / maxJenis) * 100}%"></div>
      </div>
    </div>
  `).join('');

  // Status dokumen
  const statusColors = {
    'Draft': 'bg-blue-500',
    'Review': 'bg-yellow-500',
    'Approved': 'bg-green-500',
    'Obsolete': 'bg-red-500'
  };
  const totalStatus = Object.values(data.by_status).reduce((a, b) => a + b, 0) || 1;

  document.getElementById('chartStatus').innerHTML = Object.entries(data.by_status).map(([k, v]) => `
    <div class="flex items-center gap-3 mb-3">
      <div class="w-3 h-3 rounded-full ${statusColors[k]}"></div>
      <div class="flex-1 text-sm font-medium text-slate-700">${k}</div>
      <div class="text-sm font-bold text-slate-800">${v}</div>
      <div class="text-xs text-slate-400">${((v / totalStatus) * 100).toFixed(0)}%</div>
    </div>
  `).join('');
}

function renderReminders(jatuhTempo, akanJatuhTempo) {
  const all = [...jatuhTempo, ...akanJatuhTempo].slice(0, 10);
  const el = document.getElementById('reminders');

  if (!all.length) {
    el.innerHTML = '<div class="text-sm text-slate-500 p-3">✨ Tidak ada dokumen yang perlu direview dalam 30 hari ke depan.</div>';
    return;
  }

  el.innerHTML = all.map(r => {
    const isLate = r.selisih_hari < 0;
    return `
      <div class="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-slate-50">
        <div>
          <div class="font-mono text-xs text-slate-500">${r.kode_dokumen}</div>
          <a href="document-detail.html?id=${r.doc_id}" class="font-medium text-slate-800 hover:text-blue-600">${r.judul}</a>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500">${formatDate(r.tgl_review_berikutnya)}</div>
          <div class="text-xs font-semibold ${isLate ? 'text-red-600' : 'text-yellow-600'}">
            ${isLate ? `Terlambat ${Math.abs(r.selisih_hari)} hari` : `${r.selisih_hari} hari lagi`}
          </div>
        </div>
      </div>
    `;
  }).join('');
}
