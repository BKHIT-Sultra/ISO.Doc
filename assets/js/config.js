/**
 * Konfigurasi Frontend
 * --------------------
 * GANTI dengan URL Web App Apps Script Anda!
 */
export const CONFIG = {
  // URL Web App dari Apps Script (deploy terakhir)
  API_URL: 'https://script.google.com/macros/s/AKfycbzGq_uF_aVPb_htWBjkhrtSUp24EUS6hVNgqpE4weP5oNA7YdLZ5A-lueb8UPfVnN8sVw/exec',

  // API Key (harus sama dengan yang di sheet Dashboard_Config)
  API_KEY: 'GANTI_DENGAN_KUNCI_RAHASIA',

  // Info aplikasi
  APP_NAME: 'ISO Doc Management',
  APP_VERSION: '1.0.0',

  // Konfigurasi
  ITEMS_PER_PAGE: 20,
  MAX_FILE_SIZE_MB: 10,
  SESSION_KEY: 'iso_doc_session',
  WARNING_DAYS: 30
};

export const STATUS = {
  DRAFT: 'Draft',
  REVIEW: 'Review',
  APPROVED: 'Approved',
  OBSOLETE: 'Obsolete'
};

export const JENIS = ['Pedoman', 'Prosedur', 'IKK', 'Formulir', 'Eviden', 'Lampiran'];

export const STANDAR = ['SMM', 'SMAP', 'K3', 'SMAP-AP'];

export const STATUS_BADGE = {
  'Draft':    'bg-blue-100 text-blue-700',
  'Review':   'bg-yellow-100 text-yellow-700',
  'Approved': 'bg-green-100 text-green-700',
  'Obsolete': 'bg-red-100 text-red-700'
};

/**
 * Warna badge untuk tiap jenis dokumen
 */
export const JENIS_BADGE = {
  'Pedoman':  'bg-blue-100 text-blue-700',
  'Prosedur': 'bg-purple-100 text-purple-700',
  'IKK':      'bg-amber-100 text-amber-700',
  'Formulir': 'bg-emerald-100 text-emerald-700',
  'Eviden':   'bg-rose-100 text-rose-700',
  'Lampiran': 'bg-slate-100 text-slate-700'
};

/**
 * Ikon SVG per jenis dokumen (path data)
 */
export const JENIS_ICON = {
  'Pedoman':  'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  'Prosedur': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  'IKK':      'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  'Formulir': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  'Eviden':   'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  'Lampiran': 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'
};
