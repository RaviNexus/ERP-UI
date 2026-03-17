// ============================================================
// SmartHub ERP — Forgot & Reset Password Pages
// ============================================================

import { db } from '../core/store.js';
import { router } from '../core/router.js';
import { showToast, validators, validateField, getPasswordStrength, setButtonLoading } from '../core/ui.js';

export function renderForgotPassword() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="auth-layout">
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="logo">🔑</div>
            <h2>Forgot Password?</h2>
            <p>Enter your email and we'll send you a reset link</p>
          </div>

          <form id="forgot-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="forgot-email">
                Email Address <span class="required">*</span>
              </label>
              <div class="input-wrapper">
                <span class="input-icon">📧</span>
                <input type="email" class="form-input" id="forgot-email"
                  placeholder="you@company.com" autofocus />
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" id="forgot-btn">
              Send Reset Link
            </button>
          </form>

          <div id="success-message" class="hidden" style="text-align:center; padding: 2rem 0;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📨</div>
            <h4>Check Your Email</h4>
            <p class="text-sm text-muted mt-2">
              If an account exists with that email, you'll receive a password reset link shortly.
            </p>
            <p class="text-xs text-muted mt-4">
              For demo, click below to simulate the reset:
            </p>
            <button class="btn btn-secondary mt-4" id="simulate-reset">
              Simulate Reset Link →
            </button>
          </div>

          <div class="auth-footer">
            Remember your password? <a href="#/login">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById('forgot-form');
  const emailInput = document.getElementById('forgot-email');

  emailInput.addEventListener('blur', () => {
    validateField(emailInput, [validators.required, validators.email]);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const error = validateField(emailInput, [validators.required, validators.email]);
    if (error) return;

    const btn = document.getElementById('forgot-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 800));
    setButtonLoading(btn, false);

    // Always show success (security best practice — don't reveal if email exists)
    form.classList.add('hidden');
    document.getElementById('success-message').classList.remove('hidden');

    // Store the email for the reset simulation
    sessionStorage.setItem('smarthub_reset_email', emailInput.value.trim());

    document.getElementById('simulate-reset').addEventListener('click', () => {
      const token = 'demo-reset-' + Date.now();
      sessionStorage.setItem('smarthub_reset_token', token);
      router.navigate(`/reset-password/${token}`);
    });
  });
}

export function renderResetPassword(params) {
  const app = document.getElementById('app');
  const token = params.token;

  app.innerHTML = `
    <div class="auth-layout">
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="logo">🔐</div>
            <h2>Reset Password</h2>
            <p>Enter your new password below</p>
          </div>

          <form id="reset-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="reset-password">
                New Password <span class="required">*</span>
              </label>
              <div class="input-wrapper">
                <input type="password" class="form-input" id="reset-password"
                  placeholder="Min 8 chars, 1 upper, 1 number, 1 special" autofocus />
                <button type="button" class="input-action" id="toggle-reset-pw">👁</button>
              </div>
              <div class="password-strength" id="pw-strength" data-strength="0">
                <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
              </div>
              <div class="strength-label" id="pw-strength-label"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reset-confirm">
                Confirm Password <span class="required">*</span>
              </label>
              <input type="password" class="form-input" id="reset-confirm"
                placeholder="Re-enter your new password" />
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" id="reset-btn">
              Reset Password
            </button>
          </form>

          <div class="auth-footer">
            <a href="#/login">← Back to Login</a>
          </div>
        </div>
      </div>
    </div>
  `;

  const passwordInput = document.getElementById('reset-password');
  const toggleBtn = document.getElementById('toggle-reset-pw');

  toggleBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    toggleBtn.textContent = type === 'password' ? '👁' : '🙈';
  });

  passwordInput.addEventListener('input', () => {
    const { score, label, color } = getPasswordStrength(passwordInput.value);
    document.getElementById('pw-strength').dataset.strength = score;
    const labelEl = document.getElementById('pw-strength-label');
    labelEl.textContent = label;
    labelEl.style.color = color;
  });

  const form = document.getElementById('reset-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pw = document.getElementById('reset-password');
    const confirm = document.getElementById('reset-confirm');

    const e1 = validateField(pw, [validators.required, validators.password]);
    const e2 = validateField(confirm, [validators.required, validators.match('reset-password', 'Passwords')]);

    if (e1 || e2) return;

    const btn = document.getElementById('reset-btn');
    setButtonLoading(btn, true);
    await new Promise(r => setTimeout(r, 800));
    setButtonLoading(btn, false);

    // Find the user from stored email
    const email = sessionStorage.getItem('smarthub_reset_email');
    if (email) {
      const user = db.findOne('users', u => u.email === email.toLowerCase());
      if (user) {
        // Simple hash (same as auth service)
        let hash = 0;
        const password = pw.value;
        for (let i = 0; i < password.length; i++) {
          const char = password.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        db.update('users', user.id, { password_hash: 'hash_' + Math.abs(hash).toString(36) });
      }
    }

    sessionStorage.removeItem('smarthub_reset_email');
    sessionStorage.removeItem('smarthub_reset_token');

    showToast('success', 'Password Reset!', 'Your password has been changed. Please log in with your new password.');
    setTimeout(() => router.navigate('/login'), 1500);
  });
}
