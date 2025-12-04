// ============================================
// RainbowSmoke Official - Contact Form
// Client-side validation and AJAX submission
// ============================================

(function() {
  'use strict';

  // ============================================
  // CONSTANTS
  // ============================================

  const INTEREST_OPTIONS = {
    IRL: 'In Real Life Meetups',
    Collab: 'Collaboration Opportunities',
    Gaming: 'Gaming & Streaming',
    Techie: 'Tech & Systems Engineering',
    NSFW: 'Adult Content (18+ Members Only)'
  };

  const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];

  // ============================================
  // DOM READY
  // ============================================

  document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    console.log('🌈 Contact form initialized');

    initializeForm();
    attachEventListeners();
  });

  // ============================================
  // FORM INITIALIZATION
  // ============================================

  function initializeForm() {
    // Populate interest checkboxes
    const interestsContainer = document.getElementById('interests-container');
    if (interestsContainer) {
      Object.entries(INTEREST_OPTIONS).forEach(([value, label]) => {
        const checkbox = createInterestCheckbox(value, label);
        interestsContainer.appendChild(checkbox);
      });
    }

    // Populate state dropdown
    const stateSelect = document.getElementById('state');
    if (stateSelect) {
      US_STATES.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
      });
    }
  }

  function createInterestCheckbox(value, label) {
    const div = document.createElement('div');
    div.className = 'form-checkbox-group';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `interest-${value}`;
    checkbox.name = 'interests';
    checkbox.value = value;
    checkbox.className = 'form-checkbox';

    const labelEl = document.createElement('label');
    labelEl.htmlFor = `interest-${value}`;
    labelEl.className = 'form-checkbox-label';

    // Add special styling for NSFW option
    if (value === 'NSFW') {
      labelEl.innerHTML = `
        <span class="badge badge-nsfw">18+</span>
        ${label}
        <small class="nsfw-note">Requires admin approval</small>
      `;
    } else {
      labelEl.textContent = label;
    }

    div.appendChild(checkbox);
    div.appendChild(labelEl);

    return div;
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  function attachEventListeners() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    // Form submission
    form.addEventListener('submit', handleSubmit);

    // Real-time validation
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('blur', function() {
        validateField(this);
      });
    });

    // Mobile number formatting
    const mobileInput = document.getElementById('mobile_number');
    if (mobileInput) {
      mobileInput.addEventListener('input', formatPhoneNumber);
    }

    // File upload preview
    const fileInput = document.getElementById('file_upload');
    if (fileInput) {
      fileInput.addEventListener('change', handleFilePreview);
    }

    const videoInput = document.getElementById('video_upload');
    if (videoInput) {
      videoInput.addEventListener('change', handleVideoPreview);
    }

    // NSFW checkbox warning
    const nsfwCheckbox = document.getElementById('interest-NSFW');
    if (nsfwCheckbox) {
      nsfwCheckbox.addEventListener('change', handleNSFWToggle);
    }

    // Twilio opt-in visibility
    const mobileNumberInput = document.getElementById('mobile_number');
    const twilioOptIn = document.getElementById('twilio-opt-in-section');
    if (mobileNumberInput && twilioOptIn) {
      mobileNumberInput.addEventListener('input', function() {
        if (this.value.length >= 10) {
          twilioOptIn.style.display = 'block';
        } else {
          twilioOptIn.style.display = 'none';
        }
      });
    }
  }

  // ============================================
  // FORM SUBMISSION
  // ============================================

  async function handleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');

    // Validate all fields
    if (!validateForm(form)) {
      showAlert('Please fix the errors in the form before submitting.', 'error');
      return;
    }

    // Disable submit button
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    try {
      // Prepare form data
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Collect multiple interests
      const interests = [];
      form.querySelectorAll('input[name="interests"]:checked').forEach(cb => {
        interests.push(cb.value);
      });
      data.interests = interests;

      // Handle file uploads (convert to base64 for now)
      const fileUpload = form.querySelector('#file_upload');
      const videoUpload = form.querySelector('#video_upload');

      if (fileUpload.files.length > 0) {
        data.file = await fileToBase64(fileUpload.files[0]);
        data.file_name = fileUpload.files[0].name;
      }

      if (videoUpload.files.length > 0) {
        data.video = await fileToBase64(videoUpload.files[0]);
        data.video_name = videoUpload.files[0].name;
      }

      // Submit to API
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess(result);
        form.reset();
        document.getElementById('interests-container').querySelectorAll('input').forEach(cb => cb.checked = false);
      } else {
        showAlert(result.error || 'Failed to submit form. Please try again.', 'error');
      }

    } catch (error) {
      console.error('Form submission error:', error);
      showAlert('An error occurred. Please try again later.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Send Message';
    }
  }

  // ============================================
  // VALIDATION
  // ============================================

  function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
      if (!validateField(input)) {
        isValid = false;
      }
    });

    // Check at least one interest is selected
    const interestsChecked = form.querySelectorAll('input[name="interests"]:checked').length;
    if (interestsChecked === 0) {
      showFieldError('interests-container', 'Please select at least one interest');
      isValid = false;
    } else {
      clearFieldError('interests-container');
    }

    return isValid;
  }

  function validateField(input) {
    const value = input.value.trim();
    const type = input.type;
    const required = input.hasAttribute('required');

    // Skip validation for non-required empty fields
    if (!required && !value) {
      clearFieldError(input.id || input.name);
      return true;
    }

    // Required field check
    if (required && !value) {
      showFieldError(input.id || input.name, 'This field is required');
      return false;
    }

    // Email validation
    if (type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        showFieldError(input.id || input.name, 'Please enter a valid email address');
        return false;
      }
    }

    // Phone number validation
    if (input.id === 'mobile_number' && value) {
      const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
      if (!phoneRegex.test(value.replace(/\s/g, ''))) {
        showFieldError(input.id, 'Please enter a valid 10-digit phone number');
        return false;
      }
    }

    // Birthday validation (must be 18+ if NSFW selected)
    if (input.id === 'birthday' && value) {
      const nsfwChecked = document.getElementById('interest-NSFW')?.checked;
      if (nsfwChecked) {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (age < 18) {
          showFieldError(input.id, 'You must be 18+ to select NSFW interest');
          return false;
        }
      }
    }

    // File size validation
    if (type === 'file' && input.files.length > 0) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (input.files[0].size > maxSize) {
        showFieldError(input.id, 'File size must be less than 10MB');
        return false;
      }
    }

    clearFieldError(input.id || input.name);
    return true;
  }

  function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    clearFieldError(fieldId);

    const errorEl = document.createElement('span');
    errorEl.className = 'form-error';
    errorEl.id = `${fieldId}-error`;
    errorEl.textContent = message;

    field.parentNode.appendChild(errorEl);
    field.classList.add('error');
  }

  function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const errorEl = document.getElementById(`${fieldId}-error`);
    if (errorEl) {
      errorEl.remove();
    }
    field.classList.remove('error');
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function formatPhoneNumber(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) value = value.slice(0, 10);

    if (value.length >= 6) {
      value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
    } else if (value.length >= 3) {
      value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
    }

    e.target.value = value;
  }

  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleFilePreview(e) {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById('file-preview');
    if (preview) {
      preview.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
      preview.style.display = 'block';
    }
  }

  function handleVideoPreview(e) {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById('video-preview');
    if (preview) {
      preview.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      preview.style.display = 'block';
    }
  }

  function handleNSFWToggle(e) {
    const isChecked = e.target.checked;
    const warningEl = document.getElementById('nsfw-warning');

    if (isChecked) {
      if (!warningEl) {
        const warning = document.createElement('div');
        warning.id = 'nsfw-warning';
        warning.className = 'alert alert-warning';
        warning.innerHTML = `
          <strong>⚠️ NSFW Membership Request</strong><br>
          By selecting this option, you are requesting access to adult content (18+ only).
          Admin approval is required. You must be 18 or older to access this content.
        `;
        e.target.closest('.form-group').appendChild(warning);
      }

      // Make birthday required
      const birthdayInput = document.getElementById('birthday');
      if (birthdayInput) {
        birthdayInput.setAttribute('required', 'required');
        const label = birthdayInput.previousElementSibling;
        if (label && !label.textContent.includes('*')) {
          label.innerHTML += ' <span class="required">*</span>';
        }
      }
    } else {
      if (warningEl) {
        warningEl.remove();
      }
    }
  }

  function showSuccess(result) {
    const formContainer = document.getElementById('contact-form-container');
    if (!formContainer) return;

    formContainer.innerHTML = `
      <div class="alert alert-success">
        <h3>✅ Thank you for reaching out!</h3>
        <p>Your submission has been received. ${result.message || ''}</p>
        ${result.nsfw_interest ? `
          <p><strong>NSFW Access:</strong> Your request for adult content access is pending admin approval. You'll be notified via email once approved.</p>
        ` : ''}
        <p>I'll get back to you as soon as possible!</p>
        <a href="/" class="btn btn-primary">Back to Home</a>
      </div>
    `;

    // Scroll to success message
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const form = document.getElementById('contact-form');
    if (form) {
      form.insertBefore(alertDiv, form.firstChild);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        alertDiv.style.transition = 'opacity 0.3s ease';
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 300);
      }, 5000);
    }
  }

})();
