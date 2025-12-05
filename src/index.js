// RainbowSmoke Official Website - Main Worker
// Cloudflare Workers with Hono Framework

import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { secureHeaders } from 'hono/secure-headers';

// Temporary Durable Object class for migration
// This will be removed in the next deployment after migration completes
export class VisitCounter {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    return new Response('Deprecated', { status: 410 });
  }
}

// Initialize Hono app
const app = new Hono();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use('*', secureHeaders());

// Analytics middleware - track all requests
app.use('*', async (c, next) => {
  try {
    if (c.env.ANALYTICS) {
      const url = new URL(c.req.url);
      const country = c.req.header('cf-ipcountry') || 'XX';
      const method = c.req.method;
      const userAgent = c.req.header('user-agent') || 'unknown';
      const referer = c.req.header('referer') || 'direct';

      // Track the pageview
      c.env.ANALYTICS.writeDataPoint({
        blobs: [
          'pageview',           // event_type
          url.pathname,         // page path
          country,              // country code
          method,               // HTTP method
          userAgent.substring(0, 100) // truncate user agent
        ],
        doubles: [1],           // count
        indexes: [crypto.randomUUID()] // unique event ID
      });
    }
  } catch (err) {
    // Don't fail the request if analytics fails
    console.error('Analytics middleware error:', err);
  }

  await next();
});

// Session middleware - parse cookies and validate sessions
app.use('*', async (c, next) => {
  const sessionId = getCookie(c, 'session_id');

  if (sessionId && c.env.SESSIONS_KV) {
    try {
      const sessionData = await c.env.SESSIONS_KV.get(sessionId);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        // Check if session is expired
        if (new Date(session.expires_at) > new Date()) {
          c.set('session', session);
        } else {
          // Session expired, delete it
          await c.env.SESSIONS_KV.delete(sessionId);
        }
      }
    } catch (err) {
      console.error('Session middleware error:', err);
    }
  }

  await next();
});

// Authentication middleware - require valid session of specific type
function requireAuth(userType) {
  return async (c, next) => {
    const session = c.get('session');

    if (!session || session.user_type !== userType) {
      // Redirect to login page
      if (userType === 'nsfw') {
        return c.redirect('/nsfw/login');
      } else if (userType === 'admin') {
        return c.redirect('/admin/login');
      }
      return c.text('Unauthorized', 401);
    }

    await next();
  };
}

// ============================================
// HTML TEMPLATE HELPERS
// ============================================

// Shared <head> content with Adobe Fonts and enhanced SEO
function headCommon(title, description = 'DC Native | Systems Engineer | Gamer | Vlogger | LGBTQ+ Content Creator', path = '/') {
  const baseUrl = 'https://rainbowsmokeofficial.com';
  const canonicalUrl = `${baseUrl}${path}`;
  const ogImage = `${baseUrl}/media/gallery/images/header.svg`; // Open Graph image from R2 bucket

  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <meta name="author" content="Mr. RainbowSmoke">
    <meta name="keywords" content="RainbowSmoke, LGBTQ+, content creator, gaming, vlogging, DC, systems engineer, demi-boy, adult content, streaming, twitch, youtube, tiktok">

    <!-- Canonical URL -->
    <link rel="canonical" href="${canonicalUrl}">

    <!-- Open Graph (Facebook, LinkedIn) -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="RainbowSmoke Official">
    <meta property="og:locale" content="en_US">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@RainbowKillah">
    <meta name="twitter:creator" content="@RainbowKillah">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${ogImage}">

    <!-- Additional Meta Tags -->
    <meta name="theme-color" content="#4B0082">
    <meta name="color-scheme" content="light">
    <meta name="format-detection" content="telephone=no">

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Mr. RainbowSmoke",
      "alternateName": "RainbowSmoke",
      "description": "DC Native, Systems Engineer, Gamer, Vlogger, and LGBTQ+ Content Creator",
      "url": "https://rainbowsmokeofficial.com",
      "image": "${ogImage}",
      "sameAs": [
        "https://x.com/RainbowKillah",
        "https://twitch.tv/rainbowsmoke_us",
        "https://www.youtube.com/channel/UC-a69hBxIpH-Stm6NDEYYiA",
        "https://tiktok.com/@rainbowsmoke_us",
        "https://www.linkedin.com/in/dehavillandfox",
        "https://github.com/rainbowkillah",
        "https://www.facebook.com/dehavilland.fox"
      ],
      "jobTitle": "Systems Engineer",
      "worksFor": [
        {
          "@type": "Organization",
          "name": "Mr. RainbowSmoke LLC"
        },
        {
          "@type": "Organization",
          "name": "Fox Technologies LLC"
        }
      ],
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Washington",
        "addressRegion": "DC",
        "addressCountry": "US"
      },
      "knowsAbout": [
        "Systems Engineering",
        "Cloud Infrastructure",
        "Gaming",
        "Content Creation",
        "LGBTQ+ Advocacy"
      ]
    }
    </script>

    <!-- Website Organization Schema -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "RainbowSmoke Official",
      "url": "https://rainbowsmokeofficial.com",
      "description": "Official website of Mr. RainbowSmoke - DC-based Systems Engineer, Content Creator, and LGBTQ+ Advocate",
      "publisher": {
        "@type": "Person",
        "name": "Mr. RainbowSmoke"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://rainbowsmokeofficial.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
    </script>

    <!-- Adobe Fonts -->
    <link rel="stylesheet" href="https://use.typekit.net/ojc8wen.css">

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/media/gallery/images/favicon.svg">
    <link rel="alternate icon" href="/favicon.ico">

    <!-- Stylesheets -->
    <link rel="stylesheet" href="/css/main.css">
    <link rel="stylesheet" href="/css/components.css">
    <link rel="stylesheet" href="/css/responsive.css">
    <link rel="stylesheet" href="/css/ai-widget.css">

    <title>${title}</title>
  `;
}

// AI Widget script - include on public pages
function renderAIWidget() {
  return `
    <!-- AI Chat Widget -->
    <div data-ai-widget data-worker-url="https://rnbwsmk-ai.rainbowsmokeofficial.com" data-position="bottom-right"></div>
    <script src="/js/ai-widget.js"></script>
  `;
}

// Navigation header
function renderHeader(currentPath = '/') {
  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/gallery', label: 'Gallery' },
    { path: '/contact', label: 'Contact' },
    { path: '/nsfw', label: 'Members 🔞' }
  ];

  return `
    <header class="site-header">
      <div class="container">
        <div class="header-content">
          <a href="/" class="logo">
            <h1 class="rainbow-text">🌈 RainbowSmoke</h1>
          </a>
          <nav class="main-nav">
            ${navItems.map(item => `
              <a href="${item.path}" class="${currentPath === item.path ? 'active' : ''}">${item.label}</a>
            `).join('')}
          </nav>
        </div>
      </div>
    </header>
  `;
}

// Footer with social links
function renderFooter() {
  const socialLinks = [
    { name: 'TikTok', url: 'https://tiktok.com/@rainbowsmoke_us', icon: '🎵' },
    { name: 'Twitch', url: 'https://twitch.tv/rainbowsmoke_us', icon: '🎮' },
    { name: 'YouTube', url: 'https://www.youtube.com/channel/UC-a69hBxIpH-Stm6NDEYYiA', icon: '📺' },
    { name: 'Twitter/X', url: 'https://x.com/RainbowKillah', icon: '🐦' },
    { name: 'GitHub', url: 'https://github.com/rainbowkillah', icon: '💻' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/dehavillandfox', icon: '💼' }
  ];

  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-content">
          <div class="social-links">
            ${socialLinks.map(link => `
              <a href="${link.url}" target="_blank" rel="noopener noreferrer" title="${link.name}">
                <span class="icon">${link.icon}</span>
                <span class="label">${link.name}</span>
              </a>
            `).join('')}
          </div>
          <div class="footer-info">
            <p>&copy; ${new Date().getFullYear()} Mr. RainbowSmoke LLC. All rights reserved.</p>
            <p>
              <a href="/terms">Terms of Service</a> |
              <a href="/privacy">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  `;
}

// ============================================
// PUBLIC ROUTES
// ============================================

// Home page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${headCommon('RainbowSmoke Official - Home')}
    </head>
    <body>
      ${renderHeader('/')}

      <main class="main-content">
        <!-- Hero Section -->
        <section class="hero rainbow-gradient">
          <div class="container">
            <h1 class="hero-title">Welcome to RainbowSmoke Official</h1>
            <p class="hero-subtitle">DC Native | Systems Engineer | Gamer | Vlogger | LGBTQ+ Content Creator</p>
            <div class="hero-cta">
              <a href="/about" class="btn btn-primary">Learn More About Me</a>
              <a href="/gallery" class="btn btn-secondary">View Gallery</a>
            </div>
          </div>
        </section>

        <!-- Featured Content -->
        <section class="featured">
          <div class="container">
            <h2>Featured Content</h2>
            <div class="featured-grid">
              <div class="featured-card">
                <h3>🎮 Gaming Streams</h3>
                <p>Watch me play the latest games on Twitch. Join the community!</p>
                <a href="https://twitch.tv/rainbowsmoke_us" target="_blank" class="btn btn-sm">Watch on Twitch</a>
              </div>
              <div class="featured-card">
                <h3>📺 Tech Vlogs</h3>
                <p>Systems engineering tutorials, tech reviews, and behind-the-scenes content.</p>
                <a href="https://www.youtube.com/channel/UC-a69hBxIpH-Stm6NDEYYiA" target="_blank" class="btn btn-sm">Subscribe on YouTube</a>
              </div>
              <div class="featured-card">
                <h3>🎵 Short-Form Content</h3>
                <p>Quick clips, gaming highlights, and fun moments on TikTok.</p>
                <a href="https://tiktok.com/@rainbowsmoke_us" target="_blank" class="btn btn-sm">Follow on TikTok</a>
              </div>
            </div>
          </div>
        </section>

        <!-- About Preview -->
        <section class="about-preview">
          <div class="container">
            <h2>About Me</h2>
            <p>I'm a DC-based Systems Engineer who loves gaming, creating content, and sharing my journey as an LGBTQ+ content creator. Whether I'm troubleshooting servers, streaming games, or vlogging about tech, I'm all about living authentically and colorfully.</p>
            <a href="/about" class="btn btn-primary">Read Full Bio</a>
          </div>
        </section>
      </main>

      ${renderFooter()}

      <script src="/js/main.js"></script>
      ${renderAIWidget()}
    </body>
    </html>
  `);
});

// About page
app.get('/about', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${headCommon('About - RainbowSmoke Official', 'Learn about Mr. RainbowSmoke - DC Systems Engineer, Gamer, and LGBTQ+ Content Creator')}
    </head>
    <body>
      ${renderHeader('/about')}

      <main class="main-content">
        <section class="page-header">
          <div class="container">
            <h1>About Mr. RainbowSmoke</h1>
          </div>
        </section>

        <section class="about-content">
          <div class="container">
            <div class="about-grid">
              <div class="about-text">
                <h2>My Story</h2>
                <p>I was born and raised in the rhythm-and-hustle of Washington, D.C.—a city alive with urgency, identity, connection. From an early age I found myself drawn not just to people, but to systems: what makes things work, how things connect, how information flows. While other kids might be out kicking a ball, I was peering into the back of a computer or wondering what route a packet takes when I click "send." It wasn't just fascination—it was inevitability.</p>

                <p>In high school I discovered two truths: first, that I could speak more than one way (I picked up French and Spanish), and second, that tech and identity were not separate lanes—they were converging tracks. My multilingual growth taught me that language is system and culture just as much as grammar and verbs. My love of gaming, dance, and the LGBTQ+ community taught me that systems include the human heart. I didn't want to be one facet—they could all exist in tandem.</p>

                <p>Then came university (Bowie State University) where the technical came into sharper focus: routing, switching, infrastructure, the backbone of networks. At the same time I never lost sight of the "why"—why infrastructure matters, why media and networks power stories, why identity and community matter. I learned that being "intelligent, technically competent and can do — professional, anytime, anywhere…" isn't just a tagline. It became my motto.</p>

                <h2>Professional Journey</h2>
                <p>Landing a role at NBCUniversal as a Systems & Network Engineer was a milestone—not just for career, but for purpose. Here I wasn't just keeping systems live; I was enabling storytellers, enabling connection across screens, devices, geographies. The media industry moves fast. The stakes are high. Systems have to be reliable, agile, resilient. That's my world. My gamer's mindset helps when things go sideways ("okay, one more try"), my dancing rhythm helps when I need to find balance in chaos, and my multilingual, multimedia identity helps me see the ecosystem as interconnected.</p>

                <p>I run <strong>Mr. RainbowSmoke LLC</strong> and <strong>Fox Technologies LLC</strong>, providing systems engineering consulting and content creation services.</p>

                <h2>Beyond the 9-to-?</h2>
                <p>Outside of work, I keep the creative fire alive. Gaming isn't just escape—it sharpens strategy, reaction, teamwork. Dancing isn't just movement—it reminds me bodies, circuits, networks all move when engaged. I'm active in the LGBTQ+ space because being seen, being authentic, matters as much as any network cable. I stream, I build, I express, and I refuse to check any part of myself at the door.</p>

                <h2>🎮 Find Me Gaming</h2>
                <div class="gamertags">
                  <p><strong>XBOX:</strong> <a href="https://www.xbox.com/en-US/play/user/RainbowKillah87" target="_blank" rel="noopener">Rainbowkillah87</a></p>
                  <p><strong>Steam:</strong> <a href="https://steamcommunity.com/id/rainbowsmoke_us/" target="_blank" rel="noopener">djfox8705</a></p>
                  <p><strong>Epic Games:</strong> rainbowkillah87</p>
                  <p><strong>Nintendo:</strong> djfox8705</p>
                  <p><strong>Activision ID:</strong> RainbowSmoke#8629703</p>
                </div>

                <h2>What's Next?</h2>
                <p>I'm pushing forward. Maybe I move into larger-scale architecture, maybe cloud, maybe I lead teams, build bridges between tech & creativity. Whatever comes, I'll keep the same through-line: curiosity always, authenticity always, the question of "how can this work better, more human, more connected" always.</p>

                <p>Because one thing I've learned: Wires are cold until you bring meaning. Networks are invisible until you use them to speak, to create. And identity isn't a side note—it's part of the system. I'm here to engineer the infrastructure and the culture. I'm here to dance when the beats hit, to route packets when the alarms go off, and to smile at the fact that yes, all these things—tech, identity, rhythm, voice—can belong to the same person.</p>

                <div class="cta-section">
                  <h2>Let's Connect</h2>
                  <p>Want to collaborate, hire me for consulting, or just say hi? Head over to the contact page!</p>
                  <a href="/contact" class="btn btn-primary">Get In Touch</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      ${renderFooter()}

      <script src="/js/main.js"></script>
      ${renderAIWidget()}
    </body>
    </html>
  `);
});

// Gallery page - Mixed media (images, YouTube, Twitch, TikTok)
app.get('/gallery', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${headCommon('Gallery - RainbowSmoke Official', 'Photos, videos, and content from Mr. RainbowSmoke')}
    </head>
    <body>
      ${renderHeader('/gallery')}

      <main class="main-content">
        <section class="page-header rainbow-gradient">
          <div class="container">
            <h1>🎨 Gallery</h1>
            <p>Photos, videos, and content showcasing my journey</p>
          </div>
        </section>

        <section class="gallery-content">
          <div class="container">
            <!-- Filter Tabs -->
            <div class="gallery-filters">
              <button class="gallery-filter-btn active" data-filter="all">All</button>
              <button class="gallery-filter-btn" data-filter="images">Images</button>
              <button class="gallery-filter-btn" data-filter="youtube">YouTube</button>
              <button class="gallery-filter-btn" data-filter="twitch">Twitch</button>
              <button class="gallery-filter-btn" data-filter="tiktok">TikTok</button>
            </div>

            <!-- Gallery Grid -->
            <div class="gallery-grid" id="gallery-grid">

              <!-- Sample Images -->
              <div class="gallery-item" data-type="images">
                <div class="gallery-card gallery-image">
                  <img src="/images/placeholder-1.jpg" alt="RainbowSmoke Portrait" loading="lazy" data-lightbox="gallery">
                  <div class="gallery-overlay">
                    <h3>Profile Portrait</h3>
                    <p class="gallery-meta">📸 Photography</p>
                  </div>
                </div>
              </div>

              <div class="gallery-item" data-type="images">
                <div class="gallery-card gallery-image">
                  <img src="/images/placeholder-2.jpg" alt="Gaming Setup" loading="lazy" data-lightbox="gallery">
                  <div class="gallery-overlay">
                    <h3>Gaming Setup</h3>
                    <p class="gallery-meta">🎮 Battlestation</p>
                  </div>
                </div>
              </div>

              <div class="gallery-item" data-type="images">
                <div class="gallery-card gallery-image">
                  <img src="/images/placeholder-3.jpg" alt="DC Pride Event" loading="lazy" data-lightbox="gallery">
                  <div class="gallery-overlay">
                    <h3>DC Pride</h3>
                    <p class="gallery-meta">🏳️‍🌈 Pride Month 2024</p>
                  </div>
                </div>
              </div>

              <!-- YouTube Embeds -->
              <div class="gallery-item" data-type="youtube">
                <div class="gallery-card gallery-embed">
                  <div class="embed-container">
                    <iframe
                      src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                      title="YouTube video player"
                      frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowfullscreen
                      loading="lazy">
                    </iframe>
                  </div>
                  <div class="gallery-info">
                    <h3>Tech Tutorial</h3>
                    <p class="gallery-meta">📺 YouTube • Systems Engineering</p>
                  </div>
                </div>
              </div>

              <div class="gallery-item" data-type="youtube">
                <div class="gallery-card gallery-embed">
                  <div class="embed-container">
                    <iframe
                      src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                      title="YouTube video player"
                      frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowfullscreen
                      loading="lazy">
                    </iframe>
                  </div>
                  <div class="gallery-info">
                    <h3>Vlog: Day in the Life</h3>
                    <p class="gallery-meta">📺 YouTube • Lifestyle Vlog</p>
                  </div>
                </div>
              </div>

              <!-- Twitch Embeds -->
              <div class="gallery-item" data-type="twitch">
                <div class="gallery-card gallery-embed">
                  <div class="embed-container">
                    <iframe
                      src="https://player.twitch.tv/?video=v2342668158&parent=rainbowsmokeofficial.com&autoplay=false"
                      frameborder="0"
                      allowfullscreen="true"
                      scrolling="no"
                      loading="lazy">
                    </iframe>
                  </div>
                  <div class="gallery-info">
                    <h3>Epic Gaming Session</h3>
                    <p class="gallery-meta">🎮 Twitch • Live Stream Highlight</p>
                  </div>
                </div>
              </div>

              <div class="gallery-item" data-type="twitch">
                <div class="gallery-card gallery-embed">
                  <div class="embed-container">
                    <iframe
                      src="https://player.twitch.tv/?channel=rainbowsmoke_us&parent=rainbowsmokeofficial.com&muted=true"
                      frameborder="0"
                      allowfullscreen="true"
                      scrolling="no"
                      loading="lazy">
                    </iframe>
                  </div>
                  <div class="gallery-info">
                    <h3>Live Channel</h3>
                    <p class="gallery-meta">🎮 Twitch • Watch Live</p>
                  </div>
                </div>
              </div>

              <!-- TikTok Embeds -->
              <div class="gallery-item" data-type="tiktok">
                <div class="gallery-card gallery-embed tiktok-embed">
                  <blockquote class="tiktok-embed" cite="https://www.tiktok.com/@rainbowsmoke_us" data-unique-id="rainbowsmoke_us" data-embed-from="embed_page" data-embed-type="creator" style="max-width: 780px; min-width: 288px;">
                    <section>
                      <a target="_blank" href="https://www.tiktok.com/@rainbowsmoke_us?refer=creator_embed">@rainbowsmoke_us</a>
                    </section>
                  </blockquote>
                  <div class="gallery-info">
                    <h3>TikTok Profile</h3>
                    <p class="gallery-meta">🎵 TikTok • Latest Videos</p>
                  </div>
                </div>
              </div>

              <div class="gallery-item" data-type="tiktok">
                <div class="gallery-card gallery-tiktok-placeholder">
                  <a href="https://tiktok.com/@rainbowsmoke_us" target="_blank" rel="noopener noreferrer" class="tiktok-link">
                    <div class="tiktok-preview">
                      <span class="tiktok-icon">🎵</span>
                      <h3>Follow on TikTok</h3>
                      <p>@rainbowsmoke_us</p>
                    </div>
                  </a>
                  <div class="gallery-info">
                    <h3>Short-Form Content</h3>
                    <p class="gallery-meta">🎵 TikTok • Daily Updates</p>
                  </div>
                </div>
              </div>

              <!-- More Sample Images -->
              <div class="gallery-item" data-type="images">
                <div class="gallery-card gallery-image">
                  <img src="/images/placeholder-4.jpg" alt="Tech Setup" loading="lazy" data-lightbox="gallery">
                  <div class="gallery-overlay">
                    <h3>Systems Engineering</h3>
                    <p class="gallery-meta">💻 Workspace</p>
                  </div>
                </div>
              </div>

              <div class="gallery-item" data-type="images">
                <div class="gallery-card gallery-image">
                  <img src="/images/placeholder-5.jpg" alt="Content Creation" loading="lazy" data-lightbox="gallery">
                  <div class="gallery-overlay">
                    <h3>Content Creation</h3>
                    <p class="gallery-meta">🎥 Behind the Scenes</p>
                  </div>
                </div>
              </div>

              <div class="gallery-item" data-type="images">
                <div class="gallery-card gallery-image">
                  <img src="/images/placeholder-6.jpg" alt="LGBTQ+ Advocacy" loading="lazy" data-lightbox="gallery">
                  <div class="gallery-overlay">
                    <h3>Advocacy & Community</h3>
                    <p class="gallery-meta">🏳️‍🌈 LGBTQ+ Events</p>
                  </div>
                </div>
              </div>

            </div>

            <!-- Empty State (hidden by default) -->
            <div id="gallery-empty" class="gallery-empty" style="display: none;">
              <p>No content found for this filter.</p>
            </div>
          </div>
        </section>
      </main>

      ${renderFooter()}

      <!-- TikTok Embed Script -->
      <script async src="https://www.tiktok.com/embed.js"></script>

      <script src="/js/main.js"></script>
      <script src="/js/gallery.js"></script>
      ${renderAIWidget()}
    </body>
    </html>
  `);
});

// Contact page (placeholder for Phase 4)
app.get('/contact', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${headCommon('Contact - RainbowSmoke Official', 'Get in touch with Mr. RainbowSmoke for collaborations, consulting, or inquiries')}
    </head>
    <body>
      ${renderHeader('/contact')}

      <main class="main-content">
        <section class="page-header">
          <div class="container">
            <h1>Contact Me</h1>
            <p>Let's collaborate, consult, or just connect!</p>
          </div>
        </section>

        <section class="contact-content">
          <div class="container">
            <div class="contact-grid">
              <div class="contact-info">
                <h2>Get In Touch</h2>
                <p>Whether you're interested in consulting services, content collaborations, or just want to say hello, I'd love to hear from you!</p>

                <h3>Social Media</h3>
                <ul class="contact-social">
                  <li>🐦 Twitter/X: <a href="https://x.com/RainbowKillah" target="_blank">@RainbowKillah</a></li>
                  <li>💼 LinkedIn: <a href="https://www.linkedin.com/in/dehavillandfox" target="_blank">dehavillandfox</a></li>
                  <li>💻 GitHub: <a href="https://github.com/rainbowkillah" target="_blank">rainbowkillah</a></li>
                </ul>

                <h3>Business Inquiries</h3>
                <p>For consulting or business opportunities:</p>
                <ul>
                  <li>Mr. RainbowSmoke LLC</li>
                  <li>Fox Technologies LLC</li>
                  <li>Based in Washington, D.C.</li>
                </ul>
              </div>

              <div id="contact-form-container">
                <h2>Send a Message</h2>
                <form id="contact-form" class="contact-form">
                  <!-- Personal Information -->
                  <div class="form-row">
                    <div class="form-group">
                      <label for="first_name" class="form-label">First Name <span class="required">*</span></label>
                      <input type="text" id="first_name" name="first_name" class="form-input" required>
                    </div>

                    <div class="form-group">
                      <label for="last_name" class="form-label">Last Name <span class="required">*</span></label>
                      <input type="text" id="last_name" name="last_name" class="form-input" required>
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label for="email" class="form-label">Email Address <span class="required">*</span></label>
                      <input type="email" id="email" name="email" class="form-input" required>
                    </div>

                    <div class="form-group">
                      <label for="mobile_number" class="form-label">Mobile Number</label>
                      <input type="tel" id="mobile_number" name="mobile_number" class="form-input" placeholder="(555) 123-4567">
                      <small class="form-help">Optional - For SMS updates</small>
                    </div>
                  </div>

                  <!-- Twilio Opt-in (shown when mobile number entered) -->
                  <div id="twilio-opt-in-section" style="display: none;">
                    <div class="form-group">
                      <label class="form-checkbox-label">
                        <input type="checkbox" id="twilio_opt_in" name="twilio_opt_in" class="form-checkbox">
                        I consent to receive SMS messages via Twilio for updates and notifications. Message and data rates may apply. Reply STOP to unsubscribe at any time.
                      </label>
                    </div>
                  </div>

                  <!-- Demographics -->
                  <div class="form-row">
                    <div class="form-group">
                      <label for="gender" class="form-label">Gender</label>
                      <select id="gender" name="gender" class="form-select">
                        <option value="">Prefer not to say</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Genderfluid">Genderfluid</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label for="birthday" class="form-label">Birthday</label>
                      <input type="date" id="birthday" name="birthday" class="form-input">
                      <small class="form-help">Required for NSFW access (must be 18+)</small>
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label for="city" class="form-label">City</label>
                      <input type="text" id="city" name="city" class="form-input" placeholder="Washington">
                    </div>

                    <div class="form-group">
                      <label for="state" class="form-label">State</label>
                      <select id="state" name="state" class="form-select">
                        <option value="">Select State</option>
                        <!-- States populated via JavaScript -->
                      </select>
                    </div>
                  </div>

                  <!-- Interests -->
                  <div class="form-group">
                    <label class="form-label">What are you interested in? <span class="required">*</span></label>
                    <div id="interests-container" class="interests-grid">
                      <!-- Checkboxes populated via JavaScript -->
                    </div>
                  </div>

                  <!-- Message -->
                  <div class="form-group">
                    <label for="message" class="form-label">Message <span class="required">*</span></label>
                    <textarea id="message" name="message" class="form-textarea" rows="6" placeholder="Tell me what you're interested in..." required></textarea>
                  </div>

                  <!-- File Uploads -->
                  <div class="form-row">
                    <div class="form-group">
                      <label for="file_upload" class="form-label">Attach File</label>
                      <input type="file" id="file_upload" name="file_upload" class="form-input" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg">
                      <small class="form-help">PDF, DOC, TXT, or images (Max 10MB)</small>
                      <div id="file-preview" class="file-preview"></div>
                    </div>

                    <div class="form-group">
                      <label for="video_upload" class="form-label">Attach Video</label>
                      <input type="file" id="video_upload" name="video_upload" class="form-input" accept=".mp4,.mov,.avi,.webm">
                      <small class="form-help">MP4, MOV, AVI, or WebM (Max 10MB)</small>
                      <div id="video-preview" class="file-preview"></div>
                    </div>
                  </div>

                  <!-- Submit Button -->
                  <div class="form-group">
                    <button type="submit" class="btn btn-primary btn-lg">Send Message</button>
                  </div>

                  <p class="form-help">
                    <small>By submitting this form, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</small>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      ${renderFooter()}

      <script src="/js/main.js"></script>
      <script src="/js/contact.js"></script>
      ${renderAIWidget()}
    </body>
    </html>
  `);
});

// AI Chat page - Full-page chat interface
app.get('/chat', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${headCommon('AI Chat - RainbowSmoke Official', 'Chat with RainbowSmoke\'s AI assistant. Ask questions about gaming, tech, streaming, or anything else!', '/chat')}
      <link rel="stylesheet" href="/css/main.css">
      <link rel="stylesheet" href="/css/components.css">
      <style>
        body { margin: 0; overflow: hidden; }
        .chat-page-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .chat-page-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .chat-page-header h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }
        .chat-page-header .back-link {
          color: white;
          text-decoration: none;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          transition: background 0.2s;
        }
        .chat-page-header .back-link:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        .chat-iframe-container {
          flex: 1;
          overflow: hidden;
        }
        .chat-iframe-container iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="chat-page-container">
        <div class="chat-page-header">
          <h1>🤖 RainbowSmoke AI Assistant</h1>
          <a href="/" class="back-link">← Back to Home</a>
        </div>
        <div class="chat-iframe-container">
          <iframe
            src="https://rnbwsmk-ai.rainbowsmokeofficial.com"
            title="AI Chat Assistant"
            allow="clipboard-write"
          ></iframe>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Terms of Service page
app.get('/terms', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${headCommon('Terms of Service - RainbowSmoke Official')}
    </head>
    <body>
      ${renderHeader('/terms')}

      <main class="main-content">
        <section class="page-header">
          <div class="container">
            <h1>Terms of Service</h1>
            <p class="last-updated">Last Updated: ${new Date().toLocaleDateString()}</p>
          </div>
        </section>

        <section class="legal-content">
          <div class="container">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing and using rainbowsmokeofficial.com (the "Site"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Site.</p>

            <h2>2. Use of the Site</h2>
            <p>This Site is provided for personal, non-commercial use. You may not use the Site for any illegal or unauthorized purpose. You agree to comply with all applicable laws and regulations.</p>

            <h2>3. Intellectual Property</h2>
            <p>All content on this Site, including text, graphics, logos, images, and software, is the property of Mr. RainbowSmoke LLC or its content suppliers and is protected by copyright and other intellectual property laws.</p>

            <h2>4. Age-Restricted Content</h2>
            <p>Certain sections of the Site (marked as "Members Only" or "NSFW") contain adult content and are restricted to users 18 years of age or older. By accessing these sections, you confirm that you are of legal age.</p>

            <h2>5. User Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Site in any way that violates applicable laws or regulations</li>
              <li>Transmit any viruses, malware, or other harmful code</li>
              <li>Attempt to gain unauthorized access to the Site or its systems</li>
              <li>Harass, abuse, or harm other users</li>
            </ul>

            <h2>6. Third-Party Links</h2>
            <p>The Site may contain links to third-party websites (e.g., TikTok, Twitch, YouTube). We are not responsible for the content or practices of these external sites.</p>

            <h2>7. Disclaimer of Warranties</h2>
            <p>The Site is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the Site will be uninterrupted, secure, or error-free.</p>

            <h2>8. Limitation of Liability</h2>
            <p>Mr. RainbowSmoke LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Site.</p>

            <h2>9. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to the Site.</p>

            <h2>10. Contact</h2>
            <p>For questions about these Terms of Service, please <a href="/contact">contact us</a>.</p>
          </div>
        </section>
      </main>

      ${renderFooter()}

      <script src="/js/main.js"></script>
    </body>
    </html>
  `);
});

// Privacy Policy page
app.get('/privacy', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${headCommon('Privacy Policy - RainbowSmoke Official')}
    </head>
    <body>
      ${renderHeader('/privacy')}

      <main class="main-content">
        <section class="page-header">
          <div class="container">
            <h1>Privacy Policy</h1>
            <p class="last-updated">Last Updated: ${new Date().toLocaleDateString()}</p>
          </div>
        </section>

        <section class="legal-content">
          <div class="container">
            <h2>1. Information We Collect</h2>
            <h3>Personal Information</h3>
            <p>When you use our contact form, we collect:</p>
            <ul>
              <li>Name</li>
              <li>Email address</li>
              <li>Message content</li>
              <li>IP address (for security purposes)</li>
            </ul>

            <h3>Usage Data</h3>
            <p>We automatically collect certain information when you visit the Site, including:</p>
            <ul>
              <li>Browser type and version</li>
              <li>Pages visited</li>
              <li>Time and date of visit</li>
              <li>Referring URL</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Respond to your inquiries via the contact form</li>
              <li>Improve the Site and user experience</li>
              <li>Detect and prevent security threats</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>3. Cookies and Tracking</h2>
            <p>We use cookies for:</p>
            <ul>
              <li>Session management (authentication for Members/Admin areas)</li>
              <li>Remembering your preferences</li>
              <li>Analytics (via Cloudflare Analytics)</li>
            </ul>
            <p>You can disable cookies in your browser settings, but some features of the Site may not function properly.</p>

            <h2>4. Data Storage and Security</h2>
            <p>Your data is stored securely on Cloudflare's infrastructure. We implement industry-standard security measures including:</p>
            <ul>
              <li>HTTPS encryption for all connections</li>
              <li>Secure database storage (Cloudflare D1)</li>
              <li>Access controls and authentication</li>
            </ul>

            <h2>5. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul>
              <li><strong>Cloudflare:</strong> Hosting, CDN, and security</li>
              <li><strong>Adobe Fonts:</strong> Typography (may collect usage data)</li>
            </ul>
            <p>We do not control the privacy practices of these third parties. Please review their privacy policies.</p>

            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt out of communications</li>
            </ul>

            <h2>7. Age Restrictions</h2>
            <p>This Site is not intended for users under 13 years of age. The NSFW Members section is restricted to users 18+ only.</p>

            <h2>8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last Updated" date.</p>

            <h2>9. Contact</h2>
            <p>For privacy-related questions or to exercise your rights, please <a href="/contact">contact us</a>.</p>
          </div>
        </section>
      </main>

      ${renderFooter()}

      <script src="/js/main.js"></script>
    </body>
    </html>
  `);
});

// ============================================
// NSFW MEMBERS AREA (PASSWORD PROTECTED)
// ============================================

// NSFW login page
app.get('/nsfw/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${headCommon('Members Login - RainbowSmoke Official', 'Access adult content (18+ only) - Member login required')}
    </head>
    <body>
      ${renderHeader('/nsfw')}

      <main class="main-content">
        <section class="page-header">
          <div class="container">
            <h1>🔞 Members Only Area</h1>
            <p>This section contains adult content (18+ only)</p>
          </div>
        </section>

        <section class="login-content">
          <div class="container">
            <div class="login-form-container">
              <h2>Member Login</h2>

              <div class="alert alert-warning">
                <strong>⚠️ Age Restriction</strong><br>
                You must be 18 years or older to access this content. By proceeding, you confirm that you are of legal age.
              </div>

              <form id="nsfw-login-form" class="login-form">
                <div class="form-group">
                  <label for="nsfw-password" class="form-label">Member Password <span class="required">*</span></label>
                  <div class="password-input-group">
                    <input type="password" id="nsfw-password" name="password" class="form-input" required>
                    <button type="button" class="toggle-password" aria-label="Show password">👁️</button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-checkbox-label">
                    <input type="checkbox" id="age-confirm" name="age_confirm" class="form-checkbox" required>
                    I am 18 years of age or older and wish to view adult content
                  </label>
                </div>

                <div id="nsfw-login-error" class="form-error" style="display: none;"></div>

                <div class="form-group">
                  <button type="submit" class="btn btn-primary btn-lg">Enter Members Area</button>
                </div>

                <p class="form-help">
                  <small>Don't have the password? <a href="/contact">Request access</a> by selecting "NSFW" in the contact form.</small>
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>

      ${renderFooter()}

      <script src="/js/main.js"></script>
      <script src="/js/auth.js"></script>
    </body>
    </html>
  `);
});

// NSFW content page (protected)
app.get('/nsfw', requireAuth('nsfw'), (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${headCommon('Members Area - RainbowSmoke Official', 'Adult content and exclusive platforms (18+ only)')}
    </head>
    <body>
      ${renderHeader('/nsfw')}

      <main class="main-content">
        <section class="page-header rainbow-gradient">
          <div class="container">
            <h1>🔞 Welcome to the Members Area</h1>
            <p>Adult content and exclusive platforms</p>
            <button onclick="logout('nsfw')" class="btn btn-secondary btn-sm">Logout</button>
          </div>
        </section>

        <section class="nsfw-content">
          <div class="container">
            <div class="alert alert-info">
              <strong>💎 Premium Content</strong><br>
              Thank you for being a member! Access exclusive adult content and connect on various platforms.
            </div>

            <h2>Adult Platforms</h2>
            <div class="social-grid">
              <a href="https://onlyfans.com/rainbowsmoke_us/c1" target="_blank" rel="noopener noreferrer" class="social-card">
                <span class="icon">💎</span>
                <h3>OnlyFans</h3>
                <p>Exclusive adult content & interactions</p>
                <small>@rainbowsmoke_us</small>
              </a>

              <a href="https://chaturbate.com/p/rainbowsmoke_us/" target="_blank" rel="noopener noreferrer" class="social-card">
                <span class="icon">🔞</span>
                <h3>Chaturbate</h3>
                <p>Live adult webcam shows</p>
                <small>@rainbowsmoke_us</small>
              </a>

              <a href="https://xhamster.com/users/profiles/rainbowkillah" target="_blank" rel="noopener noreferrer" class="social-card">
                <span class="icon">🎬</span>
                <h3>XHamster</h3>
                <p>Adult videos and profile</p>
                <small>@rainbowkillah</small>
              </a>

              <a href="https://x.com/RainbowKillah" target="_blank" rel="noopener noreferrer" class="social-card">
                <span class="icon">🐦</span>
                <h3>Twitter/X (NSFW)</h3>
                <p>Adult content and updates</p>
                <small>@RainbowKillah</small>
              </a>
            </div>

            <h2>Curated Collections</h2>
            <div class="social-grid">
              <a href="https://xhamster.com/my/favorites/videos/62bfd63601f76ed3130fe6a2-watch-later" target="_blank" rel="noopener noreferrer" class="social-card">
                <span class="icon">⭐</span>
                <h3>XHamster Favorites</h3>
                <p>My personal watch later collection</p>
                <small>Curated adult content</small>
              </a>
            </div>

            <h2>Exclusive Content</h2>
            <p>Additional exclusive content and resources for members will be added here.</p>

            <div class="cta-section">
              <h3>Want to Collaborate?</h3>
              <p>Interested in adult content collaborations? Reach out through the contact form!</p>
              <a href="/contact" class="btn btn-primary">Get In Touch</a>
            </div>
          </div>
        </section>
      </main>

      ${renderFooter()}

      <script src="/js/main.js"></script>
      <script src="/js/auth.js"></script>
    </body>
    </html>
  `);
});

// ============================================
// ADMIN AREA (PASSWORD PROTECTED)
// ============================================

// Admin login page
app.get('/admin/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${headCommon('Admin Login - RainbowSmoke Official', 'Administrator access only')}
    </head>
    <body>
      ${renderHeader()}

      <main class="main-content">
        <section class="page-header">
          <div class="container">
            <h1>🔐 Admin Login</h1>
            <p>Administrator access only</p>
          </div>
        </section>

        <section class="login-content">
          <div class="container">
            <div class="login-form-container">
              <h2>Administrator Login</h2>

              <form id="admin-login-form" class="login-form">
                <div class="form-group">
                  <label for="admin-password" class="form-label">Admin Password <span class="required">*</span></label>
                  <div class="password-input-group">
                    <input type="password" id="admin-password" name="password" class="form-input" required>
                    <button type="button" class="toggle-password" aria-label="Show password">👁️</button>
                  </div>
                </div>

                <div id="admin-login-error" class="form-error" style="display: none;"></div>

                <div class="form-group">
                  <button type="submit" class="btn btn-primary btn-lg">Access Dashboard</button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      ${renderFooter()}

      <script src="/js/main.js"></script>
      <script src="/js/auth.js"></script>
    </body>
    </html>
  `);
});

// Admin dashboard (protected)
app.get('/admin/dashboard', requireAuth('admin'), (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${headCommon('Admin Dashboard - RainbowSmoke Official', 'Site administration and contact management')}
    </head>
    <body>
      ${renderHeader()}

      <main class="main-content">
        <section class="page-header rainbow-gradient">
          <div class="container">
            <h1>📊 Admin Dashboard</h1>
            <p>Site administration and contact management</p>
            <button onclick="logout('admin')" class="btn btn-secondary btn-sm">Logout</button>
          </div>
        </section>

        <section class="dashboard-content">
          <div class="container">
            <!-- Statistics -->
            <h2>Quick Stats</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <h3>Total Contacts</h3>
                <p class="stat-number" id="stat-total">0</p>
                <small>All submissions</small>
              </div>
              <div class="stat-card">
                <h3>NSFW Requests</h3>
                <p class="stat-number" id="stat-nsfw">0</p>
                <small>Total NSFW interest</small>
              </div>
              <div class="stat-card">
                <h3>Unread Messages</h3>
                <p class="stat-number" id="stat-unread">0</p>
                <small>Status: new</small>
              </div>
              <div class="stat-card">
                <h3>Pending NSFW</h3>
                <p class="stat-number" id="stat-pending-nsfw">0</p>
                <small>Awaiting approval</small>
              </div>
            </div>

            <!-- Filters and Actions -->
            <div class="dashboard-toolbar">
              <div class="filter-group">
                <button class="filter-btn active" data-filter="all">All Contacts</button>
                <button class="filter-btn" data-filter="new">New</button>
                <button class="filter-btn" data-filter="read">Read</button>
                <button class="filter-btn" data-filter="replied">Replied</button>
                <button class="filter-btn" data-filter="nsfw">NSFW Requests</button>
              </div>
              <div class="action-group">
                <button id="refresh-contacts" class="btn btn-secondary btn-sm">Refresh</button>
                <button id="export-contacts" class="btn btn-primary btn-sm">Export CSV</button>
              </div>
            </div>

            <!-- Contacts Table -->
            <div class="table-container">
              <table class="contacts-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Contact</th>
                    <th>Interests</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="contacts-tbody">
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem;">
                      Loading contacts...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      ${renderFooter()}

      <script src="/js/main.js"></script>
      <script src="/js/auth.js"></script>
      <script src="/js/admin.js"></script>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'rainbowsmokeofficial-com',
    timestamp: new Date().toISOString(),
    worker: 'online',
    phase: 'Phase 1 - Infrastructure Complete'
  });
});

// API status endpoint
app.get('/api/status', (c) => {
  const session = c.get('session');
  return c.json({
    site: {
      name: c.env.SITE_NAME || 'RainbowSmoke Official',
      domain: c.env.SITE_DOMAIN || 'rainbowsmokeofficial.com',
      status: 'in_development'
    },
    infrastructure: {
      worker: 'online',
      kv: {
        auth: !!c.env.AUTH_KV,
        sessions: !!c.env.SESSIONS_KV
      },
      database: {
        d1: !!c.env.DB
      },
      assets: !!c.env.ASSETS
    },
    session: session ? { type: session.user_type, active: true } : { active: false },
    phase: 'Phase 2: Core Worker & Routing Complete',
    nextPhase: 'Phase 3: Rainbow Theme CSS & Adobe Fonts',
    routes: {
      public: ['/', '/about', '/gallery', '/contact', '/terms', '/privacy'],
      protected: ['/nsfw', '/admin/dashboard'],
      api: ['/api/status', '/health']
    }
  });
});

// ============================================
// AI WORKER PROXY ROUTES
// ============================================

// Proxy WebSocket + HTTP party traffic to AI worker (chat + calendar rooms)
app.all('/party/*', async (c) => {
  try {
    if (!c.env.AI_WORKER) {
      return c.json({ error: 'AI worker not configured' }, { status: 503 });
    }

    // Forward the original request (including Upgrade headers) to the AI worker
    const aiResponse = await c.env.AI_WORKER.fetch(c.req.raw);
    return aiResponse;
  } catch (error) {
    console.error('AI party proxy error:', error);

    if (c.req.header('upgrade')) {
      // WebSocket upgrade failed – surface a generic 502
      return new Response('WebSocket proxy error', { status: 502 });
    }

    return c.json({
      error: 'Failed to reach AI party endpoint',
      details: error.message || String(error)
    }, { status: 500 });
  }
});

// Proxy chat requests to AI worker
app.post('/api/ai/chat', async (c) => {
  try {
    if (!c.env.AI_WORKER) {
      return c.json({ error: 'AI worker not configured' }, { status: 503 });
    }

    const body = await c.req.json();

    // Forward request to AI worker
    const aiResponse = await c.env.AI_WORKER.fetch(
      new Request('http://internal/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    );

    return aiResponse;
  } catch (error) {
    console.error('AI proxy error:', error);
    return c.json({
      error: 'Failed to communicate with AI service',
      details: error.message
    }, { status: 500 });
  }
});

// Proxy search requests to AI worker
app.post('/api/ai/search', async (c) => {
  try {
    if (!c.env.AI_WORKER) {
      return c.json({ error: 'AI worker not configured' }, { status: 503 });
    }

    const body = await c.req.json();

    const aiResponse = await c.env.AI_WORKER.fetch(
      new Request('http://internal/api/vectorize/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    );

    return aiResponse;
  } catch (error) {
    console.error('AI search proxy error:', error);
    return c.json({
      error: 'Failed to communicate with AI service',
      details: error.message
    }, { status: 500 });
  }
});

// Get AI worker status
app.get('/api/ai/status', async (c) => {
  try {
    if (!c.env.AI_WORKER) {
      return c.json({
        available: false,
        error: 'AI worker not configured'
      });
    }

    const aiResponse = await c.env.AI_WORKER.fetch(
      new Request('http://internal/api/status', {
        method: 'GET'
      })
    );

    const status = await aiResponse.json();
    return c.json({
      available: true,
      worker: status
    });
  } catch (error) {
    console.error('AI status proxy error:', error);
    return c.json({
      available: false,
      error: error.message
    });
  }
});

// ============================================
// MAIN SITE API ROUTES
// ============================================

// Contact form submission API
app.post('/api/contact', async (c) => {
  try {
    const data = await c.req.json();

    // Validate required fields
    if (!data.first_name || !data.last_name || !data.email || !data.message) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Check if NSFW interest is selected
    const hasNSFWInterest = Array.isArray(data.interests) && data.interests.includes('NSFW');

    // If NSFW selected, birthday is required and must be 18+
    if (hasNSFWInterest) {
      if (!data.birthday) {
        return c.json({ error: 'Birthday is required for NSFW access' }, 400);
      }

      const birthDate = new Date(data.birthday);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      let calculatedAge = age;
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }

      if (calculatedAge < 18) {
        return c.json({ error: 'You must be 18+ to request NSFW access' }, 400);
      }
    }

    // Get request metadata
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    // Convert interests array to JSON string
    const interestsJson = JSON.stringify(data.interests || []);

    // TODO: Handle file/video uploads - For now, store URLs as null
    // In production, upload to Cloudflare R2 or Images and store URLs
    const fileUrl = null;
    const videoUrl = null;

    // Insert into D1 database
    const stmt = c.env.DB.prepare(`
      INSERT INTO contacts (
        first_name, last_name, email, mobile_number,
        gender, birthday, city, state,
        message, file_url, video_url,
        interests, has_nsfw_interest, twilio_opt_in,
        ip_address, user_agent, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `);

    await stmt.bind(
      data.first_name,
      data.last_name,
      data.email,
      data.mobile_number || null,
      data.gender || null,
      data.birthday || null,
      data.city || null,
      data.state || null,
      data.message,
      fileUrl,
      videoUrl,
      interestsJson,
      hasNSFWInterest ? 1 : 0,
      data.twilio_opt_in ? 1 : 0,
      ipAddress,
      userAgent
    ).run();

    // Send email notification via Email Workers
    try {
      await c.env.CONTACT_EMAIL.send({
        from: 'no-reply@rainbowsmokeofficial.com',
        to: c.env.ADMIN_EMAIL,
        subject: `New Contact Form Submission from ${data.first_name} ${data.last_name}`,
        text: `
New contact form submission:

Name: ${data.first_name} ${data.last_name}
Email: ${data.email}
Mobile: ${data.mobile_number || 'Not provided'}

Interests: ${data.interests.join(', ')}
${hasNSFWInterest ? '⚠️ NSFW ACCESS REQUESTED (requires approval)' : ''}

Message:
${data.message}

---
Location: ${data.city || 'Unknown'}, ${data.state || 'Unknown'}
Submitted: ${new Date().toISOString()}
IP: ${ipAddress}

View in Admin Dashboard: https://rainbowsmokeofficial.com/admin/dashboard
        `
      });
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Don't fail the request if email fails
    }

    // Track analytics event for form submission
    try {
      if (c.env.ANALYTICS) {
        const country = c.req.header('cf-ipcountry') || 'XX';
        c.env.ANALYTICS.writeDataPoint({
          blobs: [
            'form_submission',    // event_type
            'contact',            // form_type
            hasNSFWInterest ? 'nsfw' : 'general', // submission_category
            country,              // country
            data.interests.join(',').substring(0, 100) // interests (truncated)
          ],
          doubles: [1],           // count
          indexes: [crypto.randomUUID()] // unique event ID
        });
      }
    } catch (analyticsError) {
      console.error('Analytics tracking error:', analyticsError);
    }

    // Return success response
    return c.json({
      success: true,
      message: hasNSFWInterest
        ? 'Your submission has been received! Your NSFW access request is pending admin approval.'
        : 'Thank you for reaching out! I\'ll get back to you soon.',
      nsfw_interest: hasNSFWInterest
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return c.json({ error: 'Failed to submit form. Please try again.' }, 500);
  }
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// NSFW Members login
app.post('/nsfw/login', async (c) => {
  try {
    const { password, age_confirmed } = await c.req.json();

    // Validate age confirmation
    if (!age_confirmed) {
      return c.json({ error: 'You must confirm you are 18 or older.' }, 400);
    }

    // Validate password
    if (!password) {
      return c.json({ error: 'Password is required.' }, 400);
    }

    // Check password against secret
    const correctPassword = c.env.NSFW_PASSWORD;
    if (password !== correctPassword) {
      return c.json({ error: 'Invalid password.' }, 401);
    }

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Set session expiry (24 hours for NSFW)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store session in KV
    const sessionData = {
      user_type: 'nsfw',
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      ip_address: c.req.header('cf-connecting-ip') || 'unknown'
    };

    await c.env.SESSIONS_KV.put(sessionId, JSON.stringify(sessionData), {
      expirationTtl: 86400 // 24 hours in seconds
    });

    // Set cookie
    setCookie(c, 'session_id', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 86400, // 24 hours in seconds
      path: '/'
    });

    // Track analytics event for login
    try {
      if (c.env.ANALYTICS) {
        const country = c.req.header('cf-ipcountry') || 'XX';
        c.env.ANALYTICS.writeDataPoint({
          blobs: [
            'login',              // event_type
            'nsfw',               // user_type
            'success',            // status
            country               // country
          ],
          doubles: [1],           // count
          indexes: [sessionId]    // session ID for tracking
        });
      }
    } catch (analyticsError) {
      console.error('Analytics tracking error:', analyticsError);
    }

    return c.json({ success: true, message: 'Login successful' });

  } catch (error) {
    console.error('NSFW login error:', error);
    return c.json({ error: 'Login failed. Please try again.' }, 500);
  }
});

// Admin login
app.post('/admin/login', async (c) => {
  try {
    const { password } = await c.req.json();

    // Validate password
    if (!password) {
      return c.json({ error: 'Password is required.' }, 400);
    }

    // Check password against secret
    const correctPassword = c.env.ADMIN_PASSWORD;
    if (password !== correctPassword) {
      return c.json({ error: 'Invalid password.' }, 401);
    }

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Set session expiry (1 hour for admin)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store session in KV
    const sessionData = {
      user_type: 'admin',
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      ip_address: c.req.header('cf-connecting-ip') || 'unknown'
    };

    await c.env.SESSIONS_KV.put(sessionId, JSON.stringify(sessionData), {
      expirationTtl: 3600 // 1 hour in seconds
    });

    // Set cookie
    setCookie(c, 'session_id', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 3600, // 1 hour in seconds
      path: '/'
    });

    // Track analytics event for login
    try {
      if (c.env.ANALYTICS) {
        const country = c.req.header('cf-ipcountry') || 'XX';
        c.env.ANALYTICS.writeDataPoint({
          blobs: [
            'login',              // event_type
            'admin',              // user_type
            'success',            // status
            country               // country
          ],
          doubles: [1],           // count
          indexes: [sessionId]    // session ID for tracking
        });
      }
    } catch (analyticsError) {
      console.error('Analytics tracking error:', analyticsError);
    }

    return c.json({ success: true, message: 'Login successful' });

  } catch (error) {
    console.error('Admin login error:', error);
    return c.json({ error: 'Login failed. Please try again.' }, 500);
  }
});

// NSFW logout
app.post('/nsfw/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id');

  if (sessionId && c.env.SESSIONS_KV) {
    await c.env.SESSIONS_KV.delete(sessionId);
  }

  setCookie(c, 'session_id', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 0,
    path: '/'
  });

  return c.json({ success: true });
});

// Admin logout
app.post('/admin/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id');

  if (sessionId && c.env.SESSIONS_KV) {
    await c.env.SESSIONS_KV.delete(sessionId);
  }

  setCookie(c, 'session_id', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 0,
    path: '/'
  });

  return c.json({ success: true });
});

// ============================================
// ADMIN API ENDPOINTS
// ============================================

// Get all contact submissions (admin only)
app.get('/api/admin/contacts', requireAuth('admin'), async (c) => {
  try {
    const stmt = c.env.DB.prepare(`
      SELECT * FROM contacts
      ORDER BY submitted_at DESC
    `);

    const { results } = await stmt.all();

    return c.json({
      success: true,
      contacts: results || []
    });

  } catch (error) {
    console.error('Admin contacts fetch error:', error);
    return c.json({ error: 'Failed to fetch contacts' }, 500);
  }
});

// Update contact status (admin only)
app.put('/api/admin/contacts/:id/status', requireAuth('admin'), async (c) => {
  try {
    const contactId = c.req.param('id');
    const { status } = await c.req.json();

    // Validate status
    const validStatuses = ['new', 'read', 'replied', 'approved', 'archived'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    // Update contact
    const stmt = c.env.DB.prepare(`
      UPDATE contacts
      SET status = ?,
          read_at = CASE WHEN ? = 'read' AND read_at IS NULL THEN CURRENT_TIMESTAMP ELSE read_at END,
          replied_at = CASE WHEN ? = 'replied' AND replied_at IS NULL THEN CURRENT_TIMESTAMP ELSE replied_at END
      WHERE id = ?
    `);

    await stmt.bind(status, status, status, contactId).run();

    return c.json({
      success: true,
      message: `Contact marked as ${status}`
    });

  } catch (error) {
    console.error('Contact status update error:', error);
    return c.json({ error: 'Failed to update contact status' }, 500);
  }
});

// Approve NSFW access (admin only)
app.post('/api/admin/contacts/:id/approve-nsfw', requireAuth('admin'), async (c) => {
  try {
    const contactId = c.req.param('id');

    // Check if contact has NSFW interest
    const checkStmt = c.env.DB.prepare(`
      SELECT id, has_nsfw_interest, nsfw_access_approved, email, first_name, last_name
      FROM contacts
      WHERE id = ?
    `);

    const contact = await checkStmt.bind(contactId).first();

    if (!contact) {
      return c.json({ error: 'Contact not found' }, 404);
    }

    if (!contact.has_nsfw_interest) {
      return c.json({ error: 'This contact did not request NSFW access' }, 400);
    }

    if (contact.nsfw_access_approved) {
      return c.json({ error: 'NSFW access already approved' }, 400);
    }

    // Approve NSFW access
    const updateStmt = c.env.DB.prepare(`
      UPDATE contacts
      SET nsfw_access_approved = 1,
          approved_at = CURRENT_TIMESTAMP,
          status = 'approved'
      WHERE id = ?
    `);

    await updateStmt.bind(contactId).run();

    // TODO: Send email notification to user about approval
    // This would use Email Workers when configured

    return c.json({
      success: true,
      message: `NSFW access approved for ${contact.first_name} ${contact.last_name}`
    });

  } catch (error) {
    console.error('NSFW approval error:', error);
    return c.json({ error: 'Failed to approve NSFW access' }, 500);
  }
});

// ============================================
// STATIC ASSET SERVING
// ============================================

// Serve static assets from /public via Workers Static Assets binding
app.get('/css/*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Static assets not configured', 404);
});

app.get('/js/*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Static assets not configured', 404);
});

app.get('/images/*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Static assets not configured', 404);
});

app.get('/icons/*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Static assets not configured', 404);
});

// Favicon - serve from R2 bucket
app.get('/favicon.ico', async (c) => {
  try {
    if (!c.env.MEDIA_BUCKET) {
      return c.text('Media bucket not configured', 503);
    }

    // Get SVG favicon from R2 bucket
    const object = await c.env.MEDIA_BUCKET.get('gallery/images/favicon.svg');

    if (!object) {
      return c.text('Favicon not found', 404);
    }

    // Return the SVG with appropriate headers
    return new Response(object.body, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'ETag': object.httpEtag
      }
    });

  } catch (error) {
    console.error('Favicon serve error:', error);
    return c.text('Failed to load favicon', 500);
  }
});

// ============================================
// R2 MEDIA SERVING
// ============================================

// Serve gallery media from R2 bucket
app.get('/media/gallery/*', async (c) => {
  try {
    if (!c.env.MEDIA_BUCKET) {
      return c.text('Media bucket not configured', 503);
    }

    // Extract the file path (remove /media/ prefix)
    const path = c.req.path.replace('/media/', '');

    // Get object from R2
    const object = await c.env.MEDIA_BUCKET.get(path);

    if (!object) {
      return c.text('Media not found', 404);
    }

    // Determine content type from file extension
    const ext = path.split('.').pop().toLowerCase();
    const contentTypeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Return the media with appropriate headers
    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'ETag': object.httpEtag
      }
    });

  } catch (error) {
    console.error('R2 media serve error:', error);
    return c.text('Failed to load media', 500);
  }
});

// Serve NSFW media from R2 bucket (protected)
app.get('/media/nsfw/*', requireAuth('nsfw'), async (c) => {
  try {
    if (!c.env.MEDIA_BUCKET) {
      return c.text('Media bucket not configured', 503);
    }

    // Extract the file path (remove /media/ prefix)
    const path = c.req.path.replace('/media/', '');

    // Get object from R2
    const object = await c.env.MEDIA_BUCKET.get(path);

    if (!object) {
      return c.text('Media not found', 404);
    }

    // Determine content type from file extension
    const ext = path.split('.').pop().toLowerCase();
    const contentTypeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Return the media with appropriate headers
    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour (private)
        'ETag': object.httpEtag
      }
    });

  } catch (error) {
    console.error('R2 NSFW media serve error:', error);
    return c.text('Failed to load media', 500);
  }
});

// API endpoint to list gallery media (returns JSON list of available media)
app.get('/api/gallery/media', async (c) => {
  try {
    if (!c.env.MEDIA_BUCKET) {
      return c.json({ error: 'Media bucket not configured' }, 503);
    }

    // List objects in gallery folder
    const listed = await c.env.MEDIA_BUCKET.list({ prefix: 'gallery/' });

    const media = listed.objects.map(obj => ({
      key: obj.key,
      url: `/media/${obj.key}`,
      size: obj.size,
      uploaded: obj.uploaded,
      type: obj.key.includes('/images/') ? 'image' :
            obj.key.includes('/videos/') ? 'video' : 'unknown'
    }));

    return c.json({
      success: true,
      media: media,
      count: media.length
    });

  } catch (error) {
    console.error('Gallery media list error:', error);
    return c.json({ error: 'Failed to list media' }, 500);
  }
});

// API endpoint to list NSFW media (protected, returns JSON list)
app.get('/api/nsfw/media', requireAuth('nsfw'), async (c) => {
  try {
    if (!c.env.MEDIA_BUCKET) {
      return c.json({ error: 'Media bucket not configured' }, 503);
    }

    // List objects in nsfw folder
    const listed = await c.env.MEDIA_BUCKET.list({ prefix: 'nsfw/' });

    const media = listed.objects.map(obj => ({
      key: obj.key,
      url: `/media/${obj.key}`,
      size: obj.size,
      uploaded: obj.uploaded,
      type: obj.key.includes('/images/') ? 'image' :
            obj.key.includes('/videos/') ? 'video' : 'unknown'
    }));

    return c.json({
      success: true,
      media: media,
      count: media.length
    });

  } catch (error) {
    console.error('NSFW media list error:', error);
    return c.json({ error: 'Failed to list media' }, 500);
  }
});

// ============================================
// SEO & SITEMAPS
// ============================================

// Sitemap.xml - Dynamic sitemap generation
app.get('/sitemap.xml', (c) => {
  const baseUrl = 'https://rainbowsmokeofficial.com';
  const currentDate = new Date().toISOString().split('T')[0];

  // Define all public pages with priority and change frequency
  const pages = [
    { url: '/', priority: '1.0', changefreq: 'weekly', lastmod: currentDate },
    { url: '/about', priority: '0.9', changefreq: 'monthly', lastmod: currentDate },
    { url: '/gallery', priority: '0.8', changefreq: 'weekly', lastmod: currentDate },
    { url: '/contact', priority: '0.8', changefreq: 'monthly', lastmod: currentDate },
    { url: '/terms', priority: '0.3', changefreq: 'yearly', lastmod: currentDate },
    { url: '/privacy', priority: '0.3', changefreq: 'yearly', lastmod: currentDate },
  ];

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return c.text(xml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
  });
});

// Robots.txt - Search engine crawling rules
app.get('/robots.txt', (c) => {
  const robotsTxt = `# RainbowSmoke Official - robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /nsfw/
Disallow: /api/

# Sitemap location
Sitemap: https://rainbowsmokeofficial.com/sitemap.xml

# Crawl-delay (be respectful)
Crawl-delay: 1

# Specific bot rules
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /
`;

  return c.text(robotsTxt, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
  });
});

// 404 handler
app.notFound((c) => {
  // Track 404 errors in analytics
  try {
    if (c.env.ANALYTICS) {
      const url = new URL(c.req.url);
      const country = c.req.header('cf-ipcountry') || 'XX';
      c.env.ANALYTICS.writeDataPoint({
        blobs: [
          'error',              // event_type
          '404',                // error_code
          url.pathname,         // missing_path
          country               // country
        ],
        doubles: [1],           // count
        indexes: [crypto.randomUUID()] // unique event ID
      });
    }
  } catch (analyticsError) {
    console.error('Analytics tracking error:', analyticsError);
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 - Page Not Found</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(90deg,
            #FF0000, #FF7F00, #FFFF00, #00FF00,
            #0000FF, #4B0082, #9400D3
          );
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .container {
          background: white;
          padding: 3rem;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
        }

        h1 {
          font-size: 4rem;
          color: #FF0000;
        }

        p {
          font-size: 1.2rem;
          color: #666;
          margin: 1rem 0;
        }

        a {
          display: inline-block;
          margin-top: 2rem;
          padding: 1rem 2rem;
          background: linear-gradient(90deg,
            #FF0000, #FF7F00, #FFFF00, #00FF00,
            #0000FF, #4B0082, #9400D3
          );
          color: white;
          text-decoration: none;
          border-radius: 50px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404</h1>
        <p>Page not found</p>
        <p>This page doesn't exist yet. The site is under construction!</p>
        <a href="/">← Back to Home</a>
      </div>
    </body>
    </html>
  `, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  }, 500);
});

// Export the Hono app
export default app;
