// ============================================================
// SmartHub ERP — Dashboard Layout (Sidebar + Topbar + Content)
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { router } from '../core/router.js';
import { showToast, getInitials, statusBadge } from '../core/ui.js';

const NAV_ITEMS = [
  { section: 'Main', items: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
  ]},
  { section: 'Business', items: [
    { id: 'crm', label: 'CRM & Leads', icon: '👥', path: '/crm/leads', perm: 'crm.view' },
    { id: 'inventory', label: 'Inventory', icon: '📦', path: '/inventory/products', perm: 'inventory.view' },
    { id: 'sales', label: 'Sales & Invoicing', icon: '🧾', path: '/sales/dashboard', perm: 'sales.view' },
    { id: 'purchase', label: 'Purchase', icon: '🛒', path: '/purchase/vendors', perm: 'purchase.view' },
  ]},
  { section: 'Operations', items: [
    { id: 'finance', label: 'Finance', icon: '💰', path: '/finance/accounts', perm: 'finance.view' },
    { id: 'hr', label: 'HR & Payroll', icon: '👨‍💼', path: '/hr/employees', perm: 'hr.view' },
    { id: 'projects', label: 'Projects', icon: '📁', path: '/projects', perm: 'projects.view' },
  ]},
  { section: 'System', items: [
    { id: 'reports', label: 'Reports', icon: '📈', path: '/reports', perm: 'reports.view' },
    { id: 'users', label: 'User Management', icon: '🔧', path: '/admin/users', perm: 'users.view' },
    { id: 'roles', label: 'Roles & Permissions', icon: '🛡️', path: '/admin/roles', perm: 'users.view' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings/company', perm: 'settings.view' },
  ]},
];

export function renderDashboardLayout(pageContent, activeId = 'dashboard', breadcrumbs = []) {
  const app = document.getElementById('app');
  const user = auth.getCurrentUser();
  const role = auth.getCurrentRole();

  if (!user) {
    router.navigate('/login');
    return;
  }

  // Filter nav items by permissions
  const filteredNav = NAV_ITEMS.map(section => ({
    ...section,
    items: section.items.filter(item => !item.perm || auth.hasPermission(item.perm))
  })).filter(section => section.items.length > 0);

  app.innerHTML = `
    <div class="dashboard-layout">
      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon">⚡</div>
          <div>
            <div class="brand-name">SmartHub</div>
            <div class="brand-tag">ERP Platform</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          ${filteredNav.map(section => `
            <div class="nav-section">
              <div class="nav-section-title">${section.section}</div>
              ${section.items.map(item => `
                <a href="#${item.path}" class="nav-item ${item.id === activeId ? 'active' : ''}" data-nav="${item.id}">
                  <span class="nav-icon">${item.icon}</span>
                  <span>${item.label}</span>
                </a>
              `).join('')}
            </div>
          `).join('')}
        </nav>

        <div class="sidebar-footer">
          <div class="nav-item" style="cursor:pointer" id="sidebar-user-btn">
            <div class="topbar-avatar" style="width:32px;height:32px;font-size:0.75rem;">${getInitials(user.full_name)}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.8125rem;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user.full_name}</div>
              <div style="font-size:0.6875rem;color:var(--text-tertiary);">${role?.name || 'User'}</div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Top Bar -->
        <header class="topbar">
          <div class="topbar-left">
            <button class="btn btn-ghost btn-icon" id="mobile-menu-btn" style="display:none;">☰</button>
            <div class="topbar-breadcrumb">
              <span>SmartHub</span>
              ${breadcrumbs.map((b, i) =>
                `<span>/</span><span class="${i === breadcrumbs.length - 1 ? 'current' : ''}">${b}</span>`
              ).join('')}
            </div>
          </div>

          <div class="topbar-right">
            <button class="btn btn-ghost btn-icon" title="Notifications" style="position:relative;">
              🔔
              <span style="position:absolute;top:4px;right:4px;width:8px;height:8px;background:var(--color-danger);border-radius:50%;"></span>
            </button>
            <div class="dropdown" id="user-dropdown">
              <button class="topbar-avatar" id="avatar-btn" title="${user.full_name}">
                ${getInitials(user.full_name)}
              </button>
              <div class="dropdown-menu" id="user-menu">
                <div style="padding:0.75rem 1rem;border-bottom:1px solid var(--border-default);">
                  <div style="font-weight:600;font-size:0.875rem;">${user.full_name}</div>
                  <div style="font-size:0.75rem;color:var(--text-tertiary);">${user.email}</div>
                  <div style="margin-top:4px;">${statusBadge(user.status)}</div>
                </div>
                <a href="#/profile" class="dropdown-item">👤 My Profile</a>
                <a href="#/settings/company" class="dropdown-item">⚙️ Settings</a>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" id="logout-btn" style="color:var(--color-danger);">🚪 Sign Out</button>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="page-content" id="page-content">
          ${pageContent}
        </div>
      </div>
    </div>
  `;

  // ── Event Listeners ──────────────────────────────────
  // Avatar dropdown
  const avatarBtn = document.getElementById('avatar-btn');
  const userMenu = document.getElementById('user-menu');

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    userMenu.classList.remove('show');
  });

  // Sidebar user button
  document.getElementById('sidebar-user-btn')?.addEventListener('click', () => {
    router.navigate('/profile');
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    auth.logout();
    showToast('info', 'Signed Out', 'You have been logged out successfully');
    router.navigate('/login');
  });

  // Mobile menu
  if (window.innerWidth <= 768) {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (mobileBtn) {
      mobileBtn.style.display = 'flex';
      mobileBtn.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('mobile-open');
      });
    }
  }
}
