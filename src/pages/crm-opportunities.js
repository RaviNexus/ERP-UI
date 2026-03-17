// ============================================================
// SmartHub ERP — CRM: Opportunity Pipeline
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml } from '../core/ui.js';

export function renderOpportunities() {
  const session = auth.getSession();
  const opportunities = db.find('opportunities', o => o.tenant_id === session.tenant_id);
  const customers = db.find('customers', c => c.tenant_id === session.tenant_id);

  const stages = [
    { id: 'discovery', label: 'Discovery', icon: '🔍' },
    { id: 'proposal', label: 'Proposal', icon: '📄' },
    { id: 'negotiation', label: 'Negotiation', icon: '🤝' },
    { id: 'won', label: 'Won', icon: '🏆' },
    { id: 'lost', label: 'Lost', icon: '💨' }
  ];

  const content = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="page-title">Deal Pipeline</h2>
        <p class="text-secondary">Manage and close sales opportunities</p>
      </div>
      <button class="btn btn-primary" id="add-deal-btn">➕ New Opportunity</button>
    </div>

    <div class="kanban-board">
      ${stages.map(stage => {
        const stageDeals = opportunities.filter(o => o.stage === stage.id);
        const stageTotal = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
        
        return `
          <div class="kanban-column">
            <div class="kanban-header">
              <div class="kanban-title">
                ${stage.icon} ${stage.label}
              </div>
              <span class="kanban-count">${stageDeals.length}</span>
            </div>
            <div class="p-2 text-xs text-muted font-semibold bg-surface-bg text-center" style="border-bottom: 1px solid var(--border-default);">
              Σ ₹${stageTotal.toLocaleString()}
            </div>
            <div class="kanban-list">
              ${stageDeals.map(deal => {
                const customer = customers.find(c => c.id === deal.customer_id);
                return `
                  <div class="kanban-card">
                    <div class="kanban-card-title">${escapeHtml(deal.title)}</div>
                    <div class="kanban-card-meta">
                      <span>🏢 ${escapeHtml(customer?.name || 'Unknown')}</span>
                      <span>📅 Closes: ${deal.expected_close_date || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between items-center mt-3">
                      <div style="width: 100%; height: 4px; background: var(--surface-hover); border-radius: 2px; margin-right: 8px; overflow:hidden;">
                        <div style="width: ${deal.probability}%; height:100%; background: var(--color-primary);"></div>
                      </div>
                      <span class="text-xs font-bold">${deal.probability}%</span>
                    </div>
                    <div class="kanban-card-value">₹${deal.amount?.toLocaleString() || '0'}</div>
                    <div class="flex gap-2 mt-4 pt-3" style="border-top: 1px solid var(--border-default);">
                      <button class="btn btn-ghost btn-sm edit-deal-btn" data-id="${deal.id}">✏️</button>
                      <button class="btn btn-ghost btn-sm interaction-btn" data-id="${deal.id}" title="Log Activity">📑</button>
                    </div>
                  </div>
                `;
              }).join('')}
              ${stageDeals.length === 0 ? '<div class="text-center text-muted p-4 text-xs">No active deals</div>' : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  renderDashboardLayout(content, 'crm', ['CRM', 'Pipeline']);

  // Event Listeners
  document.getElementById('add-deal-btn')?.addEventListener('click', () => showDealModal());
  
  document.querySelectorAll('.edit-deal-btn').forEach(btn => {
    btn.addEventListener('click', () => showDealModal(btn.dataset.id));
  });

  document.querySelectorAll('.interaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('info', 'Interaction Log', 'Activity logging component is being implemented next.');
    });
  });
}

function showDealModal(dealId = null) {
  const session = auth.getSession();
  const deal = dealId ? db.getById('opportunities', dealId) : null;
  const customers = db.find('customers', c => c.tenant_id === session.tenant_id);
  const isEdit = !!deal;

  const html = `
    <form id="deal-form" novalidate>
      <div class="form-group">
        <label class="form-label">Opportunity Title <span class="required">*</span></label>
        <input type="text" class="form-input" id="deal-title" value="${deal ? escapeHtml(deal.title) : ''}" placeholder="e.g. Annual Maintenance Contract" required />
      </div>
      
      <div class="form-group">
        <label class="form-label">Customer <span class="required">*</span></label>
        <select class="form-select" id="deal-customer" required>
          <option value="">Select a customer...</option>
          ${customers.map(c => `<option value="${c.id}" ${deal?.customer_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Deal Amount (₹) <span class="required">*</span></label>
          <input type="number" class="form-input" id="deal-amount" value="${deal ? deal.amount : ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Probability (%)</label>
          <input type="number" class="form-input" id="deal-prob" value="${deal ? deal.probability : '10'}" min="0" max="100" />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Stage</label>
          <select class="form-select" id="deal-stage">
            <option value="discovery" ${deal?.stage === 'discovery' ? 'selected' : ''}>Discovery</option>
            <option value="proposal" ${deal?.stage === 'proposal' ? 'selected' : ''}>Proposal</option>
            <option value="negotiation" ${deal?.stage === 'negotiation' ? 'selected' : ''}>Negotiation</option>
            <option value="won" ${deal?.stage === 'won' ? 'selected' : ''}>Won</option>
            <option value="lost" ${deal?.stage === 'lost' ? 'selected' : ''}>Lost</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Expected Close Date</label>
          <input type="date" class="form-input" id="deal-date" value="${deal ? deal.expected_close_date : ''}" />
        </div>
      </div>

      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-ghost" id="cancel-deal-modal">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-deal-btn">${isEdit ? 'Update Deal' : 'Add Deal'}</button>
      </div>
    </form>
  `;

  showModal(html, { title: isEdit ? '✏️ Edit Opportunity' : '➕ New Opportunity' });

  document.getElementById('cancel-deal-modal')?.addEventListener('click', closeModal);

  document.getElementById('deal-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('deal-title');
    const customer = document.getElementById('deal-customer');
    const amount = document.getElementById('deal-amount');

    if (validateField(title, [validators.required]) || 
        validateField(customer, [validators.required]) || 
        validateField(amount, [validators.required])) return;

    const btn = document.getElementById('save-deal-btn');
    setButtonLoading(btn, true);

    const payload = {
      title: title.value.trim(),
      customer_id: customer.value,
      amount: parseFloat(amount.value),
      probability: parseInt(document.getElementById('deal-prob').value) || 0,
      stage: document.getElementById('deal-stage').value,
      expected_close_date: document.getElementById('deal-date').value
    };

    await new Promise(r => setTimeout(r, 500));

    if (isEdit) {
      db.update('opportunities', dealId, payload);
      showToast('success', 'Deal Updated', 'Opportunity has been updated.');
    } else {
      payload.tenant_id = session.tenant_id;
      db.create('opportunities', payload);
      showToast('success', 'Deal Added', 'New opportunity added to your pipeline.');
    }

    closeModal();
    renderOpportunities();
  });
}
