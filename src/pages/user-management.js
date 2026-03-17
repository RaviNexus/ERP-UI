// ============================================================
// SmartHub ERP — User Management (Admin) Page
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import {
  showToast, showModal, closeModal, validators, validateField,
  setButtonLoading, formatDateTime, getInitials, statusBadge,
  escapeHtml, debounce
} from '../core/ui.js';

let currentPage = 1;
const PAGE_SIZE = 20;
let searchTerm = '';
let filterStatus = '';
let filterRole = '';

function getFilteredUsers(tenantId) {
  return db.find('users', u => {
    if (u.tenant_id !== tenantId) return false;
    if (filterStatus && u.status !== filterStatus) return false;
    if (filterRole && u.role_id !== filterRole) return false;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      return (u.full_name||'').toLowerCase().includes(t) ||
             (u.email||'').toLowerCase().includes(t) ||
             (u.phone||'').includes(t);
    }
    return true;
  });
}

export function renderUserManagement() {
  const session = auth.getSession();
  const users = getFilteredUsers(session.tenant_id);
  const roles = db.find('roles', r => r.tenant_id === session.tenant_id);
  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const paged = users.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE);

  const rows = paged.map(u => {
    const role = db.getById('roles', u.role_id);
    const isSelf = u.id === session.user_id;
    return `<tr>
      <td><div class="flex items-center gap-3">
        <div class="topbar-avatar" style="width:36px;height:36px;font-size:.75rem;">${getInitials(u.full_name)}</div>
        <div><div class="font-semibold text-sm">${escapeHtml(u.full_name)}</div>
        <div class="text-xs text-muted">${escapeHtml(u.email)}</div></div>
      </div></td>
      <td><span class="badge badge-neutral">${role?.name||'-'}</span></td>
      <td>${statusBadge(u.status)}</td>
      <td class="text-sm text-muted">${formatDateTime(u.last_login_at)}</td>
      <td>${u.two_fa_enabled?'<span class="badge badge-success">On</span>':'<span class="badge badge-neutral">Off</span>'}</td>
      <td><div class="flex gap-1">
        <button class="btn btn-ghost btn-sm edit-user-btn" data-id="${u.id}">✏️</button>
        ${!isSelf?`<button class="btn btn-ghost btn-sm toggle-status-btn" data-id="${u.id}">${u.status==='active'?'🚫':'✅'}</button>`:''}
      </div></td>
    </tr>`;
  }).join('');

  const content = `
    <div class="page-header"><div><h1>User Management</h1><p>Manage team members, assign roles, and control access</p></div>
      <button class="btn btn-primary" id="add-user-btn">➕ Add User</button></div>
    <div class="card mb-6"><div class="card-body" style="padding:1rem 1.5rem;"><div class="search-bar">
      <div class="search-input-wrapper"><span class="search-icon">🔍</span>
        <input type="text" class="form-input" id="user-search" placeholder="Search..." value="${searchTerm}"/></div>
      <select class="form-select" id="filter-role" style="width:200px;"><option value="">All Roles</option>
        ${roles.map(r=>`<option value="${r.id}" ${filterRole===r.id?'selected':''}>${r.name}</option>`).join('')}</select>
      <select class="form-select" id="filter-status" style="width:160px;"><option value="">All Status</option>
        <option value="active" ${filterStatus==='active'?'selected':''}>Active</option>
        <option value="pending" ${filterStatus==='pending'?'selected':''}>Pending</option>
        <option value="inactive" ${filterStatus==='inactive'?'selected':''}>Inactive</option>
        <option value="locked" ${filterStatus==='locked'?'selected':''}>Locked</option></select>
    </div></div></div>
    <div class="card"><div class="table-container"><table class="data-table"><thead><tr>
      <th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>2FA</th><th style="width:120px">Actions</th>
    </tr></thead><tbody>${rows||'<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👥</div><h3>No users found</h3></div></td></tr>'}</tbody></table></div>
    ${totalPages>1?`<div class="pagination"><div class="pagination-info">Showing ${(currentPage-1)*PAGE_SIZE+1}–${Math.min(currentPage*PAGE_SIZE,users.length)} of ${users.length}</div><div class="pagination-controls">
      <button class="pagination-btn" data-page="${currentPage-1}" ${currentPage===1?'disabled':''}>← Prev</button>
      ${Array.from({length:totalPages},(_,i)=>`<button class="pagination-btn ${i+1===currentPage?'active':''}" data-page="${i+1}">${i+1}</button>`).join('')}
      <button class="pagination-btn" data-page="${currentPage+1}" ${currentPage===totalPages?'disabled':''}>Next →</button>
    </div></div>`:''}</div>`;

  renderDashboardLayout(content, 'users', ['Admin', 'User Management']);
  bindEvents(session);
}

function bindEvents(session) {
  document.getElementById('user-search')?.addEventListener('input', debounce(e=>{
    searchTerm=e.target.value; currentPage=1; renderUserManagement();
  },300));
  document.getElementById('filter-role')?.addEventListener('change', e=>{
    filterRole=e.target.value; currentPage=1; renderUserManagement();
  });
  document.getElementById('filter-status')?.addEventListener('change', e=>{
    filterStatus=e.target.value; currentPage=1; renderUserManagement();
  });
  document.querySelectorAll('.pagination-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const p=parseInt(btn.dataset.page); if(p>=1) { currentPage=p; renderUserManagement(); }
  }));
  document.getElementById('add-user-btn')?.addEventListener('click',()=>showAddUserModal(session.tenant_id));
  document.querySelectorAll('.edit-user-btn').forEach(btn=>btn.addEventListener('click',()=>showEditUserModal(btn.dataset.id,session.tenant_id)));
  document.querySelectorAll('.toggle-status-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const user=db.getById('users',btn.dataset.id); if(!user) return;
    const newStatus = user.status==='active'?'inactive':'active';
    db.update('users',user.id,{status:newStatus});
    showToast('success','User Updated',`${user.full_name} is now ${newStatus}`);
    renderUserManagement();
  }));
}

function showAddUserModal(tenantId) {
  const roles = db.find('roles',r=>r.tenant_id===tenantId);
  const html = `<form id="add-user-form" novalidate>
    <div class="grid-2"><div class="form-group"><label class="form-label" for="nu-name">Full Name <span class="required">*</span></label>
      <input type="text" class="form-input" id="nu-name" placeholder="John Doe"/></div>
    <div class="form-group"><label class="form-label" for="nu-phone">Phone <span class="required">*</span></label>
      <input type="tel" class="form-input" id="nu-phone" placeholder="9876543210" maxlength="10"/></div></div>
    <div class="form-group"><label class="form-label" for="nu-email">Email <span class="required">*</span></label>
      <input type="email" class="form-input" id="nu-email" placeholder="user@company.com"/></div>
    <div class="form-group"><label class="form-label" for="nu-role">Role <span class="required">*</span></label>
      <select class="form-select" id="nu-role"><option value="">Select Role</option>
      ${roles.map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}</select></div>
    <div class="modal-footer" style="padding:1rem 0 0;border-top:1px solid var(--border-default);margin-top:.5rem;">
      <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Cancel</button>
      <button type="submit" class="btn btn-primary" id="create-user-btn">Create User</button></div></form>`;
  showModal(html,{title:'➕ Add New User'});
  document.getElementById('add-user-form')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const n=document.getElementById('nu-name'),em=document.getElementById('nu-email'),ph=document.getElementById('nu-phone'),ro=document.getElementById('nu-role');
    if(validateField(n,[validators.required,validators.minLength(3)])||validateField(em,[validators.required,validators.email])||
       validateField(ph,[validators.required,validators.phone])||validateField(ro,[validators.required])) return;
    if(db.findOne('users',u=>u.email===em.value.toLowerCase()&&u.tenant_id===tenantId)){showToast('error','Duplicate','Email already exists');return;}
    const btn=document.getElementById('create-user-btn'); setButtonLoading(btn,true); await new Promise(r=>setTimeout(r,500));
    db.create('users',{tenant_id:tenantId,full_name:n.value.trim(),email:em.value.trim().toLowerCase(),phone:ph.value.trim(),
      password_hash:'hash_pending',role_id:ro.value,status:'pending',email_verified:false,two_fa_enabled:false,login_attempts:0,avatar_url:null});
    closeModal(); showToast('success','User Created','Invitation sent to '+em.value); renderUserManagement();
  });
}

function showEditUserModal(userId, tenantId) {
  const user=db.getById('users',userId); if(!user) return;
  const roles=db.find('roles',r=>r.tenant_id===tenantId);
  const html = `<form id="edit-user-form" novalidate>
    <div class="grid-2"><div class="form-group"><label class="form-label" for="eu-name">Full Name <span class="required">*</span></label>
      <input type="text" class="form-input" id="eu-name" value="${escapeHtml(user.full_name)}"/></div>
    <div class="form-group"><label class="form-label" for="eu-phone">Phone <span class="required">*</span></label>
      <input type="tel" class="form-input" id="eu-phone" value="${user.phone||''}" maxlength="10"/></div></div>
    <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" value="${user.email}" disabled style="opacity:.6"/></div>
    <div class="grid-2"><div class="form-group"><label class="form-label" for="eu-role">Role</label>
      <select class="form-select" id="eu-role">${roles.map(r=>`<option value="${r.id}" ${r.id===user.role_id?'selected':''}>${r.name}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label" for="eu-status">Status</label>
      <select class="form-select" id="eu-status"><option value="active" ${user.status==='active'?'selected':''}>Active</option>
      <option value="inactive" ${user.status==='inactive'?'selected':''}>Inactive</option>
      <option value="pending" ${user.status==='pending'?'selected':''}>Pending</option></select></div></div>
    <div class="modal-footer" style="padding:1rem 0 0;border-top:1px solid var(--border-default);margin-top:.5rem;">
      <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('active')">Cancel</button>
      <button type="submit" class="btn btn-primary" id="update-user-btn">Save Changes</button></div></form>`;
  showModal(html,{title:'✏️ Edit User'});
  document.getElementById('edit-user-form')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const n=document.getElementById('eu-name'),ph=document.getElementById('eu-phone');
    if(validateField(n,[validators.required,validators.minLength(3)])||validateField(ph,[validators.required,validators.phone])) return;
    const btn=document.getElementById('update-user-btn'); setButtonLoading(btn,true); await new Promise(r=>setTimeout(r,400));
    db.update('users',userId,{full_name:n.value.trim(),phone:ph.value.trim(),role_id:document.getElementById('eu-role').value,status:document.getElementById('eu-status').value});
    closeModal(); showToast('success','User Updated',n.value.trim()+"'s details saved"); renderUserManagement();
  });
}
