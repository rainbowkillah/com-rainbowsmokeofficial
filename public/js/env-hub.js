// ============================================
// Environment Hub Dashboard Logic
// ============================================

(function() {
  'use strict';

  const state = {
    items: [],
    summary: null,
    recentRotations: [],
    filters: {
      status: '',
      risk: '',
      storage: '',
      service: ''
    },
    selectedItemId: null
  };

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  async function init() {
    bindFilterEvents();
    bindFormEvents();
    bindTableEvents();

    await refreshAll();
  }

  async function refreshAll() {
    await Promise.all([loadEnvItems(), loadSummary(), loadRecentRotations()]);
  }

  function bindFilterEvents() {
    const statusFilter = document.getElementById('env-status-filter');
    const riskFilter = document.getElementById('env-risk-filter');
    const storageFilter = document.getElementById('env-storage-filter');
    const serviceFilter = document.getElementById('env-service-filter');
    const resetBtn = document.getElementById('env-reset-filters');
    const refreshBtn = document.getElementById('env-refresh');

    if (statusFilter) {
      statusFilter.addEventListener('change', (event) => {
        state.filters.status = event.target.value;
        renderTable();
      });
    }

    if (riskFilter) {
      riskFilter.addEventListener('change', (event) => {
        state.filters.risk = event.target.value;
        renderTable();
      });
    }

    if (storageFilter) {
      storageFilter.addEventListener('change', (event) => {
        state.filters.storage = event.target.value;
        renderTable();
      });
    }

    if (serviceFilter) {
      serviceFilter.addEventListener('input', (event) => {
        state.filters.service = event.target.value.toLowerCase();
        renderTable();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.filters = { status: '', risk: '', storage: '', service: '' };
        if (statusFilter) statusFilter.value = '';
        if (riskFilter) riskFilter.value = '';
        if (storageFilter) storageFilter.value = '';
        if (serviceFilter) serviceFilter.value = '';
        renderTable();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing…';
        await refreshAll();
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh';
      });
    }
  }

  function bindFormEvents() {
    const envForm = document.getElementById('env-item-form');
    const envReset = document.getElementById('env-form-reset');
    const rotationForm = document.getElementById('rotation-form');

    if (envForm) {
      envForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveEnvRecord();
      });
    }

    if (envReset) {
      envReset.addEventListener('click', () => {
        resetEnvForm();
      });
    }

    if (rotationForm) {
      rotationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveRotationLog();
      });
    }
  }

  function bindTableEvents() {
    const tableBody = document.getElementById('env-table-body');
    if (!tableBody) return;

    tableBody.addEventListener('click', async (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      const action = button.dataset.action;
      const id = Number(button.dataset.id);
      if (!id) return;

      if (action === 'edit') {
        const item = state.items.find((record) => record.id === id);
        if (item) {
          populateEnvForm(item);
          state.selectedItemId = id;
        }
      }

      if (action === 'history') {
        await loadRotationHistory(id);
      }
    });
  }

  async function loadEnvItems() {
    try {
      updateTableStatus('Loading environment inventory…');
      const data = await fetchJson('/api/admin/env/items');
      state.items = data.items || [];
      renderTable();
      populateRotationSelect();
      updateTableStatus(`${state.items.length} records loaded.`);
    } catch (error) {
      console.error(error);
      updateTableStatus('Failed to load environment inventory.', 'error');
    }
  }

  async function loadSummary() {
    try {
      const data = await fetchJson('/api/admin/env/summary');
      state.summary = data;
      renderStats();
    } catch (error) {
      console.error('Summary fetch error', error);
    }
  }

  async function loadRecentRotations() {
    try {
      const data = await fetchJson('/api/admin/env/rotations/recent');
      state.recentRotations = data.rotations || [];
      renderActivityFeed(state.recentRotations);
    } catch (error) {
      console.error('Rotation feed error', error);
    }
  }

  async function loadRotationHistory(id) {
    try {
      const data = await fetchJson(`/api/admin/env/items/${id}/rotations`);
      renderHistoryList(id, data.rotations || []);
    } catch (error) {
      console.error('History fetch error', error);
      renderHistoryList(null, []);
    }
  }

  async function saveEnvRecord() {
    const form = document.getElementById('env-item-form');
    const feedback = document.getElementById('env-form-feedback');
    if (feedback) feedback.textContent = '';

    const payload = collectEnvFormData();
    const recordId = document.getElementById('env-item-id').value;

    try {
      const endpoint = recordId ? `/api/admin/env/items/${recordId}` : '/api/admin/env/items';
      const method = recordId ? 'PUT' : 'POST';

      const response = await fetchJson(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (recordId) {
        state.items = state.items.map((item) => item.id === Number(recordId) ? response.item : item);
      } else {
        state.items = [...state.items, response.item];
      }

      renderTable();
      populateRotationSelect();
      if (!recordId) {
        form.reset();
        document.getElementById('env-form-title').textContent = 'Add Record';
        document.getElementById('env-item-id').value = '';
      }
      showFeedback(feedback, 'Record saved successfully.', 'success');
    } catch (error) {
      console.error('Save error', error);
      showFeedback(feedback, error.message || 'Failed to save record.', 'error');
    }
  }

  async function saveRotationLog() {
    const rotationForm = document.getElementById('rotation-form');
    const feedback = document.getElementById('rotation-form-feedback');
    if (feedback) feedback.textContent = '';

    const select = document.getElementById('rotation-item');
    const targetId = Number(select?.value);
    if (!targetId) {
      showFeedback(feedback, 'Select a record to log rotation.', 'error');
      return;
    }

    const payload = {
      rotated_at: normalizeInputDate(document.getElementById('rotation-date')?.value),
      rotation_channel: document.getElementById('rotation-channel')?.value,
      rotation_status: document.getElementById('rotation-status')?.value,
      rotated_by: document.getElementById('rotation-user')?.value,
      ticket_url: document.getElementById('rotation-ticket')?.value,
      storage_reference_snapshot: document.getElementById('rotation-storage')?.value,
      summary: document.getElementById('rotation-notes')?.value
    };

    try {
      const data = await fetchJson(`/api/admin/env/items/${targetId}/rotation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      state.items = state.items.map((item) => item.id === targetId ? data.item : item);
      renderTable();
      showFeedback(feedback, 'Rotation logged.', 'success');
      rotationForm.reset();
      await loadRecentRotations();
      await loadRotationHistory(targetId);
    } catch (error) {
      console.error('Rotation error', error);
      showFeedback(feedback, error.message || 'Failed to log rotation.', 'error');
    }
  }

  function collectEnvFormData() {
    const env = (id) => document.getElementById(id);
    const environments = env('env-environments')?.value || '';
    const tags = env('env-tags')?.value || '';

    return {
      key_name: env('env-key-name')?.value,
      display_name: env('env-display-name')?.value,
      description: env('env-description')?.value,
      service_area: env('env-service-area')?.value,
      owner_team: env('env-owner-team')?.value,
      point_of_contact: env('env-point-of-contact')?.value,
      environments: splitList(environments),
      tags: splitList(tags),
      secret_type: env('env-secret-type')?.value,
      storage_surface: env('env-storage-surface')?.value,
      storage_reference: env('env-storage-reference')?.value,
      sensitivity: env('env-sensitivity')?.value,
      risk_level: env('env-risk-level')?.value,
      status: env('env-status')?.value,
      verification_status: env('env-verification')?.value,
      rotation_frequency_days: env('env-rotation-frequency')?.value,
      last_rotated_at: normalizeInputDate(env('env-last-rotated')?.value),
      last_verified_at: normalizeInputDate(env('env-last-verified')?.value),
      notes: env('env-notes')?.value
    };
  }

  function populateRotationSelect() {
    const select = document.getElementById('rotation-item');
    if (!select) return;
    select.innerHTML = '';

    state.items
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
      .forEach((item) => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.display_name} (${item.key_name})`;
        select.appendChild(option);
      });
  }

  function populateEnvForm(item) {
    const env = (id) => document.getElementById(id);
    env('env-form-title').textContent = `Editing ${item.display_name}`;
    env('env-item-id').value = item.id;
    env('env-key-name').value = item.key_name;
    env('env-key-name').readOnly = true;
    env('env-display-name').value = item.display_name;
    env('env-description').value = item.description || '';
    env('env-service-area').value = item.service_area || '';
    env('env-owner-team').value = item.owner_team || '';
    env('env-point-of-contact').value = item.point_of_contact || '';
    env('env-environments').value = (item.environments || []).join(', ');
    env('env-tags').value = (item.tags || []).join(', ');
    env('env-secret-type').value = item.secret_type;
    env('env-storage-surface').value = item.storage_surface;
    env('env-storage-reference').value = item.storage_reference || '';
    env('env-sensitivity').value = item.sensitivity;
    env('env-risk-level').value = item.risk_level;
    env('env-status').value = item.status;
    env('env-verification').value = item.verification_status;
    env('env-rotation-frequency').value = item.rotation_frequency_days || 90;
    env('env-last-rotated').value = toLocalInput(item.last_rotated_at);
    env('env-last-verified').value = toLocalInput(item.last_verified_at);
    env('env-notes').value = item.notes || '';
  }

  function resetEnvForm() {
    const env = (id) => document.getElementById(id);
    const form = document.getElementById('env-item-form');
    if (form) form.reset();
    env('env-form-title').textContent = 'Add Record';
    env('env-item-id').value = '';
    env('env-key-name').readOnly = false;
  }

  function renderStats() {
    if (!state.summary) return;
    const summary = state.summary.summary || {};
    setText('env-total', summary.total || 0);
    setText('env-healthy', summary.healthy || 0);
    setText('env-due-soon', summary.due_soon || 0);
    setText('env-past-due', summary.past_due || 0);
    setText('env-unverified', summary.unverified || 0);
  }

  function renderActivityFeed(rotations) {
    const list = document.getElementById('env-activity-list');
    if (!list) return;
    list.innerHTML = '';

    if (!rotations || rotations.length === 0) {
      list.innerHTML = '<li class="empty">No activity recorded.</li>';
      return;
    }

    rotations.forEach((entry) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${entry.display_name || entry.key_name}</strong>
        <small>${formatRelative(entry.rotated_at)} • ${entry.rotation_status}
        ${entry.rotated_by ? ` • ${entry.rotated_by}` : ''}</small>
        <p>${entry.summary || ''}</p>
      `;
      list.appendChild(li);
    });
  }

  function renderHistoryList(id, history) {
    const list = document.getElementById('env-history-list');
    const label = document.getElementById('env-history-label');
    if (!list) return;

    list.innerHTML = '';
    if (label) {
      label.textContent = id ? `Record #${id}` : 'Select a record to view history';
    }

    if (!history || history.length === 0) {
      list.innerHTML = '<li class="empty">No history yet.</li>';
      return;
    }

    history.forEach((entry) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${formatDate(entry.rotated_at)}</strong>
        <small>${entry.rotation_status} • ${entry.rotation_channel || 'manual'}${entry.rotated_by ? ` • ${entry.rotated_by}` : ''}</small>
        <p>${entry.summary || ''}</p>
      `;
      list.appendChild(li);
    });
  }

  function renderTable() {
    const tbody = document.getElementById('env-table-body');
    if (!tbody) return;

    const filtered = state.items.filter(applyFilters);
    state.filtered = filtered;

    if (filtered.length === 0) {
      tbody.innerHTML = '
        <tr>
          <td colspan="7" style="text-align:center; padding: 2rem;">No records match the current filters.</td>
        </tr>';
      return;
    }

    tbody.innerHTML = filtered
      .map((item) => renderRow(item))
      .join('');

    updateTableStatus(`${filtered.length} of ${state.items.length} records shown.`);
  }

  function renderRow(item) {
    const envList = (item.environments || []).join(', ');
    const dueLabel = item.rotation_due_at ? formatRelative(item.rotation_due_at) : 'n/a';

    return `
      <tr class="env-row risk-${item.risk_level}" data-id="${item.id}">
        <td>
          <strong>${escapeHtml(item.display_name)}</strong>
          <div class="muted">${escapeHtml(item.key_name)}</div>
          <div class="env-tags">${renderTags(item.tags)}</div>
          ${envList ? `<small>Envs: ${envList}</small>` : ''}
        </td>
        <td>
          <span>${escapeHtml(item.owner_team || 'n/a')}</span>
          ${item.point_of_contact ? `<div class="muted">POC: ${escapeHtml(item.point_of_contact)}</div>` : ''}
        </td>
        <td>
          <span class="env-chip">${escapeHtml(item.storage_surface)}</span>
          ${item.storage_reference ? `<div class="muted">${escapeHtml(item.storage_reference)}</div>` : ''}
        </td>
        <td>
          <span class="risk-badge risk-${item.risk_level}">${item.risk_level}</span>
        </td>
        <td>
          <span class="status-badge status-${item.status}">${item.status}</span>
          <div class="muted">${item.rotation_health || item.verification_status}</div>
        </td>
        <td>
          <div>${item.rotation_health === 'past_due' ? '⚠️ ' : ''}${dueLabel}</div>
          ${item.last_rotated_at ? `<small>Last: ${formatDate(item.last_rotated_at)}</small>` : '<small>No rotation logged</small>'}
        </td>
        <td class="env-actions-cell">
          <button class="btn-icon" title="Edit" data-action="edit" data-id="${item.id}">✏️</button>
          <button class="btn-icon" title="History" data-action="history" data-id="${item.id}">🕘</button>
        </td>
      </tr>
    `;
  }

  function applyFilters(item) {
    if (state.filters.status && item.status !== state.filters.status) {
      return false;
    }
    if (state.filters.risk && item.risk_level !== state.filters.risk) {
      return false;
    }
    if (state.filters.storage && item.storage_surface !== state.filters.storage) {
      return false;
    }
    if (state.filters.service) {
      const service = (item.service_area || '').toLowerCase();
      if (!service.includes(state.filters.service)) {
        return false;
      }
    }
    return true;
  }

  function renderTags(tags = []) {
    if (!tags.length) return '';
    return tags.map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join(' ');
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
      window.location.href = '/admin/login';
      return Promise.reject(new Error('Unauthorized'));
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Request failed');
    }
    return data;
  }

  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function splitList(value = '') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function normalizeInputDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  function toLocalInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const iso = date.toISOString();
    return iso.slice(0, 16);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  }

  function updateTableStatus(message, type) {
    const el = document.getElementById('env-table-status');
    if (!el) return;
    el.textContent = message;
    el.className = type === 'error' ? 'error' : '';
  }

  function showFeedback(element, message, type = 'info') {
    if (!element) return;
    element.textContent = message;
    element.className = `form-feedback ${type}`;
  }

  function formatDate(dateString) {
    if (!dateString) return 'n/a';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleString();
  }

  function formatRelative(dateString) {
    if (!dateString) return 'n/a';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    const diffMs = date - new Date();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays > 0) return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
    return `${Math.abs(diffDays)} day${diffDays === -1 ? '' : 's'} ago`;
  }
})();
