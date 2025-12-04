// ============================================
// RainbowSmoke Official - Main JavaScript
// Client-side utilities and interactions
// ============================================

(function() {
  'use strict';

  // ============================================
  // DOM READY
  // ============================================

  document.addEventListener('DOMContentLoaded', function() {
    console.log('🌈 RainbowSmoke Official - Client loaded');

    // Initialize all features
    initSmoothScroll();
    initMobileMenu();
    initExternalLinks();
    logEnvironmentInfo();
  });

  // ============================================
  // SMOOTH SCROLLING
  // ============================================

  function initSmoothScroll() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // ============================================
  // MOBILE MENU (Future Enhancement)
  // ============================================

  function initMobileMenu() {
    // Mobile menu toggle functionality
    // This will be enhanced in future phases if needed
    const nav = document.querySelector('.main-nav');
    if (!nav) return;

    // Check if menu items wrap (mobile layout)
    const menuHeight = nav.offsetHeight;
    if (menuHeight > 50) {
      nav.classList.add('mobile-layout');
    }
  }

  // ============================================
  // EXTERNAL LINKS
  // ============================================

  function initExternalLinks() {
    // Add icons or indicators to external links
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
      link.setAttribute('rel', 'noopener noreferrer');

      // Add screen reader text for external links
      if (!link.querySelector('.sr-only')) {
        const srText = document.createElement('span');
        srText.className = 'sr-only';
        srText.textContent = ' (opens in new tab)';
        link.appendChild(srText);
      }
    });
  }

  // ============================================
  // ENVIRONMENT INFO
  // ============================================

  function logEnvironmentInfo() {
    console.log('%c🌈 RainbowSmoke Official', 'font-size: 20px; font-weight: bold; background: linear-gradient(90deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3); -webkit-background-clip: text; color: transparent;');
    console.log('Phase 2: Core Worker & Routing Complete');
    console.log('Built with Cloudflare Workers + Hono + Adobe Fonts');
    console.log('---');
    console.log('Social Links:');
    console.log('🎵 TikTok: https://tiktok.com/@rainbowsmoke_us');
    console.log('🎮 Twitch: https://twitch.tv/rainbowsmoke_us');
    console.log('📺 YouTube: https://youtube.com/channel/UC-a69hBxIpH-Stm6NDEYYiA');
    console.log('🐦 Twitter/X: https://x.com/RainbowKillah');
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  // Show/hide loading spinner
  window.showSpinner = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
  };

  // Show alert message
  window.showAlert = function(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    // Insert at top of main content
    const main = document.querySelector('.main-content');
    if (main && main.firstChild) {
      main.insertBefore(alertDiv, main.firstChild);
    }

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      alertDiv.style.transition = 'opacity 0.3s ease';
      alertDiv.style.opacity = '0';
      setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
  };

  // Format date
  window.formatDate = function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time
  window.formatTime = function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Debounce function for performance
  window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // ============================================
  // KEYBOARD SHORTCUTS (Future Enhancement)
  // ============================================

  document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K: Focus search (future)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      console.log('Search shortcut pressed (feature coming soon)');
    }
  });

  // ============================================
  // PERFORMANCE MONITORING
  // ============================================

  window.addEventListener('load', function() {
    if (window.performance && window.performance.timing) {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

      console.log(`⚡ Page loaded in ${pageLoadTime}ms`);

      // Log Core Web Vitals if available
      if (window.PerformanceObserver) {
        // Largest Contentful Paint (LCP)
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log(`📊 LCP: ${lastEntry.renderTime || lastEntry.loadTime}ms`);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // LCP not supported
        }
      }
    }
  });

})();
