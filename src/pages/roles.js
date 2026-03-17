// ============================================================
// SmartHub ERP — Roles & Permissions Page
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import {
  showToast, showModal, closeModal, validators, validateField,
  setButtonLoading, escapeHtml
} from '../core/ui.js';

const MODULES = [
  { key: 'users', label: 'Users', icon: '👥' },
  { key: 'crm', label: 'CRM', icon: '📇' },
  { key: 'inventory', label: 'Inventory', icon: '📦' },
  { key: 'sales', label: 'Sales', icon: '🧾' },
  { key: 'purchase', label: 'Purchase', icon: '🛒' },
  { key: 'finance', label: 'Finance', icon: '💰' },
  { key: 'hr', label: 'HR & Payroll', icon: '👨‍💼' },
  { key: 'projects', label: 'Projects', icon: '📁' },
  { key: 'reports', label: 'Reports', icon: '📈' },
  { key: 'settings', label: 'Settings', icon: '⚙️' }
];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'approve'];

export function renderRolesPermissions() {
  const session = auth.getSession();
  const roles = db.find('roles', r => r.tenant_id === session.tenant_id);

  const content = `
    <div class="page-header">
      <div><h1>Roles & Permissions</h1>
        <p>Configure access control for your organization</p></div>
      <button class="btn btn-primary" id="add-role-btn">➕ Add Role</button>
    </div>

    <div class="grid-3" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
      ${roles.map(role => {
        const userCount = db.count('users', u => u.role_id === role.id && u.tenant_id === session.tenant_id);
        const permCount = (role.permissions || []).length;
        return `
          <div class="card" style="cursor:pointer;" data-role-id="${role.id}">
            <div class="card-body">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h4>${escapeHtml(role.name)}</h4>
                  <p class="text-xs text-muted mt-1">${escapeHtml(role.description || '')}</p>
                </div>
                ${role.is_system_role ? '<span class="badge badge-info">System</span>' :
                  role.is_default ? '<span class="badge badge-warning">Default</span>' : ''}
              </div>
              <div class="flex gap-4 mt-4">
                <div class="text-center">
                  <div class="font-bold text-lg">${userCount}</div>
                  <div class="text-xs text-muted">Users</div>
                </div>
                <div class="text-center">
                  <div class="font-bold text-lg">${permCount}</div>
                  <div class="text-xs text-muted">Permissions</div>
                </div>
              </div>
              <div class="flex gap-2 mt-4" style="border-top:1px solid var(--border-default);padding-top:1rem;">
                <button class="btn btn-ghost btn-sm edit-role-btn" data-id="${role.id}">✏️ Edit</button>
                <button class="btn btn-ghost btn-sm perm-role-btn" data-id="${role.id}">🛡️ Permissions</button>
                ${!role.is_system_role ? `<button class="btn btn-ghost btn-sm delete-role-btn" data-id="${role.id}" style="color:var(--color-danger);">🗑️</button>` : ''}
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;

  renderDashboardLayout(content, 'roles', ['Admin', 'Roles & Permissions']);

  // Events
  document.getElementById('add-role-btn')?.addEventListener('click', () => showRoleModal(null, session.tenant_id));
  document.querySelectorAll('.edit-role-btn').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    showRoleModal(b.dataset.id, session.tenant_id);
  }));
  document.querySelectorAll('.perm-role-btn').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    showPermissionsModal(b.dataset.id, session.tenant_id);
  }));
  document.querySelectorAll('.delete-role-btn').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    deleteRole(b.dataset.id, session.tenant_id);
  }));
}

function showRoleModal(roleId, tenantId) {
  const role = roleId ? db.getById('roles', roleId) : null;
  const isEdit = !!role;

  const html = `<form id="role-form" novalidate>
    <div class="form-group"><label class="form-label" for="role-name">Role Name <span class="required">*</span></label>
      <input type="text" class="form-input" id="role-name" value="${role ? escapeHtml(role.name) : ''}" placeholder="e.g. Sales Manager"
        ${role?.is_system_role ? 'disabled style="opacity:.6"' : ''}/></div>
    <div class="form-group"><label class="form-label" for="role-desc">Description</label>
      <textarea class="form-textarea" id="role-desc" rows="2" placeholder="Brief description...">${role ? escapeHtml(role.description||'') : ''}</textarea></div>
    <div class="form-group"><label class="form-check"><input type="checkbox" id="role-default" ${role?.is_default?'checked':''}/>
      Set as default role for new users</label></div>
    <div class="modal-footer" style="padding:1rem 0 0;border-top:1px solid var(--border-default);">
      <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Cancel</button>
      <button type="submit" class="btn btn-primary" id="save-role-btn">${isEdit?'Save Changes':'Create Role'}</button></div></form>`;

  showModal(html, { title: isEdit ? '✏️ Edit Role' : '➕ New Role' });

  document.getElementById('role-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('role-name');
    if (validateField(name, [validators.required, validators.minLength(3)])) return;
    const btn = document.getElementById('save-role-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 400));

    const isDefault = document.getElementById('role-default').checked;
    if (isDefault) {
      // Unset other defaults
      db.find('roles', r => r.tenant_id === tenantId && r.is_default).forEach(r =>
        db.update('roles', r.id, { is_default: false })
      );
    }

    if (isEdit) {
      const updates = { description: document.getElementById('role-desc').value.trim(), is_default: isDefault };
      if (!role.is_system_role) updates.name = name.value.trim();
      db.update('roles', roleId, updates);
      showToast('success', 'Role Updated');
    } else {
      db.create('roles', {
        tenant_id: tenantId, name: name.value.trim(),
        description: document.getElementById('role-desc').value.trim(),
        is_system_role: false, is_default: isDefault, permissions: []
      });
      showToast('success', 'Role Created');
    }
    closeModal();
    renderRolesPermissions();
  });
}

function showPermissionsModal(roleId, tenantId) {
  const role = db.getById('roles', roleId);
  if (!role) return;
  const perms = role.permissions || [];

  const hasP = (mod, act) => perms.includes(`${mod}.${act}`) || perms.includes(`${mod}.*`) || perms.includes(`*.${act}`);

  const rows = MODULES.map(m => `
    <tr>
      <td class="font-semibold text-sm">${m.icon} ${m.label}</td>
      ${ACTIONS.map(a => `
        <td style="text-align:center;">
          <input type="checkbox" class="perm-check" data-mod="${m.key}" data-act="${a}" ${hasP(m.key, a) ? 'checked' : ''}
            ${role.is_system_role ? 'disabled' : ''}/>
        </td>`).join('')}
      <td style="text-align:center;">
        <input type="checkbox" class="perm-all" data-mod="${m.key}" ${ACTIONS.every(a=>hasP(m.key,a))?'checked':''}
          ${role.is_system_role?'disabled':''} title="Select All"/>
      </td>
    </tr>`).join('');

  const html = `
    <div style="overflow-x:auto;margin:-1.5rem;margin-top:-0.5rem;">
      <table class="data-table" style="min-width:600px;">
        <thead><tr><th>Module</th>${ACTIONS.map(a=>`<th style="text-align:center;text-transform:capitalize;">${a}</th>`).join('')}<th style="text-align:center;">All</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${!role.is_system_role ? `
      <div class="modal-footer" style="padding:1rem 0 0;border-top:1px solid var(--border-default);margin-top:1rem;">
        <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Cancel</button>
        <button class="btn btn-primary" id="save-perms-btn">Save Permissions</button>
      </div>` : '<p class="text-xs text-muted text-center mt-4">System roles cannot be modified</p>'}`;

  showModal(html, { title: `🛡️ Permissions — ${role.name}`, size: 'lg' });

  // Select All per module
  document.querySelectorAll('.perm-all').forEach(cb => {
    cb.addEventListener('change', () => {
      const mod = cb.dataset.mod;
      document.querySelectorAll(`.perm-check[data-mod="${mod}"]`).forEach(c => c.checked = cb.checked);
    });
  });

  // Update Select All when individual changes
  document.querySelectorAll('.perm-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const mod = cb.dataset.mod;
      const allChecked = [...document.querySelectorAll(`.perm-check[data-mod="${mod}"]`)].every(c => c.checked);
      const allCb = document.querySelector(`.perm-all[data-mod="${mod}"]`);
      if (allCb) allCb.checked = allChecked;
    });
  });

  document.getElementById('save-perms-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('save-perms-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 400));

    const newPerms = [];
    document.querySelectorAll('.perm-check:checked').forEach(cb => {
      newPerms.push(`${cb.dataset.mod}.${cb.dataset.act}`);
    });
    db.update('roles', roleId, { permissions: newPerms });

    closeModal();
    showToast('success', 'Permissions Saved', `${role.name} permissions updated`);
    renderRolesPermissions();
  });
}

function deleteRole(roleId, tenantId) {
  const role = db.getById('roles', roleId);
  if (!role || role.is_system_role) return;
  const userCount = db.count('users', u => u.role_id === roleId && u.tenant_id === tenantId);
  if (userCount > 0) {
    showToast('error', 'Cannot Delete', `${userCount} user(s) are assigned to this role. Reassign them first.`);
    return;
  }
  db.delete('roles', roleId);
  showToast('success', 'Role Deleted');
  renderRolesPermissions();
}
