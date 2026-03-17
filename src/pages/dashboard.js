// ============================================================
// SmartHub ERP — Dashboard Home Page
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { formatDate, formatDateTime } from '../core/ui.js';

export function renderDashboard() {
  const user = auth.getCurrentUser();
  const session = auth.getSession();
  const tenant = db.getById('tenants', session?.tenant_id);
  const totalUsers = db.count('users', u => u.tenant_id === session?.tenant_id);
  const activeUsers = db.count('users', u => u.tenant_id === session?.tenant_id && u.status === 'active');
  const roles = db.find('roles', r => r.tenant_id === session?.tenant_id);

  const trialDaysLeft = tenant?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  const content = `
    <div class="page-header">
      <div>
        <h1>Welcome back, ${user?.full_name?.split(' ')[0]}! 👋</h1>
        <p>Here's what's happening with your business today</p>
      </div>
      <div>
        ${tenant?.status === 'trial' ? `
          <div class="badge badge-info badge-dot" style="font-size:0.8rem;padding:6px 14px;">
            ${trialDaysLeft} days left in trial
          </div>
        ` : ''}
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon" style="background: var(--color-info-light); color: var(--color-info);">👥</div>
        <div class="kpi-label">Total Users</div>
        <div class="kpi-value">${totalUsers}</div>
        <div class="kpi-change up">↑ Active: ${activeUsers}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background: var(--color-success-light); color: var(--color-success);">🛡️</div>
        <div class="kpi-label">Roles Configured</div>
        <div class="kpi-value">${roles.length}</div>
        <div class="kpi-change up">↑ System ready</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background: var(--color-warning-light); color: var(--color-warning);">📦</div>
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-value">₹0</div>
        <div class="text-xs text-muted mt-2">Start by adding products & sales</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background: rgba(99,102,241,0.15); color: var(--brand-primary);">📊</div>
        <div class="kpi-label">Modules Active</div>
        <div class="kpi-value">1</div>
        <div class="text-xs text-muted mt-2">Auth & Users configured</div>
      </div>
    </div>

    <!-- Quick Actions + Recent Activity -->
    <div class="grid-2 mt-8">
      <!-- Quick Actions -->
      <div class="card">
        <div class="card-header">
          <h4>⚡ Quick Actions</h4>
        </div>
        <div class="card-body" style="padding: 0;">
          <a href="#/admin/users" class="nav-item" style="padding:1rem 1.5rem; margin:0; border-radius:0; border-bottom: 1px solid var(--border-default);">
            <span class="nav-icon">➕</span>
            <span>Add New User</span>
          </a>
          <a href="#/admin/roles" class="nav-item" style="padding:1rem 1.5rem; margin:0; border-radius:0; border-bottom: 1px solid var(--border-default);">
            <span class="nav-icon">🛡️</span>
            <span>Configure Roles</span>
          </a>
          <a href="#/settings/company" class="nav-item" style="padding:1rem 1.5rem; margin:0; border-radius:0; border-bottom: 1px solid var(--border-default);">
            <span class="nav-icon">🏢</span>
            <span>Company Setup</span>
          </a>
          <a href="#/profile" class="nav-item" style="padding:1rem 1.5rem; margin:0; border-radius:0;">
            <span class="nav-icon">👤</span>
            <span>Edit Profile</span>
          </a>
        </div>
      </div>

      <!-- Getting Started -->
      <div class="card">
        <div class="card-header">
          <h4>🚀 Getting Started</h4>
        </div>
        <div class="card-body">
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${[
              { done: true, label: 'Create account & login', icon: '✅' },
              { done: totalUsers > 1, label: 'Add team members', icon: totalUsers > 1 ? '✅' : '⬜' },
              { done: roles.length > 3, label: 'Configure roles & permissions', icon: roles.length > 3 ? '✅' : '⬜' },
              { done: false, label: 'Set up company profile', icon: '⬜' },
              { done: false, label: 'Add your first product', icon: '⬜' },
              { done: false, label: 'Create your first invoice', icon: '⬜' },
            ].map(step => `
              <div class="flex items-center gap-3" style="opacity: ${step.done ? '0.6' : '1'}; ${step.done ? 'text-decoration: line-through;' : ''}">
                <span style="font-size:1.1rem;">${step.icon}</span>
                <span class="text-sm">${step.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- System Info -->
    <div class="card mt-8">
      <div class="card-header">
        <h4>ℹ️ System Information</h4>
      </div>
      <div class="card-body">
        <div class="grid-3" style="gap: 2rem;">
          <div>
            <div class="text-xs text-muted mb-2">COMPANY</div>
            <div class="font-semibold">${tenant?.company_name || '-'}</div>
          </div>
          <div>
            <div class="text-xs text-muted mb-2">PLAN</div>
            <div class="font-semibold" style="text-transform: capitalize;">${tenant?.status || '-'}</div>
          </div>
          <div>
            <div class="text-xs text-muted mb-2">LAST LOGIN</div>
            <div class="font-semibold">${formatDateTime(user?.last_login_at)}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderDashboardLayout(content, 'dashboard', ['Dashboard']);
}
