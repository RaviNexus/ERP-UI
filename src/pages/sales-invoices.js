// ============================================================
// SmartHub ERP — Sales: Invoices
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml, formatDate } from '../core/ui.js';

export function renderInvoices() {
  const session = auth.getSession();
  const invoices = db.find('invoices', i => i.tenant_id === session.tenant_id);
  const customers = db.find('customers', c => c.tenant_id === session.tenant_id);

  const content = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="page-title">Tax Invoices</h2>
        <p class="text-secondary">Billing records and payment tracking</p>
      </div>
      <button class="btn btn-primary" id="standalone-inv-btn">➕ Direct Invoice</button>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Grand Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Status</th>
              <th style="width:100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)).map(inv => {
              const customer = customers.find(c => c.id === inv.customer_id);
              const due = inv.grand_total - inv.amount_paid;
              const statusColors = {
                unpaid: 'warning',
                partial: 'info',
                paid: 'success',
                overdue: 'danger'
              };

              return `
                <tr>
                  <td class="font-mono font-bold">${escapeHtml(inv.invoice_number)}</td>
                  <td>
                    <div class="font-semibold">${escapeHtml(customer?.name || 'Unknown')}</div>
                  </td>
                  <td class="text-sm">${formatDate(inv.invoice_date)}</td>
                  <td class="font-bold">₹${inv.grand_total.toLocaleString()}</td>
                  <td class="text-success">₹${inv.amount_paid.toLocaleString()}</td>
                  <td class="text-danger">₹${due.toLocaleString()}</td>
                  <td>
                    <span class="badge badge-${statusColors[inv.status] || 'neutral'}">
                      ${inv.status}
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button class="btn btn-ghost btn-sm view-inv-btn" data-id="${inv.id}">👁️</button>
                      ${inv.status !== 'paid' ? `
                        <button class="btn btn-primary btn-sm pay-btn" data-id="${inv.id}" title="Log Payment">💰</button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
            ${invoices.length === 0 ? '<tr><td colspan="8" class="text-center text-muted p-12">No invoices issued yet.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderDashboardLayout(content, 'sales-invoices', ['Sales', 'Invoices']);

  // Event Listeners
  document.getElementById('standalone-inv-btn')?.addEventListener('click', () => {
    showToast('info', 'Feature Locked', 'Direct invoicing is planned for v2. Please create a Sales Order first.');
  });

  document.querySelectorAll('.view-inv-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inv = db.getById('invoices', btn.dataset.id);
      if (inv) showInvoiceDetails(inv);
    });
  });

  document.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inv = db.getById('invoices', btn.dataset.id);
      if (inv) showPaymentModal(inv);
    });
  });
}

function showInvoiceDetails(inv) {
  const customer = db.getById('customers', inv.customer_id);
  const company = db.find('companies', () => true)[0]; // Fallback to current company

  const html = `
    <div class="invoice-container p-6" id="invoice-print-area">
      <div class="flex justify-between items-start mb-8 border-b pb-6">
        <div>
          <h2 style="color: var(--color-primary); margin: 0;">TAX INVOICE</h2>
          <div class="text-xs text-muted mt-1">${inv.invoice_number}</div>
        </div>
        <div class="text-right">
          <div class="font-bold">${escapeHtml(company?.name || 'SmartHub ERP')}</div>
          <div class="text-xs text-secondary">${escapeHtml(company?.address_line1 || '')}</div>
          <div class="text-xs text-secondary">GSTIN: ${escapeHtml(company?.gst_number || '')}</div>
        </div>
      </div>

      <div class="grid-2 mb-8">
        <div>
          <label class="text-xs font-bold uppercase text-muted">Bill To</label>
          <div class="font-semibold">${escapeHtml(customer?.name || 'Unknown Client')}</div>
          <div class="text-sm text-secondary">${escapeHtml(customer?.address_line1 || '')}</div>
          <div class="text-sm text-secondary">${escapeHtml(customer?.city || '')}, ${escapeHtml(customer?.state || '')}</div>
        </div>
        <div class="text-right">
          <div class="text-sm mb-1"><span class="text-muted">Invoice Date:</span> ${formatDate(inv.invoice_date)}</div>
          <div class="text-sm"><span class="text-muted">Due Date:</span> ${formatDate(inv.due_date)}</div>
        </div>
      </div>

      <table class="data-table mb-8">
        <thead>
          <tr style="background: rgba(255,255,255,0.05);">
            <th>Item Details</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Tax (%)</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map(item => `
            <tr>
              <td>${escapeHtml(item.product_name)}</td>
              <td class="text-right">₹${item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">${item.tax_rate}%</td>
              <td class="text-right font-semibold">₹${item.total.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="flex justify-end">
        <div style="width: 250px;">
          <div class="flex justify-between text-sm py-1 border-b">
            <span class="text-muted">Subtotal</span>
            <span>₹${inv.total_amount.toLocaleString()}</span>
          </div>
          <div class="flex justify-between text-sm py-1 border-b">
            <span class="text-muted">Total Tax</span>
            <span>₹${inv.tax_amount.toLocaleString()}</span>
          </div>
          <div class="flex justify-between text-lg font-bold py-2">
            <span>Grand Total</span>
            <span style="color: var(--color-primary);">₹${inv.grand_total.toLocaleString()}</span>
          </div>
          <div class="flex justify-between text-sm py-1 text-success">
            <span>Amount Paid</span>
            <span>₹${inv.amount_paid.toLocaleString()}</span>
          </div>
          <div class="flex justify-between text-sm py-1 font-bold text-danger">
            <span>Balance Due</span>
            <span>₹${(inv.grand_total - inv.amount_paid).toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <div class="mt-12 text-center text-xs text-muted border-t pt-4">
        ${escapeHtml(company?.invoice_footer || 'Computer generated invoice. No signature required.')}
      </div>
    </div>
    
    <div class="modal-footer mt-6 flex gap-2">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print Invoice</button>
    </div>
  `;

  showModal(html, { title: 'Invoice Preview', size: 'lg' });
}

function showPaymentModal(inv) {
  const session = auth.getSession();
  const due = inv.grand_total - inv.amount_paid;

  const html = `
    <form id="payment-form">
      <div class="mb-4 p-3 rounded bg-info-subtle border border-info" style="background: rgba(14, 165, 233, 0.1);">
        <div class="text-sm text-info font-bold">Outstanding Balance</div>
        <div class="text-2xl font-bold">₹${due.toLocaleString()}</div>
      </div>

      <div class="form-group">
        <label class="form-label">Amount Received <span class="required">*</span></label>
        <input type="number" class="form-input" id="pay-amt" value="${due}" max="${due}" min="1" required />
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Payment Date</label>
          <input type="date" class="form-input" id="pay-date" value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label class="form-label">Method</label>
          <select class="form-select" id="pay-method">
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Reference / Transaction ID</label>
        <input type="text" class="form-input" id="pay-ref" placeholder="UTR #, Chq #, etc." />
      </div>

      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-success" id="confirm-pay-btn">Confirm Payment</button>
      </div>
    </form>
  `;

  showModal(html, { title: `💰 Log Payment for ${inv.invoice_number}` });

  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amtInput = document.getElementById('pay-amt');
    const amt = parseFloat(amtInput.value);

    if (amt <= 0 || amt > due) {
      showToast('error', 'Invalid Amount', 'Amount must be between 1 and the balance due.');
      return;
    }

    const btn = document.getElementById('confirm-pay-btn');
    setButtonLoading(btn, true);

    await new Promise(r => setTimeout(r, 600));

    // 1. Record Payment
    db.create('payments', {
      tenant_id: session.tenant_id,
      invoice_id: inv.id,
      amount: amt,
      payment_date: document.getElementById('pay-date').value,
      method: document.getElementById('pay-method').value,
      reference_no: document.getElementById('pay-ref').value.trim()
    });

    // 2. Update Invoice
    const newPaid = inv.amount_paid + amt;
    const newStatus = newPaid >= inv.grand_total ? 'paid' : 'partial';
    db.update('invoices', inv.id, {
      amount_paid: newPaid,
      status: newStatus
    });

    showToast('success', 'Payment Recorded', `Amount of ₹${amt.toLocaleString()} credited to ${inv.invoice_number}.`);
    closeModal();
    renderInvoices();
  });
}
