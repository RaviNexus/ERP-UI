// ============================================================
// SmartHub ERP — Settings Layout Wrapper
// ============================================================

import { renderDashboardLayout } from './layout.js';

export function renderSettingsLayout(pageContent, activeTab) {
  const tabs = [
    { id: 'company', label: '🏢 Company Profile', path: '/settings/company' },
    { id: 'branches', label: '📍 Branches', path: '/settings/branches' },
    { id: 'industry', label: '🏭 Industry Config', path: '/settings/industry' },
    { id: 'fiscal-year', label: '📅 Fiscal Year', path: '/settings/fiscal-year' },
    { id: 'currency-tax', label: '💰 Currency & Tax', path: '/settings/currency-tax' },
    { id: 'branding', label: '🎨 Branding', path: '/settings/branding' }
  ];

  const content = `
    <div class="page-header">
      <div>
        <h1>Company Settings</h1>
        <p>Manage your business profile, branches, and system preferences</p>
      </div>
    </div>

    <div class="tabs-wrapper">
      <div class="tabs">
        ${tabs.map(t => `<a href="#${t.path}" class="tab ${t.id === activeTab ? 'active' : ''}">${t.label}</a>`).join('')}
      </div>
    </div>

    <div class="settings-content">
      ${pageContent}
    </div>
  `;

  const breadcrumbs = ['Settings', tabs.find(t => t.id === activeTab)?.label?.replace(/[^a-zA-Z\s&]/g, '').trim() || 'Company'];
  renderDashboardLayout(content, 'settings', breadcrumbs);
}
