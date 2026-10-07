/**
 * Sidebar Navigasi
 */
const MENU = [
  { id: 'dashboard',         icon: '🏠', label: 'Dashboard',       roles: ['Admin','Editor','Reviewer','Viewer'] },
  { id: 'documents',         icon: '📁', label: 'Dokumen',         roles: ['Admin','Editor','Reviewer','Viewer'] },
  { id: 'upload',            icon: '⬆️', label: 'Upload',          roles: ['Admin','Editor'] },
  { id: 'approval',          icon: '✅', label: 'Approval',        roles: ['Admin','Reviewer'] },
  { id: 'review-reminder',   icon: '🔔', label: 'Reminder Review', roles: ['Admin','Editor'] },
  { id: 'audit-trail',       icon: '📊', label: 'Audit Trail',     roles: ['Admin'] },
  { id: 'users',             icon: '👥', label: 'Pengguna',        roles: ['Admin'] }
];

export function renderSidebar(user, currentPage) {
  const items = MENU.filter(m => m.roles.includes(user.role));

  return `
    <aside id="sidebar" class="w-64 bg-white border-r border-slate-200 min-h-screen flex-shrink-0 hidden md:block">
      <div class="p-4 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">ISO</div>
          <div>
            <div class="font-bold text-slate-800">Doc Management</div>
            <div class="text-xs text-slate-500">v1.0.0</div>
          </div>
        </div>
      </div>
      <nav class="p-3 space-y-1">
        ${items.map(m => {
          const isActive = m.id === currentPage;
          return `
            <a href="${m.id}.html"
               class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50'}">
              <span class="text-lg">${m.icon}</span>
              <span>${m.label}</span>
            </a>
          `;
        }).join('')}
      </nav>
    </aside>
  `;
}
