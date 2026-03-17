// ============================================================
// SmartHub ERP — Auth Service
// ============================================================

import { db } from './store.js';

const SESSION_KEY = 'smarthub_session';

class AuthService {
  // Get current session
  getSession() {
    try {
      const session = sessionStorage.getItem(SESSION_KEY);
      if (!session) return null;
      const parsed = JSON.parse(session);
      // Check expiry
      if (parsed.expires_at && new Date(parsed.expires_at) < new Date()) {
        this.logout();
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  // Check if user is logged in
  isAuthenticated() {
    return this.getSession() !== null;
  }

  // Get current user
  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;
    return db.getById('users', session.user_id);
  }

  // Get current user's role
  getCurrentRole() {
    const user = this.getCurrentUser();
    if (!user) return null;
    return db.getById('roles', user.role_id);
  }

  // Get current user's permissions
  getPermissions() {
    const role = this.getCurrentRole();
    if (!role) return [];
    return role.permissions || [];
  }

  // Check if user has a specific permission
  hasPermission(permission) {
    const permissions = this.getPermissions();
    // Wildcard check
    if (permissions.includes('*.*')) return true;
    const [module, action] = permission.split('.');
    if (permissions.includes(`${module}.*`)) return true;
    if (permissions.includes(`*.${action}`)) return true;
    return permissions.includes(permission);
  }

  // Login
  login(email, password, rememberMe = false) {
    const user = db.findOne('users', u => u.email === email.toLowerCase());

    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    // Check if account is locked
    if (user.status === 'locked') {
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minsLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        return { success: false, error: `Account locked due to multiple failed attempts. Try after ${minsLeft} minutes.` };
      }
      // Unlock if timeout passed
      db.update('users', user.id, { status: 'active', login_attempts: 0, locked_until: null });
    }

    if (user.status === 'inactive') {
      return { success: false, error: 'Your account has been deactivated. Contact admin.' };
    }

    if (user.status === 'pending') {
      return { success: false, error: 'Please verify your email before logging in.' };
    }

    // Check password (simplified — in real app, use bcrypt)
    if (user.password_hash !== this._hashPassword(password)) {
      // Increment login attempts
      const attempts = (user.login_attempts || 0) + 1;
      const updates = { login_attempts: attempts };

      if (attempts >= 5) {
        updates.status = 'locked';
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        db.update('users', user.id, updates);
        return { success: false, error: 'Account locked due to multiple failed attempts. Try after 30 minutes.' };
      }

      db.update('users', user.id, updates);
      return { success: false, error: 'Invalid email or password.' };
    }

    // Check 2FA
    if (user.two_fa_enabled) {
      // Store pending 2FA session
      sessionStorage.setItem('smarthub_2fa_pending', JSON.stringify({
        user_id: user.id,
        otp: this._generateOTP()
      }));
      return { success: false, requires_2fa: true, otp_sent: true };
    }

    // Successful login
    return this._createSession(user, rememberMe);
  }

  // Verify 2FA OTP
  verify2FA(otp) {
    const pending = sessionStorage.getItem('smarthub_2fa_pending');
    if (!pending) {
      return { success: false, error: 'No 2FA session found. Please login again.' };
    }
    const { user_id, otp: expectedOtp } = JSON.parse(pending);
    // For demo: accept any 6-digit code or the generated one
    if (otp === expectedOtp || otp === '123456') {
      sessionStorage.removeItem('smarthub_2fa_pending');
      const user = db.getById('users', user_id);
      return this._createSession(user, false);
    }
    return { success: false, error: 'Invalid OTP. Please try again.' };
  }

  // Create session
  _createSession(user, rememberMe) {
    // Reset login attempts
    db.update('users', user.id, {
      login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString()
    });

    // Set tenant
    db.setTenant(user.tenant_id);

    const session = {
      user_id: user.id,
      tenant_id: user.tenant_id,
      role_id: user.role_id,
      email: user.email,
      full_name: user.full_name,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000).toISOString()
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Log audit
    db.create('audit_logs', {
      tenant_id: user.tenant_id,
      user_id: user.id,
      action: 'login',
      module: 'auth',
      details: { ip: '127.0.0.1', device: navigator.userAgent }
    });

    return { success: true, user };
  }

  // Register
  register(data) {
    // Check if email already exists
    const existingUser = db.findOne('users', u => u.email === data.email.toLowerCase());
    if (existingUser) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Check company name unique
    const existingCompany = db.findOne('tenants', t => t.company_name.toLowerCase() === data.company_name.toLowerCase());
    if (existingCompany) {
      return { success: false, error: 'A company with this name already exists.' };
    }

    // Create tenant
    const tenant = db.create('tenants', {
      company_name: data.company_name,
      industry_type: data.industry_type,
      country: data.country,
      plan_id: 'plan_starter',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'trial'
    });

    // Create "Business Owner" role for this tenant
    const ownerRole = db.create('roles', {
      tenant_id: tenant.id,
      name: 'Business Owner',
      description: 'Full access to all modules',
      is_system_role: true,
      is_default: false,
      permissions: ['*.view', '*.create', '*.edit', '*.delete', '*.export', '*.approve']
    });

    // Create default roles
    this._createDefaultRoles(tenant.id);

    // Create owner user
    const user = db.create('users', {
      tenant_id: tenant.id,
      full_name: data.full_name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      password_hash: this._hashPassword(data.password),
      role_id: ownerRole.id,
      status: 'active',
      email_verified: true, // Auto-verify for demo
      two_fa_enabled: false,
      login_attempts: 0,
      avatar_url: null
    });

    return { success: true, user, tenant };
  }

  // Create default roles for a tenant
  _createDefaultRoles(tenantId) {
    const roles = [
      {
        name: 'Finance Manager',
        description: 'Full access to finance, view access to sales and purchase',
        is_system_role: false,
        permissions: [
          'finance.view', 'finance.create', 'finance.edit', 'finance.approve', 'finance.export',
          'sales.view', 'purchase.view', 'reports.view', 'reports.export'
        ]
      },
      {
        name: 'Sales Staff',
        description: 'CRM and sales operations',
        is_system_role: false,
        permissions: [
          'crm.view', 'crm.create', 'crm.edit',
          'sales.view', 'sales.create',
          'inventory.view'
        ]
      },
      {
        name: 'HR Manager',
        description: 'Full access to HR and payroll',
        is_system_role: false,
        permissions: [
          'hr.view', 'hr.create', 'hr.edit', 'hr.delete', 'hr.approve',
          'reports.view'
        ]
      },
      {
        name: 'Inventory Manager',
        description: 'Full inventory and stock management',
        is_system_role: false,
        permissions: [
          'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
          'purchase.view', 'purchase.create',
          'reports.view'
        ]
      }
    ];

    roles.forEach(role => {
      db.create('roles', { tenant_id: tenantId, ...role });
    });
  }

  // Logout
  logout() {
    const session = this.getSession();
    if (session) {
      db.create('audit_logs', {
        tenant_id: session.tenant_id,
        user_id: session.user_id,
        action: 'logout',
        module: 'auth'
      });
    }
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('smarthub_2fa_pending');
  }

  // Change password
  changePassword(userId, currentPassword, newPassword) {
    const user = db.getById('users', userId);
    if (!user) return { success: false, error: 'User not found.' };

    if (user.password_hash !== this._hashPassword(currentPassword)) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    if (this._hashPassword(newPassword) === user.password_hash) {
      return { success: false, error: 'New password cannot be the same as current password.' };
    }

    db.update('users', userId, {
      password_hash: this._hashPassword(newPassword)
    });

    return { success: true };
  }

  // Simple hash (for demo — NOT secure, use bcrypt in production)
  _hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'hash_' + Math.abs(hash).toString(36);
  }

  // Generate 6-digit OTP
  _generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export const auth = new AuthService();
export default auth;
