// ============================================================
// SmartHub ERP — CRM: Activity & Interaction Log
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml, formatDateTime } from '../core/ui.js';

export function renderInteractions() {
  const session = auth.getSession();
  const interactions = db.find('interactions', i => i.tenant_id === session.tenant_id);
  const users = db.getAll('users');
  const customers = db.find('customers', c => c.tenant_id === session.tenant_id);
  const leads = db.find('leads', l => l.tenant_id === session.tenant_id);
  const opportunities = db.find('opportunities', o => o.tenant_id === session.tenant_id);

  const getRelatedName = (type, id) => {
    if (type === 'customer') return customers.find(c => c.id === id)?.name || 'Unknown Customer';
    if (type === 'lead') {
      const lead = leads.find(l => l.id === id);
      return lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown Lead';
    }
    if (type === 'opportunity') return opportunities.find(o => o.id === id)?.title || 'Unknown Opportunity';
    return '-';
  };

  const getTypeIcon = (type) => {
    const map = { call: '📞', email: '✉️', meeting: '🤝', note: '📝' };
    return map[type] || '📑';
  };

  const content = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="page-title">Activity Log</h2>
        <p class="text-secondary">Track all interactions with leads and customers</p>
      </div>
      <button class="btn btn-primary" id="log-activity-btn">➕ Log Activity</button>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Type</th>
              <th>Related To</th>
              <th>Summary</th>
              <th>Performed By</th>
              <th style="width:50px;"></th>
            </tr>
          </thead>
          <tbody>
            ${interactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(activity => {
              const user = users.find(u => u.id === activity.performed_by);
              return `
                <tr>
                  <td class="text-sm font-semibold">${formatDateTime(activity.created_at)}</td>
                  <td>
                    <span class="flex items-center gap-2">
                      ${getTypeIcon(activity.type)} <span style="text-transform: capitalize;">${activity.type}</span>
                    </span>
                  </td>
                  <td>
                    <div class="text-sm font-medium">${getRelatedName(activity.related_to_type, activity.related_to_id)}</div>
                    <div class="text-xs text-muted" style="text-transform: capitalize;">${activity.related_to_type}</div>
                  </td>
                  <td>
                    <div class="text-sm">${escapeHtml(activity.summary)}</div>
                    ${activity.content ? `<div class="text-xs text-muted">${escapeHtml(activity.content.substring(0, 50))}...</div>` : ''}
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="avatar-sm" style="width:24px; height:24px; font-size:10px;">${user ? user.full_name[0] : '?'}</div>
                      <span class="text-xs">${user ? escapeHtml(user.full_name) : 'System'}</span>
                    </div>
                  </td>
                  <td>
                    <button class="btn btn-ghost btn-sm view-activity-btn" data-id="${activity.id}">👁️</button>
                  </td>
                </tr>
              `;
            }).join('')}
            ${interactions.length === 0 ? '<tr><td colspan="6" class="text-center text-muted p-8">No activities logged yet.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderDashboardLayout(content, 'crm-interactions', ['CRM', 'Activity Log']);

  // Event Listeners
  document.getElementById('log-activity-btn')?.addEventListener('click', () => showActivityModal());
  
  document.querySelectorAll('.view-activity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const activity = db.getById('interactions', btn.dataset.id);
      if (activity) {
        showModal(`
          <div class="p-4">
            <div class="flex items-center gap-3 mb-4">
              <span style="font-size: 2rem;">${getTypeIcon(activity.type)}</span>
              <div>
                <h4 style="margin:0;">${escapeHtml(activity.summary)}</h4>
                <div class="text-xs text-muted">${formatDateTime(activity.created_at)}</div>
              </div>
            </div>
            <div class="mb-4">
              <label class="text-xs text-muted font-bold uppercase">Related To</label>
              <div class="text-sm">${getRelatedName(activity.related_to_type, activity.related_to_id)} (${activity.related_to_type})</div>
            </div>
            <div class="p-3 bg-surface-hover rounded" style="white-space: pre-wrap; font-size: 0.875rem;">
              ${escapeHtml(activity.content || 'No details provided.')}
            </div>
            <div class="mt-6">
              <button class="btn btn-ghost w-full" onclick="document.getElementById('modal-overlay').classList.remove('active')">Close</button>
            </div>
          </div>
        `, { title: 'Activity Details' });
      }
    });
  });
}

export function showActivityModal(relatedType = null, relatedId = null) {
  const session = auth.getSession();
  const customers = db.find('customers', c => c.tenant_id === session.tenant_id);
  const leads = db.find('leads', l => l.tenant_id === session.tenant_id);
  const opportunities = db.find('opportunities', o => o.tenant_id === session.tenant_id);

  const html = `
    <form id="activity-form" novalidate>
      <div class="form-group">
        <label class="form-label">Activity Type <span class="required">*</span></label>
        <select class="form-select" id="act-type">
          <option value="call">📞 Phone Call</option>
          <option value="email">✉️ Email</option>
          <option value="meeting">🤝 Meeting</option>
          <option value="note">📝 internal Note</option>
        </select>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Related To Type</label>
          <select class="form-select" id="act-rel-type">
            <option value="lead" ${relatedType === 'lead' ? 'selected' : ''}>Lead</option>
            <option value="customer" ${relatedType === 'customer' ? 'selected' : ''}>Customer</option>
            <option value="opportunity" ${relatedType === 'opportunity' ? 'selected' : ''}>Opportunity</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Select Entity <span class="required">*</span></label>
          <select class="form-select" id="act-rel-id" required>
            <option value="">-- Choose --</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Summary <span class="required">*</span></label>
        <input type="text" class="form-input" id="act-summary" placeholder="Brief gist of the interaction" required />
      </div>

      <div class="form-group">
        <label class="form-label">Detailed Content</label>
        <textarea class="form-textarea" id="act-content" rows="4" placeholder="Detailed notes..."></textarea>
      </div>

      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-ghost" id="cancel-act-modal">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-act-btn">Log Activity</button>
      </div>
    </form>
  `;

  showModal(html, { title: '📑 Log New Activity' });

  const relTypeSelect = document.getElementById('act-rel-type');
  const relIdSelect = document.getElementById('act-rel-id');

  const updateRelIds = (type, selectedId = null) => {
    let list = [];
    if (type === 'lead') list = leads.map(l => ({ id: l.id, text: `${l.first_name} ${l.last_name} (${l.company_name})` }));
    else if (type === 'customer') list = customers.map(c => ({ id: c.id, text: c.name }));
    else if (type === 'opportunity') list = opportunities.map(o => ({ id: o.id, text: o.title }));

    relIdSelect.innerHTML = '<option value="">-- Choose --</option>' + 
      list.map(item => `<option value="${item.id}" ${item.id === selectedId ? 'selected' : ''}>${escapeHtml(item.text)}</option>`).join('');
  };

  relTypeSelect.addEventListener('change', (e) => updateRelIds(e.target.value));
  updateRelIds(relTypeSelect.value, relatedId);

  document.getElementById('cancel-act-modal')?.addEventListener('click', closeModal);

  document.getElementById('activity-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const summary = document.getElementById('act-summary');
    const relId = document.getElementById('act-rel-id');

    if (validateField(summary, [validators.required]) || validateField(relId, [validators.required])) return;

    const btn = document.getElementById('save-act-btn');
    setButtonLoading(btn, true);

    const payload = {
      tenant_id: session.tenant_id,
      performed_by: session.user_id,
      related_to_type: relTypeSelect.value,
      related_to_id: relId.value,
      type: document.getElementById('act-type').value,
      summary: summary.value.trim(),
      content: document.getElementById('act-content').value.trim()
    };

    await new Promise(r => setTimeout(r, 400));
    db.create('interactions', payload);
    
    showToast('success', 'Activity Logged', 'The interaction has been saved.');
    closeModal();
    
    // Refresh if we are on the log page
    if (window.location.hash === '#/crm/interactions') renderInteractions();
  });
}
