// ============================================================
// SmartHub ERP — Settings: Fiscal Year
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderSettingsLayout } from './settings-layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, formatDate } from '../core/ui.js';

export function renderSettingsFiscalYear() {
  const session = auth.getSession();
  const years = db.find('fiscal_years', fy => fy.tenant_id === session.tenant_id)
                  .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  const activeYear = years.find(y => y.is_active);

  const content = `
    <div class="card mb-6">
      <div class="card-header">
        <h4>📅 Current Fiscal Year</h4>
      </div>
      <div class="card-body">
        ${activeYear ? `
          <div class="flex items-center justify-between" style="padding: 1.5rem; background: rgba(99,102,241,0.05); border: 1px solid var(--border-default); border-radius: var(--radius-md);">
            <div>
              <h2 class="font-bold text-2xl">${activeYear.label}</h2>
              <div class="text-sm text-muted mt-2">
                ${formatDate(activeYear.start_date)} — ${formatDate(activeYear.end_date)}
              </div>
            </div>
            <div class="text-right">
              <span class="badge badge-success badge-dot mb-3" style="display:inline-flex;">Active & Open</span>
              <div>
                <button class="btn btn-secondary btn-sm" id="close-year-btn">Close Year</button>
              </div>
            </div>
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h3>No Active Fiscal Year</h3>
            <p>Please configure a fiscal year to record transactions.</p>
          </div>
        `}
      </div>
    </div>

    <div class="card">
      <div class="card-header flex justify-between items-center">
        <h4>📚 Fiscal History</h4>
        <button class="btn btn-primary btn-sm" id="add-fy-btn">➕ New Fiscal Year</button>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Period</th>
              <th>Status</th>
              <th>Closed On</th>
            </tr>
          </thead>
          <tbody>
            ${years.length > 0 ? years.map(y => `
              <tr>
                <td class="font-semibold text-sm">${y.label}</td>
                <td class="text-sm text-muted">${formatDate(y.start_date)} to ${formatDate(y.end_date)}</td>
                <td>
                  ${y.is_active ? '<span class="badge badge-success">Active</span>' :
                    y.is_locked ? '<span class="badge badge-neutral">Closed & Locked</span>' :
                    '<span class="badge badge-warning">Draft</span>'}
                </td>
                <td class="text-sm text-muted">${y.closed_at ? formatDate(y.closed_at) : '-'}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" class="text-center text-muted">No records found</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderSettingsLayout(content, 'fiscal-year');

  // Events
  document.getElementById('add-fy-btn')?.addEventListener('click', () => showAddYearModal(session.tenant_id));
  document.getElementById('close-year-btn')?.addEventListener('click', () => {
    if (activeYear) showCloseYearModal(activeYear, session);
  });
}

function showAddYearModal(tenantId) {
  const html = `
    <form id="add-fy-form" novalidate>
      <div class="form-group">
        <label class="form-label">Fiscal Year Label <span class="required">*</span></label>
        <input type="text" class="form-input" id="fy-label" placeholder="e.g. FY 2026-27" />
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Start Date <span class="required">*</span></label>
          <input type="date" class="form-input" id="fy-start" />
        </div>
        <div class="form-group">
          <label class="form-label">End Date <span class="required">*</span></label>
          <input type="date" class="form-input" id="fy-end" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-check">
          <input type="checkbox" id="fy-active" checked />
          Set as active fiscal year (will deactivate current)
        </label>
      </div>
      <div class="modal-footer" style="padding: 1rem 0 0; border-top: 1px solid var(--border-default); margin-top: 1rem;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-fy-btn">Create Year</button>
      </div>
    </form>
  `;

  showModal(html, { title: '➕ New Fiscal Year' });

  // Auto-calculate label on start date change demo
  document.getElementById('fy-start')?.addEventListener('change', (e) => {
    const d = new Date(e.target.value);
    if (!isNaN(d)) {
      const eDate = new Date(d);
      eDate.setFullYear(d.getFullYear() + 1);
      eDate.setDate(eDate.getDate() - 1);
      document.getElementById('fy-end').value = eDate.toISOString().split('T')[0];
      document.getElementById('fy-label').value = `FY ${d.getFullYear()}-${eDate.getFullYear().toString().slice(2)}`;
    }
  });

  document.getElementById('add-fy-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const lbl = document.getElementById('fy-label');
    const start = document.getElementById('fy-start');
    const end = document.getElementById('fy-end');

    if (validateField(lbl, [validators.required]) || validateField(start, [validators.required]) || validateField(end, [validators.required])) {
      return;
    }

    if (new Date(start.value) >= new Date(end.value)) {
      showToast('error', 'Invalid Target', 'End date must be after start date');
      return;
    }

    const btn = document.getElementById('save-fy-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 400));

    const isActive = document.getElementById('fy-active').checked;

    if (isActive) {
      // Deactivate others
      db.find('fiscal_years', y => y.tenant_id === tenantId && y.is_active).forEach(y => {
        db.update('fiscal_years', y.id, { is_active: false });
      });
    }

    db.create('fiscal_years', {
      tenant_id: tenantId,
      label: lbl.value.trim(),
      start_date: start.value,
      end_date: end.value,
      is_active: isActive,
      is_locked: false
    });

    closeModal();
    showToast('success', 'Fiscal Year Created', `${lbl.value.trim()} added successfully`);
    renderSettingsFiscalYear();
  });
}

function showCloseYearModal(year, session) {
  const html = `
    <div class="text-center" style="padding: 1rem;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
      <h3 class="mb-4">Close ${year.label}?</h3>
      <p class="text-sm text-muted mb-4">
        Closing the fiscal year will lock all related transactions. You will not be able to edit invoices or entries dated between <strong>${formatDate(year.start_date)}</strong> and <strong>${formatDate(year.end_date)}</strong>.
      </p>
      <div class="form-group text-left p-4 mb-4" style="background: rgba(239,68,68,0.05); border: 1px solid var(--color-danger); border-radius: var(--radius-md);">
        <label class="form-check" style="color: var(--color-danger); font-weight: 500;">
          <input type="checkbox" id="confirm-close" />
          I understand that this action is irreversible.
        </label>
      </div>
      <div class="modal-footer" style="padding-top: 1rem;">
        <button class="btn btn-secondary w-full" onclick="document.getElementById('modal-overlay').classList.remove('active')">Cancel</button>
        <button class="btn btn-primary w-full" style="background: var(--color-danger); border-color: var(--color-danger);" id="confirm-year-btn">Close Year</button>
      </div>
    </div>
  `;

  showModal(html, { title: 'Close Fiscal Year', size: 'default' });

  document.getElementById('confirm-year-btn')?.addEventListener('click', async (e) => {
    const cb = document.getElementById('confirm-close');
    if (!cb.checked) {
      showToast('error', 'Confirmation Required', 'Please check the confirmation box to proceed.');
      return;
    }

    const btn = e.target;
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 800));

    db.update('fiscal_years', year.id, {
      is_active: false,
      is_locked: true,
      closed_at: new Date().toISOString(),
      closed_by: session.user_id
    });

    closeModal();
    showToast('success', 'Year Closed', `${year.label} has been closed and locked.`);
    renderSettingsFiscalYear();
  });
}
