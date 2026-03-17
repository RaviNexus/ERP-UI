// ============================================================
// SmartHub ERP — Settings: Company Profile
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderSettingsLayout } from './settings-layout.js';
import { showToast, validators, validateField, setButtonLoading, escapeHtml } from '../core/ui.js';

export function renderSettingsCompany() {
  const session = auth.getSession();
  const tenants = db.find('companies', c => c.tenant_id === session.tenant_id);
  // Get first company (since 1 tenant = 1 company for now)
  let company = tenants.length > 0 ? tenants[0] : null;

  if (!company) {
    company = db.create('companies', {
      tenant_id: session.tenant_id,
      name: 'My Company (Auto-generated)',
      display_name: 'My Company',
      company_type: 'pvt_ltd',
      country: 'India'
    });
    showToast('info', 'Company Initialized', 'A new default company profile was initialized for your account.');
  }

  const content = `
    <div class="card">
      <div class="card-header">
        <h4>🏢 Company Information</h4>
      </div>
      <div class="card-body">
        <form id="company-form" novalidate>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="comp-name">Company Name <span class="required">*</span></label>
              <input type="text" class="form-input" id="comp-name" value="${escapeHtml(company.name)}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-display">Display Name</label>
              <input type="text" class="form-input" id="comp-display" value="${escapeHtml(company.display_name || '')}" placeholder="Short name for UI" />
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-reg">Registration Number <span class="required">*</span></label>
              <input type="text" class="form-input" id="comp-reg" value="${escapeHtml(company.reg_number || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-type">Company Type <span class="required">*</span></label>
              <select class="form-select" id="comp-type">
                <option value="pvt_ltd" ${company.company_type === 'pvt_ltd' ? 'selected' : ''}>Pvt. Ltd.</option>
                <option value="llp" ${company.company_type === 'llp' ? 'selected' : ''}>LLP</option>
                <option value="proprietorship" ${company.company_type === 'proprietorship' ? 'selected' : ''}>Proprietorship</option>
                <option value="partnership" ${company.company_type === 'partnership' ? 'selected' : ''}>Partnership</option>
                <option value="public" ${company.company_type === 'public' ? 'selected' : ''}>Public Limited</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-gst">GST / Tax Number <span class="required">*</span></label>
              <input type="text" class="form-input" id="comp-gst" value="${escapeHtml(company.gst_number || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-pan">PAN Number</label>
              <input type="text" class="form-input" id="comp-pan" value="${escapeHtml(company.pan_number || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-email">Contact Email <span class="required">*</span></label>
              <input type="email" class="form-input" id="comp-email" value="${escapeHtml(company.email || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-phone">Contact Phone <span class="required">*</span></label>
              <input type="tel" class="form-input" id="comp-phone" value="${escapeHtml(company.phone || '')}" maxlength="15" />
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-website">Website</label>
              <input type="url" class="form-input" id="comp-website" value="${escapeHtml(company.website || '')}" placeholder="https://" />
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-year">Founded Year</label>
              <input type="number" class="form-input" id="comp-year" value="${company.founded_year || ''}" min="1800" max="${new Date().getFullYear()}" />
            </div>
          </div>

          <h5 class="mt-6 mb-4" style="border-bottom: 1px solid var(--border-default); padding-bottom: 0.5rem;">Registered Address</h5>
          
          <div class="form-group">
            <label class="form-label" for="comp-addr1">Address Line 1 <span class="required">*</span></label>
            <input type="text" class="form-input" id="comp-addr1" value="${escapeHtml(company.address_line1 || '')}" />
          </div>
          
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="comp-city">City <span class="required">*</span></label>
              <input type="text" class="form-input" id="comp-city" value="${escapeHtml(company.city || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-state">State <span class="required">*</span></label>
              <input type="text" class="form-input" id="comp-state" value="${escapeHtml(company.state || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-country">Country <span class="required">*</span></label>
              <select class="form-select" id="comp-country">
                <option value="India" ${company.country === 'India' ? 'selected' : ''}>India</option>
                <option value="United States" ${company.country === 'United States' ? 'selected' : ''}>United States</option>
                <option value="United Kingdom" ${company.country === 'United Kingdom' ? 'selected' : ''}>United Kingdom</option>
                <option value="United Arab Emirates" ${company.country === 'United Arab Emirates' ? 'selected' : ''}>United Arab Emirates</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-pin">PIN / ZIP Code <span class="required">*</span></label>
              <input type="text" class="form-input" id="comp-pin" value="${escapeHtml(company.pincode || '')}" />
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <button type="submit" class="btn btn-primary" id="save-comp-btn">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  renderSettingsLayout(content, 'company');

  // Event Listeners
  document.getElementById('company-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('comp-name');
    const reg = document.getElementById('comp-reg');
    const gst = document.getElementById('comp-gst');
    const email = document.getElementById('comp-email');
    const phone = document.getElementById('comp-phone');
    const addr1 = document.getElementById('comp-addr1');
    const city = document.getElementById('comp-city');
    const state = document.getElementById('comp-state');
    const pin = document.getElementById('comp-pin');

    const e1 = validateField(name, [validators.required, validators.minLength(3)]);
    const e2 = validateField(reg, [validators.required]);
    const e3 = validateField(gst, [validators.required]);
    const e4 = validateField(email, [validators.required, validators.email]);
    const e5 = validateField(phone, [validators.required]);
    const e6 = validateField(addr1, [validators.required]);
    const e7 = validateField(city, [validators.required]);
    const e8 = validateField(state, [validators.required]);
    const e9 = validateField(pin, [validators.required]);

    if (e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9) {
      showToast('error', 'Validation Error', 'Please check the required fields.');
      return;
    }

    const btn = document.getElementById('save-comp-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 600));

    db.update('companies', company.id, {
      name: name.value.trim(),
      display_name: document.getElementById('comp-display').value.trim(),
      reg_number: reg.value.trim(),
      company_type: document.getElementById('comp-type').value,
      gst_number: gst.value.trim(),
      pan_number: document.getElementById('comp-pan').value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      website: document.getElementById('comp-website').value.trim(),
      founded_year: document.getElementById('comp-year').value ? parseInt(document.getElementById('comp-year').value) : null,
      address_line1: addr1.value.trim(),
      city: city.value.trim(),
      state: state.value.trim(),
      country: document.getElementById('comp-country').value,
      pincode: pin.value.trim()
    });

    setButtonLoading(btn, false);
    showToast('success', 'Profile Saved', 'Company profile has been updated successfully.');
  });
}
