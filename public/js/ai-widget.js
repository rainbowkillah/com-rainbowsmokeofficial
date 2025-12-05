/**
 * AI Chat Widget
 * Floating chat widget for rnbwsmk-ai integration
 * Phase 6: Site Integration
 */

class AIWidget {
  constructor(options = {}) {
    this.options = {
      // Worker URL - will use service binding in production
      workerUrl: options.workerUrl || 'https://rnbwsmk-ai.rainbowsmokeofficial.com',

      // Widget position
      position: options.position || 'bottom-right',

      // Widget behavior
      openOnLoad: options.openOnLoad || false,
      minimizeOnBlur: options.minimizeOnBlur || true,

      // Styling
      theme: options.theme || 'rainbow',
      accentColor: options.accentColor || '#667eea',

      // Features
      showBranding: options.showBranding !== false,
      enableNotifications: options.enableNotifications !== false,
      ...options
    };

    this.isOpen = false;
    this.hasUnread = false;

    this.init();
  }

  init() {
    // Create widget HTML
    this.createWidget();

    // Attach event listeners
    this.attachEventListeners();

    // Open on load if configured
    if (this.options.openOnLoad) {
      this.open();
    }

    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
      this.handleMessage(event);
    });
  }

  createWidget() {
    // Create container
    const container = document.createElement('div');
    container.id = 'ai-widget-container';
    container.className = `ai-widget-${this.options.position}`;

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'ai-widget-toggle';
    toggleBtn.className = 'ai-widget-button';
    toggleBtn.setAttribute('aria-label', 'Open AI Chat');
    toggleBtn.innerHTML = `
      <svg class="ai-widget-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="ai-widget-badge" id="ai-widget-badge" style="display: none;"></span>
    `;

    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'ai-widget-chat';
    chatWindow.className = 'ai-widget-chat hidden';
    chatWindow.innerHTML = `
      <div class="ai-widget-header">
        <div class="ai-widget-header-content">
          <span class="ai-widget-title">🤖 RainbowSmoke AI</span>
          <span class="ai-widget-subtitle">Ask me anything!</span>
        </div>
        <div class="ai-widget-header-actions">
          <button class="ai-widget-minimize" aria-label="Minimize chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5"></path>
            </svg>
          </button>
          <button class="ai-widget-close" aria-label="Close chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="ai-widget-iframe-container">
        <iframe
          id="ai-widget-iframe"
          src="${this.options.workerUrl}"
          frameborder="0"
          allow="clipboard-write"
          title="AI Chat Assistant"
        ></iframe>
      </div>
      ${this.options.showBranding ? `
      <div class="ai-widget-footer">
        <span class="ai-widget-powered">Powered by <a href="${this.options.workerUrl}" target="_blank">rnbwsmk-ai</a></span>
      </div>
      ` : ''}
    `;

    // Append to container
    container.appendChild(toggleBtn);
    container.appendChild(chatWindow);

    // Add to DOM
    document.body.appendChild(container);

    // Store references
    this.container = container;
    this.toggleBtn = toggleBtn;
    this.chatWindow = chatWindow;
    this.iframe = chatWindow.querySelector('#ai-widget-iframe');
    this.badge = toggleBtn.querySelector('#ai-widget-badge');
  }

  attachEventListeners() {
    // Toggle button
    this.toggleBtn.addEventListener('click', () => {
      this.toggle();
    });

    // Minimize button
    const minimizeBtn = this.chatWindow.querySelector('.ai-widget-minimize');
    minimizeBtn.addEventListener('click', () => {
      this.close();
    });

    // Close button
    const closeBtn = this.chatWindow.querySelector('.ai-widget-close');
    closeBtn.addEventListener('click', () => {
      this.close();
    });

    // Click outside to close (optional)
    if (this.options.minimizeOnBlur) {
      document.addEventListener('click', (event) => {
        if (this.isOpen &&
            !this.container.contains(event.target) &&
            !event.target.closest('.ai-widget-container')) {
          // Don't close immediately, just mark as potentially closeable
          // This prevents accidental closes
        }
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      // Escape to close
      if (event.key === 'Escape' && this.isOpen) {
        this.close();
      }

      // Ctrl/Cmd + K to toggle
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  handleMessage(event) {
    // Security: Verify origin
    const allowedOrigins = [
      this.options.workerUrl,
      window.location.origin
    ];

    if (!allowedOrigins.some(origin => event.origin.includes(origin.split('://')[1]?.split('/')[0]))) {
      return;
    }

    const { type, data } = event.data || {};

    switch (type) {
      case 'ai-widget:ready':
        console.log('[AI Widget] Chat interface ready');
        break;

      case 'ai-widget:message':
        // New message received - show notification if closed
        if (!this.isOpen && this.options.enableNotifications) {
          this.showNotification(data.preview);
        }
        break;

      case 'ai-widget:typing':
        // AI is typing - could show indicator on button
        this.toggleBtn.classList.add('ai-widget-typing');
        break;

      case 'ai-widget:typing-stop':
        this.toggleBtn.classList.remove('ai-widget-typing');
        break;

      case 'ai-widget:unread':
        // Update unread count
        this.setUnread(data.count);
        break;

      default:
        break;
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.chatWindow.classList.remove('hidden');
    this.chatWindow.classList.add('visible');
    this.toggleBtn.classList.add('active');

    // Clear unread indicator
    this.setUnread(0);

    // Focus iframe
    setTimeout(() => {
      this.iframe.focus();
    }, 100);

    // Trigger animation
    requestAnimationFrame(() => {
      this.chatWindow.style.transform = 'scale(1)';
      this.chatWindow.style.opacity = '1';
    });
  }

  close() {
    this.isOpen = false;
    this.chatWindow.classList.add('hidden');
    this.chatWindow.classList.remove('visible');
    this.toggleBtn.classList.remove('active');

    // Trigger animation
    this.chatWindow.style.transform = 'scale(0.95)';
    this.chatWindow.style.opacity = '0';
  }

  setUnread(count) {
    this.hasUnread = count > 0;

    if (count > 0) {
      this.badge.textContent = count > 9 ? '9+' : count;
      this.badge.style.display = 'flex';
      this.toggleBtn.classList.add('has-unread');
    } else {
      this.badge.style.display = 'none';
      this.toggleBtn.classList.remove('has-unread');
    }
  }

  showNotification(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'ai-widget-toast';
    toast.innerHTML = `
      <div class="ai-widget-toast-content">
        <strong>RainbowSmoke AI</strong>
        <p>${message || 'New message received'}</p>
      </div>
    `;

    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);

    // Auto-hide after 4 seconds
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4000);

    // Click to open chat
    toast.addEventListener('click', () => {
      this.open();
      toast.remove();
    });
  }

  // Public API
  sendMessage(message) {
    this.iframe.contentWindow.postMessage({
      type: 'ai-widget:send',
      data: { message }
    }, this.options.workerUrl);
  }

  destroy() {
    if (this.container) {
      this.container.remove();
    }
    window.removeEventListener('message', this.handleMessage);
  }
}

// Auto-initialize if data attribute present
document.addEventListener('DOMContentLoaded', () => {
  const widgetConfig = document.querySelector('[data-ai-widget]');

  if (widgetConfig) {
    const options = {
      workerUrl: widgetConfig.dataset.workerUrl,
      openOnLoad: widgetConfig.dataset.openOnLoad === 'true',
      position: widgetConfig.dataset.position || 'bottom-right',
      theme: widgetConfig.dataset.theme || 'rainbow'
    };

    window.aiWidget = new AIWidget(options);
  } else {
    // Default initialization
    window.aiWidget = new AIWidget();
  }
});

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIWidget;
}
