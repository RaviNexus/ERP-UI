// ============================================================
// SmartHub ERP — Settings: Industry Configuration
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderSettingsLayout } from './settings-layout.js';
import { showToast, setButtonLoading } from '../core/ui.js';

const MODULES = [
  { id: 'crm', label: 'CRM & Leads', desc: 'Manage prospects, leads, and sales pipeline' },
  { id: 'inventory', label: 'Inventory & Stock', desc: 'Track products, transfers, and valuation' },
  { id: 'sales', label: 'Sales & Invoicing', desc: 'Sales orders, invoices, and returns' },
  { id: 'purchase', label: 'Purchase & Vendors', desc: 'Purchase orders, bills, and suppliers' },
  { id: 'finance', label: 'Finance & Accounts', desc: 'Ledger, payments, P&L, balance sheet' },
  { id: 'hr', label: 'HR & Payroll', desc: 'Employees, attendance, and salaries' },
  { id: 'projects', label: 'Projects & Tasks', desc: 'Task management and timesheets' },
  { id: 'reports', label: 'Reports & Analytics', desc: 'Business intelligence dashboards' },
];

export function renderSettingsIndustry() {
  const session = auth.getSession();
  const config = db.find('industry_config', c => c.tenant_id === session.tenant_id)[0] || {
    industry_type: 'retail',
    enabled_modules: ['crm', 'inventory', 'sales', 'purchase', 'finance', 'hr', 'reports'],
    default_uom: 'Piece'
  };

  const isActive = (modId) => config.enabled_modules.includes(modId);

  const content = `
    <div class="card mb-6">
      <div class="card-header">
        <h4>🏭 Industry Type</h4>
      </div>
      <div class="card-body">
        <p class="text-sm text-muted mb-4">Selecting an industry pre-configures your workspace with the most relevant features and fields.</p>
        <div class="grid-3 mb-6">
          ${['retail', 'manufacturing', 'services', 'logistics', 'hospitality', 'construction'].map(ind => `
            <label class="card" style="cursor: pointer; padding: 1rem; border: ${config.industry_type === ind ? '2px solid var(--brand-primary)' : '1px solid var(--border-default)'};">
              <input type="radio" name="ind_type" value="${ind}" ${config.industry_type === ind ? 'checked' : ''} style="display:none;" onchange="document.getElementById('save-ind-btn').disabled = false; document.querySelector('.btn-primary').classList.add('pulse-anim');" />
              <div class="font-semibold text-sm" style="text-transform: capitalize;">${ind}</div>
            </label>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header flex justify-between items-center">
        <div>
          <h4>🧩 Active Modules</h4>
          <p class="text-xs text-muted mt-1">Enable or disable modules to customize your ERP experience.</p>
        </div>
        <button class="btn btn-primary" id="save-ind-btn">Save Configuration</button>
      </div>
      <div class="card-body">
        <div class="grid-2" style="gap: 1.5rem;">
          ${MODULES.map(m => `
            <div style="border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 1rem;" class="flex items-center justify-between">
              <div>
                <div class="font-semibold text-sm">${m.label}</div>
                <div class="text-xs text-muted mt-1">${m.desc}</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" class="module-toggle" value="${m.id}" ${isActive(m.id) ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  renderSettingsLayout(content, 'industry');

  // Listeners
  document.getElementById('save-ind-btn')?.addEventListener('click', async (e) => {
    const btn = e.target;
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 600));

    const selectedIndustry = document.querySelector('input[name="ind_type"]:checked').value;
    const activeModules = Array.from(document.querySelectorAll('.module-toggle:checked')).map(cb => cb.value);

    let dbConfig = db.find('industry_config', c => c.tenant_id === session.tenant_id)[0];
    if (dbConfig) {
      db.update('industry_config', dbConfig.id, {
        industry_type: selectedIndustry,
        enabled_modules: activeModules
      });
    } else {
      db.create('industry_config', {
        tenant_id: session.tenant_id,
        industry_type: selectedIndustry,
        enabled_modules: activeModules,
        default_uom: 'Piece'
      });
    }

    setButtonLoading(btn, false);
    btn.classList.remove('pulse-anim');
    showToast('success', 'Configuration Saved', 'Industry and module settings updated. Changes will apply on next page load.');
    
    // Quick re-render to reflect border selection changes
    setTimeout(() => renderSettingsIndustry(), 100);
  });
}
