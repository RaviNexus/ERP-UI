// ============================================================
// SmartHub ERP — Inventory: Categories & UoMs
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml } from '../core/ui.js';

export function renderCategoriesUoMs() {
  const session = auth.getSession();
  const categories = db.find('categories', c => c.tenant_id === session.tenant_id);
  const uoms = db.find('uoms', u => u.tenant_id === session.tenant_id);

  const content = `
    <div class="mb-6">
      <h2 class="page-title">Inventory Master Data</h2>
      <p class="text-secondary">Configure product categories and units of measure</p>
    </div>

    <div class="grid-2">
      <!-- Categories Section -->
      <div class="card">
        <div class="card-header flex justify-between items-center">
          <h4>🏷️ Product Categories</h4>
          <button class="btn btn-primary btn-sm" id="add-cat-btn">➕ Add</button>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th style="width:50px;"></th>
              </tr>
            </thead>
            <tbody>
              ${categories.map(cat => `
                <tr>
                  <td class="font-medium">${escapeHtml(cat.name)}</td>
                  <td class="text-sm font-mono">${escapeHtml(cat.code)}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm delete-cat-btn" data-id="${cat.id}">🗑️</button>
                  </td>
                </tr>
              `).join('')}
              ${categories.length === 0 ? '<tr><td colspan="3" class="text-center text-muted">No categories.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>

      <!-- UoM Section -->
      <div class="card">
        <div class="card-header flex justify-between items-center">
          <h4>⚖️ Units of Measure (UoM)</h4>
          <button class="btn btn-primary btn-sm" id="add-uom-btn">➕ Add</button>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Unit Name</th>
                <th>Abbr.</th>
                <th style="width:50px;"></th>
              </tr>
            </thead>
            <tbody>
              ${uoms.map(uom => `
                <tr>
                  <td class="font-medium">${escapeHtml(uom.name)}</td>
                  <td class="font-bold text-xs">${escapeHtml(uom.abbreviation)}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm delete-uom-btn" data-id="${uom.id}">🗑️</button>
                  </td>
                </tr>
              `).join('')}
              ${uoms.length === 0 ? '<tr><td colspan="3" class="text-center text-muted">No UoMs defined.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  renderDashboardLayout(content, 'inventory-config', ['Inventory', 'Master Data']);

  // Event Listeners
  document.getElementById('add-cat-btn')?.addEventListener('click', () => showCatModal());
  document.getElementById('add-uom-btn')?.addEventListener('click', () => showUomModal());

  document.querySelectorAll('.delete-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this category? Products using it will become uncategorized.')) {
        db.delete('categories', btn.dataset.id);
        showToast('info', 'Category Removed', 'Category has been deleted.');
        renderCategoriesUoMs();
      }
    });
  });

  document.querySelectorAll('.delete-uom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this UoM? Ensure no products are actively linked to it.')) {
        db.delete('uoms', btn.dataset.id);
        showToast('info', 'UoM Removed', 'Unit of measure has been deleted.');
        renderCategoriesUoMs();
      }
    });
  });
}

function showCatModal() {
  const session = auth.getSession();
  const html = `
    <form id="cat-form" novalidate>
      <div class="form-group">
        <label class="form-label">Category Name <span class="required">*</span></label>
        <input type="text" class="form-input" id="cat-name" placeholder="e.g. Perishables" required />
      </div>
      <div class="form-group">
        <label class="form-label">Category Code <span class="required">*</span></label>
        <input type="text" class="form-input" id="cat-code" placeholder="e.g. PRS" required />
      </div>
      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-cat-btn">Save Category</button>
      </div>
    </form>
  `;
  showModal(html, { title: '🏷️ New Category' });
  document.getElementById('cat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cat-name').value.trim();
    const code = document.getElementById('cat-code').value.trim().toUpperCase();
    if (!name || !code) return;
    db.create('categories', { tenant_id: session.tenant_id, name, code });
    showToast('success', 'Category Created', 'New category added.');
    closeModal();
    renderCategoriesUoMs();
  });
}

function showUomModal() {
  const session = auth.getSession();
  const html = `
    <form id="uom-form" novalidate>
      <div class="form-group">
        <label class="form-label">Unit Name <span class="required">*</span></label>
        <input type="text" class="form-input" id="uom-name" placeholder="e.g. Kilogram" required />
      </div>
      <div class="form-group">
        <label class="form-label">Abbreviation <span class="required">*</span></label>
        <input type="text" class="form-input" id="uom-abbr" placeholder="e.g. Kg" required />
      </div>
      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-uom-btn">Save Unit</button>
      </div>
    </form>
  `;
  showModal(html, { title: '⚖️ New Unit of Measure' });
  document.getElementById('uom-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('uom-name').value.trim();
    const abbreviation = document.getElementById('uom-abbr').value.trim();
    if (!name || !abbreviation) return;
    db.create('uoms', { tenant_id: session.tenant_id, name, abbreviation });
    showToast('success', 'Unit Created', 'New unit of measure added.');
    closeModal();
    renderCategoriesUoMs();
  });
}
