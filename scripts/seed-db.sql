-- D1 Database Schema for rainbowsmokeofficial.com
-- This file creates all necessary tables for the website

PRAGMA foreign_keys = OFF;

-- Rebuild helper views if they already exist
DROP VIEW IF EXISTS nsfw_access_requests;
DROP VIEW IF EXISTS pending_approvals;

-- ============================================
-- Contact form submissions table (Phase 4+ schema)
-- ============================================
DROP TABLE IF EXISTS contacts;
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile_number TEXT,

  -- Demographics
  gender TEXT,
  birthday DATE,
  city TEXT,
  state TEXT,

  -- Message & Uploads
  message TEXT NOT NULL,
  file_url TEXT,
  video_url TEXT,

  -- Interests & flags
  interests TEXT,
  has_nsfw_interest INTEGER DEFAULT 0,
  nsfw_access_approved INTEGER DEFAULT 0,
  twilio_opt_in INTEGER DEFAULT 0,

  -- Metadata
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,

  -- Status tracking
  status TEXT DEFAULT 'new' CHECK(status IN ('new', 'read', 'replied', 'approved', 'archived')),
  admin_notes TEXT,

  -- Timestamps
  read_at DATETIME,
  replied_at DATETIME,
  approved_at DATETIME
);

CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_submitted ON contacts(submitted_at DESC);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_nsfw_interest ON contacts(has_nsfw_interest);
CREATE INDEX idx_contacts_nsfw_approved ON contacts(nsfw_access_approved);

CREATE VIEW nsfw_access_requests AS
SELECT
  id,
  first_name,
  last_name,
  email,
  mobile_number,
  gender,
  birthday,
  city,
  state,
  submitted_at,
  nsfw_access_approved,
  approved_at
FROM contacts
WHERE has_nsfw_interest = 1
ORDER BY submitted_at DESC;

CREATE VIEW pending_approvals AS
SELECT
  id,
  first_name,
  last_name,
  email,
  interests,
  submitted_at,
  status
FROM contacts
WHERE has_nsfw_interest = 1 AND nsfw_access_approved = 0
ORDER BY submitted_at DESC;

-- ============================================
-- Sessions table (optional - can use KV-only)
-- ============================================
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_type TEXT NOT NULL CHECK(user_type IN ('nsfw', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- Gallery items table (for dynamic gallery management)
-- ============================================
DROP TABLE IF EXISTS gallery_items;
CREATE TABLE gallery_items (
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

CREATE INDEX idx_gallery_order ON gallery_items(display_order, created_at DESC);
CREATE INDEX idx_gallery_visible ON gallery_items(is_visible, display_order);

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
