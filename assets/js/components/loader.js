/**
 * Loading & Progress Components
 * ------------------------------
 * Kumpulan komponen visual untuk feedback loading.
 */

// ============================================================
// 1. BUTTON SPINNER
// ============================================================
/**
 * Aktifkan loading state di tombol
 * @param {HTMLElement|string} btn - Elemen atau ID tombol
 * @param {string} loadingText - Teks saat loading
 */
export function btnLoading(btn, loadingText = 'Memproses...') {
  const el = typeof btn === 'string' ? document.getElementById(btn) : btn;
  if (!el) return;

  // Simpan state asli
  if (!el.dataset.originalHtml) {
    el.dataset.originalHtml = el.innerHTML;
  }

  el.disabled = true;
  el.classList.add('opacity-70', 'cursor-not-allowed');
  el.innerHTML = `
    <span class="inline-flex items-center justify-center gap-2">
      <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" 
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      <span>${loadingText}</span>
    </span>
  `;
}

/**
 * Kembalikan tombol ke state normal
 */
export function btnReset(btn) {
  const el = typeof btn === 'string' ? document.getElementById(btn) : btn;
  if (!el) return;

  if (el.dataset.originalHtml) {
    el.innerHTML = el.dataset.originalHtml;
    delete el.dataset.originalHtml;
  }
  el.disabled = false;
  el.classList.remove('opacity-70', 'cursor-not-allowed');
}

// ============================================================
// 2. FULL-SCREEN OVERLAY
// ============================================================
let overlayCount = 0;

/**
 * Tampilkan overlay full-screen dengan pesan loading
 * @param {string} message - Pesan yang ditampilkan
 * @param {string} subMessage - Sub pesan (opsional)
 */
export function showOverlay(message = 'Memproses...', subMessage = '') {
  overlayCount++;

  let overlay = document.getElementById('globalOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'globalOverlay';
    overlay.className = 'fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm 
                        flex items-center justify-center';
    overlay.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center 
                  transform scale-95 transition-transform duration-200">
        <div class="relative w-16 h-16 mx-auto mb-4">
          <div class="absolute inset-0 rounded-full border-4 border-blue-100"></div>
          <div class="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent 
                      animate-spin"></div>
          <div class="absolute inset-0 flex items-center justify-center text-2xl">📄</div>
        </div>
        <div id="overlayMessage" class="font-semibold text-slate-800"></div>
        <div id="overlaySubMessage" class="text-sm text-slate-500 mt-1"></div>
        <div id="overlayProgressWrapper" class="hidden mt-4">
          <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div id="overlayProgressBar" 
                 class="h-full bg-blue-600 transition-all duration-300 rounded-full"
                 style="width: 0%"></div>
          </div>
          <div id="overlayProgressText" class="text-xs text-slate-500 mt-2 text-center"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Trigger animasi scale
    requestAnimationFrame(() => {
      overlay.querySelector('div').classList.remove('scale-95');
      overlay.querySelector('div').classList.add('scale-100');
    });
  }

  overlay.querySelector('#overlayMessage').textContent = message;
  overlay.querySelector('#overlaySubMessage').textContent = subMessage;
  overlay.style.display = 'flex';
}

/**
 * Update progress bar di overlay
 * @param {number} percent - 0-100
 * @param {string} text - Teks progress
 */
export function updateOverlayProgress(percent, text = '') {
  const wrapper = document.getElementById('overlayProgressWrapper');
  const bar = document.getElementById('overlayProgressBar');
  const textEl = document.getElementById('overlayProgressText');

  if (wrapper && bar) {
    wrapper.classList.remove('hidden');
    bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (textEl) textEl.textContent = text || `${Math.round(percent)}%`;
  }
}

/**
 * Sembunyikan overlay
 */
export function hideOverlay() {
  overlayCount = Math.max(0, overlayCount - 1);
  if (overlayCount > 0) return; // masih ada proses lain

  const overlay = document.getElementById('globalOverlay');
  if (overlay) {
    overlay.querySelector('div').classList.add('scale-95');
    overlay.querySelector('div').classList.remove('scale-100');
    setTimeout(() => overlay.remove(), 200);
  }
}

// ============================================================
// 3. SKELETON LOADER (sudah ada di utils.js, ini versi lebih rapi)
// ============================================================
export function skeletonTable(cols, rows = 5) {
  let html = '';
  for (let i = 0; i < rows; i++) {
    html += '<tr>';
    for (let j = 0; j < cols; j++) {
      const width = 40 + Math.random() * 60;
      html += `
        <td class="p-3">
          <div class="h-4 bg-slate-200 rounded animate-pulse" 
               style="width: ${width}%"></div>
        </td>`;
    }
    html += '</tr>';
  }
  return html;
}

export function skeletonCard() {
  return `
    <div class="bg-white rounded-xl p-5 border border-slate-100 animate-pulse">
      <div class="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
      <div class="h-8 bg-slate-200 rounded w-2/3"></div>
    </div>
  `;
}

// ============================================================
// 4. INLINE LOADING SPINNER
// ============================================================
export function inlineSpinner(size = 'md') {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }[size] || 'h-6 w-6';

  return `
    <div class="flex items-center justify-center py-8">
      <svg class="${sizeClass} animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" 
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
    </div>
  `;
}
