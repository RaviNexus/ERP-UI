// ============================================================
// SmartHub ERP — CRM: Leads Management
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml } from '../core/ui.js';

export function renderLeads() {
  const session = auth.getSession();
  const leads = db.find('leads', l => l.tenant_id === session.tenant_id);
  
  const stages = [
    { id: 'new', label: 'New', icon: '✨' },
    { id: 'contacted', label: 'Contacted', icon: '📞' },
    { id: 'qualified', label: 'Qualified', icon: '✅' },
    { id: 'lost', label: 'Lost', icon: '❌' }
  ];

  const content = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="page-title">Leads Management</h2>
        <p class="text-secondary">Track and convert potential customers</p>
      </div>
      <button class="btn btn-primary" id="add-lead-btn">➕ Add New Lead</button>
    </div>

    <div class="kanban-board">
      ${stages.map(stage => {
        const stageLeads = leads.filter(l => l.status === stage.id);
        return `
          <div class="kanban-column" data-stage="${stage.id}">
            <div class="kanban-header">
              <div class="kanban-title">
                ${stage.icon} ${stage.label}
              </div>
              <span class="kanban-count">${stageLeads.length}</span>
            </div>
            <div class="kanban-list" id="list-${stage.id}">
              ${stageLeads.map(lead => `
                <div class="kanban-card" data-id="${lead.id}">
                  <div class="kanban-card-title">${escapeHtml(lead.first_name)} ${escapeHtml(lead.last_name)}</div>
                  <div class="kanban-card-meta">
                    <span>🏢 ${escapeHtml(lead.company_name)}</span>
                    <span>📧 ${escapeHtml(lead.email)}</span>
                    <span>📱 ${escapeHtml(lead.phone)}</span>
                  </div>
                  <div class="flex justify-between items-center mt-3">
                    <span class="kanban-card-tag">${escapeHtml(lead.source)}</span>
                    <div class="kanban-card-value">₹${lead.expected_value?.toLocaleString() || '0'}</div>
                  </div>
                  <div class="flex gap-2 mt-4 pt-3" style="border-top: 1px solid var(--border-default);">
                    <button class="btn btn-ghost btn-sm edit-lead-btn" data-id="${lead.id}">✏️</button>
                    ${lead.status === 'qualified' ? `
                      <button class="btn btn-ghost btn-sm convert-lead-btn" data-id="${lead.id}" title="Convert to Customer">🚀</button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
              ${stageLeads.length === 0 ? '<div class="text-center text-muted p-4 text-xs">No leads in this stage</div>' : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  renderDashboardLayout(content, 'crm', ['CRM', 'Leads']);

  // Event Listeners
  document.getElementById('add-lead-btn')?.addEventListener('click', () => showLeadModal());
  
  document.querySelectorAll('.edit-lead-btn').forEach(btn => {
    btn.addEventListener('click', () => showLeadModal(btn.dataset.id));
  });

  document.querySelectorAll('.convert-lead-btn').forEach(btn => {
    btn.addEventListener('click', () => convertLead(btn.dataset.id));
  });
}

function showLeadModal(leadId = null) {
  const lead = leadId ? db.getById('leads', leadId) : null;
  const isEdit = !!lead;

  const html = `
    <form id="lead-form" novalidate>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">First Name <span class="required">*</span></label>
          <input type="text" class="form-input" id="lead-fname" value="${lead ? escapeHtml(lead.first_name) : ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Last Name <span class="required">*</span></label>
          <input type="text" class="form-input" id="lead-lname" value="${lead ? escapeHtml(lead.last_name) : ''}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Company Name <span class="required">*</span></label>
        <input type="text" class="form-input" id="lead-company" value="${lead ? escapeHtml(lead.company_name) : ''}" required />
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Email <span class="required">*</span></label>
          <input type="email" class="form-input" id="lead-email" value="${lead ? escapeHtml(lead.email) : ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Phone <span class="required">*</span></label>
          <input type="tel" class="form-input" id="lead-phone" value="${lead ? escapeHtml(lead.phone) : ''}" required />
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Source</label>
          <select class="form-select" id="lead-source">
            <option value="Google Search" ${lead?.source === 'Google Search' ? 'selected' : ''}>Google Search</option>
            <option value="Referral" ${lead?.source === 'Referral' ? 'selected' : ''}>Referral</option>
            <option value="Social Media" ${lead?.source === 'Social Media' ? 'selected' : ''}>Social Media</option>
            <option value="Event" ${lead?.source === 'Event' ? 'selected' : ''}>Event</option>
            <option value="Cold Call" ${lead?.source === 'Cold Call' ? 'selected' : ''}>Cold Call</option>
            <option value="Other" ${lead?.source === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="lead-status">
            <option value="new" ${lead?.status === 'new' ? 'selected' : ''}>New</option>
            <option value="contacted" ${lead?.status === 'contacted' ? 'selected' : ''}>Contacted</option>
            <option value="qualified" ${lead?.status === 'qualified' ? 'selected' : ''}>Qualified</option>
            <option value="lost" ${lead?.status === 'lost' ? 'selected' : ''}>Lost</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Expected Deal Value (₹)</label>
        <input type="number" class="form-input" id="lead-value" value="${lead?.expected_value || ''}" />
      </div>
      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-ghost" id="cancel-modal">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-lead-btn">${isEdit ? 'Update Lead' : 'Create Lead'}</button>
      </div>
    </form>
  `;

  showModal(html, { title: isEdit ? '✏️ Edit Lead' : '➕ Add New Lead' });

  document.getElementById('cancel-modal')?.addEventListener('click', closeModal);

  document.getElementById('lead-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fields = {
      fname: document.getElementById('lead-fname'),
      lname: document.getElementById('lead-lname'),
      company: document.getElementById('lead-company'),
      email: document.getElementById('lead-email'),
      phone: document.getElementById('lead-phone')
    };

    const hasError = Object.values(fields).some(field => 
      validateField(field, [validators.required, ...(field.id === 'lead-email' ? [validators.email] : [])])
    );

    if (hasError) return;

    const btn = document.getElementById('save-lead-btn');
    setButtonLoading(btn, true);

    const payload = {
      first_name: fields.fname.value.trim(),
      last_name: fields.lname.value.trim(),
      company_name: fields.company.value.trim(),
      email: fields.email.value.trim(),
      phone: fields.phone.value.trim(),
      source: document.getElementById('lead-source').value,
      status: document.getElementById('lead-status').value,
      expected_value: parseFloat(document.getElementById('lead-value').value) || 0
    };

    await new Promise(r => setTimeout(r, 500));

    if (isEdit) {
      db.update('leads', leadId, payload);
      showToast('success', 'Lead Updated', 'Lead information has been updated.');
    } else {
      payload.tenant_id = auth.getSession().tenant_id;
      payload.assigned_to = auth.getSession().user_id;
      db.create('leads', payload);
      showToast('success', 'Lead Created', 'New lead has been added to your pipeline.');
    }

    closeModal();
    renderLeads();
  });
}

function convertLead(leadId) {
  const lead = db.getById('leads', leadId);
  if (!lead) return;

  const html = `
    <div class="p-4 text-center">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🚀</div>
      <h3>Convert Lead?</h3>
      <p class="text-secondary mt-2">Converting this lead will create a new Customer profile and Opportunity for <strong>${escapeHtml(lead.company_name)}</strong>.</p>
      
      <div class="flex gap-3 justify-center mt-6">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-overlay').classList.remove('active')">Cancel</button>
        <button class="btn btn-primary" id="confirm-convert-btn">Convert Now</button>
      </div>
    </div>
  `;

  showModal(html, { title: 'Lead Conversion' });

  document.getElementById('confirm-convert-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('confirm-convert-btn');
    setButtonLoading(btn, true);

    await new Promise(r => setTimeout(r, 800));

    const session = auth.getSession();

    // 1. Create Customer
    const customer = db.create('customers', {
      tenant_id: session.tenant_id,
      name: lead.company_name,
      customer_type: 'corporate',
      email: lead.email,
      phone: lead.phone,
      status: 'active'
    });

    // 2. Create Opportunity
    db.create('opportunities', {
      tenant_id: session.tenant_id,
      customer_id: customer.id,
      title: `Deal with ${lead.company_name}`,
      amount: lead.expected_value,
      stage: 'discovery',
      probability: 10
    });

    // 3. Mark Lead as converted
    db.update('leads', lead.id, { status: 'converted' });

    closeModal();
    showToast('success', 'Conversion Successful', 'Customer and Opportunity created successfully!');
    renderLeads();
  });
}
