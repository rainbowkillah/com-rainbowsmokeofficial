// ============================================
// RainbowSmoke Official - Gallery
// Filtering, lightbox, and mixed media handling
// ============================================

(function() {
  'use strict';

  let currentFilter = 'all';

  // ============================================
  // DOM READY
  // ============================================

  document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Gallery initialized');

    initializeFilters();
    initializeLightbox();
    loadR2GalleryMedia(); // Load images from R2 bucket
  });

  // ============================================
  // R2 MEDIA LOADING
  // ============================================

  async function loadR2GalleryMedia() {
    try {
      const response = await fetch('/api/gallery/media');
      if (!response.ok) {
        console.warn('Failed to load R2 gallery media, using placeholder images');
        return;
      }

      const data = await response.json();
      if (!data.success || !data.media) {
        console.warn('No R2 media payload, using placeholder images');
        return;
      }

      const galleryGrid = document.getElementById('gallery-grid');
      if (!galleryGrid) return;

      const imageMedia = data.media.filter(m => m.type === 'image');
      const videoMedia = data.media.filter(m => m.type === 'video');
      const totalMedia = imageMedia.length + videoMedia.length;

      if (totalMedia === 0) {
        console.warn('No R2 media found, keeping placeholders');
        return;
      }

      // Clear placeholder images (keep embeds)
      galleryGrid.querySelectorAll('.gallery-item[data-type="images"]').forEach(p => p.remove());

      const insertBeforeFirstEmbed = (node) => {
        const firstEmbed = galleryGrid.querySelector('.gallery-item[data-type="youtube"], .gallery-item[data-type="twitch"], .gallery-item[data-type="tiktok"]');
        if (firstEmbed) {
          galleryGrid.insertBefore(node, firstEmbed);
        } else {
          galleryGrid.appendChild(node);
        }
      };

      const formatTitle = (key) => {
        const fileName = key.split('/').pop() || '';
        return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || 'Untitled';
      };

      const videoMimeFromKey = (key = '') => {
        if (key.toLowerCase().endsWith('.webm')) return 'video/webm';
        if (key.toLowerCase().endsWith('.mov')) return 'video/quicktime';
        return 'video/mp4';
      };

      imageMedia.forEach(media => {
        const title = formatTitle(media.key);
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.dataset.type = 'images';
        galleryItem.innerHTML = `
          <div class="gallery-card gallery-image">
            <img src="${media.url}" alt="${title}" loading="lazy" data-lightbox="gallery">
            <div class="gallery-overlay">
              <h3>${title}</h3>
              <p class="gallery-meta">📸 From R2 Bucket</p>
            </div>
          </div>
        `;
        insertBeforeFirstEmbed(galleryItem);
      });

      videoMedia.forEach(media => {
        const title = formatTitle(media.key);
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.dataset.type = 'videos';
        galleryItem.innerHTML = `
          <div class="gallery-card gallery-video">
            <video controls preload="metadata">
              <source src="${media.url}" type="${videoMimeFromKey(media.key)}">
              Your browser does not support the video tag.
            </video>
            <div class="gallery-video-meta">
              <h3>${title}</h3>
              <p class="gallery-meta">🎞️ Stream-ready from R2</p>
            </div>
          </div>
        `;
        galleryGrid.appendChild(galleryItem);
      });

      initializeLightbox();
      console.log(`✅ Loaded ${imageMedia.length} images and ${videoMedia.length} videos from R2`);

    } catch (error) {
      console.error('Error loading R2 gallery media:', error);
    }
  }

  // ============================================
  // FILTER FUNCTIONALITY
  // ============================================

  function initializeFilters() {
    const filterButtons = document.querySelectorAll('.gallery-filter-btn');

    filterButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        // Update active state
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // Apply filter
        currentFilter = this.dataset.filter;
        filterGallery(currentFilter);
      });
    });
  }

  function filterGallery(filter) {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const emptyState = document.getElementById('gallery-empty');
    let visibleCount = 0;

    galleryItems.forEach(item => {
      const itemType = item.dataset.type;

      if (filter === 'all' || itemType === filter) {
        item.style.display = 'block';
        // Add fade-in animation
        item.style.animation = 'fadeIn 0.5s ease-in';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });

    // Show/hide empty state
    if (visibleCount === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
    }
  }

  // ============================================
  // LIGHTBOX FUNCTIONALITY
  // ============================================

  function initializeLightbox() {
    const images = document.querySelectorAll('[data-lightbox="gallery"]');

    images.forEach(img => {
      img.addEventListener('click', function(e) {
        e.preventDefault();
        openLightbox(this.src, this.alt);
      });

      // Add cursor pointer style
      img.style.cursor = 'pointer';
    });

    // Close lightbox on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeLightbox();
      }
    });
  }

  function openLightbox(imageSrc, imageAlt) {
    // Create lightbox overlay
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.className = 'lightbox-overlay';

    lightbox.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
        <button class="lightbox-prev" onclick="navigateLightbox(-1)">&#10094;</button>
        <button class="lightbox-next" onclick="navigateLightbox(1)">&#10095;</button>
        <img src="${imageSrc}" alt="${imageAlt}" class="lightbox-image">
        <div class="lightbox-caption">${imageAlt}</div>
      </div>
    `;

    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden'; // Prevent scrolling

    // Fade in
    setTimeout(() => {
      lightbox.classList.add('active');
    }, 10);

    // Close on overlay click
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });

    // Store current image for navigation
    const allImages = Array.from(document.querySelectorAll('[data-lightbox="gallery"]'));
    const currentIndex = allImages.findIndex(img => img.src === imageSrc);
    lightbox.dataset.currentIndex = currentIndex;
  }

  window.closeLightbox = function() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
      lightbox.classList.remove('active');
      setTimeout(() => {
        lightbox.remove();
        document.body.style.overflow = ''; // Restore scrolling
      }, 300);
    }
  };

  window.navigateLightbox = function(direction) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const allImages = Array.from(document.querySelectorAll('[data-lightbox="gallery"]'));
    let currentIndex = parseInt(lightbox.dataset.currentIndex);

    // Calculate new index with wrapping
    currentIndex += direction;
    if (currentIndex < 0) {
      currentIndex = allImages.length - 1;
    } else if (currentIndex >= allImages.length) {
      currentIndex = 0;
    }

    // Update lightbox
    const newImage = allImages[currentIndex];
    const lightboxImage = lightbox.querySelector('.lightbox-image');
    const lightboxCaption = lightbox.querySelector('.lightbox-caption');

    lightboxImage.src = newImage.src;
    lightboxImage.alt = newImage.alt;
    lightboxCaption.textContent = newImage.alt;
    lightbox.dataset.currentIndex = currentIndex;
  };

  // Arrow key navigation in lightbox
  document.addEventListener('keydown', function(e) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    if (e.key === 'ArrowLeft') {
      navigateLightbox(-1);
    } else if (e.key === 'ArrowRight') {
      navigateLightbox(1);
    }
  });

  // ============================================
  // EMBED HANDLING
  // ============================================

  // Lazy load embeds when they come into viewport
  function initializeLazyEmbeds() {
    const embeds = document.querySelectorAll('.gallery-embed');

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const iframe = entry.target.querySelector('iframe');
            if (iframe && iframe.dataset.src) {
              iframe.src = iframe.dataset.src;
              iframe.removeAttribute('data-src');
            }
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '50px'
      });

      embeds.forEach(embed => {
        observer.observe(embed);
      });
    }
  }

  // Initialize lazy loading for embeds
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLazyEmbeds);
  } else {
    initializeLazyEmbeds();
  }

})();
