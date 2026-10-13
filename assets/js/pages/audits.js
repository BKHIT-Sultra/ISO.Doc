/**
 * Hasil Audit — List Page Controller
 */
import { requireAuth } from '../auth.js';
import { renderNavbar, attachNavbarEvents } from '../components/navbar.js';
import { renderSidebar } from '../components/sidebar.js';
import { apiGet, apiPost } from '../api.js';
import { formatDate, escapeHtml, debounce } from '../utils.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { btnLoading, btnReset } from '../components/loader.js';

var state = { user: null, audits: [], filters: { q: '', jenis: '', status: '' } };

// ===== INIT =====
function initPage() {
  var user = requireAuth();
  if (!user) return;
  state.user = user;

  var navbarEl = document.getElementById('navbar');
  if (navbarEl) navbarEl.innerHTML = renderNavbar(user);

  var sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) sidebarEl.innerHTML = renderSidebar(user, 'audits');

  try { attachNavbarEvents(); } catch (e) { console.error(e); }

  setupFilters();
  setupAddButton();
  loadAudits();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}

// ===== FILTERS =====
function setupFilters() {
  var fSearch = document.getElementById('fSearch');
  var fJenis = document.getElementById('fJenis');
  var fStatus = document.getElementById('fStatus');

  if (fSearch) fSearch.addEventListener('input', debounce(function(e) {
    state.filters.q = e.target.value.trim(); loadAudits();
  }, 300));
  if (fJenis) fJenis.addEventListener('change', function(e) {
    state.filters.jenis = e.target.value; loadAudits();
  });
  if (fStatus) fStatus.addEventListener('change', function(e) {
    state.filters.status = e.target.value; loadAudits();
  });
}

// ===== LOAD =====
async function loadAudits() {
  var list = document.getElementById('auditList');
  if (!list) return;

  list.innerHTML = '<div class="card-premium !p-5 animate-pulse"><div class="h-4 bg-slate-200 rounded w-1/3 mb-3"></div><div class="h-3 bg-slate-200 rounded w-1/2"></div></div>';

  try {
    var data = await apiGet('getAudits', state.filters);
    state.audits = data || [];
    renderStats(state.audits);
    renderList(state.audits);
  } catch (e) {
    list.innerHTML = '<div class="card-premium p-12 text-center text-red-600">Gagal memuat: ' + escapeHtml(e.message) + '</div>';
  }
}

// ===== STATS =====
function renderStats(audits) {
  var c = document.getElementById('auditStats');
  if (!c) return;

  var total = audits.length;
  var inProgress = audits.filter(function(a) { return a.status === 'In Progress'; }).length;
  var totalTemuan = audits.reduce(function(s, a) { return s + (a.total_temuan || 0); }, 0);
  var totalOpen = audits.reduce(function(s, a) { return s + (a.temuan_open || 0); }, 0);

  var stats = [
    { label: 'Total Audit', value: total, color: 'blue',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'In Progress', value: inProgress, color: 'yellow',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Total Temuan', value: totalTemuan, color: 'purple',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { label: 'Temuan Open', value: totalOpen, color: 'red',
      icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  c.innerHTML = stats.map(function(s, i) {
    return '<div class="stat-card ' + s.color + ' fade-in-up fade-in-up-' + (i+1) + ' !p-4">' +
      '<div class="flex items-center gap-3">' +
        '<div class="stat-icon ' + s.color + ' !w-10 !h-10">' +
          '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="' + s.icon + '"/></svg>' +
        '</div>' +
        '<div class="min-w-0">' +
          '<div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">' + s.label + '</div>' +
          '<div class="text-2xl font-extrabold text-slate-800 leading-tight">' + s.value + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== LIST =====
function renderList(audits) {
  var list = document.getElementById('auditList');
  if (!list) return;

  if (!audits.length) {
    list.innerHTML = '<div class="card-premium p-16 text-center">' +
      '<div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">' +
        '<svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>' +
      '</div>' +
      '<div class="font-bold text-slate-700 text-lg mb-1">Belum ada audit</div>' +
      '<div class="text-sm text-slate-500">Klik "Tambah Audit" untuk mulai mendokumentasikan hasil audit</div>' +
    '</div>';
    return;
  }

  var STATUS_STYLE = {
    'Scheduled':   'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Completed':   'bg-green-100 text-green-700 border-green-200',
    'Closed':      'bg-slate-100 text-slate-600 border-slate-200'
  };

  list.innerHTML = audits.map(function(a) {
    var cls = STATUS_STYLE[a.status] || 'bg-slate-100 text-slate-600';
    var hasOpen = a.temuan_open > 0;

    return '<div class="card-premium !p-5 hover:shadow-md transition">' +
      '<div class="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">' +
        '<div class="flex items-start gap-3 flex-1 min-w-0">' +
          '<div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, #ede9fe, #ddd6fe);">' +
            '<svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>' +
          '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex flex-wrap items-center gap-2 mb-1">' +
              '<span class="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">' + escapeHtml(a.audit_id) + '</span>' +
              '<span class="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">' + escapeHtml(a.jenis || '-') + '</span>' +
              '<span class="text-xs px-2 py-0.5 rounded-md border font-semibold ' + cls + '">' + escapeHtml(a.status) + '</span>' +
            '</div>' +
            '<a href="audit-detail.html?id=' + a.audit_id + '" class="font-bold text-slate-800 hover:text-blue-600 transition truncate block">' + escapeHtml(a.judul) + '</a>' +
            '<div class="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">' +
              '<span>' + formatDate(a.tanggal_audit) + '</span>' +
              (a.auditor ? '<span>Auditor: ' + escapeHtml(a.auditor) + '</span>' : '') +
              (a.area_diaudit ? '<span>Area: ' + escapeHtml(a.area_diaudit) + '</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flex items-center gap-3 flex-shrink-0">' +
          '<div class="text-right">' +
            '<div class="text-xs text-slate-500">Temuan</div>' +
            '<div class="font-bold text-lg ' + (hasOpen ? 'text-red-600' : 'text-green-600') + '">' +
              (a.temuan_open || 0) + ' / ' + (a.total_temuan || 0) +
            '</div>' +
            '<div class="text-xs text-slate-400">open / total</div>' +
          '</div>' +
          '<a href="audit-detail.html?id=' + a.audit_id + '" class="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition">' +
            'Detail' +
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== ADD BUTTON =====
function setupAddButton() {
  var btn = document.getElementById('btnAddAudit');
  if (!btn) return;
  btn.addEventListener('click', function() { showAuditModal(null); });
}

// ===== MODAL CREATE/EDIT =====
function showAuditModal(existing) {
  var isEdit = !!existing;
  var a = existing || {};

  var content =
    '<div class="space-y-3">' +
      '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Judul Audit <span class="text-red-500">*</span></label>' +
        '<input id="ma-judul" value="' + escapeHtml(a.judul || '') + '" placeholder="Contoh: Audit Internal ISO 9001 2026" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"></div>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Jenis</label>' +
          '<select id="ma-jenis" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl">' +
            ['Internal','Eksternal','Surveillance'].map(function(j) {
              return '<option value="' + j + '"' + (a.jenis === j ? ' selected' : '') + '>' + j + '</option>';
            }).join('') +
          '</select></div>' +
        '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Tanggal <span class="text-red-500">*</span></label>' +
          '<input id="ma-tgl" type="date" value="' + (a.tanggal_audit ? new Date(a.tanggal_audit).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]) + '" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl"></div>' +
      '</div>' +
      '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Auditor</label>' +
        '<input id="ma-auditor" value="' + escapeHtml(a.auditor || '') + '" placeholder="Tim Audit / Nama Auditor" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl"></div>' +
      '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Area / Departemen yang Diaudit</label>' +
        '<input id="ma-area" value="' + escapeHtml(a.area_diaudit || '') + '" placeholder="Contoh: QC, Produksi" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl"></div>' +
      '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Keterangan</label>' +
        '<textarea id="ma-ket" rows="2" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl resize-none">' + escapeHtml(a.keterangan || '') + '</textarea></div>' +
    '</div>';

  showModal({
    title: isEdit ? 'Edit Audit' : 'Tambah Audit Baru',
    content: content,
    confirmText: isEdit ? 'Simpan' : 'Tambah',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');
      var payload = {
        judul: overlay.querySelector('#ma-judul').value.trim(),
        jenis: overlay.querySelector('#ma-jenis').value,
        tanggal_audit: overlay.querySelector('#ma-tgl').value,
        auditor: overlay.querySelector('#ma-auditor').value.trim(),
        area_diaudit: overlay.querySelector('#ma-area').value.trim(),
        keterangan: overlay.querySelector('#ma-ket').value.trim()
      };

      if (!payload.judul || !payload.tanggal_audit) {
        showToast('Judul dan tanggal wajib diisi', 'warning'); return;
      }

      btnLoading(confirmBtn, 'Menyimpan...');
      try {
        if (isEdit) {
          payload.audit_id = a.audit_id;
          await apiPost('updateAudit', payload);
        } else {
          await apiPost('createAudit', payload);
        }
        overlay.remove();
        showToast('Berhasil disimpan', 'success');
        setTimeout(loadAudits, 500);
      } catch (e) {
        btnReset(confirmBtn);
        showToast(e.message, 'error');
      }
    }
  });
}
