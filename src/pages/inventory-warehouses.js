// ============================================================
// SmartHub ERP — Inventory: Warehouse Management
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml } from '../core/ui.js';

export function renderWarehouses() {
  const session = auth.getSession();
  const warehouses = db.find('warehouses', w => w.tenant_id === session.tenant_id);

  const content = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="page-title">Warehouse Management</h2>
        <p class="text-secondary">Define and manage physical storage locations</p>
      </div>
      <button class="btn btn-primary" id="add-wh-btn">➕ Add Warehouse</button>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Warehouse Name</th>
              <th>Code</th>
              <th>Location</th>
              <th>Default</th>
              <th style="width:100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${warehouses.map(wh => `
              <tr>
                <td>
                  <div class="font-semibold">${escapeHtml(wh.name)}</div>
                  <div class="text-xs text-muted">ID: ${wh.id.substring(0, 8)}</div>
                </td>
                <td class="font-mono text-sm">${escapeHtml(wh.code)}</td>
                <td>${escapeHtml(wh.city || 'N/A')}</td>
                <td>
                  ${wh.is_default ? '<span class="badge badge-success">Primary</span>' : '<span class="text-xs text-muted">—</span>'}
                </td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-sm edit-wh-btn" data-id="${wh.id}">✏️</button>
                    <button class="btn btn-ghost btn-sm set-default-btn" data-id="${wh.id}" ${wh.is_default ? 'disabled' : ''} title="Make Default">🏠</button>
                  </div>
                </td>
              </tr>
            `).join('')}
            ${warehouses.length === 0 ? '<tr><td colspan="5" class="text-center text-muted p-12">No warehouses defined.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderDashboardLayout(content, 'inventory-warehouses', ['Inventory', 'Warehouses']);

  // Event Listeners
  document.getElementById('add-wh-btn')?.addEventListener('click', () => showWarehouseModal());
  
  document.querySelectorAll('.edit-wh-btn').forEach(btn => {
    btn.addEventListener('click', () => showWarehouseModal(btn.dataset.id));
  });

  document.querySelectorAll('.set-default-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      // Unset others
      warehouses.forEach(w => db.update('warehouses', w.id, { is_default: w.id === id }));
      showToast('success', 'Default Updated', 'Primary warehouse has been changed.');
      renderWarehouses();
    });
  });
}

function showWarehouseModal(whId = null) {
  const session = auth.getSession();
  const wh = whId ? db.getById('warehouses', whId) : null;
  const isEdit = !!wh;

  const html = `
    <form id="wh-form" novalidate>
      <div class="form-group">
        <label class="form-label">Warehouse Name <span class="required">*</span></label>
        <input type="text" class="form-input" id="wh-name" value="${wh ? escapeHtml(wh.name) : ''}" placeholder="e.g. South Zone Hub" required />
      </div>
      
      <div class="form-group">
        <label class="form-label">Warehouse Code <span class="required">*</span></label>
        <input type="text" class="form-input" id="wh-code" value="${wh ? escapeHtml(wh.code) : ''}" placeholder="e.g. S-HUB-01" required />
      </div>

      <div class="form-group">
        <label class="form-label">City / Location</label>
        <input type="text" class="form-input" id="wh-city" value="${wh ? escapeHtml(wh.city || '') : ''}" />
      </div>

      <div class="form-group">
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" id="wh-default" ${wh?.is_default ? 'checked' : ''} />
          <span class="text-sm">Set as Default Warehouse</span>
        </label>
      </div>

      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-ghost" id="cancel-wh-modal">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-wh-btn">${isEdit ? 'Update Warehouse' : 'Create Warehouse'}</button>
      </div>
    </form>
  `;

  showModal(html, { title: isEdit ? '🏠 Edit Warehouse' : '➕ Add Warehouse' });

  document.getElementById('cancel-wh-modal')?.addEventListener('click', closeModal);

  document.getElementById('wh-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('wh-name');
    const code = document.getElementById('wh-code');

    if (validateField(name, [validators.required]) || validateField(code, [validators.required])) return;

    const btn = document.getElementById('save-wh-btn');
    setButtonLoading(btn, true);

    const isDefault = document.getElementById('wh-default').checked;

    if (isDefault) {
      // Unset existing defaults for this tenant
      const existing = db.find('warehouses', w => w.tenant_id === session.tenant_id);
      existing.forEach(w => db.update('warehouses', w.id, { is_default: false }));
    }

    const payload = {
      name: name.value.trim(),
      code: code.value.trim().toUpperCase(),
      city: document.getElementById('wh-city').value.trim(),
      is_default: isDefault
    };

    await new Promise(r => setTimeout(r, 400));

    if (isEdit) {
      db.update('warehouses', whId, payload);
      showToast('success', 'Warehouse Updated', 'Configuration has been saved.');
    } else {
      payload.tenant_id = session.tenant_id;
      db.create('warehouses', payload);
      showToast('success', 'Warehouse Created', 'New storage location added.');
    }

    closeModal();
    renderWarehouses();
  });
}
