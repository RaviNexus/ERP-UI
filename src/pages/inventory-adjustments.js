// ============================================================
// SmartHub ERP — Inventory: Stock Adjustments
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml, formatDate } from '../core/ui.js';

export function renderStockAdjustments() {
  const session = auth.getSession();
  const ledger = db.find('stock_ledger', l => l.tenant_id === session.tenant_id);
  const products = db.find('products', p => p.tenant_id === session.tenant_id);
  const warehouses = db.find('warehouses', w => w.tenant_id === session.tenant_id);
  const users = db.getAll('users');

  const content = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="page-title">Stock Adjustments</h2>
        <p class="text-secondary">Manual quantity corrections and stock ledger audit</p>
      </div>
      <button class="btn btn-primary" id="new-adj-btn">📉 New Adjustment</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h4>Recent Inventory Movements</h4>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Warehouse</th>
              <th>Type</th>
              <th>Change</th>
              <th>Summary</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            ${ledger.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(entry => {
              const product = products.find(p => p.id === entry.product_id);
              const warehouse = warehouses.find(w => w.id === entry.warehouse_id);
              const user = users.find(u => u.id === entry.performed_by);
              const isPositive = entry.quantity_change > 0;

              return `
                <tr>
                  <td class="text-sm">${formatDate(entry.created_at)}</td>
                  <td>
                    <div class="font-semibold">${escapeHtml(product?.name || 'Unknown')}</div>
                    <div class="text-xs text-muted">${product?.sku || ''}</div>
                  </td>
                  <td class="text-sm">${escapeHtml(warehouse?.name || 'Unknown')}</td>
                  <td>
                    <span class="badge ${entry.transaction_type === 'adjustment' ? 'badge-neutral' : 'badge-info'}">
                      ${entry.transaction_type}
                    </span>
                  </td>
                  <td>
                    <span class="font-bold ${isPositive ? 'text-success' : 'text-danger'}">
                      ${isPositive ? '+' : ''}${entry.quantity_change}
                    </span>
                  </td>
                  <td class="text-xs text-muted">${escapeHtml(entry.summary || '')}</td>
                  <td>
                    <div class="text-xs">${user ? escapeHtml(user.full_name) : 'System'}</div>
                  </td>
                </tr>
              `;
            }).join('')}
            ${ledger.length === 0 ? '<tr><td colspan="7" class="text-center text-muted p-12">No movement logs found.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderDashboardLayout(content, 'inventory-adjustments', ['Inventory', 'Adjustments']);

  // Event Listeners
  document.getElementById('new-adj-btn')?.addEventListener('click', () => showAdjustmentModal());
}

function showAdjustmentModal() {
  const session = auth.getSession();
  const products = db.find('products', p => p.tenant_id === session.tenant_id);
  const warehouses = db.find('warehouses', w => w.tenant_id === session.tenant_id);

  const html = `
    <form id="adj-form" novalidate>
      <div class="form-group">
        <label class="form-label">Select Product <span class="required">*</span></label>
        <select class="form-select" id="adj-prod" required>
          <option value="">-- Select Product --</option>
          ${products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${p.sku})</option>`).join('')}
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Warehouse <span class="required">*</span></label>
        <select class="form-select" id="adj-wh" required>
          ${warehouses.map(w => `<option value="${w.id}" ${w.is_default ? 'selected' : ''}>${escapeHtml(w.name)}</option>`).join('')}
        </select>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Adjustment Type</label>
          <select class="form-select" id="adj-type">
            <option value="addition">➕ Increase Stock</option>
            <option value="reduction">➖ Decrease Stock</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Quantity <span class="required">*</span></label>
          <input type="number" class="form-input" id="adj-qty" step="1" min="1" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Reason / Summary <span class="required">*</span></label>
        <input type="text" class="form-input" id="adj-summary" placeholder="e.g. Damage correction, Opening balance" required />
      </div>

      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-ghost" id="cancel-adj-modal">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-adj-btn">Submit Adjustment</button>
      </div>
    </form>
  `;

  showModal(html, { title: '📊 New Stock Adjustment' });

  document.getElementById('cancel-adj-modal')?.addEventListener('click', closeModal);

  document.getElementById('adj-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const product = document.getElementById('adj-prod');
    const warehouse = document.getElementById('adj-wh');
    const qtyInput = document.getElementById('adj-qty');
    const summary = document.getElementById('adj-summary');

    if (validateField(product, [validators.required]) || 
        validateField(warehouse, [validators.required]) || 
        validateField(qtyInput, [validators.required]) ||
        validateField(summary, [validators.required])) return;

    const btn = document.getElementById('save-adj-btn');
    setButtonLoading(btn, true);

    const type = document.getElementById('adj-type').value;
    const qtyValue = parseInt(qtyInput.value);
    const finalChange = type === 'addition' ? qtyValue : -qtyValue;

    await new Promise(r => setTimeout(r, 600));

    // 1. Log to Ledger
    db.create('stock_ledger', {
      tenant_id: session.tenant_id,
      product_id: product.value,
      warehouse_id: warehouse.value,
      transaction_type: 'adjustment',
      quantity_change: finalChange,
      summary: summary.value.trim(),
      performed_by: session.user_id
    });

    // 2. Update Stock Levels
    const existingLevel = db.findOne('stock_levels', s => 
      s.product_id === product.value && s.warehouse_id === warehouse.value
    );

    if (existingLevel) {
      db.update('stock_levels', existingLevel.id, {
        current_quantity: (existingLevel.current_quantity || 0) + finalChange
      });
    } else {
      db.create('stock_levels', {
        tenant_id: session.tenant_id,
        product_id: product.value,
        warehouse_id: warehouse.value,
        current_quantity: finalChange,
        reserved_quantity: 0,
        opening_quantity: 0
      });
    }

    showToast('success', 'Stock Adjusted', 'Inventory levels have been updated.');
    closeModal();
    renderStockAdjustments();
  });
}
