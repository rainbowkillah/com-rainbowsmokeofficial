// ============================================
// RainbowSmoke Official - Authentication
// Login forms for NSFW Members and Admin
// ============================================

(function() {
  'use strict';

  // ============================================
  // DOM READY
  // ============================================

  document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Auth module initialized');

    initializeLoginForms();
  });

  // ============================================
  // LOGIN FORM INITIALIZATION
  // ============================================

  function initializeLoginForms() {
    // NSFW Members login form
    const nsfwLoginForm = document.getElementById('nsfw-login-form');
    if (nsfwLoginForm) {
      nsfwLoginForm.addEventListener('submit', handleNSFWLogin);
    }

    // Admin login form
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', handleAdminLogin);
    }

    // Show/hide password toggle
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
      button.addEventListener('click', togglePasswordVisibility);
    });
  }

  // ============================================
  // NSFW LOGIN HANDLER
  // ============================================

  async function handleNSFWLogin(e) {
    e.preventDefault();

    const form = e.target;
    const password = form.querySelector('#nsfw-password').value;
    const ageConfirm = form.querySelector('#age-confirm').checked;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('nsfw-login-error');

    // Clear previous errors
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    }

    // Validate age confirmation
    if (!ageConfirm) {
      showLoginError('nsfw-login-error', 'You must confirm you are 18 or older to access this content.');
      return;
    }

    // Validate password
    if (!password) {
      showLoginError('nsfw-login-error', 'Please enter the member password.');
      return;
    }

    // Disable submit button
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';

    try {
      const response = await fetch('/nsfw/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: password,
          age_confirmed: ageConfirm
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Success - redirect to NSFW content
        window.location.href = '/nsfw';
      } else {
        // Show error message
        showLoginError('nsfw-login-error', result.error || 'Invalid password. Please try again.');
      }

    } catch (error) {
      console.error('NSFW login error:', error);
      showLoginError('nsfw-login-error', 'An error occurred. Please try again later.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Enter Members Area';
    }
  }

  // ============================================
  // ADMIN LOGIN HANDLER
  // ============================================

  async function handleAdminLogin(e) {
    e.preventDefault();

    const form = e.target;
    const password = form.querySelector('#admin-password').value;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('admin-login-error');

    // Clear previous errors
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    }

    // Validate password
    if (!password) {
      showLoginError('admin-login-error', 'Please enter the admin password.');
      return;
    }

    // Disable submit button
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';

    try {
      const response = await fetch('/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: password
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Success - redirect to admin dashboard
        window.location.href = '/admin/dashboard';
      } else {
        // Show error message
        showLoginError('admin-login-error', result.error || 'Invalid password. Please try again.');
      }

    } catch (error) {
      console.error('Admin login error:', error);
      showLoginError('admin-login-error', 'An error occurred. Please try again later.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Access Dashboard';
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function showLoginError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  function togglePasswordVisibility(e) {
    const button = e.currentTarget;
    const input = button.previousElementSibling;

    if (input && input.type === 'password') {
      input.type = 'text';
      button.textContent = '🙈';
      button.setAttribute('aria-label', 'Hide password');
    } else if (input) {
      input.type = 'password';
      button.textContent = '👁️';
      button.setAttribute('aria-label', 'Show password');
    }
  }

  // ============================================
  // LOGOUT HANDLER
  // ============================================

  window.logout = async function(type) {
    try {
      const response = await fetch(`/${type}/logout`, {
        method: 'POST'
      });

      if (response.ok) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect anyway
      window.location.href = '/';
    }
  };

})();
