/**
 * Toast Notifikasi
 */
export function showToast(message, type = 'info', duration = 3000) {
  const colors = {
    success: 'bg-green-500',
    error:   'bg-red-500',
    warning: 'bg-yellow-500',
    info:    'bg-blue-500'
  };
  const icons = {
    success: '✓',
    error:   '✕',
    warning: '⚠',
    info:    'ℹ'
  };

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 
                     transform translate-x-full transition-transform duration-300 min-w-[280px]`;
  toast.innerHTML = `
    <span class="text-xl">${icons[type]}</span>
    <span class="flex-1 text-sm">${message}</span>
    <button class="opacity-70 hover:opacity-100">✕</button>
  `;

  toast.querySelector('button').onclick = () => toast.remove();
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.remove('translate-x-full'));
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
