/**
 * Navbar Atas - Premium Version (No Search)
 * -----------------------------------------
 * Ornamen: Page Title (kiri) + Greeting (tengah) + User (kanan)
 */
import { logout } from '../auth.js';

// ============================================================
// KONFIGURASI HALAMAN
// ============================================================
var PAGE_MAP = {
  'dashboard':        { title: 'Dashboard',        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  'documents':        { title: 'Dokumen',          icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  'document-detail':  { title: 'Detail Dokumen',   icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  'upload':           { title: 'Upload Dokumen',   icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
  'approval':         { title: 'Approval',         icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  'review-reminder':  { title: 'Reminder Review',  icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  'audit-trail':      { title: 'Audit Trail',      icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
  'users':            { title: 'Pengguna',         icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
};

// ============================================================
// DETECT HALAMAN AKTIF
// ============================================================
function getCurrentPage() {
  var path = window.location.pathname;
  var file = path.substring(path.lastIndexOf('/') + 1).replace('.html', '');
  return PAGE_MAP[file] || { title: 'ISO Doc Management', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' };
}

// ============================================================
// GREETING BERDASARKAN JAM
// ============================================================
function getGreeting() {
  var jam = new Date().getHours();
  if (jam < 11) return 'Selamat pagi';
  if (jam < 15) return 'Selamat siang';
  if (jam < 19) return 'Selamat sore';
  return 'Selamat malam';
}

// ============================================================
// TANGGAL FORMAT INDONESIA
// ============================================================
function getDateStr() {
  var d = new Date();
  var hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getDay()];
  var bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()];
  return hari + ', ' + d.getDate() + ' ' + bulan + ' ' + d.getFullYear();
}

// ============================================================
// RENDER NAVBAR
// ============================================================
export function renderNavbar(user) {
  var page = getCurrentPage();
  var greeting = getGreeting();
  var firstName = (user.nama || 'User').split(' ')[0];

  return `
    <header class="h-16 border-b border-slate-200/60 relative overflow-hidden" 
            style="background: rgba(255,255,255,0.85); backdrop-filter: blur(12px);">
      
      <!-- ===== ORNAMEN SUBTLE ===== -->
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <!-- Blob gradient kiri -->
        <div class="absolute -top-12 -left-12 w-48 h-48 rounded-full opacity-[0.06]"
             style="background: radial-gradient(circle, #2563eb, transparent 70%);"></div>
        <!-- Blob gradient tengah -->
        <div class="absolute -top-20 left-1/2 w-64 h-64 rounded-full opacity-[0.04] -translate-x-1/2"
             style="background: radial-gradient(circle, #6366f1, transparent 70%);"></div>
        <!-- Blob gradient kanan -->
        <div class="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-[0.06]"
             style="background: radial-gradient(circle, #8b5cf6, transparent 70%);"></div>
      </div>

      <!-- ===== KONTEN ===== -->
      <div class="relative flex items-center justify-between px-4 lg:px-6 h-full gap-4">
        
        <!-- KIRI: Hamburger (mobile) + Page Info -->
        <div class="flex items-center gap-3 min-w-0 flex-shrink">
          
          <!-- Hamburger (mobile) -->
          <button id="toggleSidebar" 
                  class="lg:hidden w-10 h-10 flex items-center justify-center 
                         text-slate-600 hover:text-blue-600 hover:bg-slate-100 
                         rounded-xl transition flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <!-- Page Icon + Title -->
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                 style="background: linear-gradient(135deg, #2563eb, #6366f1);">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="${page.icon}"/>
              </svg>
            </div>
            <div class="min-w-0">
              <div class="text-sm font-bold text-slate-800 truncate leading-tight">
                ${page.title}
              </div>
              <div class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold leading-tight hidden sm:block">
                ISO Doc Management
              </div>
            </div>
          </div>
        </div>

        <!-- TENGAH: Greeting (hidden di mobile) -->
        <div class="hidden md:flex items-center gap-3 flex-1 justify-center min-w-0">
          
          <!-- Divider kiri -->
          <div class="hidden lg:block w-px h-8 bg-gradient-to-b from-transparent via-slate-200 to-transparent"></div>
          
          <!-- Greeting -->
          <div class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50/80 border border-slate-100">
            <!-- Dot pulse -->
            <span class="relative flex h-2 w-2 flex-shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            
            <span class="text-sm text-slate-700 truncate">
              <span class="font-semibold">${greeting},</span>
              <span class="text-slate-500">${firstName}</span>
            </span>
            
            <span class="text-slate-300 hidden lg:inline">&middot;</span>
            
            <span class="text-xs text-slate-500 hidden lg:inline-flex items-center gap-1.5">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              ${getDateStr()}
            </span>
          </div>

          <!-- Divider kanan -->
          <div class="hidden lg:block w-px h-8 bg-gradient-to-b from-transparent via-slate-200 to-transparent"></div>
        </div>

        <!-- KANAN: Role + User Dropdown -->
        <div class="flex items-center gap-2 flex-shrink-0">
          
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
                        rounded-2xl min-w-[260px] z-[100] overflow-hidden"
                 style="box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.25);">
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

// ============================================================
// ATTACH EVENTS
// ============================================================
export function attachNavbarEvents() {
  // ===== USER DROPDOWN =====
  var wrapper = document.getElementById('userMenuWrapper');
  var btn = document.getElementById('userMenuBtn');
  var dropdown = document.getElementById('userMenuDropdown');

  if (btn && dropdown && wrapper) {
    var hideTimer = null;

    var showDropdown = function() {
      clearTimeout(hideTimer);
      dropdown.classList.remove('hidden');
    };

    var hideDropdown = function() {
      hideTimer = setTimeout(function() {
        dropdown.classList.add('hidden');
      }, 250);
    };

    wrapper.addEventListener('mouseenter', showDropdown);
    wrapper.addEventListener('mouseleave', hideDropdown);

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // ===== LOGOUT =====
  var logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) logoutBtn.onclick = logout;

  // ===== TOGGLE SIDEBAR (mobile) =====
  var toggle = document.getElementById('toggleSidebar');
  if (toggle) {
    toggle.onclick = function() {
      var sb = document.getElementById('sidebar');
      if (sb) sb.classList.toggle('hidden');
    };
  }
}
