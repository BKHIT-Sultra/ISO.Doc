/**
 * Helper Functions
 */

/**
 * Format tanggal (ISO → "15 Jan 2025")
 */
export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return '-';

  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  const result = `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;

  if (opts.withTime) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${result} ${hh}:${mm}`;
  }
  return result;
}

/**
 * Format tanggal + jam
 */
export function formatDateTime(dateStr) {
  return formatDate(dateStr, { withTime: true });
}

/**
 * Format file size
 */
export function formatSize(kb) {
  if (!kb) return '-';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Escape HTML untuk cegah XSS
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Konversi file ke base64
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // buang data:...;base64,
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validasi file
 */
export function validateFile(file) {
  const maxBytes = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxBytes) {
    return { valid: false, error: `Ukuran file melebihi 10 MB` };
  }

  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg'
  ];

  if (!allowed.includes(file.type)) {
    return { valid: false, error: 'Tipe file tidak didukung' };
  }

  return { valid: true };
}

/**
 * Debounce
 */
export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Ambil query parameter dari URL
 */
export function getQuery(key) {
  return new URLSearchParams(location.search).get(key);
}

/**
 * Skeleton loading untuk tabel
 */
export function skeletonRows(cols, rows = 5) {
  let html = '';
  for (let i = 0; i < rows; i++) {
    html += '<tr>';
    for (let j = 0; j < cols; j++) {
      html += '<td class="p-3"><div class="h-4 bg-slate-200 rounded animate-pulse"></div></td>';
    }
    html += '</tr>';
  }
  return html;
}
