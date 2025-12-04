-- ============================================
-- Update Contacts Table Schema
-- Add comprehensive fields for registration/inquiry form
-- ============================================

-- Drop old contacts table if exists (for clean migration)
DROP TABLE IF EXISTS contacts;

-- Create enhanced contacts table
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

  -- Interests (comma-separated for simplicity)
  interests TEXT, -- JSON array: ["IRL", "Collab", "Gaming", "Techie", "NSFW"]

  -- Flags
  has_nsfw_interest INTEGER DEFAULT 0, -- 1 if NSFW selected in interests
  nsfw_access_approved INTEGER DEFAULT 0, -- Admin approval for NSFW access
  twilio_opt_in INTEGER DEFAULT 0, -- SMS opt-in for Twilio

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

-- Indexes for performance
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_submitted ON contacts(submitted_at DESC);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_nsfw_interest ON contacts(has_nsfw_interest);
CREATE INDEX idx_contacts_nsfw_approved ON contacts(nsfw_access_approved);

-- Create a view for NSFW access requests
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

-- Create a view for pending approvals
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
