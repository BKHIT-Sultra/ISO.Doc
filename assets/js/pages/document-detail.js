import { apiGet, apiPost } from '../api.js';
import { formatDate, formatDateTime, escapeHtml, getQuery } from '../utils.js';
import { STATUS_BADGE, CONFIG } from '../config.js';
import { showToast } from '../components/toast.js';
import { showModal, confirmDialog } from '../components/modal.js';

let state = { doc: null, versions: [], approvals: [], user: null };

export async function initDocumentDetail(user) {
  state.user = user;
  const docId = getQuery('id');
  if (!docId) {
    document.getElementById('detailContent').innerHTML =
      '<div class="text-red-600 p-4">ID dokumen tidak ditemukan di URL.</div>';
    return;
  }

  try {
    const data = await apiGet('getDocumentById', { doc_id: docId });
    state.doc = data.document;
    state.versions = data.versions || [];
    state.approvals = data.approvals || [];

    renderTitle();
    renderContent();
    attachActions();
  } catch (e) {
    document.getElementById('detailContent').innerHTML =
      `<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        Gagal memuat dokumen: ${escapeHtml(e.message)}
      </div>`;
  }
}

function renderTitle() {
  const d = state.doc;
  document.getElementById('titleArea').innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="font-mono text-sm text-slate-500 mb-1">${escapeHtml(d.kode_dokumen)}</div>
        <h1 class="text-2xl font-bold text-slate-800">${escapeHtml(d.judul)}</h1>
        <div class="flex flex-wrap items-center gap-2 mt-2">
          <span class="text-xs bg-slate-100 px-2 py-1 rounded">${escapeHtml(d.jenis)}</span>
          ${d.sub_jenis ? `<span class="text-xs bg-slate-100 px-2 py-1 rounded">${escapeHtml(d.sub_jenis)}</span>` : ''}
          <span class="text-xs px-2 py-1 rounded font-semibold ${STATUS_BADGE[d.status]}">
            ${escapeHtml(d.status)}
          </span>
          <span class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">v${escapeHtml(d.versi_terkini)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderContent() {
  const d = state.doc;

  const standarBadges = String(d.standar || '').split(',').filter(Boolean).map(s => 
    `<span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">${escapeHtml(s.trim())}</span>`
  ).join(' ');

  document.getElementById('detailContent').innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Kolom kiri: Info -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Metadata -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 class="font-semibold text-slate-800 mb-4">📋 Metadata Dokumen</h2>
          <dl class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            ${infoRow('Klausul', `${d.klausul_utama || '-'} ${d.sub_klausul ? '(' + d.sub_klausul + ')' : ''}`)}
            ${infoRow('Standar', standarBadges || '-')}
            ${infoRow('Departemen', escapeHtml(d.pemilik_departemen || '-'))}
            ${infoRow('Pemilik', escapeHtml(d.pemilik_email || '-'))}
            ${infoRow('Penyusun', escapeHtml(d.penyusun || '-'))}
            ${infoRow('Pemeriksa', escapeHtml(d.pemeriksa || '-'))}
            ${infoRow('Penyetuju', escapeHtml(d.penyetuju || '-'))}
            ${infoRow('Tanggal Terbit', formatDate(d.tgl_terbit))}
            ${infoRow('Review Terakhir', formatDate(d.tgl_review_terakhir))}
            ${infoRow('Review Berikutnya', formatDate(d.tgl_review_berikutnya))}
            ${infoRow('Frekuensi Review', `${d.frekuensi_review_bulan || '-'} bulan`)}
            ${infoRow('Kata Kunci', escapeHtml(d.kata_kunci || '-'))}
          </dl>
          ${d.keterangan ? `
            <div class="mt-4 pt-4 border-t border-slate-100">
              <div class="text-xs text-slate-500 mb-1">Keterangan</div>
              <div class="text-sm text-slate-700">${escapeHtml(d.keterangan)}</div>
            </div>
          ` : ''}
        </div>

        <!-- Riwayat Versi -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100">
          <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 class="font-semibold text-slate-800">📚 Riwayat Versi</h2>
            <button id="btnUploadVersion" 
                    class="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100">
              + Upload Versi Baru
            </button>
          </div>
          <div class="p-6">
            ${state.versions.length ? `
              <div class="relative">
                <div class="absolute left-4 top-3 bottom-3 w-0.5 bg-slate-200"></div>
                <div class="space-y-4">
                  ${state.versions.map((v, i) => `
                    <div class="flex gap-4 relative">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center 
                                  ${i === 0 ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'} 
                                  flex-shrink-0 z-10 text-xs font-bold">
                        v${escapeHtml(v.versi)}
                      </div>
                      <div class="flex-1 bg-slate-50 rounded-lg p-3">
                        <div class="flex justify-between items-start">
                          <div>
                            <div class="font-medium text-sm text-slate-800">${escapeHtml(v.deskripsi_perubahan)}</div>
                            <div class="text-xs text-slate-500 mt-1">
                              ${escapeHtml(v.diubah_oleh)} · ${formatDateTime(v.tgl_perubahan)}
                            </div>
                          </div>
                          <div class="flex gap-2 items-center">
                            <span class="text-xs px-2 py-0.5 rounded ${v.status_versi === 'Aktif' 
                              ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}">
                              ${escapeHtml(v.status_versi)}
                            </span>
                            ${v.drive_file_url ? `<a href="${v.drive_file_url}" target="_blank" 
                              class="text-blue-600 hover:text-blue-800 text-sm" title="Lihat file">📄</a>` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : '<div class="text-sm text-slate-500 text-center py-4">Belum ada riwayat versi.</div>'}
          </div>
        </div>

        <!-- Riwayat Approval -->
        ${state.approvals.length ? `
          <div class="bg-white rounded-xl shadow-sm border border-slate-100">
            <div class="px-6 py-4 border-b border-slate-100">
              <h2 class="font-semibold text-slate-800">✅ Riwayat Approval</h2>
            </div>
            <div class="p-6 space-y-3">
              ${state.approvals.map(a => `
                <div class="text-sm border-l-2 pl-4 ${a.status_review === 'Disetujui' ? 'border-green-500' : a.status_review === 'Ditolak' ? 'border-red-500' : 'border-yellow-500'}">
                  <div class="font-medium text-slate-800">Versi ${escapeHtml(a.versi)}</div>
                  <div class="text-xs text-slate-500">Diajukan: ${formatDateTime(a.tgl_pengajuan)} oleh ${escapeHtml(a.pengaju)}</div>
                  ${a.reviewer ? `<div class="text-xs text-slate-500">Reviewer: ${escapeHtml(a.reviewer)}</div>` : ''}
                  ${a.komentar_review ? `<div class="text-xs text-slate-600 mt-1 italic">"${escapeHtml(a.komentar_review)}"</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Kolom kanan: Aksi & File -->
      <div class="space-y-4">
        
        <!-- File Preview Card -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 class="font-semibold text-slate-800 mb-3 text-sm">📎 File Dokumen</h3>
          ${d.drive_file_url ? `
            <a href="${d.drive_file_url}" target="_blank" 
               class="block bg-slate-50 rounded-lg p-4 text-center hover:bg-slate-100 transition">
              <div class="text-4xl mb-2">📄</div>
              <div class="text-sm font-medium text-slate-700">Buka di Google Drive</div>
              <div class="text-xs text-slate-500 mt-1">Klik untuk preview / download</div>
            </a>
          ` : `
            <div class="text-center text-sm text-slate-500 py-4">File belum diupload</div>
          `}
        </div>

        <!-- Action Card -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 class="font-semibold text-slate-800 mb-3 text-sm">⚡ Aksi</h3>
          <div class="space-y-2" id="actionButtons">
            ${renderActions()}
          </div>
        </div>

        <!-- Info Card -->
        <div class="bg-slate-50 rounded-xl p-5 text-xs text-slate-500 space-y-2">
          <div class="flex justify-between"><span>ID:</span><span class="font-mono text-slate-700">${escapeHtml(d.doc_id)}</span></div>
          <div class="flex justify-between"><span>Dibuat:</span><span>${formatDateTime(d.created_at)}</span></div>
          <div class="flex justify-between"><span>Diubah:</span><span>${formatDateTime(d.updated_at)}</span></div>
        </div>
      </div>
    </div>
  `;
}

function renderActions() {
  const d = state.doc;
  const u = state.user;
  const buttons = [];

  // Edit (Admin/Editor, status Draft atau Review)
  if (['Admin', 'Editor'].includes(u.role) && [CONFIG.SESSION_KEY ? 'Draft' : 'Draft', 'Review'].includes(d.status)) {
    buttons.push(`
      <a href="upload.html?id=${d.doc_id}" 
         class="block text-center bg-slate-100 hover:bg-slate-200 text-slate-700 
                py-2 rounded-lg text-sm font-medium transition">
        ✏️ Edit Dokumen
      </a>
    `);
  }

  // Ajukan Review (Draft, Admin/Editor)
  if (['Admin', 'Editor'].includes(u.role) && d.status === 'Draft') {
    buttons.push(`
      <button data-action="submit-review"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg 
                     text-sm font-medium transition">
        📤 Ajukan untuk Review
      </button>
    `);
  }

  // Approve/Reject (Review status, Admin/Reviewer)
  if (['Admin', 'Reviewer'].includes(u.role) && d.status === 'Review') {
    buttons.push(`
      <button data-action="approve"
              class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg 
                     text-sm font-medium transition">
        ✅ Setujui
      </button>
      <button data-action="reject"
              class="w-full bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg 
                     text-sm font-medium transition">
        ❌ Tolak
      </button>
    `);
  }

  // Obsolete (Admin)
  if (u.role === 'Admin' && d.status === 'Approved') {
    buttons.push(`
      <button data-action="obsolete"
              class="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 py-2 rounded-lg 
                     text-sm font-medium transition">
        🚫 Tandai Obsolete
      </button>
    `);
  }

  // Hapus (Admin)
  if (u.role === 'Admin') {
    buttons.push(`
      <button data-action="delete"
              class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg 
                     text-sm font-medium transition">
        🗑️ Hapus Permanen
      </button>
    `);
  }

  return buttons.join('') || '<div class="text-xs text-slate-500 text-center py-2">Tidak ada aksi tersedia</div>';
}

function infoRow(label, value) {
  return `
    <div>
      <dt class="text-xs text-slate-500 mb-0.5">${label}</dt>
      <dd class="text-slate-800">${value}</dd>
    </div>
  `;
}

function attachActions() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.onclick = () => handleAction(btn.dataset.action);
  });

  const btnUploadVersion = document.getElementById('btnUploadVersion');
  if (btnUploadVersion) btnUploadVersion.onclick = showUploadVersionModal;
}

async function handleAction(action) {
  const d = state.doc;
  const u = state.user;

  switch (action) {
    case 'submit-review':
      return submitReview();
    case 'approve':
      return approveDoc();
    case 'reject':
      return rejectDoc();
    case 'obsolete':
      return obsoleteDoc();
    case 'delete':
      return deleteDoc();
  }
}

async function submitReview() {
  showModal({
    title: 'Ajukan untuk Review',
    content: `
      <label class="block text-sm font-medium mb-1">Email Reviewer</label>
      <input id="m-reviewer" type="email" placeholder="reviewer@company.com"
             class="w-full px-3 py-2 border rounded-lg mb-3">
      <label class="block text-sm font-medium mb-1">Catatan (opsional)</label>
      <textarea id="m-catatan" rows="2" 
                class="w-full px-3 py-2 border rounded-lg"></textarea>
    `,
    confirmText: 'Ajukan',
    onConfirm: async (overlay) => {
      const reviewer_email = overlay.querySelector('#m-reviewer').value.trim();
      const catatan = overlay.querySelector('#m-catatan').value.trim();

      try {
        await apiPost('submitForReview', {
          doc_id: state.doc.doc_id,
          reviewer_email,
          catatan
        });
        showToast('✅ Dokumen diajukan untuk review', 'success');
        overlay.remove();
        setTimeout(() => location.reload(), 1000);
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  });
}

async function approveDoc() {
  showModal({
    title: 'Setujui Dokumen',
    content: `
      <p class="text-sm text-slate-600 mb-3">Dokumen akan disetujui dan berstatus "Approved".</p>
      <label class="block text-sm font-medium mb-1">Tanggal Berlaku</label>
      <input id="m-tgl" type="date" value="${new Date().toISOString().split('T')[0]}"
             class="w-full px-3 py-2 border rounded-lg mb-3">
      <label class="block text-sm font-medium mb-1">Komentar (opsional)</label>
      <textarea id="m-komentar" rows="2" 
                class="w-full px-3 py-2 border rounded-lg"></textarea>
    `,
    confirmText: 'Setujui',
    onConfirm: async (overlay) => {
      const tgl_berlaku = overlay.querySelector('#m-tgl').value;
      const komentar = overlay.querySelector('#m-komentar').value;

      try {
        const approval = state.approvals.find(a => a.status_review === 'Pending' || a.status_approval === 'Pending');
        await apiPost('approveDocument', {
          doc_id: state.doc.doc_id,
          approval_id: approval?.approval_id || '',
          komentar,
          tgl_berlaku
        });
        showToast('✅ Dokumen berhasil disetujui', 'success');
        overlay.remove();
        setTimeout(() => location.reload(), 1000);
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  });
}

async function rejectDoc() {
  showModal({
    title: 'Tolak Dokumen',
    content: `
      <p class="text-sm text-slate-600 mb-3">Dokumen akan dikembalikan ke status Draft.</p>
      <label class="block text-sm font-medium mb-1">Alasan Penolakan *</label>
      <textarea id="m-alasan" rows="3" required
                class="w-full px-3 py-2 border rounded-lg"></textarea>
    `,
    confirmText: 'Tolak',
    onConfirm: async (overlay) => {
      const alasan = overlay.querySelector('#m-alasan').value.trim();
      if (!alasan) { showToast('Alasan wajib diisi', 'error'); return; }

      try {
        const approval = state.approvals.find(a => a.status_review === 'Pending');
        await apiPost('rejectDocument', {
          doc_id: state.doc.doc_id,
          approval_id: approval?.approval_id || '',
          alasan
        });
        showToast('Dokumen ditolak', 'success');
        overlay.remove();
        setTimeout(() => location.reload(), 1000);
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  });
}

async function obsoleteDoc() {
  confirmDialog(
    `Tandai dokumen "${state.doc.judul}" sebagai Obsolete? Dokumen tidak akan dipakai untuk operasional.`,
    async () => {
      try {
        await apiPost('deleteDocument', {
          doc_id: state.doc.doc_id,
          hard_delete: false
        });
        showToast('Dokumen ditandai Obsolete', 'success');
        setTimeout(() => location.reload(), 1000);
      } catch (e) {
        showToast(e.message, 'error');
      }
    },
    { confirmText: 'Ya, Tandai', title: 'Konfirmasi' }
  );
}

async function deleteDoc() {
  confirmDialog(
    `<b class="text-red-600">PERINGATAN!</b> Dokumen akan dihapus PERMANEN dari database. Tindakan ini tidak dapat dibatalkan.`,
    async () => {
      try {
        await apiPost('deleteDocument', {
          doc_id: state.doc.doc_id,
          hard_delete: true
        });
        showToast('Dokumen dihapus permanen', 'success');
        setTimeout(() => location.href = 'documents.html', 1000);
      } catch (e) {
        showToast(e.message, 'error');
      }
    },
    { confirmText: 'Hapus Permanen', title: '⚠️ Konfirmasi Hapus' }
  );
}

function showUploadVersionModal() {
  showModal({
    title: 'Upload Versi Baru',
    content: `
      <label class="block text-sm font-medium mb-1">Deskripsi Perubahan *</label>
      <textarea id="mv-desc" rows="2" required
                class="w-full px-3 py-2 border rounded-lg mb-3"></textarea>
      
      <label class="block text-sm font-medium mb-1">Jenis Perubahan</label>
      <select id="mv-jenis" class="w-full px-3 py-2 border rounded-lg mb-3">
        <option value="Minor">Minor (perbaikan kecil)</option>
        <option value="Major">Major (perubahan signifikan)</option>
      </select>
      
      <label class="block text-sm font-medium mb-1">File *</label>
      <input id="mv-file" type="file" accept=".pdf,.docx,.xlsx" required
             class="w-full px-3 py-2 border rounded-lg">
    `,
    confirmText: 'Upload',
    onConfirm: async (overlay) => {
      const desc = overlay.querySelector('#mv-desc').value.trim();
      const jenis = overlay.querySelector('#mv-jenis').value;
      const file = overlay.querySelector('#mv-file').files[0];

      if (!desc || !file) { showToast('Deskripsi & file wajib diisi', 'error'); return; }

      try {
        showToast('Mengupload...', 'info');
        const { fileToBase64 } = await import('../utils.js');
        const base64 = await fileToBase64(file);

        await apiPost('uploadNewVersion', {
          doc_id: state.doc.doc_id,
          deskripsi_perubahan: desc,
          jenis_perubahan: jenis,
          fileName: file.name,
          mimeType: file.type,
          fileBase64: base64
        });

        showToast('✅ Versi baru berhasil diupload', 'success');
        overlay.remove();
        setTimeout(() => location.reload(), 1000);
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  });
}
