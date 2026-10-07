/**
 * Sidebar Navigasi - Premium Version
 */
const MENU = [
  { id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', 
    label: 'Dashboard', roles: ['Admin', 'Editor', 'Reviewer', 'Viewer'] },
  
  { id: 'documents', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', 
    label: 'Dokumen', roles: ['Admin', 'Editor', 'Reviewer', 'Viewer'] },
  
  { id: 'upload', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', 
    label: 'Upload', roles: ['Admin', 'Editor'] },
  
  { id: 'approval', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', 
    label: 'Approval', roles: ['Admin', 'Reviewer'] },
  
  { id: 'review-reminder', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', 
    label: 'Reminder Review', roles: ['Admin', 'Editor'] },
  
  { id: 'audit-trail', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2', 
    label: 'Audit Trail', roles: ['Admin'] },
  
  { id: 'users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', 
    label: 'Pengguna', roles: ['Admin'] }
];

export function renderSidebar(user, currentPage) {
  const items = MENU.filter(m => m.roles.includes(user.role));

  return `
    <aside id="sidebar" 
           class="w-64 flex-shrink-0 hidden lg:flex flex-col 
                  bg-white border-r border-slate-200
                  sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      
      <!-- Logo Header -->
      <div class="p-5 border-b border-slate-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center 
                      text-white font-bold shadow-lg"
               style="background: linear-gradient(135deg, #2563eb, #6366f1);">
            ISO
          </div>
          <div>
            <div class="font-bold text-slate-800 text-sm">Doc Management</div>
            <div class="text-xs text-slate-500">v1.0.0</div>
          </div>
        </div>
      </div>

      <!-- Menu -->
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        ${items.map(m => {
          const isActive = m.id === currentPage;
          return `
            <a href="${m.id}.html" 
               class="sidebar-item ${isActive ? 'active' : ''}">
              <span class="sidebar-icon">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" 
                     viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="${m.icon}"/>
                </svg>
              </span>
              <span>${m.label}</span>
            </a>
          `;
        }).join('')}
      </nav>

      <!-- Footer -->
      <div class="p-4 border-t border-slate-100">
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 
                    border border-blue-100">
          <div class="flex items-center gap-2 text-xs text-blue-700 font-semibold mb-1">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full pulse-dot"></span>
            Sistem Aktif
          </div>
          <div class="text-xs text-slate-500">Kendari, Sulawesi Tenggara</div>
        </div>
      </div>
    </aside>
  `;
}
