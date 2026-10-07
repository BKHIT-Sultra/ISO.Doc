/**
 * Halaman Approval Dokumen
 * ------------------------
 * Fitur: list pending, approve, reject dengan loading button
 */
import { apiGet, apiPost } from '../api.js';
import { formatDateTime, escapeHtml } from '../utils.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { btnLoading, btnReset, skeletonCard, inlineSpinner } from '../components/loader.js';

// ===== State =====
let state = {
  user: null,
  items: []
};

/**
 * ==================== INIT ====================
 */
export async function initApproval(user) {
  state.user = user;

  // Cek role
  if (!['Admin', 'Reviewer'].includes(user.role)) {
    const container = document.getElementById('approvalList');
    if (container) {
      container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <div class="text-5xl mb-3">⛔</div>
          <div class="font-medium text-red-600">Akses Ditolak</div>
          <div class="text-sm text-slate-500 mt-1">
            Halaman ini hanya untuk Admin & Reviewer.
          </div>
        </div>
      `;
    }
    return;
  }

  await loadApprovals();
}

/**
 * ==================== LOAD DATA ====================
 */
async function loadApprovals() {
  const container = document.getElementById('approvalList');
  if (!container) return;

  // Skeleton
  container.innerHTML = `
    <div class="space-y-3">
      ${skeletonCard()}
      ${skeletonCard()}
      ${skeletonCard()}
    </div>
  `;

  try {
    const data = await apiGet('getPendingApprovals', {
      user_email: state.user.email
    });

    state.items = data || [];

    if (state.items.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <div class="text-5xl mb-3">🎉</div>
          <div class="font-semibold text-slate-700 text-lg">
            Tidak ada dokumen yang menunggu approval
          </div>
          <div class="text-sm text-slate-500 mt-2">
            Semua dokumen sudah ditinjau. Kerja bagus!
          </div>
          <a href="documents.html" 
             class="inline-block mt-4 text-blue-600 hover:underline text-sm">
            Lihat semua dokumen →
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = state.items.map(renderItem).join('');
    attachItemEvents();

  } catch (e) {
    container.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        ❌ Gagal memuat data: ${escapeHtml(e.message)}
        <button onclick="location.reload()" class="ml-2 underline text-sm">
          Muat ulang
        </button>
      </div>
    `;
  }
}

/**
 * ==================== RENDER ITEM ====================
 */
function renderItem(a) {
  const isReviewStage = a.status_review === 'Pending';
  const stageLabel = isReviewStage ? 'Review' : 'Approval';
  const stageColor = isReviewStage
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-blue-100 text-blue-700';

  return `
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5 
                hover:shadow-md transition" 
         data-item="${escapeHtml(a.approval_id)}">
      <div class="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="font-mono text-xs text-slate-500">
              ${escapeHtml(a.kode_dokumen)}
            </span>
            <span class="text-xs bg-slate-100 px-2 py-0.5 rounded">
              ${escapeHtml(a.jenis || '-')}
            </span>
            <span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
              v${escapeHtml(a.versi || '01')}
            </span>
            <span class="text-xs px-2 py-0.5 rounded ${stageColor}">
              ${stageLabel}
            </span>
          </div>
          
          <div class="font-semibold text-slate-800 text-lg truncate">
            ${escapeHtml(a.judul || 'Tanpa Judul')}
          </div>
          
          <div class="text-xs text-slate-500 mt-1">
            Diajukan oleh <b>${escapeHtml(a.pengaju || '-')}</b> · 
            ${formatDateTime(a.tgl_pengajuan)}
          </div>
          
          ${a.komentar_review ? `
            <div class="mt-2 text-xs text-slate-600 italic bg-slate-50 p-2 rounded 
                        border-l-2 border-blue-400">
              💬 "${escapeHtml(a.komentar_review)}"
            </div>
          ` : ''}
        </div>

        <div class="flex gap-2 flex-shrink-0 flex-wrap">
          <a href="document-detail.html?id=${escapeHtml(a.doc_id)}"
             class="px-3 py-2 text-sm border border-slate-200 rounded-lg 
                    hover:bg-slate-50 transition flex items-center gap-1">
            👁️ Lihat
          </a>
          <button data-action="approve" 
                  data-id="${escapeHtml(a.approval_id)}" 
                  data-doc="${escapeHtml(a.doc_id)}"
                  class="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 
                         text-white rounded-lg transition flex items-center gap-1 
                         disabled:opacity-50">
            ✅ Setujui
          </button>
          <button data-action="reject" 
                  data-id="${escapeHtml(a.approval_id)}" 
                  data-doc="${escapeHtml(a.doc_id)}"
                  class="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 
                         text-red-700 rounded-lg transition flex items-center gap-1 
                         disabled:opacity-50">
            ❌ Tolak
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * ==================== EVENT LISTENERS ====================
 */
function attachItemEvents() {
  document.querySelectorAll('[data-action="approve"]').forEach(btn => {
    btn.addEventListener('click', () => {
      approveItem(btn.dataset.id, btn.dataset.doc);
    });
  });

  document.querySelectorAll('[data-action="reject"]').forEach(btn => {
    btn.addEventListener('click', () => {
      rejectItem(btn.dataset.id, btn.dataset.doc);
    });
  });
}

/**
 * ==================== APPROVE ====================
 */
function approveItem(approvalId, docId) {
  const item = state.items.find(x => x.approval_id === approvalId);
  const judul = item?.judul || 'Dokumen ini';

  showModal({
    title: '✅ Setujui Dokumen',
    content: `
      <div class="space-y-3">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <div class="font-medium text-slate-800">${escapeHtml(judul)}</div>
          <div class="text-xs text-slate-500 mt-1">
            Kode: ${escapeHtml(item?.kode_dokumen || '-')}
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Tanggal Berlaku
          </label>
          <input id="m-tgl" type="date" 
                 value="${new Date().toISOString().split('T')[0]}"
                 class="w-full px-3 py-2 border border-slate-200 rounded-lg 
                        focus:ring-2 focus:ring-blue-500 focus:outline-none">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Komentar (opsional)
          </label>
          <textarea id="m-komentar" rows="3" 
                    placeholder="Contoh: Dokumen sudah sesuai..."
                    class="w-full px-3 py-2 border border-slate-200 rounded-lg 
                           focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"></textarea>
        </div>
      </div>
    `,
    confirmText: 'Setujui',
    onConfirm: async (overlay) => {
      const confirmBtn = overlay.querySelector('[data-confirm]');
      const tgl_berlaku = overlay.querySelector('#m-tgl').value;
      const komentar = overlay.querySelector('#m-komentar').value.trim();

      if (!tgl_berlaku) {
        showToast('Tanggal berlaku wajib diisi', 'warning');
        return;
      }

      // Set loading
      btnLoading(confirmBtn, 'Menyimpan...');

      try {
        await apiPost('approveDocument', {
          doc_id: docId,
          approval_id: approvalId,
          komentar,
          tgl_berlaku
        });

        overlay.remove();
        showToast('✅ Dokumen berhasil disetujui', 'success');

        // Reload list dengan delay kecil
        setTimeout(() => loadApprovals(), 500);

      } catch (e) {
        btnReset(confirmBtn);
        showToast(e.message || 'Gagal approve', 'error');
      }
    }
  });
}

/**
 * ==================== REJECT ====================
 */
function rejectItem(approvalId, docId) {
  const item = state.items.find(x => x.approval_id === approvalId);
  const judul = item?.judul || 'Dokumen ini';

  showModal({
    title: '❌ Tolak Dokumen',
    content: `
      <div class="space-y-3">
        <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <div class="font-medium text-slate-800">${escapeHtml(judul)}</div>
          <div class="text-xs text-slate-500 mt-1">
            Kode: ${escapeHtml(item?.kode_dokumen || '-')}
          </div>
        </div>
        
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
          ⚠️ Dokumen akan dikembalikan ke status <b>Draft</b> dan penyusun 
          akan menerima notifikasi email.
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Alasan Penolakan <span class="text-red-500">*</span>
          </label>
          <textarea id="m-alasan" rows="4" required
                    placeholder="Contoh: Perlu revisi pada bagian 3.2 karena..."
                    class="w-full px-3 py-2 border border-slate-200 rounded-lg 
                           focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"></textarea>
        </div>
      </div>
    `,
    confirmText: 'Tolak',
    onConfirm: async (overlay) => {
      const confirmBtn = overlay.querySelector('[data-confirm]');
      const alasan = overlay.querySelector('#m-alasan').value.trim();

      if (!alasan) {
        showToast('Alasan penolakan wajib diisi', 'warning');
        overlay.querySelector('#m-alasan').focus();
        return;
      }

      if (alasan.length < 10) {
        showToast('Alasan minimal 10 karakter', 'warning');
        return;
      }

      // Set loading
      btnLoading(confirmBtn, 'Mengirim...');

      try {
        await apiPost('rejectDocument', {
          doc_id: docId,
          approval_id: approvalId,
          alasan
        });

        overlay.remove();
        showToast('Dokumen ditolak', 'success');

        setTimeout(() => loadApprovals(), 500);

      } catch (e) {
        btnReset(confirmBtn);
        showToast(e.message || 'Gagal reject', 'error');
      }
    }
  });
}
