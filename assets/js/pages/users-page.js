/**
 * Users Page Controller
 * ---------------------
 * Premium version, ASCII-safe, konsisten dengan design system.
 */
import { requireAuth } from '../auth.js';
import { renderNavbar, attachNavbarEvents } from '../components/navbar.js';
import { renderSidebar } from '../components/sidebar.js';
import { apiGet, apiPost } from '../api.js';
import { formatDateTime, escapeHtml, debounce } from '../utils.js';
import { showToast } from '../components/toast.js';
import { showModal, confirmDialog } from '../components/modal.js';
import { btnLoading, btnReset } from '../components/loader.js';

// ============================================================
// STATE
// ============================================================
var state = {
  user: null,
  users: [],
  filtered: [],
  filters: {
    q: '',
    role: '',
    status: ''
  }
};

// ============================================================
// WARNA ROLE
// ============================================================
var ROLE_STYLE = {
  'Admin':    { cls: 'bg-red-100 text-red-700 border-red-200',       icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  'Editor':   { cls: 'bg-blue-100 text-blue-700 border-blue-200',    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  'Reviewer': { cls: 'bg-purple-100 text-purple-700 border-purple-200', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  'Viewer':   { cls: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
};

// ============================================================
// HELPERS
// ============================================================
function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function skeletonRows(cols, rows) {
  cols = cols || 6;
  rows = rows || 5;
  var html = '';
  for (var i = 0; i < rows; i++) {
    html += '<tr>';
    for (var j = 0; j < cols; j++) {
      html += '<td class="p-4">' +
        '<div class="h-4 bg-slate-200 rounded animate-pulse" ' +
             'style="width: ' + (40 + Math.random() * 60) + '%"></div>' +
        '</td>';
    }
    html += '</tr>';
  }
  return html;
}

// ============================================================
// INIT
// ============================================================
function initPage() {
  console.log('[users] Init mulai...');

  var user = requireAuth();
  if (!user) return;
  state.user = user;

  // Render navbar & sidebar
  var navbarEl = document.getElementById('navbar');
  if (navbarEl) navbarEl.innerHTML = renderNavbar(user);

  var sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) sidebarEl.innerHTML = renderSidebar(user, 'users');

  try { attachNavbarEvents(); } catch (e) { console.error(e); }

  // Cek role - hanya Admin yang bisa akses
  if (user.role !== 'Admin') {
    var tbody = document.getElementById('userBody');
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="p-16 text-center">' +
          '<div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">' +
            '<svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>' +
            '</svg>' +
          '</div>' +
          '<div class="font-bold text-red-600 text-lg mb-1">Akses Ditolak</div>' +
          '<div class="text-sm text-slate-500">' +
            'Halaman ini hanya dapat diakses oleh Administrator.' +
          '</div>' +
        '</td></tr>';
    }
    // Sembunyikan tombol add
    var btnAdd = document.getElementById('btnAddUser');
    if (btnAdd) btnAdd.style.display = 'none';
    return;
  }

  // Setup filter & events
  setupFilterEvents();
  setupAddButton();

  // Load users
  loadUsers();

  console.log('[users] Init selesai');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}

// ============================================================
// FILTER
// ============================================================
function setupFilterEvents() {
  var fSearch = document.getElementById('fSearch');
  var fRole = document.getElementById('fRole');
  var fStatus = document.getElementById('fStatus');

  if (fSearch) {
    fSearch.addEventListener('input', debounce(function(e) {
      state.filters.q = e.target.value.trim().toLowerCase();
      applyFilter();
    }, 300));
  }

  if (fRole) {
    fRole.addEventListener('change', function(e) {
      state.filters.role = e.target.value;
      applyFilter();
    });
  }

  if (fStatus) {
    fStatus.addEventListener('change', function(e) {
      state.filters.status = e.target.value;
      applyFilter();
    });
  }
}

function applyFilter() {
  var f = state.filters;
  var filtered = state.users.filter(function(u) {
    // Search
    if (f.q) {
      var hay = String(u.nama || '').toLowerCase() + ' ' + String(u.email || '').toLowerCase();
      if (hay.indexOf(f.q) === -1) return false;
    }
    // Role
    if (f.role && u.role !== f.role) return false;
    // Status
    if (f.status && u.status !== f.status) return false;
    return true;
  });
  state.filtered = filtered;
  renderTable(filtered);
}

// ============================================================
// LOAD USERS
// ============================================================
async function loadUsers() {
  var tbody = document.getElementById('userBody');
  if (!tbody) return;

  tbody.innerHTML = skeletonRows(6, 5);

  try {
    var data = await apiGet('getUsers');
    state.users = data || [];
    state.filtered = state.users;

    renderStats(state.users);
    renderTable(state.users);

  } catch (e) {
    console.error('[users] Load error:', e);
    tbody.innerHTML =
      '<tr><td colspan="6" class="p-12 text-center">' +
        '<div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-50 flex items-center justify-center">' +
          '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-semibold text-slate-700 mb-1">Gagal memuat data</div>' +
        '<div class="text-sm text-slate-500 mb-4">' + escapeHtml(e.message) + '</div>' +
        '<button onclick="location.reload()" ' +
                'class="text-blue-600 hover:text-blue-700 font-semibold text-sm">' +
          'Muat Ulang' +
        '</button>' +
      '</td></tr>';
  }
}

// ============================================================
// STATS
// ============================================================
function renderStats(users) {
  var container = document.getElementById('userStats');
  if (!container) return;

  var aktif = users.filter(function(u) { return u.status === 'Aktif'; }).length;
  var nonaktif = users.filter(function(u) { return u.status === 'Nonaktif'; }).length;
  var adminEditor = users.filter(function(u) {
    return u.role === 'Admin' || u.role === 'Editor';
  }).length;

  var stats = [
    {
      label: 'Total User',
      value: users.length,
      color: 'blue',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      label: 'Aktif',
      value: aktif,
      color: 'green',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Nonaktif',
      value: nonaktif,
      color: 'red',
      icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
    },
    {
      label: 'Admin / Editor',
      value: adminEditor,
      color: 'purple',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
    }
  ];

  container.innerHTML = stats.map(function(c, i) {
    return '<div class="stat-card ' + c.color + ' fade-in-up fade-in-up-' + (i + 1) + ' !p-4">' +
      '<div class="flex items-center gap-3">' +
        '<div class="stat-icon ' + c.color + ' !w-10 !h-10">' +
          '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="' + c.icon + '"/>' +
          '</svg>' +
        '</div>' +
        '<div class="min-w-0">' +
          '<div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">' +
            c.label +
          '</div>' +
          '<div class="text-2xl font-extrabold text-slate-800 leading-tight">' +
            c.value +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ============================================================
// RENDER TABLE
// ============================================================
function renderTable(users) {
  var tbody = document.getElementById('userBody');
  if (!tbody) return;

  if (!users || !users.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="p-16 text-center">' +
        '<div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">' +
          '<svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="font-bold text-slate-700 text-lg mb-1">Tidak Ada User</div>' +
        '<div class="text-sm text-slate-500">' +
          'Belum ada user yang sesuai dengan filter.' +
        '</div>' +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(function(u) {
    var roleStyle = ROLE_STYLE[u.role] || ROLE_STYLE['Viewer'];
    var initial = (u.nama || 'U').charAt(0).toUpperCase();
    var isActive = u.status === 'Aktif';

    var html = '<tr>';

    // Nama + Avatar
    html += '<td>';
    html += '  <div class="flex items-center gap-3">';
    html += '    <div class="w-10 h-10 rounded-xl flex items-center justify-center ' +
                  'text-white font-bold text-sm shadow-md flex-shrink-0" ';
    html += '         style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">';
    html +=        initial;
    html += '    </div>';
    html += '    <div class="min-w-0">';
    html += '      <div class="text-sm font-bold text-slate-800 truncate">' +
                    escapeHtml(u.nama || '-') + 
                  '</div>';
    html += '      <div class="text-xs text-slate-500">' +
                    escapeHtml(u.jabatan || '-') + 
                  '</div>';
    html += '    </div>';
    html += '  </div>';
    html += '</td>';

    // Email
    html += '<td>';
    html += '  <div class="flex items-center gap-2 text-xs">';
    html += '    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
    html += '      <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>';
    html += '    </svg>';
    html += '    <span class="text-slate-600 truncate">' + 
                  escapeHtml(u.email || '-') + 
                '</span>';
    html += '  </div>';
    html += '</td>';

    // Departemen
    html += '<td>';
    html += '  <div class="text-sm text-slate-700 font-medium">' + 
                  escapeHtml(u.departemen || '-') + 
                '</div>';
    html += '</td>';

    // Role
    html += '<td>';
    html += '  <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 ' +
                  'rounded-lg border ' + roleStyle.cls + '">';
    html += '    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">';
    html += '      <path stroke-linecap="round" stroke-linejoin="round" d="' + roleStyle.icon + '"/>';
    html += '    </svg>';
    html +=      escapeHtml(u.role);
    html += '  </span>';
    html += '</td>';

    // Status
    html += '<td>';
    html += '  <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 ' +
                  'rounded-lg border ' +
                  (isActive 
                    ? 'bg-green-100 text-green-700 border-green-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200') + '">';
    html += '    <span class="w-1.5 h-1.5 rounded-full ' + 
                    (isActive ? 'bg-green-500 pulse-dot' : 'bg-slate-400') + '"></span>';
    html +=      escapeHtml(u.status || '-');
    html += '  </span>';
    html += '</td>';

    // Aksi
    html += '<td class="text-right whitespace-nowrap">';
    html += '  <button data-edit="' + escapeHtml(u.user_id) + '" ';
    html += '          class="w-8 h-8 rounded-lg inline-flex items-center justify-center ' +
                  'text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition" ';
    html += '          title="Edit user">';
    html += '    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">';
    html += '      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>';
    html += '    </svg>';
    html += '  </button>';
    html += '</td>';

    html += '</tr>';
    return html;
  }).join('');

  // Attach edit handlers
  tbody.querySelectorAll('[data-edit]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.dataset.edit;
      var u = state.users.find(function(x) { return x.user_id === id; });
      if (u) showUserModal(u);
    });
  });
}

// ============================================================
// ADD BUTTON
// ============================================================
function setupAddButton() {
  var btn = document.getElementById('btnAddUser');
  if (!btn) return;
  btn.addEventListener('click', function() {
    showUserModal(null);
  });
}

// ============================================================
// USER MODAL (CREATE/EDIT)
// ============================================================
function showUserModal(existing) {
  var isEdit = !!existing;
  var u = existing || {};

  showModal({
    title: isEdit ? 'Edit User' : 'Tambah User Baru',
    content: buildFormContent(u, isEdit),
    confirmText: isEdit ? 'Simpan' : 'Tambah',
    onConfirm: async function(overlay) {
      var confirmBtn = overlay.querySelector('[data-confirm]');

      var payload = {
        user_id: u.user_id || '',
        nama: overlay.querySelector('#mu-nama').value.trim(),
        email: overlay.querySelector('#mu-email').value.trim(),
        departemen: overlay.querySelector('#mu-dept').value.trim(),
        jabatan: overlay.querySelector('#mu-jabatan').value.trim(),
        role: overlay.querySelector('#mu-role').value,
        status: overlay.querySelector('#mu-status').value,
        password: overlay.querySelector('#mu-password').value
      };

      // Validasi
      if (!payload.nama || !payload.email) {
        showToast('Nama dan email wajib diisi', 'warning');
        return;
      }

      if (!isEdit && !payload.password) {
        showToast('Password wajib diisi', 'warning');
        return;
      }

      if (payload.password && payload.password.length < 6) {
        showToast('Password minimal 6 karakter', 'warning');
        return;
      }

      // Email simple validation
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email)) {
        showToast('Format email tidak valid', 'warning');
        return;
      }

      btnLoading(confirmBtn, 'Menyimpan...');

      try {
        if (isEdit) {
          await apiPost('updateUser', payload);
          showToast('User berhasil diupdate', 'success');
        } else {
          await apiPost('createUser', payload);
          showToast('User berhasil dibuat', 'success');
        }

        overlay.remove();
        await delay(300);
        loadUsers();

      } catch (e) {
        btnReset(confirmBtn);
        showToast(e.message || 'Gagal menyimpan', 'error');
      }
    }
  });
}

function buildFormContent(u, isEdit) {
  var html = '<div class="space-y-4">';

  // Info (kalau edit)
  if (isEdit) {
    html += '<div class="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">';
    html += '  <div class="w-10 h-10 rounded-xl flex items-center justify-center ' +
                  'text-white font-bold shadow-md flex-shrink-0" ';
    html += '       style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">';
    html +=        (u.nama || 'U').charAt(0).toUpperCase();
    html += '  </div>';
    html += '  <div class="min-w-0">';
    html += '    <div class="font-semibold text-slate-800 text-sm truncate">' +
                  escapeHtml(u.nama || '-') + 
                '</div>';
    html += '    <div class="text-xs text-slate-500 truncate">' +
                  escapeHtml(u.email || '-') + 
                '</div>';
    html += '  </div>';
    html += '</div>';
  }

  // Nama
  html += '<div>';
  html += '  <label class="block text-sm font-semibold text-slate-700 mb-1">' +
              'Nama Lengkap <span class="text-red-500">*</span>' +
            '</label>';
  html += '  <input id="mu-nama" type="text" value="' + escapeHtml(u.nama || '') + '" ' +
               'placeholder="Contoh: Andi Wijaya" ' +
               'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                      'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">';
  html += '</div>';

  // Email
  html += '<div>';
  html += '  <label class="block text-sm font-semibold text-slate-700 mb-1">' +
              'Email <span class="text-red-500">*</span>' +
            '</label>';
  html += '  <input id="mu-email" type="email" value="' + escapeHtml(u.email || '') + '" ' +
               (isEdit ? 'disabled ' : '') +
               'placeholder="nama@company.com" ' +
               'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                      'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ' +
                      (isEdit ? 'bg-slate-100 cursor-not-allowed' : '') + '">';
  if (isEdit) {
    html += '  <div class="text-xs text-slate-500 mt-1">Email tidak dapat diubah</div>';
  }
  html += '</div>';

  // Departemen & Jabatan
  html += '<div class="grid grid-cols-2 gap-3">';
  html += '  <div>';
  html += '    <label class="block text-sm font-semibold text-slate-700 mb-1">Departemen</label>';
  html += '    <input id="mu-dept" type="text" value="' + escapeHtml(u.departemen || '') + '" ' +
                 'placeholder="QC" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">';
  html += '  </div>';
  html += '  <div>';
  html += '    <label class="block text-sm font-semibold text-slate-700 mb-1">Jabatan</label>';
  html += '    <input id="mu-jabatan" type="text" value="' + escapeHtml(u.jabatan || '') + '" ' +
                 'placeholder="Supervisor" ' +
                 'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">';
  html += '  </div>';
  html += '</div>';

  // Role & Status
  html += '<div class="grid grid-cols-2 gap-3">';
  html += '  <div>';
  html += '    <label class="block text-sm font-semibold text-slate-700 mb-1">' +
                'Role <span class="text-red-500">*</span>' +
              '</label>';
  html += '    <select id="mu-role" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">';
  ['Admin', 'Editor', 'Reviewer', 'Viewer'].forEach(function(r) {
    html += '      <option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + r + '</option>';
  });
  html += '    </select>';
  html += '  </div>';
  html += '  <div>';
  html += '    <label class="block text-sm font-semibold text-slate-700 mb-1">Status</label>';
  html += '    <select id="mu-status" class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                        'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">';
  ['Aktif', 'Nonaktif'].forEach(function(s) {
    html += '      <option value="' + s + '"' + (u.status === s ? ' selected' : '') + '>' + s + '</option>';
  });
  html += '    </select>';
  html += '  </div>';
  html += '</div>';

  // Password
  html += '<div>';
  html += '  <label class="block text-sm font-semibold text-slate-700 mb-1">';
  html +=      isEdit ? 'Password Baru (opsional)' : 'Password <span class="text-red-500">*</span>';
  html += '  </label>';
  html += '  <input id="mu-password" type="password" ' + (isEdit ? '' : 'required ') +
               'placeholder="' + (isEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter') + '" ' +
               'class="w-full px-3 py-2 border-2 border-slate-200 rounded-xl ' +
                      'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">';
  if (isEdit) {
    html += '  <div class="text-xs text-slate-500 mt-1">Kosongkan jika tidak ingin mengubah password</div>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}
