// ============================================================
// SmartHub ERP — User Profile Page
// ============================================================

import { auth } from '../core/auth.js';
import { db } from '../core/store.js';
import { renderDashboardLayout } from './layout.js';
import { showToast, validators, validateField, getPasswordStrength, setButtonLoading, formatDateTime, getInitials } from '../core/ui.js';

export function renderProfile() {
  const user = auth.getCurrentUser();
  const role = auth.getCurrentRole();
  if (!user) return;

  const content = `
    <div class="page-header">
      <div>
        <h1>My Profile</h1>
        <p>Manage your personal information and security settings</p>
      </div>
    </div>

    <div class="grid-2" style="grid-template-columns: 1fr 2fr; align-items: start;">
      <!-- Profile Card -->
      <div class="card">
        <div class="card-body text-center">
          <div class="topbar-avatar" style="width:80px;height:80px;font-size:1.75rem;margin:0 auto 1rem;">
            ${getInitials(user.full_name)}
          </div>
          <h3>${user.full_name}</h3>
          <p class="text-sm text-muted">${role?.name || 'User'}</p>
          <p class="text-xs text-muted mt-2">${user.email}</p>
          <div class="mt-4">
            ${user.status === 'active'
              ? '<span class="badge badge-success badge-dot">Active</span>'
              : '<span class="badge badge-warning badge-dot">' + user.status + '</span>'}
          </div>
          <div class="mt-4 text-xs text-muted">
            Last login: ${formatDateTime(user.last_login_at)}
          </div>
        </div>
      </div>

      <!-- Profile Forms -->
      <div style="display:flex;flex-direction:column;gap:1.5rem;">
        <!-- Personal Info -->
        <div class="card">
          <div class="card-header">
            <h4>📋 Personal Information</h4>
          </div>
          <div class="card-body">
            <form id="profile-form" novalidate>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label" for="prof-name">Full Name <span class="required">*</span></label>
                  <input type="text" class="form-input" id="prof-name" value="${user.full_name}" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="prof-phone">Phone <span class="required">*</span></label>
                  <input type="tel" class="form-input" id="prof-phone" value="${user.phone || ''}" maxlength="10" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-email">Email Address</label>
                <input type="email" class="form-input" id="prof-email" value="${user.email}" disabled style="opacity:0.6;" />
                <div class="form-hint">Email cannot be changed. Contact admin for assistance.</div>
              </div>
              <button type="submit" class="btn btn-primary" id="save-profile-btn">Save Changes</button>
            </form>
          </div>
        </div>

        <!-- Change Password -->
        <div class="card">
          <div class="card-header">
            <h4>🔒 Change Password</h4>
          </div>
          <div class="card-body">
            <form id="password-form" novalidate>
              <div class="form-group">
                <label class="form-label" for="current-pw">Current Password <span class="required">*</span></label>
                <input type="password" class="form-input" id="current-pw" placeholder="Enter current password" />
              </div>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label" for="new-pw">New Password <span class="required">*</span></label>
                  <input type="password" class="form-input" id="new-pw" placeholder="Enter new password" />
                  <div class="password-strength" id="prof-pw-strength" data-strength="0">
                    <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
                  </div>
                  <div class="strength-label" id="prof-pw-label"></div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="confirm-pw">Confirm Password <span class="required">*</span></label>
                  <input type="password" class="form-input" id="confirm-pw" placeholder="Re-enter new password" />
                </div>
              </div>
              <button type="submit" class="btn btn-secondary" id="change-pw-btn">Update Password</button>
            </form>
          </div>
        </div>

        <!-- Security Settings -->
        <div class="card">
          <div class="card-header">
            <h4>🛡️ Security Settings</h4>
          </div>
          <div class="card-body">
            <div class="flex items-center justify-between" style="padding: 0.75rem 0;">
              <div>
                <div class="font-semibold text-sm">Two-Factor Authentication (2FA)</div>
                <div class="text-xs text-muted mt-1">Add an extra layer of security to your account</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-2fa" ${user.two_fa_enabled ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div style="border-top:1px solid var(--border-default);padding-top:0.75rem;margin-top:0.75rem;">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-semibold text-sm">Active Sessions</div>
                  <div class="text-xs text-muted mt-1">Manage your logged-in devices</div>
                </div>
                <span class="badge badge-info">1 active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderDashboardLayout(content, 'dashboard', ['Profile']);

  // ── Event Listeners ──────────────────────────────────
  // Profile form
  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prof-name');
    const phone = document.getElementById('prof-phone');

    const e1 = validateField(name, [validators.required, validators.minLength(3)]);
    const e2 = validateField(phone, [validators.required, validators.phone]);
    if (e1 || e2) return;

    const btn = document.getElementById('save-profile-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 500));

    db.update('users', user.id, {
      full_name: name.value.trim(),
      phone: phone.value.trim()
    });

    setButtonLoading(btn, false);
    showToast('success', 'Profile Updated', 'Your personal information has been saved');
  });

  // Password form
  document.getElementById('new-pw')?.addEventListener('input', (e) => {
    const { score, label, color } = getPasswordStrength(e.target.value);
    document.getElementById('prof-pw-strength').dataset.strength = score;
    const labelEl = document.getElementById('prof-pw-label');
    labelEl.textContent = label;
    labelEl.style.color = color;
  });

  document.getElementById('password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = document.getElementById('current-pw');
    const newPw = document.getElementById('new-pw');
    const confirm = document.getElementById('confirm-pw');

    const e1 = validateField(current, [validators.required]);
    const e2 = validateField(newPw, [validators.required, validators.password]);
    const e3 = validateField(confirm, [validators.required, validators.match('new-pw', 'Passwords')]);
    if (e1 || e2 || e3) return;

    const btn = document.getElementById('change-pw-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 500));

    const result = auth.changePassword(user.id, current.value, newPw.value);
    setButtonLoading(btn, false);

    if (!result.success) {
      showToast('error', 'Password Change Failed', result.error);
      return;
    }

    showToast('success', 'Password Changed', 'Your password has been updated successfully');
    current.value = '';
    newPw.value = '';
    confirm.value = '';
    document.getElementById('prof-pw-strength').dataset.strength = 0;
    document.getElementById('prof-pw-label').textContent = '';
  });

  // 2FA Toggle
  document.getElementById('toggle-2fa')?.addEventListener('change', (e) => {
    db.update('users', user.id, { two_fa_enabled: e.target.checked });
    showToast('info', '2FA ' + (e.target.checked ? 'Enabled' : 'Disabled'),
      e.target.checked ? 'Two-factor authentication is now active' : '2FA has been turned off');
  });
}
