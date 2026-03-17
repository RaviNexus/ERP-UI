// ============================================================
// SmartHub ERP — CRM: Customer Directory
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml, statusBadge } from '../core/ui.js';

export function renderCustomers() {
  const session = auth.getSession();
  const customers = db.find('customers', c => c.tenant_id === session.tenant_id);

  const content = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="page-title">Customer Directory</h2>
        <p class="text-secondary">Manage your client relationships</p>
      </div>
      <button class="btn btn-primary" id="add-customer-btn">➕ Add Customer</button>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact Info</th>
              <th>Location</th>
              <th>Type</th>
              <th>Status</th>
              <th style="width:100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(customer => `
              <tr>
                <td>
                  <div class="font-semibold">${escapeHtml(customer.name)}</div>
                  <div class="text-xs text-muted">${customer.tax_id || 'No Tax ID'}</div>
                </td>
                <td>
                  <div class="text-sm">${escapeHtml(customer.email)}</div>
                  <div class="text-xs text-muted">${escapeHtml(customer.phone)}</div>
                </td>
                <td>
                  <div class="text-sm">${escapeHtml(customer.city || '')}${customer.city && customer.state ? ', ' : ''}${escapeHtml(customer.state || '')}</div>
                </td>
                <td>
                  <span class="badge badge-neutral">${customer.customer_type === 'corporate' ? '🏢 Corporate' : '👤 Individual'}</span>
                </td>
                <td>${statusBadge(customer.status)}</td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-sm edit-customer-btn" data-id="${customer.id}" title="Edit">✏️</button>
                    <button class="btn btn-ghost btn-sm view-customer-btn" data-id="${customer.id}" title="View Details">👁️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
            ${customers.length === 0 ? '<tr><td colspan="6" class="text-center text-muted p-8">No customers found. Click "Add Customer" to get started.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderDashboardLayout(content, 'crm', ['CRM', 'Customers']);

  // Event Listeners
  document.getElementById('add-customer-btn')?.addEventListener('click', () => showCustomerModal());
  
  document.querySelectorAll('.edit-customer-btn').forEach(btn => {
    btn.addEventListener('click', () => showCustomerModal(btn.dataset.id));
  });

  document.querySelectorAll('.view-customer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('info', 'Customer Timeline', 'Detailed timeline view is being built.');
    });
  });
}

function showCustomerModal(customerId = null) {
  const customer = customerId ? db.getById('customers', customerId) : null;
  const isEdit = !!customer;

  const html = `
    <form id="customer-form" novalidate>
      <div class="form-group">
        <label class="form-label">Legal Name <span class="required">*</span></label>
        <input type="text" class="form-input" id="cust-name" value="${customer ? escapeHtml(customer.name) : ''}" required />
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Customer Type</label>
          <select class="form-select" id="cust-type">
            <option value="corporate" ${customer?.customer_type === 'corporate' ? 'selected' : ''}>Corporate</option>
            <option value="individual" ${customer?.customer_type === 'individual' ? 'selected' : ''}>Individual</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tax ID (GST/VAT)</label>
          <input type="text" class="form-input" id="cust-tax" value="${customer ? escapeHtml(customer.tax_id || '') : ''}" />
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Email <span class="required">*</span></label>
          <input type="email" class="form-input" id="cust-email" value="${customer ? escapeHtml(customer.email || '') : ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Phone <span class="required">*</span></label>
          <input type="tel" class="form-input" id="cust-phone" value="${customer ? escapeHtml(customer.phone || '') : ''}" required />
        </div>
      </div>
      
      <h5 class="mt-4 mb-2">Address Details</h5>
      <div class="form-group">
        <label class="form-label">Street Address</label>
        <input type="text" class="form-input" id="cust-addr" value="${customer ? escapeHtml(customer.address_line1 || '') : ''}" />
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">City</label>
          <input type="text" class="form-input" id="cust-city" value="${customer ? escapeHtml(customer.city || '') : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">State</label>
          <input type="text" class="form-input" id="cust-state" value="${customer ? escapeHtml(customer.state || '') : ''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="cust-status">
          <option value="active" ${customer?.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${customer?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
      
      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-ghost" id="cancel-cust-modal">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-cust-btn">${isEdit ? 'Update' : 'Create'}</button>
      </div>
    </form>
  `;

  showModal(html, { title: isEdit ? '✏️ Edit Customer' : '➕ Add New Customer' });

  document.getElementById('cancel-cust-modal')?.addEventListener('click', closeModal);

  document.getElementById('customer-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fields = {
      name: document.getElementById('cust-name'),
      email: document.getElementById('cust-email'),
      phone: document.getElementById('cust-phone')
    };

    const hasError = Object.values(fields).some(field => 
      validateField(field, [validators.required, ...(field.id === 'cust-email' ? [validators.email] : [])])
    );

    if (hasError) return;

    const btn = document.getElementById('save-cust-btn');
    setButtonLoading(btn, true);

    const payload = {
      name: fields.name.value.trim(),
      customer_type: document.getElementById('cust-type').value,
      tax_id: document.getElementById('cust-tax').value.trim(),
      email: fields.email.value.trim(),
      phone: fields.phone.value.trim(),
      address_line1: document.getElementById('cust-addr').value.trim(),
      city: document.getElementById('cust-city').value.trim(),
      state: document.getElementById('cust-state').value.trim(),
      status: document.getElementById('cust-status').value
    };

    await new Promise(r => setTimeout(r, 500));

    if (isEdit) {
      db.update('customers', customerId, payload);
      showToast('success', 'Customer Updated', 'Information has been successfully updated.');
    } else {
      payload.tenant_id = auth.getSession().tenant_id;
      db.create('customers', payload);
      showToast('success', 'Customer Created', 'New business entity added to your records.');
    }

    closeModal();
    renderCustomers();
  });
}
