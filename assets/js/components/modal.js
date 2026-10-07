/**
 * Modal Dialog Sederhana
 */
export function showModal({ title, content, onConfirm, confirmText = 'OK', showCancel = true }) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4';

  overlay.innerHTML = `
    <div class="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
      <div class="px-5 py-3 border-b flex justify-between items-center">
        <h3 class="font-semibold text-lg">${title}</h3>
        <button class="text-slate-400 hover:text-slate-700 text-xl" data-close>✕</button>
      </div>
      <div class="p-5">${content}</div>
      <div class="px-5 py-3 border-t flex justify-end gap-2">
        ${showCancel ? '<button data-close class="btn-secondary">Batal</button>' : ''}
        <button data-confirm class="btn-primary">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-close]').forEach(el => el.onclick = close);

  if (onConfirm) {
    overlay.querySelector('[data-confirm]').onclick = async () => {
      try {
        await onConfirm(overlay);
      } catch (e) {
        // biarkan caller yang handle
      }
    };
  } else {
    overlay.querySelector('[data-confirm]').onclick = close;
  }

  return { close, element: overlay };
}

/**
 * Confirm dialog shortcut
 */
export function confirmDialog(message, onConfirm, opts = {}) {
  return showModal({
    title: opts.title || 'Konfirmasi',
    content: `<p class="text-slate-700">${message}</p>`,
    confirmText: opts.confirmText || 'Ya',
    onConfirm: async (overlay) => {
      await onConfirm();
      overlay.remove();
    }
  });
}
