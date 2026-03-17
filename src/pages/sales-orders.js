// ============================================================
// SmartHub ERP — Sales: Orders
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml, formatDate } from '../core/ui.js';

export function renderSalesOrders() {
  const session = auth.getSession();
  const orders = db.find('sales_orders', o => o.tenant_id === session.tenant_id);
  const customers = db.find('customers', c => c.tenant_id === session.tenant_id);

  const content = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="page-title">Sales Orders</h2>
        <p class="text-secondary">Manage customer orders and fulfillment status</p>
      </div>
      <button class="btn btn-primary" id="add-order-btn">➕ Create Order</button>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th style="width:120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date)).map(order => {
              const customer = customers.find(c => c.id === order.customer_id);
              const statusColors = {
                draft: 'neutral',
                confirmed: 'info',
                fulfilled: 'success',
                cancelled: 'danger'
              };
              
              return `
                <tr>
                  <td class="font-mono font-bold">${escapeHtml(order.order_number)}</td>
                  <td>
                    <div class="font-semibold">${escapeHtml(customer?.name || 'Unknown')}</div>
                  </td>
                  <td class="text-sm">${formatDate(order.order_date)}</td>
                  <td class="font-bold">₹${order.grand_total?.toLocaleString() || '0'}</td>
                  <td>
                    <span class="badge badge-${statusColors[order.status] || 'neutral'}">
                      ${order.status}
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button class="btn btn-ghost btn-sm view-order-btn" data-id="${order.id}">👁️</button>
                      ${order.status === 'confirmed' ? `
                        <button class="btn btn-success btn-sm fulfill-btn" data-id="${order.id}" title="Mark as Fulfilled">📦</button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
            ${orders.length === 0 ? '<tr><td colspan="6" class="text-center text-muted p-12">No sales orders found.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderDashboardLayout(content, 'sales-orders', ['Sales', 'Sales Orders']);

  // Event Listeners
  document.getElementById('add-order-btn')?.addEventListener('click', () => showOrderModal());

  document.querySelectorAll('.view-order-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const order = db.getById('sales_orders', btn.dataset.id);
      if (order) showOrderDetails(order);
    });
  });

  document.querySelectorAll('.fulfill-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('Mark this order as fulfilled? This will reduce inventory stock.')) {
        await fulfillOrder(id);
      }
    });
  });
}

function showOrderModal() {
  const session = auth.getSession();
  const customers = db.find('customers', c => c.tenant_id === session.tenant_id);
  const products = db.find('products', p => p.tenant_id === session.tenant_id);
  const taxSlabs = db.find('tax_slabs', t => t.tenant_id === session.tenant_id);

  let lineItems = [];

  const html = `
    <div id="order-creation-container">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Customer <span class="required">*</span></label>
          <select class="form-select" id="order-cust" required>
            <option value="">-- Choose Customer --</option>
            ${customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Order Date</label>
          <input type="date" class="form-input" id="order-date" value="${new Date().toISOString().split('T')[0]}" />
        </div>
      </div>

      <div class="card mb-4" style="background: rgba(255,255,255,0.03); border: 1px dashed var(--color-border);">
        <div class="p-3 border-b flex justify-between items-center">
          <h5 style="margin:0;">Line Items</h5>
          <button class="btn btn-primary btn-sm" id="add-item-btn">➕ Add Item</button>
        </div>
        <div class="table-container" style="max-height: 300px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th style="width:100px;">Qty</th>
                <th style="width:120px;">Price</th>
                <th style="width:100px;">Subtotal</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody id="items-tbody">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
        <div class="p-3 bg-surface-hover flex justify-end gap-6 text-sm">
          <div class="text-muted">Total Tax: <span id="total-tax">₹0</span></div>
          <div class="font-bold">Grand Total: <span id="grand-total">₹0</span></div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" id="save-order-btn">Confirm Order</button>
      </div>
    </div>
  `;

  showModal(html, { title: '🆕 Create New Sales Order', size: 'lg' });

  const tbody = document.getElementById('items-tbody');
  const addBtn = document.getElementById('add-item-btn');
  const saveBtn = document.getElementById('save-order-btn');

  const updateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;

    lineItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const taxSlab = taxSlabs.find(t => t.id === product.tax_slab_id) || { rate: 0 };
        const basePrice = item.price / (1 + taxSlab.rate / 100);
        item.taxRate = taxSlab.rate;
        item.taxAmount = (basePrice * (taxSlab.rate / 100)) * item.qty;
        item.lineTotal = item.price * item.qty;
        
        subtotal += basePrice * item.qty;
        taxTotal += item.taxAmount;
      }
    });

    document.getElementById('total-tax').textContent = `₹${taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('grand-total').textContent = `₹${(subtotal + taxTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderItems = () => {
    tbody.innerHTML = lineItems.map((item, index) => {
      const product = products.find(p => p.id === item.productId);
      return `
        <tr>
          <td>
            <select class="form-select item-prod-select" data-index="${index}">
              <option value="">-- Product --</option>
              ${products.map(p => `<option value="${p.id}" ${item.productId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </td>
          <td>
            <input type="number" class="form-input item-qty" data-index="${index}" value="${item.qty}" min="1" />
          </td>
          <td>
            <input type="number" class="form-input item-price" data-index="${index}" value="${item.price}" />
          </td>
          <td class="text-sm font-semibold">₹${(item.qty * item.price).toLocaleString()}</td>
          <td>
            <button class="btn btn-ghost btn-sm remove-item-btn" data-index="${index}">×</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row events
    document.querySelectorAll('.item-prod-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = e.target.dataset.index;
        const prod = products.find(p => p.id === e.target.value);
        if (prod) {
          lineItems[idx].productId = prod.id;
          lineItems[idx].price = prod.sale_price;
          renderItems();
          updateTotals();
        }
      });
    });

    document.querySelectorAll('.item-qty, .item-price').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = e.target.dataset.index;
        if (e.target.classList.contains('item-qty')) lineItems[idx].qty = parseInt(e.target.value) || 0;
        else lineItems[idx].price = parseFloat(e.target.value) || 0;
        updateTotals();
        // Avoid full re-render for typing performance, just update labels if needed
        e.target.closest('tr').querySelector('td:nth-child(4)').textContent = `₹${(lineItems[idx].qty * lineItems[idx].price).toLocaleString()}`;
      });
    });

    document.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        lineItems.splice(btn.dataset.index, 1);
        renderItems();
        updateTotals();
      });
    });
  };

  addBtn.addEventListener('click', () => {
    lineItems.push({ productId: '', qty: 1, price: 0 });
    renderItems();
  });

  saveBtn.addEventListener('click', async () => {
    const custId = document.getElementById('order-cust').value;
    if (!custId || lineItems.length === 0 || lineItems.some(i => !i.productId)) {
      showToast('error', 'Incomplete Data', 'Please select a customer and at least one valid product.');
      return;
    }

    setButtonLoading(saveBtn, true);
    
    // Calculate final totals for storage
    let grandTotal = 0;
    let taxAmount = 0;
    const finalItems = lineItems.map(item => {
      const prod = products.find(p => p.id === item.productId);
      const taxRate = item.taxRate || 0;
      const basePrice = item.price / (1 + taxRate/100);
      const rowTax = (basePrice * (taxRate/100)) * item.qty;
      grandTotal += item.price * item.qty;
      taxAmount += rowTax;
      
      return {
        product_id: item.productId,
        product_name: prod.name,
        quantity: item.qty,
        unit_price: basePrice,
        tax_rate: taxRate,
        tax_amount: rowTax,
        total: item.price * item.qty
      };
    });

    const orderNumber = `SO-${new Date().getFullYear()}-${(orders.length + 1).toString().padStart(3, '0')}`;

    db.create('sales_orders', {
      tenant_id: session.tenant_id,
      customer_id: custId,
      order_number: orderNumber,
      order_date: document.getElementById('order-date').value,
      status: 'confirmed',
      total_amount: grandTotal - taxAmount,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      items: finalItems
    });

    await new Promise(r => setTimeout(r, 800));
    showToast('success', 'Order Confirmed', `Order ${orderNumber} has been created.`);
    closeModal();
    renderSalesOrders();
  });

  // Initial row
  addBtn.click();
}

async function fulfillOrder(orderId) {
  const order = db.getById('sales_orders', orderId);
  const session = auth.getSession();
  if (!order) return;

  // 1. Check stock & Decrement
  for (const item of order.items) {
    const stock = db.findOne('stock_levels', s => s.product_id === item.product_id); // Simplified: checks first WH
    if (!stock || stock.current_quantity < item.quantity) {
      showToast('error', 'Insufficient Stock', `Not enough stock for ${item.product_name}.`);
      return;
    }
    
    db.update('stock_levels', stock.id, {
      current_quantity: stock.current_quantity - item.quantity
    });

    db.create('stock_ledger', {
      tenant_id: session.tenant_id,
      product_id: item.product_id,
      warehouse_id: stock.warehouse_id,
      transaction_type: 'sale',
      quantity_change: -item.quantity,
      summary: `Order Fulfillment ${order.order_number}`,
      performed_by: session.user_id
    });
  }

  // 2. Update status
  db.update('sales_orders', orderId, { status: 'fulfilled' });

  // 3. Auto-generate Invoice
  const invoiceNumber = `INV-${new Date().getFullYear()}-${(db.getAll('invoices').length + 1).toString().padStart(3, '0')}`;
  db.create('invoices', {
    tenant_id: session.tenant_id,
    order_id: order.id,
    customer_id: order.customer_id,
    invoice_number: invoiceNumber,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'unpaid',
    total_amount: order.total_amount,
    tax_amount: order.tax_amount,
    grand_total: order.grand_total,
    amount_paid: 0,
    items: order.items
  });

  showToast('success', 'Order Fulfilled', 'Stock updated and Invoice generated.');
  renderSalesOrders();
}

function showOrderDetails(order) {
  const customers = db.getAll('customers');
  const customer = customers.find(c => c.id === order.customer_id);

  const html = `
    <div class="p-4">
      <div class="flex justify-between items-start mb-6">
        <div>
          <h3 style="margin:0;">${order.order_number}</h3>
          <div class="text-sm text-muted">Date: ${formatDate(order.order_date)}</div>
        </div>
        <span class="badge badge-info">${order.status}</span>
      </div>

      <div class="mb-6">
        <label class="text-xs font-bold uppercase text-muted">Customer Information</label>
        <div class="font-semibold">${escapeHtml(customer?.name || 'Unknown')}</div>
        <div class="text-sm text-secondary">${escapeHtml(customer?.email || '')}</div>
      </div>

      <div class="table-container mb-6">
        <table class="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td class="text-sm">${escapeHtml(item.product_name)}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">₹${(item.unit_price + (item.tax_amount/item.quantity)).toLocaleString()}</td>
                <td class="text-right font-semibold">₹${item.total.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="flex flex-col items-end gap-1">
        <div class="text-sm text-secondary">Subtotal: ₹${order.total_amount.toLocaleString()}</div>
        <div class="text-sm text-secondary">Tax: ₹${order.tax_amount.toLocaleString()}</div>
        <div class="text-lg font-bold">Total: ₹${order.grand_total.toLocaleString()}</div>
      </div>

      <div class="mt-8 flex gap-2">
        <button class="btn btn-ghost w-full" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;

  showModal(html, { title: 'Order Details' });
}
