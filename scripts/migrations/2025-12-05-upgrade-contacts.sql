-- ============================================
-- D1 Migration: 2025-12-05
-- Upgrade legacy contacts table to Phase 4 schema without data loss
-- ============================================

PRAGMA foreign_keys = OFF;

-- Views reference the contacts table, drop them before renaming
DROP VIEW IF EXISTS nsfw_access_requests;
DROP VIEW IF EXISTS pending_approvals;

-- Rename legacy table so we can copy data forward
ALTER TABLE contacts RENAME TO contacts_legacy;

-- Create the new contacts table definition
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

-- Copy existing rows, splitting the legacy name column as best we can
INSERT INTO contacts (
  id,
  first_name,
  last_name,
  email,
  mobile_number,
  gender,
  birthday,
  city,
  state,
  message,
  file_url,
  video_url,
  interests,
  has_nsfw_interest,
  nsfw_access_approved,
  twilio_opt_in,
  submitted_at,
  ip_address,
  user_agent,
  status,
  admin_notes,
  read_at,
  replied_at,
  approved_at
)
SELECT
  id,
  TRIM(CASE WHEN instr(name, ' ') > 0 THEN substr(name, 1, instr(name, ' ') - 1) ELSE name END) AS first_name,
  TRIM(CASE WHEN instr(name, ' ') > 0 THEN substr(name, instr(name, ' ') + 1) ELSE '' END) AS last_name,
  email,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  message,
  NULL,
  NULL,
  '[]',
  0,
  0,
  0,
  submitted_at,
  ip_address,
  user_agent,
  status,
  CASE
    WHEN subject IS NOT NULL AND subject <> '' THEN printf('Legacy subject: %s', subject)
    ELSE NULL
  END,
  NULL,
  NULL,
  NULL
FROM contacts_legacy;

DROP TABLE contacts_legacy;

-- Rebuild indexes for the new structure
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_submitted ON contacts(submitted_at DESC);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_nsfw_interest ON contacts(has_nsfw_interest);
CREATE INDEX idx_contacts_nsfw_approved ON contacts(nsfw_access_approved);

-- Restore helper views now that the migration is complete
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
