// ============================================================
// SmartHub ERP — UI Utilities (Toast, Modal, Validation, etc.)
// ============================================================

// ── Toast Notifications ──────────────────────────────────
const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

export function showToast(type, title, message = '', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type]}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Modal ────────────────────────────────────────────────
export function showModal(content, { title = '', size = 'default', onClose = null } = {}) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  const maxWidth = size === 'lg' ? '720px' : size === 'sm' ? '400px' : '560px';

  overlay.innerHTML = `
    <div class="modal" style="max-width: ${maxWidth}">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" id="modal-close-btn">×</button>
      </div>
      <div class="modal-body">${content}</div>
    </div>
  `;

  overlay.classList.add('active');

  const closeBtn = document.getElementById('modal-close-btn');
  closeBtn.addEventListener('click', () => closeModal(onClose));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(onClose);
  });

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeModal(onClose);
      document.removeEventListener('keydown', escHandler);
    }
  });
}

export function closeModal(callback = null) {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.innerHTML = '';
  }
  if (callback) callback();
}

// ── Validation ──────────────────────────────────────────
export const validators = {
  required: (value) => {
    if (typeof value === 'string') return value.trim().length > 0 ? null : 'This field is required';
    return value !== null && value !== undefined ? null : 'This field is required';
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    return value.length >= min ? null : `Minimum ${min} characters required`;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    return value.length <= max ? null : `Maximum ${max} characters allowed`;
  },

  email: (value) => {
    if (!value) return null;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value) ? null : 'Please enter a valid email address';
  },

  phone: (value) => {
    if (!value) return null;
    const regex = /^\d{10}$/;
    return regex.test(value.replace(/[\s-]/g, '')) ? null : 'Please enter a valid 10-digit phone number';
  },

  password: (value) => {
    if (!value) return null;
    const checks = [];
    if (value.length < 8) checks.push('at least 8 characters');
    if (!/[A-Z]/.test(value)) checks.push('one uppercase letter');
    if (!/[a-z]/.test(value)) checks.push('one lowercase letter');
    if (!/[0-9]/.test(value)) checks.push('one number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) checks.push('one special character');
    return checks.length === 0 ? null : `Password must contain ${checks.join(', ')}`;
  },

  match: (targetId, label = 'passwords') => (value) => {
    const target = document.getElementById(targetId);
    if (!target || !value) return null;
    return value === target.value ? null : `${label} do not match`;
  },

  alphaOnly: (value) => {
    if (!value) return null;
    return /^[a-zA-Z\s]+$/.test(value) ? null : 'Only letters and spaces are allowed';
  },

  numeric: (value) => {
    if (!value) return null;
    return /^\d+$/.test(value) ? null : 'Only numbers are allowed';
  }
};

// Validate a form element
export function validateField(input, rules = []) {
  const value = input.value;
  let error = null;

  for (const rule of rules) {
    error = typeof rule === 'function' ? rule(value) : null;
    if (error) break;
  }

  const group = input.closest('.form-group');
  const existingError = group?.querySelector('.form-error');
  if (existingError) existingError.remove();

  if (error) {
    input.classList.add('error');
    input.classList.remove('success');
    if (group) {
      const errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      errorEl.textContent = error;
      group.appendChild(errorEl);
    }
  } else if (value) {
    input.classList.remove('error');
    input.classList.add('success');
  } else {
    input.classList.remove('error', 'success');
  }

  return error;
}

// Validate entire form
export function validateForm(formEl, fieldRules) {
  let isValid = true;
  const errors = {};

  for (const [fieldId, rules] of Object.entries(fieldRules)) {
    const input = formEl.querySelector(`#${fieldId}`);
    if (!input) continue;
    const error = validateField(input, rules);
    if (error) {
      isValid = false;
      errors[fieldId] = error;
    }
  }

  return { isValid, errors };
}

// ── Password Strength ───────────────────────────────────
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'var(--color-danger)', 'var(--color-warning)', 'var(--color-info)', 'var(--color-success)'];

  return { score, label: labels[score], color: colors[score] };
}

// ── Loading Button ──────────────────────────────────────
export function setButtonLoading(btn, loading) {
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
    }
  }
}

// ── Escape HTML ─────────────────────────────────────────
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Format Date ─────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ── Debounce ────────────────────────────────────────────
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Get Initials ────────────────────────────────────────
export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Status Badge ────────────────────────────────────────
export function statusBadge(status) {
  const map = {
    active: 'success',
    inactive: 'danger',
    pending: 'warning',
    locked: 'danger',
    trial: 'info',
    draft: 'neutral',
    suspended: 'danger'
  };
  const variant = map[status] || 'neutral';
  return `<span class="badge badge-${variant} badge-dot">${status}</span>`;
}
