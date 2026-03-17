// ============================================================
// SmartHub ERP — Login Page
// ============================================================

import { auth } from '../core/auth.js';
import { router } from '../core/router.js';
import { showToast, validators, validateField, getPasswordStrength, setButtonLoading } from '../core/ui.js';

export function renderLogin() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="auth-layout">
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="logo">⚡</div>
            <h2>Welcome Back</h2>
            <p>Sign in to your SmartHub ERP account</p>
          </div>

          <form id="login-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="login-email">
                Email Address <span class="required">*</span>
              </label>
              <div class="input-wrapper">
                <span class="input-icon">📧</span>
                <input type="email" class="form-input" id="login-email"
                  placeholder="you@company.com" autocomplete="email" autofocus />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="login-password">
                Password <span class="required">*</span>
              </label>
              <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input type="password" class="form-input" id="login-password"
                  placeholder="Enter your password" autocomplete="current-password" />
                <button type="button" class="input-action" id="toggle-password" title="Show password">👁</button>
              </div>
            </div>

            <div class="flex items-center justify-between mb-6">
              <label class="form-check">
                <input type="checkbox" id="login-remember" />
                Remember me
              </label>
              <a href="#/forgot-password" class="text-sm">Forgot password?</a>
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" id="login-btn">
              Sign In
            </button>
          </form>

          <!-- 2FA Section (hidden by default) -->
          <div id="otp-section" class="hidden">
            <div class="auth-divider">Two-Factor Authentication</div>
            <p class="text-sm text-muted text-center mb-4">
              Enter the 6-digit code sent to your registered email
            </p>
            <form id="otp-form" novalidate>
              <div class="form-group">
                <div class="input-wrapper">
                  <span class="input-icon">🔐</span>
                  <input type="text" class="form-input" id="otp-code"
                    placeholder="Enter 6-digit OTP" maxlength="6" style="text-align:center; letter-spacing:8px; font-size:1.25rem;" />
                </div>
                <div class="form-hint text-center">Demo OTP: 123456</div>
              </div>
              <button type="submit" class="btn btn-primary btn-full btn-lg" id="otp-btn">
                Verify OTP
              </button>
            </form>
          </div>

          <div class="auth-footer">
            Don't have an account? <a href="#/register">Create one free</a>
          </div>

          <div class="auth-divider">Demo Credentials</div>
          <div class="text-center text-xs text-muted" style="line-height:1.8">
            <strong>Email:</strong> rajesh@smarthub.com<br />
            <strong>Password:</strong> Admin@123
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Event Listeners ──────────────────────────────────
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const toggleBtn = document.getElementById('toggle-password');
  const loginBtn = document.getElementById('login-btn');

  // Toggle password visibility
  toggleBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    toggleBtn.textContent = type === 'password' ? '👁' : '🙈';
  });

  // Real-time validation
  emailInput.addEventListener('blur', () => {
    validateField(emailInput, [validators.required, validators.email]);
  });

  passwordInput.addEventListener('blur', () => {
    validateField(passwordInput, [validators.required]);
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailError = validateField(emailInput, [validators.required, validators.email]);
    const passError = validateField(passwordInput, [validators.required]);

    if (emailError || passError) return;

    setButtonLoading(loginBtn, true);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    const result = auth.login(
      emailInput.value.trim(),
      passwordInput.value,
      document.getElementById('login-remember').checked
    );

    setButtonLoading(loginBtn, false);

    if (result.requires_2fa) {
      // Show OTP section
      form.classList.add('hidden');
      document.getElementById('otp-section').classList.remove('hidden');
      showToast('info', 'OTP Sent', 'A verification code has been sent to your email');
      document.getElementById('otp-code').focus();
      return;
    }

    if (!result.success) {
      showToast('error', 'Login Failed', result.error);
      return;
    }

    showToast('success', 'Welcome back!', `Signed in as ${result.user.full_name}`);
    setTimeout(() => router.navigate('/dashboard'), 300);
  });

  // OTP Form
  const otpForm = document.getElementById('otp-form');
  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otpInput = document.getElementById('otp-code');
    const otpBtn = document.getElementById('otp-btn');

    if (!otpInput.value || otpInput.value.length !== 6) {
      validateField(otpInput, [validators.required, validators.minLength(6)]);
      return;
    }

    setButtonLoading(otpBtn, true);
    await new Promise(r => setTimeout(r, 600));

    const result = auth.verify2FA(otpInput.value);
    setButtonLoading(otpBtn, false);

    if (!result.success) {
      showToast('error', 'Verification Failed', result.error);
      return;
    }

    showToast('success', 'Welcome back!', `Signed in as ${result.user.full_name}`);
    setTimeout(() => router.navigate('/dashboard'), 300);
  });
}
