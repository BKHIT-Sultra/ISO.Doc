import { apiGet, apiPost } from '../api.js';
import { formatDate, escapeHtml, skeletonRows } from '../utils.js';
import { showToast } from '../components/toast.js';
import { showModal, confirmDialog } from '../components/modal.js';

let state = { user: null, users: [] };

const ROLE_BADGE = {
  Admin:    'bg-red-100 text-red-700',
  Editor:   'bg-blue-100 text-blue-700',
  Reviewer: 'bg-purple-100 text-purple-700',
  Viewer:   'bg-slate-100 text-slate-700'
};

export async function initUsers(user) {
  state.user = user;

  if (user.role !== 'Admin') {
    document.getElementById('userBody').innerHTML = `
      <tr><td colspan="6" class="p-8 text-center text-red-600">
        ⛔ Anda tidak punya akses ke halaman ini.
      </td></tr>
    `;
    return;
  }

  document.getElementById('btnAddUser').onclick = () => showUserModal();
  await loadUsers();
}

async function loadUsers() {
  const tbody = document.getElementById('userBody');
  tbody.innerHTML = skeletonRows(6);

  try {
    const data = await apiGet('getUsers');
    state.users = data;
    renderTable(data);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-red-600">Error: ${escapeHtml(e.message)}</td></tr>`;
  }
}

function renderTable(users) {
  const tbody = document.getElementById('userBody');

  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada user.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr class="border-b border-slate-100 hover:bg-slate-50">
      <td class="p-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            ${escapeHtml((u.nama || 'U').charAt(0).toUpperCase())}
          </div>
          <span class="font-medium text-slate-800">${escapeHtml(u.nama)}</span>
        </div>
      </td>
      <td class="p-3 text-sm text-slate-600">${escapeHtml(u.email)}</td>
      <td class="p-3 text-sm text-slate-600">${escapeHtml(u.departemen || '-')}</td>
      <td class="p-3">
        <span class="text-xs px-2 py-1 rounded font-semibold ${ROLE_BADGE[u.role] || ''}">
          ${escapeHtml(u.role)}
        </span>
      </td>
      <td class="p-3">
        <span class="text-xs px-2 py-1 rounded ${u.status === 'Aktif' 
          ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}">
          ${escapeHtml(u.status)}
        </span>
      </td>
      <td class="p-3 text-right">
        <button data-edit="${u.user_id}" 
                class="text-blue-600 hover:text-blue-800 text-sm mr-2" title="Edit">✏️</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => {
      const u = state.users.find(x => x.user_id === btn.dataset.edit);
      if (u) showUserModal(u);
    };
  });
}

function showUserModal(existing = null) {
  const isEdit = !!existing;
  const u = existing || {};

  showModal({
    title: isEdit ? 'Edit User' : 'Tambah User Baru',
    content: `
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1">Nama Lengkap *</label>
          <input id="mu-nama" value="${escapeHtml(u.nama || '')}" required
                 class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Email *</label>
          <input id="mu-email" type="email" value="${escapeHtml(u.email || '')}" 
                 ${isEdit ? 'disabled' : ''} required
                 class="w-full px-3 py-2 border rounded-lg ${isEdit ? 'bg-slate-100' : ''}">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Departemen</label>
            <input id="mu-dept" value="${escapeHtml(u.departemen || '')}"
                   class="w-full px-3 py-2 border rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Jabatan</label>
            <input id="mu-jabatan" value="${escapeHtml(u.jabatan || '')}"
                   class="w-full px-3 py-2 border rounded-lg">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Role *</label>
            <select id="mu-role" class="w-full px-3 py-2 border rounded-lg">
              <option value="Admin"    ${u.role === 'Admin'    ? 'selected' : ''}>Admin</option>
              <option value="Editor"   ${u.role === 'Editor'   ? 'selected' : ''}>Editor</option>
              <option value="Reviewer" ${u.role === 'Reviewer' ? 'selected' : ''}>Reviewer</option>
              <option value="Viewer"   ${u.role === 'Viewer'   ? 'selected' : ''}>Viewer</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Status</label>
            <select id="mu-status" class="w-full px-3 py-2 border rounded-lg">
              <option value="Aktif"    ${u.status === 'Aktif'    ? 'selected' : ''}>Aktif</option>
              <option value="Nonaktif" ${u.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">
            Password ${isEdit ? '(kosongkan jika tidak diubah)' : '*'}
          </label>
          <input id="mu-password" type="password" ${isEdit ? '' : 'required'}
                 placeholder="${isEdit ? 'Kosongkan jika tidak diubah' : 'Min. 6 karakter'}"
                 class="w-full px-3 py-2 border rounded-lg">
        </div>
      </div>
    `,
    confirmText: isEdit ? 'Simpan' : 'Tambah',
    onConfirm: async (overlay) => {
      const payload = {
        user_id: u.user_id || '',
        nama: overlay.querySelector('#mu-nama').value.trim(),
        email: overlay.querySelector('#mu-email').value.trim(),
        departemen: overlay.querySelector('#mu-dept').value.trim(),
        jabatan: overlay.querySelector('#mu-jabatan').value.trim(),
        role: overlay.querySelector('#mu-role').value,
        status: overlay.querySelector('#mu-status').value,
        password: overlay.querySelector('#mu-password').value
      };

      if (!payload.nama || !payload.email) {
        showToast('Nama & email wajib diisi', 'error');
        return;
      }
      if (!isEdit && !payload.password) {
        showToast('Password wajib diisi', 'error');
        return;
      }

      try {
        if (isEdit) {
          await apiPost('updateUser', payload);
          showToast('✅ User berhasil diupdate', 'success');
        } else {
          await apiPost('createUser', payload);
          showToast('✅ User berhasil dibuat', 'success');
        }
        overlay.remove();
        await loadUsers();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  });
}
