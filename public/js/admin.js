// ============================================
// RainbowSmoke Official - Admin Dashboard
// Contact management and statistics
// ============================================

(function() {
  'use strict';

  let allContacts = [];
  let currentFilter = 'all';

  // ============================================
  // DOM READY
  // ============================================

  document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Admin dashboard initialized');

    initializeDashboard();
  });

  // ============================================
  // DASHBOARD INITIALIZATION
  // ============================================

  async function initializeDashboard() {
    // Load initial data
    await loadContacts();

    // Set up event listeners
    setupEventListeners();

    // Update stats
    updateStatistics();
  }

  function setupEventListeners() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderContactsTable();
      });
    });

    // Refresh button
    const refreshBtn = document.getElementById('refresh-contacts');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
        await loadContacts();
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh';
      });
    }

    // Export button
    const exportBtn = document.getElementById('export-contacts');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportContactsToCSV);
    }
  }

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadContacts() {
    try {
      const response = await fetch('/api/admin/contacts');

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        throw new Error('Failed to load contacts');
      }

      const data = await response.json();
      allContacts = data.contacts || [];

      renderContactsTable();
      updateStatistics();

    } catch (error) {
      console.error('Error loading contacts:', error);
      showNotification('Failed to load contacts. Please try again.', 'error');
    }
  }

  // ============================================
  // RENDERING
  // ============================================

  function renderContactsTable() {
    const tbody = document.getElementById('contacts-tbody');
    if (!tbody) return;

    // Filter contacts
    let filteredContacts = allContacts;
    if (currentFilter !== 'all') {
      if (currentFilter === 'nsfw') {
        filteredContacts = allContacts.filter(c => c.has_nsfw_interest === 1);
      } else {
        filteredContacts = allContacts.filter(c => c.status === currentFilter);
      }
    }

    // Clear table
    tbody.innerHTML = '';

    if (filteredContacts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem;">
            No contacts found for filter: ${currentFilter}
          </td>
        </tr>
      `;
      return;
    }

    // Render contacts
    filteredContacts.forEach(contact => {
      const row = createContactRow(contact);
      tbody.appendChild(row);
    });
  }

  function createContactRow(contact) {
    const tr = document.createElement('tr');
    tr.className = `contact-row status-${contact.status}`;
    tr.dataset.contactId = contact.id;

    // Parse interests
    let interests = [];
    try {
      interests = JSON.parse(contact.interests || '[]');
    } catch (e) {
      console.error('Failed to parse interests:', e);
    }

    // Format date
    const submittedDate = new Date(contact.submitted_at);
    const dateStr = submittedDate.toLocaleDateString();
    const timeStr = submittedDate.toLocaleTimeString();

    tr.innerHTML = `
      <td>${contact.id}</td>
      <td>
        <strong>${escapeHtml(contact.first_name)} ${escapeHtml(contact.last_name)}</strong><br>
        <small>${escapeHtml(contact.email)}</small>
        ${contact.mobile_number ? `<br><small>📱 ${escapeHtml(contact.mobile_number)}</small>` : ''}
      </td>
      <td>
        ${interests.map(i => `<span class="badge-interest ${i === 'NSFW' ? 'badge-nsfw' : ''}">${i}</span>`).join(' ')}
        ${contact.has_nsfw_interest ? '<br><span class="badge badge-nsfw">🔞 NSFW Request</span>' : ''}
      </td>
      <td>
        <span class="status-badge status-${contact.status}">${contact.status}</span>
        ${contact.has_nsfw_interest && !contact.nsfw_access_approved ? '<br><small style="color: var(--rainbow-red);">Pending NSFW Approval</small>' : ''}
        ${contact.has_nsfw_interest && contact.nsfw_access_approved ? '<br><small style="color: var(--rainbow-green);">✅ NSFW Approved</small>' : ''}
      </td>
      <td>
        <small>${dateStr}<br>${timeStr}</small>
      </td>
      <td>
        ${contact.city || 'N/A'}, ${contact.state || 'N/A'}
      </td>
      <td>
        <button class="btn-icon" onclick="viewContact(${contact.id})" title="View Details">👁️</button>
        <button class="btn-icon" onclick="updateContactStatus(${contact.id}, 'read')" title="Mark as Read">✓</button>
        ${contact.has_nsfw_interest && !contact.nsfw_access_approved ?
          `<button class="btn-icon btn-approve" onclick="approveNSFWAccess(${contact.id})" title="Approve NSFW">✅</button>` : ''}
      </td>
    `;

    return tr;
  }

  function updateStatistics() {
    // Total contacts
    const totalEl = document.getElementById('stat-total');
    if (totalEl) {
      totalEl.textContent = allContacts.length;
    }

    // NSFW requests
    const nsfwEl = document.getElementById('stat-nsfw');
    if (nsfwEl) {
      const nsfwCount = allContacts.filter(c => c.has_nsfw_interest === 1).length;
      nsfwEl.textContent = nsfwCount;
    }

    // Unread
    const unreadEl = document.getElementById('stat-unread');
    if (unreadEl) {
      const unreadCount = allContacts.filter(c => c.status === 'new').length;
      unreadEl.textContent = unreadCount;
    }

    // Pending NSFW approvals
    const pendingEl = document.getElementById('stat-pending-nsfw');
    if (pendingEl) {
      const pendingCount = allContacts.filter(c => c.has_nsfw_interest === 1 && c.nsfw_access_approved === 0).length;
      pendingEl.textContent = pendingCount;
    }
  }

  // ============================================
  // CONTACT ACTIONS
  // ============================================

  window.viewContact = async function(contactId) {
    const contact = allContacts.find(c => c.id === contactId);
    if (!contact) return;

    // Parse interests
    let interests = [];
    try {
      interests = JSON.parse(contact.interests || '[]');
    } catch (e) {
      console.error('Failed to parse interests:', e);
    }

    // Create modal content
    const modalContent = `
      <div class="contact-details">
        <h3>${escapeHtml(contact.first_name)} ${escapeHtml(contact.last_name)}</h3>

        <div class="detail-section">
          <h4>Contact Information</h4>
          <p><strong>Email:</strong> ${escapeHtml(contact.email)}</p>
          ${contact.mobile_number ? `<p><strong>Mobile:</strong> ${escapeHtml(contact.mobile_number)}</p>` : ''}
          ${contact.twilio_opt_in ? '<p><span class="badge">SMS Opt-in: Yes</span></p>' : ''}
        </div>

        <div class="detail-section">
          <h4>Demographics</h4>
          ${contact.gender ? `<p><strong>Gender:</strong> ${escapeHtml(contact.gender)}</p>` : ''}
          ${contact.birthday ? `<p><strong>Birthday:</strong> ${new Date(contact.birthday).toLocaleDateString()}</p>` : ''}
          ${contact.city || contact.state ? `<p><strong>Location:</strong> ${escapeHtml(contact.city || 'N/A')}, ${escapeHtml(contact.state || 'N/A')}</p>` : ''}
        </div>

        <div class="detail-section">
          <h4>Interests</h4>
          <p>${interests.map(i => `<span class="badge-interest ${i === 'NSFW' ? 'badge-nsfw' : ''}">${i}</span>`).join(' ')}</p>
          ${contact.has_nsfw_interest ? '<p><strong>🔞 NSFW Access Request</strong></p>' : ''}
          ${contact.nsfw_access_approved ? '<p style="color: var(--rainbow-green);">✅ NSFW Access Approved</p>' : ''}
        </div>

        <div class="detail-section">
          <h4>Message</h4>
          <p style="white-space: pre-wrap;">${escapeHtml(contact.message)}</p>
        </div>

        <div class="detail-section">
          <h4>Metadata</h4>
          <p><strong>Status:</strong> <span class="status-badge status-${contact.status}">${contact.status}</span></p>
          <p><strong>Submitted:</strong> ${new Date(contact.submitted_at).toLocaleString()}</p>
          <p><strong>IP Address:</strong> ${escapeHtml(contact.ip_address || 'Unknown')}</p>
          ${contact.admin_notes ? `<p><strong>Admin Notes:</strong> ${escapeHtml(contact.admin_notes)}</p>` : ''}
        </div>

        <div class="detail-actions">
          <button class="btn btn-primary" onclick="updateContactStatus(${contact.id}, 'read'); closeModal();">Mark as Read</button>
          <button class="btn btn-secondary" onclick="updateContactStatus(${contact.id}, 'replied'); closeModal();">Mark as Replied</button>
          ${contact.has_nsfw_interest && !contact.nsfw_access_approved ?
            `<button class="btn btn-success" onclick="approveNSFWAccess(${contact.id}); closeModal();">Approve NSFW Access</button>` : ''}
          <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;

    showModal(modalContent);
  };

  window.updateContactStatus = async function(contactId, newStatus) {
    try {
      const response = await fetch(`/api/admin/contacts/${contactId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      showNotification(`Contact marked as ${newStatus}`, 'success');
      await loadContacts();

    } catch (error) {
      console.error('Error updating contact:', error);
      showNotification('Failed to update contact status', 'error');
    }
  };

  window.approveNSFWAccess = async function(contactId) {
    if (!confirm('Are you sure you want to approve NSFW access for this contact?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/contacts/${contactId}/approve-nsfw`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to approve NSFW access');
      }

      showNotification('NSFW access approved successfully', 'success');
      await loadContacts();

    } catch (error) {
      console.error('Error approving NSFW access:', error);
      showNotification('Failed to approve NSFW access', 'error');
    }
  };

  // ============================================
  // EXPORT FUNCTIONALITY
  // ============================================

  function exportContactsToCSV() {
    if (allContacts.length === 0) {
      showNotification('No contacts to export', 'warning');
      return;
    }

    // CSV headers
    const headers = [
      'ID', 'First Name', 'Last Name', 'Email', 'Mobile Number',
      'Gender', 'Birthday', 'City', 'State',
      'Interests', 'Has NSFW Interest', 'NSFW Approved', 'Twilio Opt-in',
      'Message', 'Status', 'Submitted At', 'IP Address'
    ];

    // CSV rows
    const rows = allContacts.map(contact => {
      let interests = '';
      try {
        interests = JSON.parse(contact.interests || '[]').join('; ');
      } catch (e) {
        interests = '';
      }

      return [
        contact.id,
        contact.first_name,
        contact.last_name,
        contact.email,
        contact.mobile_number || '',
        contact.gender || '',
        contact.birthday || '',
        contact.city || '',
        contact.state || '',
        interests,
        contact.has_nsfw_interest ? 'Yes' : 'No',
        contact.nsfw_access_approved ? 'Yes' : 'No',
        contact.twilio_opt_in ? 'Yes' : 'No',
        contact.message.replace(/"/g, '""'), // Escape quotes
        contact.status,
        contact.submitted_at,
        contact.ip_address || ''
      ].map(field => `"${field}"`).join(',');
    });

    // Create CSV content
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('Contacts exported successfully', 'success');
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  function showModal(content) {
    const existingModal = document.getElementById('admin-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <button class="modal-close" onclick="closeModal()">×</button>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on overlay click
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  window.closeModal = function() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
      modal.remove();
    }
  };

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Remove notification
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

})();
