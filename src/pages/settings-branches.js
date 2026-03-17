// ============================================================
// SmartHub ERP — Settings: Branch Management
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderSettingsLayout } from './settings-layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml, formatDate } from '../core/ui.js';

export function renderSettingsBranches() {
  const session = auth.getSession();
  const branches = db.find('branches', b => b.tenant_id === session.tenant_id);
  const users = db.find('users', u => u.tenant_id === session.tenant_id && u.status === 'active');
  const company = db.find('companies', c => c.tenant_id === session.tenant_id)[0];

  const content = `
    <div class="card">
      <div class="card-header flex justify-between items-center">
        <h4>📍 Branches</h4>
        <button class="btn btn-primary btn-sm" id="add-branch-btn">➕ Add Branch</button>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Branch Details</th>
              <th>Location</th>
              <th>Type</th>
              <th>Manager</th>
              <th>Status</th>
              <th style="width:100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${branches.map(b => {
              const mgr = db.getById('users', b.manager_id);
              return `
                <tr>
                  <td>
                    <div class="font-semibold text-sm">${escapeHtml(b.name)}</div>
                    <div class="text-xs text-muted">Code: ${b.code}</div>
                  </td>
                  <td>
                    <div>${escapeHtml(b.city)}, ${escapeHtml(b.state)}</div>
                  </td>
                  <td>
                    ${b.is_hq ? '<span class="badge badge-info">Head Office</span>' : `<span class="badge badge-neutral">${b.branch_type}</span>`}
                  </td>
                  <td>${mgr ? escapeHtml(mgr.full_name) : '-'}</td>
                  <td>
                    ${b.status === 'active' ? '<span class="badge badge-success badge-dot">Active</span>' : '<span class="badge badge-warning badge-dot">Inactive</span>'}
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button class="btn btn-ghost btn-sm edit-branch-btn" data-id="${b.id}" title="Edit">✏️</button>
                      ${!b.is_hq ? `
                        <button class="btn btn-ghost btn-sm toggle-status-btn" data-id="${b.id}">
                          ${b.status === 'active' ? '🚫' : '✅'}
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderSettingsLayout(content, 'branches');

  // Events
  document.getElementById('add-branch-btn')?.addEventListener('click', () => showBranchModal(null, session.tenant_id, company.id, users));
  document.querySelectorAll('.edit-branch-btn').forEach(b => b.addEventListener('click', () => showBranchModal(b.dataset.id, session.tenant_id, company.id, users)));
  document.querySelectorAll('.toggle-status-btn').forEach(b => b.addEventListener('click', (e) => {
    const br = db.getById('branches', b.dataset.id);
    if (!br || br.is_hq) return;
    const newStatus = br.status === 'active' ? 'inactive' : 'active';
    db.update('branches', br.id, { status: newStatus });
    showToast('success', 'Branch Updated', `${br.name} is now ${newStatus}`);
    renderSettingsBranches();
  }));
}

function showBranchModal(branchId, tenantId, companyId, users) {
  const branch = branchId ? db.getById('branches', branchId) : null;
  const isEdit = !!branch;

  const html = `
    <form id="branch-form" novalidate>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Branch Name <span class="required">*</span></label>
          <input type="text" class="form-input" id="br-name" value="${branch ? escapeHtml(branch.name) : ''}" placeholder="e.g. Mumbai South" />
        </div>
        <div class="form-group">
          <label class="form-label">Branch Code <span class="required">*</span></label>
          <input type="text" class="form-input" id="br-code" value="${branch ? escapeHtml(branch.code) : ''}" placeholder="MUM-01" ${branch?.is_hq ? 'disabled title="HQ code cannot be changed"' : ''} style="text-transform: uppercase;" />
        </div>
      </div>
      
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Branch Type <span class="required">*</span></label>
          <select class="form-select" id="br-type" ${branch?.is_hq ? 'disabled' : ''}>
            <option value="regional" ${branch?.branch_type === 'regional' ? 'selected' : ''}>Regional Office</option>
            <option value="warehouse" ${branch?.branch_type === 'warehouse' ? 'selected' : ''}>Warehouse</option>
            <option value="store" ${branch?.branch_type === 'store' ? 'selected' : ''}>Store/Showroom</option>
            <option value="factory" ${branch?.branch_type === 'factory' ? 'selected' : ''}>Factory</option>
            ${branch?.is_hq ? '<option value="hq" selected>Head Office</option>' : ''}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Branch Manager <span class="required">*</span></label>
          <select class="form-select" id="br-manager">
            <option value="">Select Manager</option>
            ${users.map(u => `<option value="${u.id}" ${branch?.manager_id === u.id ? 'selected' : ''}>${u.full_name}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Address Line 1 <span class="required">*</span></label>
        <input type="text" class="form-input" id="br-addr1" value="${branch ? escapeHtml(branch.address_line1 || '') : ''}" />
      </div>

      <div class="grid-3">
        <div class="form-group">
          <label class="form-label">City <span class="required">*</span></label>
          <input type="text" class="form-input" id="br-city" value="${branch ? escapeHtml(branch.city || '') : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">State <span class="required">*</span></label>
          <input type="text" class="form-input" id="br-state" value="${branch ? escapeHtml(branch.state || '') : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">PIN Code <span class="required">*</span></label>
          <input type="text" class="form-input" id="br-pin" value="${branch ? escapeHtml(branch.pincode || '') : ''}" />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Contact Phone</label>
          <input type="tel" class="form-input" id="br-phone" value="${branch ? escapeHtml(branch.phone || '') : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Branch GST (If different)</label>
          <input type="text" class="form-input" id="br-gst" value="${branch ? escapeHtml(branch.gst_number || '') : ''}" />
        </div>
      </div>

      <div class="modal-footer" style="padding: 1rem 0 0; border-top: 1px solid var(--border-default); margin-top: 0.5rem;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-br-btn">${isEdit ? 'Save Changes' : 'Create Branch'}</button>
      </div>
    </form>
  `;

  showModal(html, { title: isEdit ? '✏️ Edit Branch' : '➕ Add New Branch', size: 'lg' });

  document.getElementById('branch-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('br-name');
    const code = document.getElementById('br-code');
    const type = document.getElementById('br-type');
    const mgr = document.getElementById('br-manager');
    const addr1 = document.getElementById('br-addr1');
    const city = document.getElementById('br-city');
    const state = document.getElementById('br-state');
    const pin = document.getElementById('br-pin');

    if (validateField(name, [validators.required, validators.minLength(3)]) ||
        validateField(code, [validators.required]) ||
        validateField(mgr, [validators.required]) ||
        validateField(addr1, [validators.required]) ||
        validateField(city, [validators.required]) ||
        validateField(state, [validators.required]) ||
        validateField(pin, [validators.required])) {
      return;
    }

    // Check duplicate code
    const uCode = code.value.trim().toUpperCase();
    const existing = db.findOne('branches', b => b.tenant_id === tenantId && b.code === uCode && b.id !== branchId);
    if (existing) {
      showToast('error', 'Duplicate Code', 'This branch code is already in use.');
      return;
    }

    const btn = document.getElementById('save-br-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 400));

    const payload = {
      name: name.value.trim(),
      manager_id: mgr.value,
      address_line1: addr1.value.trim(),
      city: city.value.trim(),
      state: state.value.trim(),
      country: 'India', // Could be dynamic
      pincode: pin.value.trim(),
      phone: document.getElementById('br-phone').value.trim(),
      gst_number: document.getElementById('br-gst').value.trim()
    };

    if (!branch?.is_hq) {
      payload.code = uCode;
      payload.branch_type = type.value;
    }

    if (isEdit) {
      db.update('branches', branchId, payload);
      showToast('success', 'Branch Updated', `${name.value.trim()} has been saved`);
    } else {
      payload.tenant_id = tenantId;
      payload.company_id = companyId;
      payload.is_hq = false;
      payload.status = 'active';
      db.create('branches', payload);
      showToast('success', 'Branch Created', `${name.value.trim()} added successfully`);
    }

    closeModal();
    renderSettingsBranches();
  });
}
