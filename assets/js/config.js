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
