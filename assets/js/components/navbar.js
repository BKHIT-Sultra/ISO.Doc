/**
 * Navbar Atas
 */
import { logout } from '../auth.js';
import { debounce } from '../utils.js';
import { apiGet } from '../api.js';

export function renderNavbar(user) {
  return `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div class="flex items-center justify-between px-4 py-3">
        <!-- Kiri: logo mobile + hamburger -->
        <div class="flex items-center gap-3">
          <button id="toggleSidebar" class="md:hidden text-2xl">☰</button>
          <div class="md:hidden font-bold text-slate-800">ISO Doc</div>
        </div>

        <!-- Tengah: search global -->
        <div class="hidden md:block flex-1 max-w-md mx-6 relative">
          <input id="globalSearch" type="text"
                 placeholder="🔍 Cari dokumen (kode/judul)..."
                 class="w-full px-4 py-2 border border-slate-200 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <div id="searchResults"
               class="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg 
                      border border-slate-200 max-h-80 overflow-auto hidden z-40"></div>
        </div>

        <!-- Kanan: user info -->
        <div class="flex items-center gap-3">
          <span class="hidden md:inline-block text-xs bg-blue-100 text-blue-700 
                       px-2 py-1 rounded font-semibold">${user.role}</span>
          <div class="relative group">
            <button class="flex items-center gap-2 text-sm">
              <div class="w-8 h-8 bg-blue-600 text-white rounded-full 
                          flex items-center justify-center font-bold">
                ${(user.nama || 'U').charAt(0).toUpperCase()}
              </div>
              <span class="hidden md:inline">${user.nama}</span>
            </button>
            <div class="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg 
                        hidden group-hover:block min-w-[180px]">
              <div class="p-3 border-b">
                <div class="text-sm font-semibold">${user.nama}</div>
                <div class="text-xs text-slate-500">${user.email}</div>
              </div>
              <button id="btnLogout"
                      class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-red-600">
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
}

/**
 * Pasang event listener navbar
 */
export function attachNavbarEvents() {
  document.getElementById('btnLogout').onclick = logout;

  const toggle = document.getElementById('toggleSidebar');
  if (toggle) {
    toggle.onclick = () => {
      const sb = document.getElementById('sidebar');
      if (sb) sb.classList.toggle('hidden');
    };
  }

  // Global search
  const input = document.getElementById('globalSearch');
  const results = document.getElementById('searchResults');

  if (input) {
    const doSearch = debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) {
        results.classList.add('hidden');
        return;
      }
      try {
        const data = await apiGet('searchDocuments', { q });
        if (!data.length) {
          results.innerHTML = '<div class="p-3 text-sm text-slate-500">Tidak ada hasil</div>';
        } else {
          results.innerHTML = data.map(d => `
            <a href="document-detail.html?id=${d.doc_id}"
               class="block px-3 py-2 hover:bg-slate-50 border-b last:border-b-0">
              <div class="text-sm font-semibold text-slate-800">${d.judul}</div>
              <div class="text-xs text-slate-500 font-mono">${d.kode_dokumen} · ${d.jenis}</div>
            </a>
          `).join('');
        }
        results.classList.remove('hidden');
      } catch (e) {
        results.classList.add('hidden');
      }
    }, 400);

    input.addEventListener('input', doSearch);
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.classList.add('hidden');
      }
    });
  }
}
