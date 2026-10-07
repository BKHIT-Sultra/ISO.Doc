/**
 * Navbar Atas - Premium Version
 */
import { logout } from '../auth.js';
import { debounce } from '../utils.js';
import { apiGet } from '../api.js';

export function renderNavbar(user) {
  return `
    <header class="sticky top-0 z-30 border-b border-slate-200/60" 
            style="background: rgba(255,255,255,0.85); backdrop-filter: blur(12px);">
      <div class="flex items-center justify-between px-4 lg:px-6 py-3">
        
        <!-- KIRI: Hamburger + Search -->
        <div class="flex items-center gap-3 flex-1">
          <button id="toggleSidebar" 
                  class="lg:hidden w-10 h-10 flex items-center justify-center 
                         text-slate-600 hover:text-blue-600 hover:bg-slate-100 
                         rounded-xl transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <!-- Search -->
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <input id="globalSearch" type="text"
                   placeholder="Cari dokumen (kode / judul)..."
                   class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 
                          rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 
                          focus:border-blue-500 focus:bg-white text-sm transition">
            <div id="searchResults"
                 class="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl 
                        border border-slate-200 max-h-96 overflow-auto hidden z-50"></div>
          </div>
        </div>

        <!-- KANAN: User info -->
        <div class="flex items-center gap-3 ml-4">
          
          <!-- Role Badge -->
          <span class="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 
                       rounded-lg bg-blue-50 border border-blue-100 text-blue-700 
                       text-xs font-semibold">
            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full pulse-dot"></span>
            ${user.role}
          </span>

          <!-- User Dropdown -->
          <div id="userMenuWrapper" class="relative">
            <button id="userMenuBtn" type="button"
                    class="flex items-center gap-2 px-2 py-1.5 rounded-xl 
                           hover:bg-slate-100 transition">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center 
                          text-white font-bold text-sm shadow-md"
                   style="background: linear-gradient(135deg, #2563eb, #6366f1);">
                ${(user.nama || 'U').charAt(0).toUpperCase()}
              </div>
              <div class="hidden lg:block text-left">
                <div class="text-sm font-semibold text-slate-800 leading-tight">
                  ${user.nama}
                </div>
                <div class="text-xs text-slate-500 leading-tight">${user.email}</div>
              </div>
              <svg class="hidden lg:block w-4 h-4 text-slate-400" 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <div id="userMenuDropdown"
                 class="hidden absolute right-0 top-full mt-2 bg-white border border-slate-200 
                        rounded-2xl shadow-2xl min-w-[240px] z-50 overflow-hidden">
              <div class="p-4 border-b border-slate-100 bg-gradient-to-br from-blue-50 to-indigo-50">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center 
                              text-white font-bold text-lg shadow-lg"
                       style="background: linear-gradient(135deg, #2563eb, #6366f1);">
                    ${(user.nama || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-slate-800 truncate">${user.nama}</div>
                    <div class="text-xs text-slate-500 truncate">${user.email}</div>
                    <span class="inline-block mt-1 text-xs px-2 py-0.5 rounded 
                                 bg-blue-100 text-blue-700 font-semibold">
                      ${user.role}
                    </span>
                  </div>
                </div>
              </div>
              <div class="p-2">
                <button id="btnLogout"
                        class="w-full text-left px-3 py-2.5 text-sm text-red-600 
                               hover:bg-red-50 rounded-xl transition flex items-center gap-3 
                               font-medium">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" 
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
}

export function attachNavbarEvents() {
  // ===== USER DROPDOWN =====
  const wrapper = document.getElementById('userMenuWrapper');
  const btn = document.getElementById('userMenuBtn');
  const dropdown = document.getElementById('userMenuDropdown');

  if (btn && dropdown && wrapper) {
    let hideTimer = null;

    const showDropdown = () => {
      clearTimeout(hideTimer);
      dropdown.classList.remove('hidden');
    };

    const hideDropdown = () => {
      hideTimer = setTimeout(() => {
        dropdown.classList.add('hidden');
      }, 250);
    };

    wrapper.addEventListener('mouseenter', showDropdown);
    wrapper.addEventListener('mouseleave', hideDropdown);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // ===== LOGOUT =====
  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) logoutBtn.onclick = logout;

  // ===== TOGGLE SIDEBAR (mobile) =====
  const toggle = document.getElementById('toggleSidebar');
  if (toggle) {
    toggle.onclick = () => {
      const sb = document.getElementById('sidebar');
      if (sb) sb.classList.toggle('hidden');
    };
  }

  // ===== GLOBAL SEARCH =====
  const input = document.getElementById('globalSearch');
  const results = document.getElementById('searchResults');

  if (input && results) {
    const doSearch = debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) {
        results.classList.add('hidden');
        return;
      }
      try {
        const data = await apiGet('searchDocuments', { q });
        if (!data.length) {
          results.innerHTML = '<div class="p-4 text-sm text-slate-500 text-center">Tidak ada hasil</div>';
        } else {
          results.innerHTML = data.map(d => `
            <a href="document-detail.html?id=${d.doc_id}"
               class="block px-4 py-3 hover:bg-slate-50 border-b border-slate-100 
                      last:border-b-0 transition">
              <div class="text-sm font-semibold text-slate-800">${d.judul}</div>
              <div class="text-xs text-slate-500 font-mono mt-0.5">
                ${d.kode_dokumen} &middot; ${d.jenis}
              </div>
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
