/**
 * Loading & Progress Components
 * ------------------------------
 * Versi ASCII-safe: tanpa emoji, tanpa karakter Unicode khusus.
 */

// ============================================================
// 1. BUTTON SPINNER
// ============================================================
export function btnLoading(btn, loadingText) {
  loadingText = loadingText || 'Memproses...';
  const el = typeof btn === 'string' ? document.getElementById(btn) : btn;
  if (!el) return;

  if (!el.dataset.originalHtml) {
    el.dataset.originalHtml = el.innerHTML;
  }

  el.disabled = true;
  el.classList.add('opacity-70', 'cursor-not-allowed');
  el.innerHTML = '<span class="inline-flex items-center justify-center gap-2">' +
    '<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">' +
    '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>' +
    '<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>' +
    '</svg>' +
    '<span>' + loadingText + '</span>' +
    '</span>';
}

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
var overlayCount = 0;

export function showOverlay(message, subMessage) {
  message = message || 'Memproses...';
  subMessage = subMessage || '';
  overlayCount++;

  var overlay = document.getElementById('globalOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'globalOverlay';
    overlay.className = 'fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center';
    overlay.innerHTML =
      '<div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center transform scale-95 transition-transform duration-200">' +
        '<div class="relative w-16 h-16 mx-auto mb-4">' +
          '<div class="absolute inset-0 rounded-full border-4 border-blue-100"></div>' +
          '<div class="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>' +
        '</div>' +
        '<div id="overlayMessage" class="font-semibold text-slate-800"></div>' +
        '<div id="overlaySubMessage" class="text-sm text-slate-500 mt-1"></div>' +
        '<div id="overlayProgressWrapper" class="hidden mt-4">' +
          '<div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">' +
            '<div id="overlayProgressBar" class="h-full bg-blue-600 transition-all duration-300 rounded-full" style="width: 0%"></div>' +
          '</div>' +
          '<div id="overlayProgressText" class="text-xs text-slate-500 mt-2 text-center"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    requestAnimationFrame(function() {
      var inner = overlay.querySelector('div');
      if (inner) {
        inner.classList.remove('scale-95');
        inner.classList.add('scale-100');
      }
    });
  }

  var msgEl = overlay.querySelector('#overlayMessage');
  var subEl = overlay.querySelector('#overlaySubMessage');
  if (msgEl) msgEl.textContent = message;
  if (subEl) subEl.textContent = subMessage;
  overlay.style.display = 'flex';
}

export function updateOverlayProgress(percent, text) {
  var wrapper = document.getElementById('overlayProgressWrapper');
  var bar = document.getElementById('overlayProgressBar');
  var textEl = document.getElementById('overlayProgressText');

  if (wrapper && bar) {
    wrapper.classList.remove('hidden');
    bar.style.width = Math.min(100, Math.max(0, percent)) + '%';
    if (textEl) textEl.textContent = text || (Math.round(percent) + '%');
  }
}

export function hideOverlay() {
  overlayCount = Math.max(0, overlayCount - 1);
  if (overlayCount > 0) return;

  var overlay = document.getElementById('globalOverlay');
  if (overlay) {
    var inner = overlay.querySelector('div');
    if (inner) {
      inner.classList.add('scale-95');
      inner.classList.remove('scale-100');
    }
    setTimeout(function() { overlay.remove(); }, 200);
  }
}

// ============================================================
// 3. SKELETON
// ============================================================
export function skeletonTable(cols, rows) {
  cols = cols || 5;
  rows = rows || 5;
  var html = '';
  for (var i = 0; i < rows; i++) {
    html += '<tr>';
    for (var j = 0; j < cols; j++) {
      var width = 40 + Math.random() * 60;
      html += '<td class="p-3">' +
        '<div class="h-4 bg-slate-200 rounded animate-pulse" style="width: ' + width + '%"></div>' +
        '</td>';
    }
    html += '</tr>';
  }
  return html;
}

export function skeletonCard() {
  return '<div class="bg-white rounded-xl p-5 border border-slate-100 animate-pulse">' +
    '<div class="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>' +
    '<div class="h-8 bg-slate-200 rounded w-2/3"></div>' +
    '</div>';
}

// ============================================================
// 4. INLINE SPINNER
// ============================================================
export function inlineSpinner(size) {
  size = size || 'md';
  var sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
  return '<div class="flex items-center justify-center py-8">' +
    '<svg class="' + sizeClass + ' animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">' +
    '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>' +
    '<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>' +
    '</svg>' +
    '</div>';
}

// ============================================================
// 5. TOP LOADING BAR
// ============================================================
var topBarTimer = null;

export function showTopBar() {
  var bar = document.getElementById('topProgressBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'topProgressBar';
    bar.className = 'fixed top-0 left-0 h-0.5 bg-blue-600 z-[999] transition-all duration-300';
    bar.style.width = '0%';
    document.body.appendChild(bar);
  }

  bar.style.width = '30%';
  clearTimeout(topBarTimer);
  topBarTimer = setTimeout(function() {
    bar.style.width = '60%';
    topBarTimer = setTimeout(function() {
      bar.style.width = '90%';
    }, 800);
  }, 200);
}

export function hideTopBar() {
  var bar = document.getElementById('topProgressBar');
  if (!bar) return;
  clearTimeout(topBarTimer);
  bar.style.width = '100%';
  setTimeout(function() {
    bar.style.opacity = '0';
    setTimeout(function() { bar.remove(); }, 300);
  }, 300);
}
