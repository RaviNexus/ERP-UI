// ============================================================
// SmartHub ERP — Register Page
// ============================================================

import { auth } from '../core/auth.js';
import { router } from '../core/router.js';
import { showToast, validators, validateField, getPasswordStrength, setButtonLoading } from '../core/ui.js';

const INDUSTRIES = [
  'Retail', 'Manufacturing', 'Services', 'Healthcare',
  'Education', 'Hospitality', 'Logistics', 'Construction', 'Other'
];

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'UAE', 'Singapore', 'Germany', 'France', 'Japan', 'Other'
];

export function renderRegister() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="auth-layout">
      <div class="auth-container" style="max-width: 540px;">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="logo">⚡</div>
            <h2>Create Your Account</h2>
            <p>Start your 14-day free trial — no credit card required</p>
          </div>

          <form id="register-form" novalidate>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="reg-name">
                  Full Name <span class="required">*</span>
                </label>
                <input type="text" class="form-input" id="reg-name"
                  placeholder="John Doe" />
              </div>

              <div class="form-group">
                <label class="form-label" for="reg-phone">
                  Phone <span class="required">*</span>
                </label>
                <input type="tel" class="form-input" id="reg-phone"
                  placeholder="9876543210" maxlength="10" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-email">
                Email Address <span class="required">*</span>
              </label>
              <input type="email" class="form-input" id="reg-email"
                placeholder="you@company.com" />
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-company">
                Company Name <span class="required">*</span>
              </label>
              <input type="text" class="form-input" id="reg-company"
                placeholder="Your Company Name" />
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="reg-industry">
                  Industry <span class="required">*</span>
                </label>
                <select class="form-select" id="reg-industry">
                  <option value="">Select Industry</option>
                  ${INDUSTRIES.map(i => `<option value="${i.toLowerCase()}">${i}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="reg-country">
                  Country <span class="required">*</span>
                </label>
                <select class="form-select" id="reg-country">
                  <option value="">Select Country</option>
                  ${COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-password">
                Password <span class="required">*</span>
              </label>
              <div class="input-wrapper">
                <input type="password" class="form-input" id="reg-password"
                  placeholder="Min 8 chars, 1 upper, 1 number, 1 special" />
                <button type="button" class="input-action" id="toggle-reg-password">👁</button>
              </div>
              <div class="password-strength" id="password-strength" data-strength="0">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
              </div>
              <div class="strength-label" id="strength-label"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-confirm">
                Confirm Password <span class="required">*</span>
              </label>
              <input type="password" class="form-input" id="reg-confirm"
                placeholder="Re-enter your password" />
            </div>

            <div class="form-group">
              <label class="form-check">
                <input type="checkbox" id="reg-terms" />
                I agree to the <a href="#" onclick="event.preventDefault()">Terms of Service</a> and <a href="#" onclick="event.preventDefault()">Privacy Policy</a>
              </label>
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" id="reg-btn">
              Create Account & Start Free Trial
            </button>
          </form>

          <div class="auth-footer">
            Already have an account? <a href="#/login">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Event Listeners ──────────────────────────────────
  const form = document.getElementById('register-form');
  const passwordInput = document.getElementById('reg-password');
  const toggleBtn = document.getElementById('toggle-reg-password');

  // Toggle password visibility
  toggleBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    toggleBtn.textContent = type === 'password' ? '👁' : '🙈';
  });

  // Password strength indicator
  passwordInput.addEventListener('input', () => {
    const { score, label, color } = getPasswordStrength(passwordInput.value);
    const meter = document.getElementById('password-strength');
    const labelEl = document.getElementById('strength-label');
    meter.dataset.strength = score;
    labelEl.textContent = label;
    labelEl.style.color = color;
  });

  // Real-time validation on blur
  const fields = {
    'reg-name': [validators.required, validators.minLength(3), validators.alphaOnly],
    'reg-email': [validators.required, validators.email],
    'reg-phone': [validators.required, validators.phone],
    'reg-company': [validators.required, validators.minLength(3)],
    'reg-industry': [validators.required],
    'reg-country': [validators.required],
    'reg-password': [validators.required, validators.password],
    'reg-confirm': [validators.required, validators.match('reg-password', 'Passwords')]
  };

  Object.keys(fields).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('blur', () => validateField(el, fields[id]));
    }
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate all fields
    let hasErrors = false;
    Object.entries(fields).forEach(([id, rules]) => {
      const el = document.getElementById(id);
      if (el && validateField(el, rules)) hasErrors = true;
    });

    // Check terms
    const termsCheck = document.getElementById('reg-terms');
    if (!termsCheck.checked) {
      showToast('warning', 'Terms Required', 'Please agree to the Terms of Service');
      hasErrors = true;
    }

    if (hasErrors) return;

    const btn = document.getElementById('reg-btn');
    setButtonLoading(btn, true);

    await new Promise(r => setTimeout(r, 1000));

    const result = auth.register({
      full_name: document.getElementById('reg-name').value.trim(),
      email: document.getElementById('reg-email').value.trim(),
      phone: document.getElementById('reg-phone').value.trim(),
      company_name: document.getElementById('reg-company').value.trim(),
      industry_type: document.getElementById('reg-industry').value,
      country: document.getElementById('reg-country').value,
      password: document.getElementById('reg-password').value
    });

    setButtonLoading(btn, false);

    if (!result.success) {
      showToast('error', 'Registration Failed', result.error);
      return;
    }

    showToast('success', 'Account Created!', 'Welcome to SmartHub ERP. Your 14-day trial has started.');

    // Auto-login
    const loginResult = auth.login(
      document.getElementById('reg-email').value.trim(),
      document.getElementById('reg-password').value
    );

    setTimeout(() => router.navigate('/dashboard'), 500);
  });
}
