import { apiGet, apiPost } from '../api.js';
import { formatDateTime, formatDate, escapeHtml } from '../utils.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

let state = { user: null, items: [] };

export async function initApproval(user) {
  state.user = user;
  await loadApprovals();
}

async function loadApprovals() {
  const container = document.getElementById('approvalList');

  try {
    const data = await apiGet('getPendingApprovals', {
      user_email: state.user.email
    });
    state.items = data;

    if (!data.length) {
      container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <div class="text-5xl mb-3">🎉</div>
          <div class="font-medium text-slate-700">Tidak ada dokumen yang menunggu approval</div>
          <div class="text-sm text-slate-500 mt-1">Semua sudah ditinjau. Kerja bagus!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(a => renderItem(a)).join('');
    attachItemEvents();
  } catch (e) {
    container.innerHTML = `<div class="text-red-600 p-4">Error: ${escapeHtml(e.message)}</div>`;
  }
}

function renderItem(a) {
  return `
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5" data-item="${a.approval_id}">
      <div class="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-xs text-slate-500">${escapeHtml(a.kode_dokumen)}</span>
            <span class="text-xs bg-slate-100 px-2 py-0.5 rounded">${escapeHtml(a.jenis)}</span>
            <span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">v${escapeHtml(a.versi)}</span>
          </div>
          <div class="font-semibold text-slate-800">${escapeHtml(a.judul)}</div>
          <div class="text-xs text-slate-500 mt-1">
            Diajukan oleh <b>${escapeHtml(a.pengaju)}</b> · ${formatDateTime(a.tgl_pengajuan)}
          </div>
          ${a.komentar_review ? `
            <div class="mt-2 text-xs text-slate-600 italic bg-slate-50 p-2 rounded">
              💬 "${escapeHtml(a.komentar_review)}"
            </div>
          ` : ''}
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <a href="document-detail.html?id=${a.doc_id}"
             class="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50">👁️ Lihat</a>
          <button data-action="approve" data-id="${a.approval_id}" data-doc="${a.doc_id}"
                  class="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg">
            ✅ Setujui
          </button>
          <button data-action="reject" data-id="${a.approval_id}" data-doc="${a.doc_id}"
                  class="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg">
            ❌ Tolak
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachItemEvents() {
  document.querySelectorAll('[data-action="approve"]').forEach(btn => {
    btn.onclick = () => approveItem(btn.dataset.id, btn.dataset.doc);
  });

  document.querySelectorAll('[data-action="reject"]').forEach(btn => {
    btn.onclick = () => rejectItem(btn.dataset.id, btn.dataset.doc);
  });
}

import { btnLoading, btnReset } from '../components/loader.js';

function approveItem(approvalId, docId) {
  showModal({
    title: 'Setujui Dokumen',
    content: `...`,
    confirmText: 'Setujui',
    onConfirm: async (overlay) => {
      const confirmBtn = overlay.querySelector('[data-confirm]');
      btnLoading(confirmBtn, 'Menyimpan...');

      const tgl_berlaku = overlay.querySelector('#m-tgl').value;
      const komentar = overlay.querySelector('#m-komentar').value;

      try {
        await apiPost('approveDocument', {
          doc_id: docId,
          approval_id: approvalId,
          komentar,
          tgl_berlaku
        });
        showToast('✅ Dokumen berhasil disetujui', 'success');
        overlay.remove();
        await loadApprovals();
      } catch (e) {
        showToast(e.message, 'error');
        btnReset(confirmBtn);
      }
    }
  });
}

function rejectItem(approvalId, docId) {
  showModal({
    title: 'Tolak Dokumen',
    content: `
      <label class="block text-sm font-medium mb-1">Alasan Penolakan *</label>
      <textarea id="m-alasan" rows="3" required
                class="w-full px-3 py-2 border rounded-lg"
                placeholder="Contoh: Perlu revisi pada bagian 3.2..."></textarea>
    `,
    confirmText: 'Tolak',
    onConfirm: async (overlay) => {
      const alasan = overlay.querySelector('#m-alasan').value.trim();
      if (!alasan) { showToast('Alasan wajib diisi', 'error'); return; }

      try {
        await apiPost('rejectDocument', {
          doc_id: docId,
          approval_id: approvalId,
          alasan
        });
        showToast('Dokumen ditolak', 'success');
        overlay.remove();
        await loadApprovals();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  });
}
