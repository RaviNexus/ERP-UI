// ============================================================
// SmartHub ERP — Inventory: Product Master
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml, statusBadge } from '../core/ui.js';

export function renderProducts() {
  const session = auth.getSession();
  const products = db.find('products', p => p.tenant_id === session.tenant_id);
  const categories = db.find('categories', c => c.tenant_id === session.tenant_id);
  const uoms = db.find('uoms', u => u.tenant_id === session.tenant_id);
  const stockLevels = db.find('stock_levels', s => s.tenant_id === session.tenant_id);

  const getStockForProduct = (productId) => {
    return stockLevels
      .filter(s => s.product_id === productId)
      .reduce((sum, s) => sum + (s.current_quantity || 0), 0);
  };

  const content = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="page-title">Product Master</h2>
        <p class="text-secondary">Manage your items, variants, and pricing</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-ghost" id="manage-cats-btn">🏷️ Categories</button>
        <button class="btn btn-primary" id="add-product-btn">➕ Add Product</button>
      </div>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Product Info</th>
              <th>SKU / Barcode</th>
              <th>Category</th>
              <th>Stock Level</th>
              <th>Sale Price</th>
              <th>Status</th>
              <th style="width:100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(product => {
              const category = categories.find(c => c.id === product.category_id);
              const uom = uoms.find(u => u.id === product.uom_id);
              const totalStock = getStockForProduct(product.id);
              const isLowStock = totalStock <= (product.min_stock_level || 0);

              return `
                <tr>
                  <td>
                    <div class="font-semibold">${escapeHtml(product.name)}</div>
                    <div class="text-xs text-muted">${escapeHtml(product.brand || 'No Brand')}</div>
                  </td>
                  <td class="text-sm">
                    <div class="font-mono">${escapeHtml(product.sku)}</div>
                    <div class="text-xs text-muted">${escapeHtml(product.barcode || '')}</div>
                  </td>
                  <td>
                    <span class="badge badge-neutral">${escapeHtml(category?.name || 'Uncategorized')}</span>
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="font-bold ${isLowStock ? 'text-danger' : 'text-success'}">${totalStock}</span>
                      <span class="text-xs text-muted">${escapeHtml(uom?.abbreviation || 'Units')}</span>
                      ${isLowStock ? '<span class="text-xs" title="Low Stock">⚠️</span>' : ''}
                    </div>
                  </td>
                  <td>₹${product.sale_price?.toLocaleString()}</td>
                  <td>${statusBadge(product.status)}</td>
                  <td>
                    <div class="flex gap-1">
                      <button class="btn btn-ghost btn-sm edit-product-btn" data-id="${product.id}">✏️</button>
                      <button class="btn btn-ghost btn-sm stock-adj-btn" data-id="${product.id}" title="Stock Adjustment">📊</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
            ${products.length === 0 ? '<tr><td colspan="7" class="text-center text-muted p-12">No products found. Add your first item!</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderDashboardLayout(content, 'inventory', ['Inventory', 'Products']);

  // Event Listeners
  document.getElementById('add-product-btn')?.addEventListener('click', () => showProductModal());
  document.getElementById('manage-cats-btn')?.addEventListener('click', () => {
    window.location.hash = '#/inventory/categories';
  });

  document.querySelectorAll('.edit-product-btn').forEach(btn => {
    btn.addEventListener('click', () => showProductModal(btn.dataset.id));
  });

  document.querySelectorAll('.stock-adj-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('info', 'Stock Adjustment', 'Redirecting to stock adjustments dashboard...');
    });
  });
}

function showProductModal(productId = null) {
  const session = auth.getSession();
  const product = productId ? db.getById('products', productId) : null;
  const categories = db.find('categories', c => c.tenant_id === session.tenant_id);
  const uoms = db.find('uoms', u => u.tenant_id === session.tenant_id);
  const taxSlabs = db.find('tax_slabs', t => t.tenant_id === session.tenant_id);
  const isEdit = !!product;

  const html = `
    <form id="product-form" novalidate>
      <div class="form-group">
        <label class="form-label">Product Name <span class="required">*</span></label>
        <input type="text" class="form-input" id="prod-name" value="${product ? escapeHtml(product.name) : ''}" required />
      </div>
      
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">SKU <span class="required">*</span></label>
          <input type="text" class="form-input" id="prod-sku" value="${product ? escapeHtml(product.sku) : ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Barcode</label>
          <input type="text" class="form-input" id="prod-barcode" value="${product ? escapeHtml(product.barcode || '') : ''}" />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="prod-cat">
            <option value="">-- No Category --</option>
            ${categories.map(c => `<option value="${c.id}" ${product?.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Base Unit (UoM)</label>
          <select class="form-select" id="prod-uom">
            ${uoms.map(u => `<option value="${u.id}" ${product?.uom_id === u.id ? 'selected' : ''}>${escapeHtml(u.name)} (${u.abbreviation})</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Purchase Price (₹) <span class="required">*</span></label>
          <input type="number" class="form-input" id="prod-purchase" value="${product ? product.purchase_price : ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Sale Price (₹) <span class="required">*</span></label>
          <input type="number" class="form-input" id="prod-sale" value="${product ? product.sale_price : ''}" required />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Reorder Level (Min Stock)</label>
          <input type="number" class="form-input" id="prod-min" value="${product ? product.min_stock_level : '0'}" />
        </div>
        <div class="form-group">
          <label class="form-label">Tax Slab</label>
          <select class="form-select" id="prod-tax">
            <option value="">Exempt</option>
            ${taxSlabs.map(t => `<option value="${t.id}" ${product?.tax_slab_id === t.id ? 'selected' : ''}>${escapeHtml(t.name)} (${t.rate}%)</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-ghost" id="cancel-prod-modal">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-prod-btn">${isEdit ? 'Update Product' : 'Create Product'}</button>
      </div>
    </form>
  `;

  showModal(html, { title: isEdit ? '✏️ Edit Product' : '➕ Add New Product', size: 'lg' });

  document.getElementById('cancel-prod-modal')?.addEventListener('click', closeModal);

  document.getElementById('product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('prod-name');
    const sku = document.getElementById('prod-sku');
    const sale = document.getElementById('prod-sale');

    if (validateField(name, [validators.required]) || 
        validateField(sku, [validators.required]) || 
        validateField(sale, [validators.required])) return;

    const btn = document.getElementById('save-prod-btn');
    setButtonLoading(btn, true);

    const payload = {
      name: name.value.trim(),
      sku: sku.value.trim(),
      barcode: document.getElementById('prod-barcode').value.trim(),
      category_id: document.getElementById('prod-cat').value,
      uom_id: document.getElementById('prod-uom').value,
      purchase_price: parseFloat(document.getElementById('prod-purchase').value) || 0,
      sale_price: parseFloat(sale.value) || 0,
      min_stock_level: parseInt(document.getElementById('prod-min').value) || 0,
      tax_slab_id: document.getElementById('prod-tax').value,
      status: 'active'
    };

    await new Promise(r => setTimeout(r, 600));

    if (isEdit) {
      db.update('products', productId, payload);
      showToast('success', 'Product Updated', 'Product master data has been updated.');
    } else {
      // Check for SKU Dupes
      const dupe = db.findOne('products', p => p.tenant_id === session.tenant_id && p.sku === payload.sku);
      if (dupe) {
        showToast('error', 'Duplicate SKU', 'An item with this SKU already exists.');
        setButtonLoading(btn, false);
        return;
      }
      payload.tenant_id = session.tenant_id;
      db.create('products', payload);
      showToast('success', 'Product Created', 'New item added to your inventory.');
    }

    closeModal();
    renderProducts();
  });
}
