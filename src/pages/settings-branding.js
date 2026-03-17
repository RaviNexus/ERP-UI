// ============================================================
// SmartHub ERP — Settings: Branding
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderSettingsLayout } from './settings-layout.js';
import { showToast, showModal, closeModal, validators, validateField, setButtonLoading, escapeHtml } from '../core/ui.js';

export function renderSettingsBranding() {
  const session = auth.getSession();
  const company = db.find('companies', c => c.tenant_id === session.tenant_id)[0] || {
    primary_color: '#6366f1',
    invoice_footer: 'Thank you for your business!'
  };

  const content = `
    <div class="grid-2" style="grid-template-columns: 2fr 1fr; align-items: start;">
      
      <!-- Brand Details Form -->
      <div class="card">
        <div class="card-header">
          <h4>🎨 Brand Identity</h4>
        </div>
        <div class="card-body">
          <form id="brand-form" novalidate>
            <div class="grid-2 mb-6" style="gap:2rem;">
              
              <!-- Logos -->
              <div>
                <div class="form-group">
                  <label class="form-label">Company Logo</label>
                  <div class="flex items-center gap-4 p-4 mb-2" style="border: 2px dashed var(--border-default); border-radius: var(--radius-md);">
                    ${company.logo_url ? `
                      <img src="${company.logo_url}" alt="Company Logo" style="height: 48px; object-fit: contain;" />
                    ` : `
                      <div style="width: 48px; height: 48px; background: var(--surface-hover); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">
                        <span style="font-size: 1.5rem;">🖼️</span>
                      </div>
                    `}
                    <div style="flex:1;">
                      <div class="text-sm font-semibold">Upload high-res logo</div>
                      <div class="text-xs text-muted mb-2">PNG, JPG, SVG allowed. Max 5MB.</div>
                      <input type="file" id="comp-logo" accept="image/png, image/jpeg, image/svg+xml" style="font-size:0.75rem;" />
                    </div>
                  </div>
                </div>

                <div class="form-group mt-4">
                  <label class="form-label">Favicon (Browser Tab Icon)</label>
                  <div class="flex items-center gap-4 p-4" style="border: 1px dashed var(--border-default); border-radius: var(--radius-md);">
                    ${company.favicon_url ? `
                      <img src="${company.favicon_url}" alt="Favicon" style="height: 32px; width: 32px; object-fit: cover; border-radius: 4px;" />
                    ` : `
                      <div style="width: 32px; height: 32px; background: var(--surface-hover); border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 1rem;">🌐</span>
                      </div>
                    `}
                    <input type="file" id="comp-favicon" accept="image/png, image/x-icon" style="flex:1; font-size:0.75rem;" />
                  </div>
                  <div class="text-xs text-muted mt-1">Recommended size 32x32px (.ico or .png)</div>
                </div>
              </div>

              <!-- Colors -->
              <div>
                <div class="form-group">
                  <label class="form-label">Primary Brand Color</label>
                  <div class="flex gap-2">
                    <input type="color" id="primary-color" value="${company.primary_color || '#6366f1'}" style="height:42px; width:42px; cursor:pointer;" />
                    <input type="text" class="form-input" id="primary-hex" value="${company.primary_color || '#6366f1'}" style="text-transform:uppercase; font-family:monospace;" />
                  </div>
                  <div class="text-xs text-muted mt-2">Used as the dominant accent color on branded printouts like invoices and PDFs.</div>
                </div>

                <div class="form-group mt-4">
                  <label class="form-label">Secondary Color</label>
                  <div class="flex gap-2">
                    <input type="color" id="secondary-color" value="${company.secondary_color || '#1e293b'}" style="height:42px; width:42px; cursor:pointer;" />
                    <input type="text" class="form-input" id="secondary-hex" value="${company.secondary_color || '#1e293b'}" style="text-transform:uppercase; font-family:monospace;" />
                  </div>
                </div>
              </div>

            </div>

            <div class="form-group mt-6" style="border-top: 1px solid var(--border-default); padding-top: 1.5rem;">
              <label class="form-label">Default Invoice Header Note</label>
              <textarea class="form-textarea" id="inv-header" rows="2" placeholder="e.g. Original for Recipient">${escapeHtml(company.invoice_header || '')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Default Invoice Footer Note</label>
              <textarea class="form-textarea" id="inv-footer" rows="2" placeholder="Thank you for your business!">${escapeHtml(company.invoice_footer || '')}</textarea>
            </div>

            <div class="mt-6 flex justify-end">
              <button type="submit" class="btn btn-primary" id="save-brand-btn">Save Branding</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Live Preview Component -->
      <div class="card" style="position: sticky; top: var(--space-6);">
        <div class="card-header">
          <h4>👁️ PDF Preview</h4>
        </div>
        <div class="card-body" style="padding: 1rem; background: var(--surface-bg);">
          
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1.5rem; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transition: all 0.3s;" id="preview-page">
            
            <div class="flex justify-between items-start mb-6" style="border-bottom: 2px solid ${company.primary_color || '#6366f1'}" id="preview-header-bar">
              <div>
                ${company.logo_url ? `<img src="${company.logo_url}" style="height:32px; margin-bottom: 8px;" id="preview-logo"/>` : `<div style="font-weight:700; font-size: 1.25rem; margin-bottom:8px;" id="preview-logo-text">${escapeHtml(company.name || 'Company Name')}</div>`}
                <div style="font-size: 0.65rem; color: #64748b; margin-bottom: 4px;">123 Street, City, State ZIP</div>
              </div>
              <div style="text-align: right;">
                <h2 style="color: ${company.primary_color || '#6366f1'}; font-size:1.5rem; margin:0; text-transform:uppercase; letter-spacing:1px;" id="preview-title">INVOICE</h2>
                <div style="font-size: 0.65rem; font-weight: 600; color: #64748b; margin-top:4px;">#INV-2026-001</div>
              </div>
            </div>

            <div class="flex justify-between mb-6">
              <div style="font-size: 0.75rem;">
                <div style="color: #64748b;">Invoice To:</div>
                <div style="font-weight: 600; margin-top:2px;">Acme Corp</div>
                <div>Demo Address</div>
              </div>
            </div>

            <div style="width: 100%; margin-bottom: 1.5rem;">
              <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; display:flex; padding: 6px; font-size: 0.65rem; font-weight:600; color: #64748b;">
                <div style="flex:2;">Description</div>
                <div style="flex:1; text-align:right;">Qty</div>
                <div style="flex:1; text-align:right;">Total</div>
              </div>
              <div style="display:flex; padding: 6px; border-bottom: 1px dashed #e2e8f0; font-size: 0.75rem;">
                <div style="flex:2;">Web Development Services</div>
                <div style="flex:1; text-align:right;">1</div>
                <div style="flex:1; text-align:right; font-weight:600;">$1,500.00</div>
              </div>
            </div>

            <div class="text-xs text-muted" style="text-align:center; padding-top: 1rem; color: #64748b; font-size: 0.65rem;" id="preview-footer-text">
              ${escapeHtml(company.invoice_footer || 'Thank you for your business!')}
            </div>

          </div>
          
        </div>
      </div>
      
    </div>
  `;

  renderSettingsLayout(content, 'branding');

  // Preview color updates
  const primC = document.getElementById('primary-color');
  const primH = document.getElementById('primary-hex');
  const hdrB = document.getElementById('preview-header-bar');
  const pTitle = document.getElementById('preview-title');

  const updatePreviewColor = (color) => {
    hdrB.style.borderBottomColor = color;
    pTitle.style.color = color;
    primH.value = color.toUpperCase();
  };

  primC?.addEventListener('input', (e) => updatePreviewColor(e.target.value));
  primH?.addEventListener('input', (e) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
      primC.value = e.target.value;
      updatePreviewColor(e.target.value);
    }
  });

  const secC = document.getElementById('secondary-color');
  const secH = document.getElementById('secondary-hex');
  secC?.addEventListener('input', (e) => secH.value = e.target.value.toUpperCase());
  secH?.addEventListener('input', (e) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) secC.value = e.target.value;
  });

  const invF = document.getElementById('inv-footer');
  const prevF = document.getElementById('preview-footer-text');
  invF?.addEventListener('input', (e) => {
    prevF.textContent = e.target.value || 'Thank you for your business!';
  });

  document.getElementById('brand-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-brand-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 500));

    // Note in real app file-inputs would be uploaded via FormData
    const payload = {
      primary_color: primC.value,
      secondary_color: secC.value,
      invoice_header: document.getElementById('inv-header').value.trim(),
      invoice_footer: invF.value.trim()
    };

    if (company) {
      db.update('companies', company.id, payload);
    }
    
    setButtonLoading(btn, false);
    showToast('success', 'Branding Saved', 'PDF templates and brand guidelines have been updated.');
  });
}
