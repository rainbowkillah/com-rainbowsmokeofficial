-- D1 Database Schema for rainbowsmokeofficial.com
-- This file creates all necessary tables for the website

-- ============================================
-- Contact form submissions table
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'new' CHECK(status IN ('new', 'read', 'replied', 'archived'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_contacts_submitted ON contacts(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- ============================================
-- Sessions table (optional - can use KV-only)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_type TEXT NOT NULL CHECK(user_type IN ('nsfw', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

-- Index for session expiry cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- Gallery items table (for dynamic gallery management)
-- ============================================
CREATE TABLE IF NOT EXISTS gallery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('image', 'youtube', 'twitch', 'tiktok')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_visible INTEGER DEFAULT 1
);

-- Index for ordering gallery items
CREATE INDEX IF NOT EXISTS idx_gallery_order ON gallery_items(display_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_visible ON gallery_items(is_visible, display_order);

-- ============================================
-- Insert some sample gallery items (optional)
-- ============================================
INSERT OR IGNORE INTO gallery_items (id, title, description, type, url, display_order) VALUES
(1, 'Gaming Stream Highlights', 'Check out my latest gaming streams on Twitch!', 'twitch', 'rainbowsmoke_us', 1),
(2, 'YouTube Channel', 'Subscribe to my YouTube channel for tech vlogs and gaming content', 'youtube', 'UC-a69hBxIpH-Stm6NDEYYiA', 2),
(3, 'TikTok Videos', 'Follow me on TikTok for short-form content', 'tiktok', '@rainbowsmoke_us', 3);

-- ============================================
-- End of schema
-- ============================================
