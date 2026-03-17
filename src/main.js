// ============================================================
// SmartHub ERP — Main Application Entry Point
// ============================================================

import { router } from './core/router.js';
import { auth } from './core/auth.js';
import { seedDatabase } from './core/seed.js';

// Pages
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderForgotPassword, renderResetPassword } from './pages/forgot-password.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderProfile } from './pages/profile.js';
import { renderUserManagement } from './pages/user-management.js';
import { renderRolesPermissions } from './pages/roles.js';
import { renderSettingsCompany } from './pages/settings-company.js';
import { renderSettingsBranches } from './pages/settings-branches.js';
import { renderSettingsIndustry } from './pages/settings-industry.js';
import { renderSettingsFiscalYear } from './pages/settings-fiscal-year.js';
import { renderSettingsCurrencyTax } from './pages/settings-currency-tax.js';
import { renderSettingsBranding } from './pages/settings-branding.js';

// CRM Module
import { renderLeads } from './pages/crm-leads.js';
import { renderCustomers } from './pages/crm-customers.js';
import { renderOpportunities } from './pages/crm-opportunities.js';
import { renderInteractions } from './pages/crm-interactions.js';

// Inventory Module
import { renderProducts } from './pages/inventory-products.js';
import { renderWarehouses } from './pages/inventory-warehouses.js';
import { renderStockAdjustments } from './pages/inventory-adjustments.js';
import { renderCategoriesUoMs } from './pages/inventory-config.js';

// Sales Module
import { renderSalesDashboard } from './pages/sales-dashboard.js';
import { renderSalesOrders } from './pages/sales-orders.js';
import { renderInvoices } from './pages/sales-invoices.js';


// ── Seed Database ────────────────────────────────────────
seedDatabase();

// ── Auth Guard ───────────────────────────────────────────
const publicRoutes = ['/login', '/register', '/forgot-password'];

router.before((route) => {
  const isPublic = publicRoutes.some(p => route.path === p) || route.path.startsWith('/reset-password');

  if (!isPublic && !auth.isAuthenticated()) {
    router.navigate('/login');
    return false;
  }

  if (isPublic && auth.isAuthenticated() && route.path !== '/login') {
    // Allow navigation to public routes even when logged in
  } else if (route.path === '/login' && auth.isAuthenticated()) {
    router.navigate('/dashboard');
    return false;
  }

  return true;
});

// ── Routes ───────────────────────────────────────────────
// Public routes
router.addRoute('/login', () => renderLogin(), { public: true });
router.addRoute('/register', () => renderRegister(), { public: true });
router.addRoute('/forgot-password', () => renderForgotPassword(), { public: true });
router.addRoute('/reset-password/:token', (params) => renderResetPassword(params), { public: true });

// Protected routes
router.addRoute('/dashboard', () => renderDashboard());
router.addRoute('/profile', () => renderProfile());
router.addRoute('/admin/users', () => renderUserManagement());
router.addRoute('/admin/roles', () => renderRolesPermissions());

// Placeholder routes for future modules
const placeholderPage = (title, icon, desc) => () => {
  import('./pages/layout.js').then(({ renderDashboardLayout }) => {
    renderDashboardLayout(`
      <div class="empty-state" style="padding: 6rem 2rem;">
        <div class="empty-icon" style="font-size: 4rem;">${icon}</div>
        <h2 style="margin-top: 1rem;">${title}</h2>
        <p class="text-muted mt-2">${desc}</p>
        <div class="mt-6">
          <span class="badge badge-info badge-dot" style="font-size: 0.875rem; padding: 8px 16px;">
            Coming Soon
          </span>
        </div>
      </div>
    `, '', [title]);
  });
};

// Module 3: CRM Routes
router.addRoute('/crm/leads', () => renderLeads());
router.addRoute('/crm/customers', () => renderCustomers());
router.addRoute('/crm/pipeline', () => renderOpportunities());
router.addRoute('/crm/interactions', () => renderInteractions());

// Module 4: Inventory Routes
router.addRoute('/inventory/products', () => renderProducts());
router.addRoute('/inventory/warehouses', () => renderWarehouses());
router.addRoute('/inventory/adjustments', () => renderStockAdjustments());
router.addRoute('/inventory/config', () => renderCategoriesUoMs());

// Module 5: Sales Routes
router.addRoute('/sales/dashboard', () => renderSalesDashboard());
router.addRoute('/sales/orders', () => renderSalesOrders());
router.addRoute('/sales/invoices', () => renderInvoices());

// Future module placeholders
router.addRoute('/crm/leads-old', placeholderPage('CRM & Leads', '👥', 'Old CRM view removed'));
router.addRoute('/inventory/products-old', placeholderPage('Inventory', '📦', 'Old inventory view removed'));
router.addRoute('/sales/dashboard-old', placeholderPage('Sales', '🧾', 'Old sales view removed'));
router.addRoute('/purchase/vendors', placeholderPage('Purchase & Vendors', '🛒', 'Purchase and vendor management coming soon'));
router.addRoute('/finance/accounts', placeholderPage('Finance & Accounting', '💰', 'Finance and accounting module coming soon'));
router.addRoute('/hr/employees', placeholderPage('HR & Payroll', '👨‍💼', 'HR and payroll module coming soon'));
router.addRoute('/projects', placeholderPage('Projects & Tasks', '📁', 'Projects and task management coming soon'));
router.addRoute('/reports', placeholderPage('Reports & Analytics', '📈', 'Reports and dashboards coming soon'));

// Module 2: Settings Routes
router.addRoute('/settings/company', () => renderSettingsCompany());
router.addRoute('/settings/branches', () => renderSettingsBranches());
router.addRoute('/settings/industry', () => renderSettingsIndustry());
router.addRoute('/settings/fiscal-year', () => renderSettingsFiscalYear());
router.addRoute('/settings/currency-tax', () => renderSettingsCurrencyTax());
router.addRoute('/settings/branding', () => renderSettingsBranding());

// ── Initial Route ────────────────────────────────────────
if (!window.location.hash) {
  window.location.hash = auth.isAuthenticated() ? '#/dashboard' : '#/login';
}

console.log('⚡ SmartHub ERP v1.0 — Module 1: Auth & User Management');
console.log('📧 Demo: rajesh@smarthub.com / Admin@123');
