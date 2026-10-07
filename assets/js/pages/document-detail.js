/**
 * Halaman Detail Dokumen
 * ----------------------
 * Premium version - konsisten dengan design system.
 * ASCII-safe: tanpa emoji, string concat, no template literal.
 */
import { apiGet, apiPost } from '../api.js';
import { formatDate, formatDateTime, escapeHtml, getQuery, fileToBase64 } from '../utils.js';
import { STATUS_BADGE, JENIS_BADGE, JENIS_ICON } from '../config.js';
import { showToast } from '../components/toast.js';
import { showModal, confirmDialog } from '../components/modal.js';
import { btnLoading, btnReset } from '../components/loader.js';

// ============================================================
// STATE
// ============================================================
var state = {
  doc: null,
  versions: [],
  approvals: [],
  user: null
};

// ============================================================
// INIT
// ============================================================
export async function initDocumentDetail(user) {
  state.user = user;
  var docId = getQuery('id');

  if (!docId) {
    renderError('ID dokumen tidak ditemukan di URL.');
    return;
  }

  renderSkeleton();

  try {
    var data = await apiGet('getDocumentById', { doc_id: docId });
    state.doc = data.document;
    state.versions = data.versions || [];
    state.approvals = data.approvals || [];

    renderTitle();
    renderContent();
    attachActions();
  } catch (e) {
    console.error('[DocumentDetail]', e);
    renderError('Gagal memuat dokumen: ' + (e.message || 'Unknown error'));
  }
}

function renderError(msg) {
  var el = document.getElementById('detailContent');
  if (!el) return;
  el.innerHTML =
    '<div class="card-premium p-12 text-center">' +
      '<div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">' +
        '<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
        '</svg>' +
      '</div>' +
      '<div class="font-bold text-slate-700 text-lg mb-1">Terjadi Kesalahan</div>' +
      '<div class="text-sm text-slate-500 mb-5">' + escapeHtml(msg) + '</div>' +
      '<a href="documents.html" class="btn-gradient inline-flex">' +
        'Kembali ke Daftar Dokumen' +
      '</a>' +
    '</div>';
}

function renderSkeleton() {
  var el = document.getElementById('detailContent');
  if (!el) return;
  el.innerHTML =
    '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">' +
      '<div class="lg:col-span-2 space-y-6">' +
        '<div class="card-premium animate-pulse">' +
          '<div class="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>' +
          '<div class="grid grid-cols-2 gap-4">' +
            '<div class="h-12 bg-slate-100 rounded"></div>' +
            '<div class="h-12 bg-slate-100 rounded"></div>' +
            '<div class="h-12 bg-slate-100 rounded"></div>' +
            '<div class="h-12 bg-slate-100 rounded"></div>' +
          '</div>' +
        '</div>' +
        '<div class="card-premium animate-pulse">' +
          '<div class="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>' +
          '<div class="space-y-3">' +
            '<div class="h-16 bg-slate-100 rounded"></div>' +
            '<div class="h-16 bg-slate-100 rounded"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="space-y-4">' +
        '<div class="card-premium animate-pulse"><div class="h-32 bg-slate-100 rounded"></div></div>' +
        '<div class="card-premium animate-pulse"><div class="h-24 bg-slate-100 rounded"></div></div>' +
      '</div>' +
    '</div>';
}

// ============================================================
// TITLE
// ============================================================
function renderTitle() {
  var d = state.doc;
  var el = document.getElementById('titleArea');
  if (!el) return;

  var statusCls = STATUS_BADGE[d.status] || 'bg-slate-100 text-slate-700';
  var jenisCls = JENIS_BADGE[d.jenis] || 'bg-slate-100 text-slate-700';
  var jenisIcon = JENIS_ICON[d.jenis] || 'M9 12h6m-6 4h6';

  var html = '';
  html += '<div class="flex flex-wrap items-start gap-4 fade-in-up">';
  html += '  <div class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" ';
  html += '       style="background: linear-gradient(135deg, #2563eb, #6366f1);">';
  html += '    <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '      <path stroke-linecap="round" stroke-linejoin="round" d="' + jenisIcon + '"/>';
  html += '    </svg>';
  html += '  </div>';
  html += '  <div class="flex-1 min-w-0">';
  html += '    <div class="font-mono text-xs text-slate-500 mb-1">' + escapeHtml(d.kode_dokumen || '-') + '</div>';
  html += '    <h1 class="text-2xl lg:text-3xl font-extrabold text-slate-800 leading-tight mb-3">';
  html +=        escapeHtml(d.judul || '-');
  html += '    </h1>';
  html += '    <div class="flex flex-wrap items-center gap-2">';
  html += '      <span class="badge ' + jenisCls + '">';
  html += '        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '          <path stroke-linecap="round" stroke-linejoin="round" d="' + jenisIcon + '"/>';
  html += '        </svg>';
  html +=          escapeHtml(d.jenis);
  html += '      </span>';
  
  if (d.sub_jenis) {
    html += '      <span class="badge bg-slate-100 text-slate-700">' + escapeHtml(d.sub_jenis) + '</span>';
  }
  
  html += '      <span class="badge ' + statusCls + '">';
  html += '        <span class="w-1.5 h-1.5 rounded-full bg-current"></span>';
  html +=          escapeHtml(d.status);
  html += '      </span>';
  html += '      <span class="inline-flex items-center gap-1 text-xs font-bold text-slate-700 ';
  html += '                   bg-gradient-to-br from-blue-50 to-indigo-50 ';
  html += '                   border border-blue-100 px-2.5 py-1 rounded-lg">';
  html += '        v' + escapeHtml(d.versi_terkini || '01');
  html += '      </span>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  el.innerHTML = html;
}

// ============================================================
// MAIN CONTENT
// ============================================================
function renderContent() {
  var d = state.doc;
  var el = document.getElementById('detailContent');
  if (!el) return;

  var standarArr = String(d.standar || '').split(',').filter(Boolean);

  var html = '';
  html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">';

  // ===== LEFT COLUMN =====
  html += '  <div class="lg:col-span-2 space-y-6">';

  // Metadata Card
  html += '    <div class="card-premium fade-in-up fade-in-up-1">';
  html += '      <div class="flex items-center gap-3 mb-5">';
  html += '        <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">';
  html += '          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>';
  html += '          </svg>';
  html += '        </div>';
  html += '        <div>';
  html += '          <h2 class="font-bold text-slate-800">Metadata Dokumen</h2>';
  html += '          <p class="text-xs text-slate-500 mt-0.5">Informasi lengkap dokumen</p>';
  html += '        </div>';
  html += '      </div>';

  html += '      <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">';
  html += infoRow('Klausul ISO', 
    (d.klausul_utama || '-') + (d.sub_klausul ? ' (' + d.sub_klausul + ')' : ''));
  html += infoRowHtml('Standar', renderStandarBadges(standarArr));
  html += infoRow('Departemen', d.pemilik_departemen || '-');
  html += infoRow('Pemilik', d.pemilik_email || '-');
  html += infoRow('Penyusun', d.penyusun || '-');
  html += infoRow('Pemeriksa', d.pemeriksa || '-');
  html += infoRow('Penyetuju', d.penyetuju || '-');
  html += infoRow('Frekuensi Review', (d.frekuensi_review_bulan || '-') + ' bulan');
  html += infoRow('Tanggal Terbit', formatDate(d.tgl_terbit));
  html += infoRow('Review Terakhir', formatDate(d.tgl_review_terakhir));
  html += infoRow('Review Berikutnya', formatDate(d.tgl_review_berikutnya));
  html += infoRow('Kata Kunci', d.kata_kunci || '-');
  html += '      </dl>';

  if (d.keterangan) {
    html += '      <div class="mt-5 pt-5 border-t border-slate-100">';
    html += '        <div class="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Keterangan</div>';
    html += '        <div class="text-sm text-slate-700 leading-relaxed">' + escapeHtml(d.keterangan) + '</div>';
    html += '      </div>';
  }
  html += '    </div>';

  // Riwayat Versi
  html += '    <div class="card-premium !p-0 overflow-hidden fade-in-up fade-in-up-2">';
  html += '      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">';
  html += '        <div class="flex items-center gap-3">';
  html += '          <div class="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">';
  html += '            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>';
  html += '            </svg>';
  html += '          </div>';
  html += '          <div>';
  html += '            <h2 class="font-bold text-slate-800">Riwayat Versi</h2>';
  html += '            <p class="text-xs text-slate-500 mt-0.5">' + state.versions.length + ' versi terdaftar</p>';
  html += '          </div>';
  html += '        </div>';
  html += '        <button id="btnUploadVersion" ';
  html += '                class="inline-flex items-center gap-1.5 text-xs font-semibold ';
  html += '                       text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 ';
  html += '                       px-3 py-2 rounded-lg transition">';
  html += '          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">';
  html += '            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>';
  html += '          </svg>';
  html += '          Upload Versi';
  html += '        </button>';
  html += '      </div>';
  html += '      <div class="p-6">';
  html +=          renderVersionsTimeline();
  html += '      </div>';
  html += '    </div>';

  // Riwayat Approval
  if (state.approvals.length) {
    html += '    <div class="card-premium fade-in-up fade-in-up-3">';
    html += '      <div class="flex items-center gap-3 mb-5">';
    html += '        <div class="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">';
    html += '          <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
    html += '            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>';
    html += '          </svg>';
    html += '        </div>';
    html += '        <div>';
    html += '          <h2 class="font-bold text-slate-800">Riwayat Approval</h2>';
    html += '          <p class="text-xs text-slate-500 mt-0.5">Alur persetujuan dokumen</p>';
    html += '        </div>';
    html += '      </div>';
    html += '      <div class="space-y-3">';
    html +=          state.approvals.map(renderApprovalItem).join('');
    html += '      </div>';
    html += '    </div>';
  }

  html += '  </div>';

  // ===== RIGHT COLUMN =====
  html += '  <div class="space-y-4">';

  // File Card
  html += '    <div class="card-premium fade-in-up fade-in-up-1">';
  html += '      <div class="flex items-center gap-3 mb-4">';
  html += '        <div class="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">';
  html += '          <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '            <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>';
  html += '          </svg>';
  html += '        </div>';
  html += '        <h3 class="font-bold text-slate-800">File Dokumen</h3>';
  html += '      </div>';

  if (d.drive_file_url) {
    html += '      <a href="' + d.drive_file_url + '" target="_blank" ';
    html += '         class="block rounded-xl p-5 text-center transition ';
    html += '                bg-gradient-to-br from-blue-50 to-indigo-50 ';
    html += '                border border-blue-100 hover:border-blue-300 ';
    html += '                hover:shadow-lg hover:shadow-blue-500/10">';
    html += '        <div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white shadow-sm ';
    html += '                    flex items-center justify-center">';
    html += '          <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
    html += '            <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>';
    html += '          </svg>';
    html += '        </div>';
    html += '        <div class="font-semibold text-slate-800 text-sm">Buka di Google Drive</div>';
    html += '        <div class="text-xs text-slate-500 mt-1">Preview atau download file</div>';
    html += '      </a>';
  } else {
    html += '      <div class="rounded-xl p-8 text-center bg-slate-50 border border-dashed border-slate-200">';
    html += '        <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 ';
    html += '                    flex items-center justify-center">';
    html += '          <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
    html += '            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>';
    html += '          </svg>';
    html += '        </div>';
    html += '        <div class="text-sm text-slate-500">File belum diupload</div>';
    html += '      </div>';
  }
  html += '    </div>';

  // Action Card
  html += '    <div class="card-premium fade-in-up fade-in-up-2">';
  html += '      <div class="flex items-center gap-3 mb-4">';
  html += '        <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">';
  html += '          <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
  html += '            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>';
  html += '          </svg>';
  html += '        </div>';
  html += '        <h3 class="font-bold text-slate-800">Aksi</h3>';
  html += '      </div>';
  html += '      <div class="space-y-2" id="actionButtons">';
  html +=          renderActions();
  html += '      </div>';
  html += '    </div>';

  // Info Card
  html += '    <div class="rounded-2xl p-5 text-xs space-y-2 fade-in-up fade-in-up-3" ';
  html += '         style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0;">';
  html += '      <div class="flex justify-between gap-3"><span class="text-slate-500">ID Dokumen</span>';
  html += '        <span class="font-mono text-slate-700 text-right break-all">' + escapeHtml(d.doc_id) + '</span></div>';
  html += '      <div class="flex justify-between gap-3"><span class="text-slate-500">Dibuat</span>';
  html += '        <span class="text-slate-700 text-right">' + formatDateTime(d.created_at) + '</span></div>';
  html += '      <div class="flex justify-between gap-3"><span class="text-slate-500">Diubah</span>';
  html += '        <span class="text-slate-700 text-right">' + formatDateTime(d.updated_at) + '</span></div>';
  html += '    </div>';

  html += '  </div>';
  html += '</div>';

  el.innerHTML = html;
}

// ============================================================
// HELPERS
// ============================================================
function infoRow(label, value) {
  return '<div>' +
    '<dt class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">' + 
      escapeHtml(label) + 
    '</dt>' +
    '<dd class="text-sm font-medium text-slate-800">' + escapeHtml(value || '-') + '</dd>' +
  '</div>';
}

function infoRowHtml(label, valueHtml) {
  return '<div>' +
    '<dt class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">' + 
      escapeHtml(label) + 
    '</dt>' +
    '<dd class="text-sm font-medium text-slate-800">' + valueHtml + '</dd>' +
  '</div>';
}

function renderStandarBadges(arr) {
  if (!arr.length) return '-';
  return arr.map(function(s) {
    return '<span class="inline-block text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md mr-1 mb-1">' +
      escapeHtml(s.trim()) + 
    '</span>';
  }).join('');
}

// ============================================================
// VERSIONS TIMELINE
// ============================================================
function renderVersionsTimeline() {
  if (!state.versions.length) {
    return '<div class="text-sm text-slate-500 text-center py-6">' +
      'Belum ada riwayat versi.' +
    '</div>';
  }

  var html = '<div class="relative">';
  // Vertical line
  html += '<div class="absolute left-4 top-3 bottom-3 w-0.5 bg-slate-200"></div>';
  html += '<div class="space-y-4">';

  html += state.versions.map(function(v, i) {
    var isActive = i === 0;
    var circleCls = isActive
      ? 'text-white shadow-lg shadow-green-500/30" style="background: linear-gradient(135deg, #10b981, #34d399);'
      : 'bg-slate-200 text-slate-600';
    var statusCls = v.status_versi === 'Aktif'
      ? 'bg-green-100 text-green-700'
      : 'bg-slate-100 text-slate-600';

    var inner = '';
    inner += '<div class="flex gap-4 relative">';
    inner += '  <div class="w-8 h-8 rounded-full flex items-center justify-center ';
    inner +=       'flex-shrink-0 z-10 text-xs font-bold ' + circleCls + '">';
    inner += '    ' + escapeHtml(v.versi);
    inner += '  </div>';
    inner += '  <div class="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100">';
    inner += '    <div class="flex justify-between items-start gap-3 flex-wrap">';
    inner += '      <div class="min-w-0 flex-1">';
    inner += '        <div class="font-semibold text-sm text-slate-800">' + 
                    escapeHtml(v.deskripsi_perubahan || 'Tanpa deskripsi') + 
                  '</div>';
    inner += '        <div class="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 flex-wrap">';
    inner += '          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
    inner += '            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>';
    inner += '          </svg>';
    inner +=            escapeHtml(v.diubah_oleh || '-');
    inner += '          <span class="text-slate-300">&middot;</span>';
    inner += '          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
    inner += '            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>';
    inner += '          </svg>';
    inner +=            formatDateTime(v.tgl_perubahan);
    inner += '        </div>';
    inner += '        <div class="text-xs text-slate-500 mt-1">';
    inner += '          Jenis: <span class="font-medium">' + 
                    escapeHtml(v.jenis_perubahan || '-') + 
                  '</span>';
    inner += '        </div>';
    inner += '      </div>';
    inner += '      <div class="flex items-center gap-2 flex-shrink-0">';
    inner += '        <span class="text-xs font-semibold px-2 py-0.5 rounded-md ' + statusCls + '">' +
                    escapeHtml(v.status_versi || '-') +
                  '</span>';
    if (v.drive_file_url) {
      inner += '      <a href="' + v.drive_file_url + '" target="_blank" ';
      inner += '         class="w-7 h-7 rounded-lg flex items-center justify-center ';
      inner += '                text-blue-600 hover:bg-blue-50 transition" ';
      inner += '         title="Lihat file">';
      inner += '        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
      inner += '          <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>';
      inner += '        </svg>';
      inner += '      </a>';
    }
    inner += '      </div>';
    inner += '    </div>';
    inner += '  </div>';
    inner += '</div>';
    return inner;
  }).join('');

  html += '</div></div>';
  return html;
}

// ============================================================
// APPROVAL ITEMS
// ============================================================
function renderApprovalItem(a) {
  var status = a.status_review || a.status_approval || 'Pending';
  var borderColor = '#f59e0b';
  var bgColor = 'bg-amber-50';
  var textColor = 'text-amber-700';

  if (status === 'Disetujui') {
    borderColor = '#10b981';
    bgColor = 'bg-green-50';
    textColor = 'text-green-700';
  } else if (status === 'Ditolak') {
    borderColor = '#ef4444';
    bgColor = 'bg-red-50';
    textColor = 'text-red-700';
  }

  var html = '';
  html += '<div class="rounded-xl p-4 border border-slate-100" ';
  html += '     style="border-left: 4px solid ' + borderColor + ';">';
  html += '  <div class="flex items-center justify-between gap-3 mb-2 flex-wrap">';
  html += '    <div class="font-semibold text-sm text-slate-800">';
  html += '      Versi ' + escapeHtml(a.versi || '-');
  html += '    </div>';
  html += '    <span class="text-xs font-semibold px-2 py-0.5 rounded-md ' + 
              bgColor + ' ' + textColor + '">' +
              escapeHtml(status) +
            '</span>';
  html += '  </div>';
  html += '  <div class="text-xs text-slate-500 space-y-1">';
  html += '    <div>Diajukan: ' + formatDateTime(a.tgl_pengajuan) + 
              ' oleh <b class="text-slate-700">' + escapeHtml(a.pengaju || '-') + '</b></div>';
  if (a.reviewer) {
    html += '    <div>Reviewer: <b class="text-slate-700">' + escapeHtml(a.reviewer) + '</b></div>';
  }
  if (a.approver) {
    html += '    <div>Approver: <b class="text-slate-700">' + escapeHtml(a.approver) + '</b></div>';
  }
  if (a.komentar_review) {
    html += '    <div class="mt-2 p-2 bg-slate-50 rounded-lg italic text-slate-600 border-l-2 border-slate-300">';
    html += '      "' + escapeHtml(a.komentar_review) + '"';
    html += '    </div>';
  }
  if (a.komentar_approval) {
    html += '    <div class="mt-2 p-2 bg-slate-50 rounded-lg italic text-slate-600 border-l-2 border-slate-300">';
    html += '      "' + escapeHtml(a.komentar_approval) + '"';
    html += '    </div>';
  }
  html += '  </div>';
  html += '</div>';
  return html;
}

// ============================================================
// ACTIONS
// ============================================================
function renderActions() {
  var d = state.doc;
  var u = state.user;
  var buttons = [];

  // Edit (Admin/Editor, status Draft atau Review)
  if (['Admin', 'Editor'].indexOf(u.role) !== -1 && 
      ['Draft', 'Review'].indexOf(d.status) !== -1) {
    buttons.push(actionLink(
      'upload.html?id=' + d.doc_id,
      'slate',
      'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      'Edit Dokumen'
    ));
  }

  // Ajukan Review
  if (['Admin', 'Editor'].indexOf(u.role) !== -1 && d.status === 'Draft') {
    buttons.push(actionBtn(
      'submit-review',
      'blue',
      'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
      'Ajukan untuk Review'
    ));
  }

  // Approve + Reject
  if (['Admin', 'Reviewer'].indexOf(u.role) !== -1 && d.status === 'Review') {
    buttons.push(actionBtn(
      'approve',
      'green',
      'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'Setujui Dokumen'
    ));
    buttons.push(actionBtn(
      'reject',
      'red-outline',
      'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      'Tolak'
    ));
  }

  // Obsolete
  if (u.role === 'Admin' && d.status === 'Approved') {
    buttons.push(actionBtn(
      'obsolete',
      'amber-outline',
      'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
      'Tandai Obsolete'
    ));
  }

  // Delete
  if (u.role === 'Admin') {
    buttons.push(actionBtn(
      'delete',
      'red',
      'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      'Hapus Permanen'
    ));
  }

  if (!buttons.length) {
    return '<div class="text-xs text-slate-500 text-center py-4">' +
      'Tidak ada aksi tersedia untuk Anda.' +
    '</div>';
  }
  return buttons.join('');
}

function actionBtn(action, color, iconPath, label) {
  var styles = {
    'blue': 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/30',
    'green': 'bg-gradient-to-br from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/30',
    'red': 'bg-gradient-to-br from-red-600 to-rose-600 text-white hover:shadow-lg hover:shadow-red-500/30',
    'red-outline': 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
    'amber-outline': 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
  };
  var cls = styles[color] || styles['blue'];

  return '<button data-action="' + action + '" ' +
    'class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ' +
    'text-sm font-semibold transition ' + cls + '">' +
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="' + iconPath + '"/>' +
    '</svg>' +
    '<span>' + label + '</span>' +
  '</button>';
}

function actionLink(href, color, iconPath, label) {
  var cls = 'bg-slate-100 text-slate-700 hover:bg-slate-200';
  return '<a href="' + href + '" ' +
    'class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ' +
    'text-sm font-semibold transition ' + cls + '">' +
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="' + iconPath + '"/>' +
    '</svg>' +
    '<span>' + label + '</span>' +
  '</a>';
}

function attachActions() {
  document.querySelectorAll('[data-action]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      handleAction(btn.dataset.action);
    });
  });

  var btnUV = document.getElementById('btnUploadVersion');
  if (btnUV) btnUV.addEventListener('click', showUploadVersionModal);
}

async function handleAction(action) {
  switch (action) {
    case 'submit-review': return submitReview();
    case 'approve':       return approveDoc();
    case 'reject':        return rejectDoc();
    case 'obsolete':      return obsoleteDoc();
    case 'delete':        return deleteDoc();
  }
}

// ============================================================
// SUBMIT REVIEW
// ============================================================
function submitReview() {
  showModal({
    title: 'Ajukan untuk Review',
    content:
      '<div class="space-y-3">' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Email Reviewer</label>' +
          '<input id="m-reviewer" type="email" placeholder="reviewer@company.com" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Catatan (opsional)</label>' +
          '<textarea id="m-catatan" rows="3" placeholder="Catatan untuk reviewer..." ' +
                    'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                           'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"></textarea>' +
        '</div>' +
      '</div>',
    confirmText: 'Ajukan',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');
      btnLoading(confirmBtn, 'Mengirim...');

      try {
        await apiPost('submitForReview', {
          doc_id: state.doc.doc_id,
          reviewer_email: overlay.querySelector('#m-reviewer').value.trim(),
          catatan: overlay.querySelector('#m-catatan').value.trim()
        });
        showToast('Dokumen diajukan untuk review', 'success');
        overlay.remove();
        setTimeout(function() { location.reload(); }, 800);
      } catch (e) {
        btnReset(confirmBtn);
        showToast(e.message, 'error');
      }
    }
  });
}

// ============================================================
// APPROVE
// ============================================================
function approveDoc() {
  showModal({
    title: 'Setujui Dokumen',
    content:
      '<div class="space-y-3">' +
        '<div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">' +
          'Dokumen akan disetujui dan berstatus <b>Approved</b>.' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Tanggal Berlaku</label>' +
          '<input id="m-tgl" type="date" value="' + new Date().toISOString().split('T')[0] + '" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Komentar (opsional)</label>' +
          '<textarea id="m-komentar" rows="3" ' +
                    'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                           'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"></textarea>' +
        '</div>' +
      '</div>',
    confirmText: 'Setujui',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');
      btnLoading(confirmBtn, 'Menyimpan...');

      try {
        var approval = state.approvals.find(function(a) {
          return a.status_review === 'Pending' || a.status_approval === 'Pending';
        });
        await apiPost('approveDocument', {
          doc_id: state.doc.doc_id,
          approval_id: (approval && approval.approval_id) || '',
          komentar: overlay.querySelector('#m-komentar').value.trim(),
          tgl_berlaku: overlay.querySelector('#m-tgl').value
        });
        showToast('Dokumen berhasil disetujui', 'success');
        overlay.remove();
        setTimeout(function() { location.reload(); }, 800);
      } catch (e) {
        btnReset(confirmBtn);
        showToast(e.message, 'error');
      }
    }
  });
}

// ============================================================
// REJECT
// ============================================================
function rejectDoc() {
  showModal({
    title: 'Tolak Dokumen',
    content:
      '<div class="space-y-3">' +
        '<div class="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">' +
          'Dokumen akan dikembalikan ke status <b>Draft</b>.' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
            'Alasan Penolakan <span class="text-red-500">*</span>' +
          '</label>' +
          '<textarea id="m-alasan" rows="4" required placeholder="Minimal 10 karakter..." ' +
                    'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                           'focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 resize-none"></textarea>' +
        '</div>' +
      '</div>',
    confirmText: 'Tolak',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');
      var alasan = overlay.querySelector('#m-alasan').value.trim();

      if (!alasan || alasan.length < 10) {
        showToast('Alasan minimal 10 karakter', 'warning');
        return;
      }

      btnLoading(confirmBtn, 'Mengirim...');

      try {
        var approval = state.approvals.find(function(a) {
          return a.status_review === 'Pending';
        });
        await apiPost('rejectDocument', {
          doc_id: state.doc.doc_id,
          approval_id: (approval && approval.approval_id) || '',
          alasan: alasan
        });
        showToast('Dokumen ditolak', 'success');
        overlay.remove();
        setTimeout(function() { location.reload(); }, 800);
      } catch (e) {
        btnReset(confirmBtn);
        showToast(e.message, 'error');
      }
    }
  });
}

// ============================================================
// OBSOLETE
// ============================================================
function obsoleteDoc() {
  confirmDialog(
    'Tandai dokumen "' + escapeHtml(state.doc.judul) + '" sebagai Obsolete? ' +
    'Dokumen tidak akan dipakai untuk operasional.',
    async function() {
      try {
        await apiPost('deleteDocument', {
          doc_id: state.doc.doc_id,
          hard_delete: false
        });
        showToast('Dokumen ditandai Obsolete', 'success');
        setTimeout(function() { location.reload(); }, 800);
      } catch (e) {
        showToast(e.message, 'error');
      }
    },
    { confirmText: 'Ya, Tandai', title: 'Konfirmasi' }
  );
}

// ============================================================
// DELETE
// ============================================================
function deleteDoc() {
  confirmDialog(
    '<b class="text-red-600">PERINGATAN!</b> Dokumen akan dihapus PERMANEN dari database. ' +
    'Tindakan ini tidak dapat dibatalkan.',
    async function() {
      try {
        await apiPost('deleteDocument', {
          doc_id: state.doc.doc_id,
          hard_delete: true
        });
        showToast('Dokumen dihapus permanen', 'success');
        setTimeout(function() { location.href = 'documents.html'; }, 800);
      } catch (e) {
        showToast(e.message, 'error');
      }
    },
    { confirmText: 'Hapus Permanen', title: 'Konfirmasi Hapus' }
  );
}

// ============================================================
// UPLOAD NEW VERSION
// ============================================================
function showUploadVersionModal() {
  showModal({
    title: 'Upload Versi Baru',
    content:
      '<div class="space-y-3">' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
            'Deskripsi Perubahan <span class="text-red-500">*</span>' +
          '</label>' +
          '<textarea id="mv-desc" rows="2" required ' +
                    'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                           'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"></textarea>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">Jenis Perubahan</label>' +
          '<select id="mv-jenis" ' +
                  'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                         'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">' +
            '<option value="Minor">Minor (perbaikan kecil)</option>' +
            '<option value="Major">Major (perubahan signifikan)</option>' +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label class="block text-sm font-semibold text-slate-700 mb-1">' +
            'File <span class="text-red-500">*</span>' +
          '</label>' +
          '<input id="mv-file" type="file" accept=".pdf,.docx,.xlsx" required ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500 text-sm ' +
                        'file:mr-3 file:py-1.5 file:px-3 file:rounded-lg ' +
                        'file:border-0 file:bg-blue-50 file:text-blue-700 ' +
                        'file:font-semibold file:text-xs hover:file:bg-blue-100">' +
        '</div>' +
      '</div>',
    confirmText: 'Upload',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');
      var desc = overlay.querySelector('#mv-desc').value.trim();
      var jenis = overlay.querySelector('#mv-jenis').value;
      var file = overlay.querySelector('#mv-file').files[0];

      if (!desc || !file) {
        showToast('Deskripsi & file wajib diisi', 'warning');
        return;
      }

      btnLoading(confirmBtn, 'Mengupload...');

      try {
        var base64 = await fileToBase64(file);

        await apiPost('uploadNewVersion', {
          doc_id: state.doc.doc_id,
          deskripsi_perubahan: desc,
          jenis_perubahan: jenis,
          fileName: file.name,
          mimeType: file.type,
          fileBase64: base64
        });

        showToast('Versi baru berhasil diupload', 'success');
        overlay.remove();
        setTimeout(function() { location.reload(); }, 800);
      } catch (e) {
        btnReset(confirmBtn);
        showToast(e.message, 'error');
      }
    }
  });
}
