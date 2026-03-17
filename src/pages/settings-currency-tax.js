// ============================================================
// SmartHub ERP — Settings: Currency & Tax
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderSettingsLayout } from './settings-layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml } from '../core/ui.js';

export function renderSettingsCurrencyTax() {
  const session = auth.getSession();
  const taxes = db.find('tax_slabs', t => t.tenant_id === session.tenant_id);
  const currencySettings = db.find('currency_settings', c => c.tenant_id === session.tenant_id)[0];

  const content = `
    <div class="grid-2" style="grid-template-columns: 1fr 2fr; align-items: start;">
      
      <!-- Currency Settings -->
      <div class="card">
        <div class="card-header">
          <h4>💰 Currency Formatting</h4>
        </div>
        <div class="card-body">
          <form id="currency-form" novalidate>
            <div class="form-group">
              <label class="form-label">Base Currency <span class="required">*</span></label>
              <select class="form-select" id="curr-base">
                <option value="INR" ${currencySettings?.base_currency === 'INR' ? 'selected' : ''}>INR - Indian Rupee (₹)</option>
                <option value="USD" ${currencySettings?.base_currency === 'USD' ? 'selected' : ''}>USD - US Dollar ($)</option>
                <option value="EUR" ${currencySettings?.base_currency === 'EUR' ? 'selected' : ''}>EUR - Euro (€)</option>
                <option value="GBP" ${currencySettings?.base_currency === 'GBP' ? 'selected' : ''}>GBP - British Pound (£)</option>
                <option value="AED" ${currencySettings?.base_currency === 'AED' ? 'selected' : ''}>AED - UAE Dirham (د.إ)</option>
              </select>
            </div>
            
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Decimals</label>
                <select class="form-select" id="curr-decimals">
                  <option value="0" ${currencySettings?.decimal_places === 0 ? 'selected' : ''}>0</option>
                  <option value="1" ${currencySettings?.decimal_places === 1 ? 'selected' : ''}>1</option>
                  <option value="2" ${currencySettings?.decimal_places === 2 ? 'selected' : ''}>2</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Format Style</label>
                <select class="form-select" id="curr-format">
                  <option value="indian" ${currencySettings?.number_format === 'indian' ? 'selected' : ''}>Indian (1,00,000.00)</option>
                  <option value="international" ${currencySettings?.number_format === 'international' ? 'selected' : ''}>International (100,000.00)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Date Format</label>
              <select class="form-select" id="curr-date">
                <option value="DD/MM/YYYY" ${currencySettings?.date_format === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
                <option value="MM/DD/YYYY" ${currencySettings?.date_format === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
                <option value="YYYY-MM-DD" ${currencySettings?.date_format === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
              </select>
            </div>

            <div class="form-group p-4" style="background: var(--surface-hover); border-radius: var(--radius-md);">
              <label class="form-check" style="margin-bottom:0;">
                <input type="checkbox" id="curr-multi" ${currencySettings?.multi_currency ? 'checked' : ''} />
                <span style="font-weight:500;">Enable Multi-currency setup</span>
              </label>
              <div class="text-xs text-muted" style="margin-top:0.25rem; margin-left: 28px;">
                Permits sales and purchases using foreign currencies with live conversion rates.
              </div>
            </div>

            <button type="submit" class="btn btn-primary mt-6 w-full" id="save-curr-btn">Save Formatting</button>
          </form>
        </div>
      </div>

      <!-- Tax Slabs -->
      <div class="card">
        <div class="card-header flex justify-between items-center">
          <h4>🧾 Tax Slabs</h4>
          <button class="btn btn-primary btn-sm" id="add-tax-btn">➕ Add Tax Slab</button>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tax Name</th>
                <th>Rate (%)</th>
                <th>Type</th>
                <th>Components</th>
                <th>Status</th>
                <th style="width:100px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${taxes.length === 0 ? '<tr><td colspan="6" class="text-center text-muted">No tax slabs defined.</td></tr>' : ''}
              ${taxes.map(t => `
                <tr>
                  <td>
                    <div class="font-semibold text-sm">${escapeHtml(t.name)} ${t.is_default ? '<span class="badge badge-info" style="margin-left:8px;">Default</span>' : ''}</div>
                  </td>
                  <td class="font-bold">${t.rate.toFixed(1)}%</td>
                  <td style="text-transform:uppercase;">${t.tax_system}</td>
                  <td>
                    ${t.components && t.components.length > 0 
                      ? t.components.map(c => `<span class="badge badge-neutral" style="margin-right:4px;">${c.name} ${c.rate}%</span>`).join('')
                      : '<span class="text-xs text-muted">Single</span>'}
                  </td>
                  <td>${t.status === 'active' ? '<span class="badge badge-success badge-dot">Active</span>' : '<span class="badge badge-warning badge-dot">Inactive</span>'}</td>
                  <td>
                    <div class="flex gap-1">
                      <button class="btn btn-ghost btn-sm edit-tax-btn" data-id="${t.id}">✏️</button>
                      <button class="btn btn-ghost btn-sm toggle-tax-status-btn" data-id="${t.id}">${t.status === 'active' ? '🚫' : '✅'}</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  renderSettingsLayout(content, 'currency-tax');

  // Currency form logic
  document.getElementById('currency-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-curr-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 400));

    const symMap = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AED': 'د.إ' };
    const base = document.getElementById('curr-base').value;

    const payload = {
      base_currency: base,
      symbol: symMap[base],
      decimal_places: parseInt(document.getElementById('curr-decimals').value),
      date_format: document.getElementById('curr-date').value,
      number_format: document.getElementById('curr-format').value,
      multi_currency: document.getElementById('curr-multi').checked
    };

    if (currencySettings?.id) {
      db.update('currency_settings', currencySettings.id, payload);
    } else {
      payload.tenant_id = session.tenant_id;
      db.create('currency_settings', payload);
    }
    
    setButtonLoading(btn, false);
    showToast('success', 'Formatting Saved', 'Your business locale settings have been updated.');
  });

  // Tax logic
  document.getElementById('add-tax-btn')?.addEventListener('click', () => showTaxModal(null, session.tenant_id));
  document.querySelectorAll('.edit-tax-btn').forEach(b => b.addEventListener('click', () => showTaxModal(b.dataset.id, session.tenant_id)));
  document.querySelectorAll('.toggle-tax-status-btn').forEach(b => b.addEventListener('click', (e) => {
    const tax = db.getById('tax_slabs', b.dataset.id);
    if (!tax) return;
    if (tax.is_default && tax.status === 'active') {
      showToast('error', 'Cannot Deactivate', 'Cannot deactivate the default tax slab. Reassign the default first.');
      return;
    }
    db.update('tax_slabs', tax.id, { status: tax.status === 'active' ? 'inactive' : 'active' });
    showToast('success', 'Tax Updated', `${tax.name} tax status updated.`);
    renderSettingsCurrencyTax();
  }));
}

function showTaxModal(taxId, tenantId) {
  const tax = taxId ? db.getById('tax_slabs', taxId) : null;
  const isEdit = !!tax;

  const html = `
    <form id="tax-form" novalidate>
      <div class="form-group">
        <label class="form-label">Tax Name <span class="required">*</span></label>
        <input type="text" class="form-input" id="t-name" value="${tax ? escapeHtml(tax.name) : ''}" placeholder="e.g. GST 18%" />
      </div>
      
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Tax System <span class="required">*</span></label>
          <select class="form-select" id="t-sys">
            <option value="gst" ${tax?.tax_system === 'gst' ? 'selected' : ''}>GST (India/AU/NZ)</option>
            <option value="vat" ${tax?.tax_system === 'vat' ? 'selected' : ''}>VAT (UK/UAE/EU)</option>
            <option value="sales_tax" ${tax?.tax_system === 'sales_tax' ? 'selected' : ''}>Sales Tax (US)</option>
            <option value="none" ${tax?.tax_system === 'none' ? 'selected' : ''}>Tax Exempt</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Total Rate (%) <span class="required">*</span></label>
          <input type="number" step="0.01" min="0" max="100" class="form-input" id="t-rate" value="${tax ? tax.rate : ''}" placeholder="18.00" />
        </div>
      </div>

      <div class="form-group p-3 mb-4" style="background: rgba(99,102,241,0.05); border: 1px dashed var(--border-default); border-radius: var(--radius-md);">
        <label class="form-check" style="margin-bottom:0.5rem">
          <input type="checkbox" id="t-comp-check" ${tax?.is_composite ? 'checked' : ''} />
          <span style="font-weight:500;">Is Composite Tax (e.g. CGST + SGST)</span>
        </label>
        <div id="t-comp-area" style="display:${tax?.is_composite ? 'block' : 'none'};">
          <textarea class="form-textarea" id="t-comp-json" rows="3" placeholder='[{"name": "CGST", "rate": 9}, {"name": "SGST", "rate": 9}]' style="font-family:monospace; font-size:12px;">${tax?.is_composite && tax?.components ? JSON.stringify(tax.components) : '[{"name": "CGST", "rate": 9}, {"name": "SGST", "rate": 9}]'}</textarea>
          <p class="text-xs text-muted mt-1">Provide JSON of components whose rates sum exactly to the Total Rate.</p>
        </div>
      </div>

      <div class="form-group">
        <label class="form-check">
          <input type="checkbox" id="t-default" ${tax?.is_default ? 'checked' : ''} />
          Set as default tax slab for new products
        </label>
      </div>

      <div class="modal-footer" style="padding: 1rem 0 0; border-top: 1px solid var(--border-default);">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-tax-btn">${isEdit ? 'Save Tax Slab' : 'Add Tax Slab'}</button>
      </div>
    </form>
  `;

  showModal(html, { title: isEdit ? '✏️ Edit Tax Slab' : '➕ Add Tax Slab' });

  // Toggle composite area
  document.getElementById('t-comp-check')?.addEventListener('change', (e) => {
    document.getElementById('t-comp-area').style.display = e.target.checked ? 'block' : 'none';
  });

  document.getElementById('tax-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('t-name');
    const rate = document.getElementById('t-rate');
    const isComposite = document.getElementById('t-comp-check').checked;
    
    if (validateField(name, [validators.required, validators.minLength(2)]) || validateField(rate, [validators.required])) return;

    let totalRate = parseFloat(rate.value);
    let comps = [];

    if (isComposite) {
      try {
        comps = JSON.parse(document.getElementById('t-comp-json').value);
        if (!Array.isArray(comps)) throw new Error('Must be an array');
        let sum = comps.reduce((acc, c) => acc + parseFloat(c.rate), 0);
        if (Math.abs(sum - totalRate) > 0.01) {
          showToast('error', 'Tax Mismatch', `Components sum (${sum}%) does not equal total rate (${totalRate}%).`);
          return;
        }
      } catch (err) {
        showToast('error', 'Invalid JSON', 'Tax components format is invalid array format.');
        return;
      }
    }

    const isDefault = document.getElementById('t-default').checked;
    if (isDefault) {
      db.find('tax_slabs', t => t.tenant_id === tenantId && t.is_default).forEach(t => {
        db.update('tax_slabs', t.id, { is_default: false });
      });
    }

    const btn = document.getElementById('save-tax-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 400));

    const payload = {
      name: name.value.trim(),
      rate: totalRate,
      tax_system: document.getElementById('t-sys').value,
      is_composite: isComposite,
      components: isComposite ? comps : [],
      is_default: isDefault
    };

    if (isEdit) {
      db.update('tax_slabs', taxId, payload);
      showToast('success', 'Tax Updated', `${payload.name} has been updated.`);
    } else {
      payload.tenant_id = tenantId;
      payload.status = 'active';
      db.create('tax_slabs', payload);
      showToast('success', 'Tax Created', `${payload.name} has been created.`);
    }

    closeModal();
    renderSettingsCurrencyTax();
  });
}
