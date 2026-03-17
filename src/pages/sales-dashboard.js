// ============================================================
// SmartHub ERP — Sales: Dashboard
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { escapeHtml } from '../core/ui.js';

export function renderSalesDashboard() {
  const session = auth.getSession();
  const invoices = db.find('invoices', i => i.tenant_id === session.tenant_id);
  const orders = db.find('sales_orders', o => o.tenant_id === session.tenant_id);

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
  const totalReceived = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const totalPending = totalRevenue - totalReceived;
  const activeOrders = orders.filter(o => o.status === 'confirmed').length;

  const content = `
    <div class="mb-6">
      <h2 class="page-title">Sales Overview</h2>
      <p class="text-secondary">Track revenue, orders, and customer payments</p>
    </div>

    <div class="stats-grid grid-4 mb-6">
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(99, 102, 241, 0.1); color: var(--color-primary);">💰</div>
        <div class="stat-info">
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value">₹${totalRevenue.toLocaleString()}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(34, 197, 94, 0.1); color: var(--color-success);">📥</div>
        <div class="stat-info">
          <div class="stat-label">Received</div>
          <div class="stat-value">₹${totalReceived.toLocaleString()}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--color-warning);">⏳</div>
        <div class="stat-info">
          <div class="stat-label">Pending Dues</div>
          <div class="stat-value">₹${totalPending.toLocaleString()}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">🏗️</div>
        <div class="stat-info">
          <div class="stat-label">Active Orders</div>
          <div class="stat-value">${activeOrders}</div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header flex justify-between items-center">
          <h4>Recent Invoices</h4>
          <a href="#/sales/invoices" class="btn btn-ghost btn-sm">View All</a>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.slice(0, 5).map(inv => `
                <tr>
                  <td class="font-mono text-sm">${inv.invoice_number}</td>
                  <td>
                    <span class="badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'partial' ? 'info' : 'warning'} text-xs">
                      ${inv.status}
                    </span>
                  </td>
                  <td class="font-semibold text-right">₹${inv.grand_total.toLocaleString()}</td>
                </tr>
              `).join('')}
              ${invoices.length === 0 ? '<tr><td colspan="3" class="text-center text-muted p-4">No invoices yet.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header flex justify-between items-center">
          <h4>Key Customers</h4>
          <a href="#/crm/customers" class="btn btn-ghost btn-sm">Directory</a>
        </div>
        <div class="p-4">
          <p class="text-sm text-muted">Customer spending analysis coming soon!</p>
          <div class="mt-4 flex flex-col gap-3">
            <div class="flex items-center justify-between p-2 rounded bg-surface-hover">
              <span class="text-sm font-medium">Reliance Retail</span>
              <span class="font-bold text-success">₹${totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderDashboardLayout(content, 'sales-dashboard', ['Sales', 'Dashboard']);
}
