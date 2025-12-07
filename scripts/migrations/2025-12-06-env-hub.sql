-- Migration: Environment Hub metadata tables
-- Date: 2025-12-06

-- Cloudflare D1 handles transactions internally for migrations.
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS environment_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  service_area TEXT NOT NULL DEFAULT 'infrastructure',
  environments TEXT NOT NULL DEFAULT '[]',
  secret_type TEXT NOT NULL DEFAULT 'api_token' CHECK(secret_type IN (
    'api_token', 'password', 'oauth_client', 'webhook', 'kv_namespace', 'r2_token', 'misc'
  )),
  sensitivity TEXT NOT NULL DEFAULT 'secret' CHECK(sensitivity IN (
    'public', 'internal', 'secret', 'critical'
  )),
  storage_surface TEXT NOT NULL DEFAULT 'wrangler_secret' CHECK(storage_surface IN (
    'wrangler_secret', 'kv', '.dev.vars', 'r2', 'vectorize', 'email_worker', 'other'
  )),
  storage_reference TEXT,
  owner_team TEXT NOT NULL DEFAULT 'platform',
  point_of_contact TEXT,
  rotation_frequency_days INTEGER NOT NULL DEFAULT 90,
  last_rotated_at DATETIME,
  last_verified_at DATETIME,
  verification_status TEXT NOT NULL DEFAULT 'unknown' CHECK(verification_status IN (
    'verified', 'drifted', 'unknown'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN (
    'active', 'needs_rotation', 'rotating', 'scheduled', 'revoked', 'decommissioned'
  )),
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK(risk_level IN (
    'low', 'medium', 'high', 'critical'
  )),
  tags TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS environment_rotation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  env_item_id INTEGER NOT NULL REFERENCES environment_items(id) ON DELETE CASCADE,
  rotated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  rotated_by TEXT,
  rotation_channel TEXT NOT NULL DEFAULT 'manual',
  rotation_status TEXT NOT NULL DEFAULT 'success' CHECK(rotation_status IN (
    'success', 'partial', 'failed', 'scheduled'
  )),
  ticket_url TEXT,
  summary TEXT,
  storage_reference_snapshot TEXT
);

CREATE INDEX IF NOT EXISTS idx_env_items_status ON environment_items(status);
CREATE INDEX IF NOT EXISTS idx_env_items_owner ON environment_items(owner_team);
CREATE INDEX IF NOT EXISTS idx_env_items_next_rotation ON environment_items(last_rotated_at);
CREATE INDEX IF NOT EXISTS idx_env_rotation_logs_item ON environment_rotation_logs(env_item_id);

DROP VIEW IF EXISTS environment_items_with_health;
CREATE VIEW environment_items_with_health AS
SELECT
  ei.*,
  CASE
    WHEN ei.last_rotated_at IS NOT NULL THEN datetime(ei.last_rotated_at, '+' || ei.rotation_frequency_days || ' days')
    ELSE NULL
  END AS rotation_due_at,
  CASE
    WHEN ei.last_rotated_at IS NULL THEN NULL
    ELSE CAST((julianday(datetime(ei.last_rotated_at, '+' || ei.rotation_frequency_days || ' days')) - julianday('now')) AS INTEGER)
  END AS days_until_due,
  CASE
    WHEN ei.status IN ('revoked', 'decommissioned') THEN 'retired'
    WHEN ei.last_rotated_at IS NULL THEN 'missing'
    WHEN datetime(ei.last_rotated_at, '+' || ei.rotation_frequency_days || ' days') < datetime('now') THEN 'past_due'
    WHEN datetime(ei.last_rotated_at, '+' || ei.rotation_frequency_days || ' days') < datetime('now', '+14 days') THEN 'due_soon'
    ELSE 'healthy'
  END AS rotation_health,
  rl.id AS last_rotation_log_id,
  rl.rotated_at AS last_rotation_logged_at,
  rl.rotation_status AS last_rotation_status,
  rl.summary AS last_rotation_summary,
  rl.ticket_url AS last_rotation_ticket_url
FROM environment_items ei
LEFT JOIN environment_rotation_logs rl
  ON rl.id = (
    SELECT id FROM environment_rotation_logs
    WHERE env_item_id = ei.id
    ORDER BY rotated_at DESC
    LIMIT 1
  );

INSERT OR IGNORE INTO environment_items (
  key_name, display_name, description, service_area, environments,
  secret_type, sensitivity, storage_surface, storage_reference,
  owner_team, point_of_contact, rotation_frequency_days,
  last_rotated_at, last_verified_at, verification_status,
  status, risk_level, tags, notes
) VALUES
  (
    'OPENAI_API_KEY',
    'OpenAI API Key',
    'Primary GPT-4o access for the AI worker and chat widget.',
    'ai-worker',
    json_array('production', 'staging'),
    'api_token',
    'critical',
    'wrangler_secret',
    'ai/rnbwsmk-ai → wrangler secret OPENAI_API_KEY',
    'AI Platform',
    'De Havilland Fox',
    60,
    '2025-12-05T09:15:00Z',
    '2025-12-05T09:20:00Z',
    'verified',
    'active',
    'critical',
    json_array('ai', 'LLM', 'openai'),
    'Rotate immediately if leaked; revoke unused keys in OpenAI dashboard.'
  ),
  (
    'AI_GATEWAY_TOKEN',
    'Cloudflare AI Gateway Token',
    'Routes AI traffic through Cloudflare AI Gateway with rate limiting.',
    'ai-worker',
    json_array('production'),
    'api_token',
    'high',
    'wrangler_secret',
    'ai/rnbwsmk-ai → wrangler secret AI_GATEWAY_TOKEN',
    'AI Platform',
    'De Havilland Fox',
    45,
    '2025-11-18T15:00:00Z',
    '2025-11-19T12:00:00Z',
    'verified',
    'needs_rotation',
    'high',
    json_array('ai', 'gateway', 'cloudflare'),
    'Rotate alongside new AI Gateway rate limit configs.'
  ),
  (
    'NSFW_PASSWORD',
    'NSFW Members Password',
    'Shared secret used to gate NSFW pages for trusted members.',
    'marketing-site',
    json_array('production'),
    'password',
    'high',
    'wrangler_secret',
    'www/com-rainbowsmokeofficial → wrangler secret NSFW_PASSWORD',
    'Web Experience',
    'RainbowSmoke',
    30,
    '2025-11-30T22:00:00Z',
    '2025-12-01T13:45:00Z',
    'verified',
    'scheduled',
    'medium',
    json_array('nsfw', 'auth'),
    'Rotate whenever contact list adds 10+ new approvals or on schedule.'
  ),
  (
    'GITHUB_PAT',
    'GitHub Personal Access Token',
    'Used for private repo automation + Wrangler deployments.',
    'platform-tooling',
    json_array('local', 'ci'),
    'api_token',
    'critical',
    '.dev.vars',
    '.dev.vars → GITHUB_PAT, GitHub developer settings',
    'Platform Ops',
    'RainbowSmoke',
    90,
    '2025-08-15T10:00:00Z',
    '2025-10-01T09:00:00Z',
    'drifted',
    'needs_rotation',
    'critical',
    json_array('github', 'deploy'),
    'Token still scoped broadly; create repo-scoped replacement.'
  ),
  (
    'CLOUDFLARE_R2_TOKEN',
    'R2 API Token',
    'Allows media uploads to the rainbowsmokeofficial-com-media bucket.',
    'marketing-site',
    json_array('production', 'staging'),
    'r2_token',
    'high',
    'wrangler_secret',
    'www/com-rainbowsmokeofficial → wrangler secret CLOUDFLARE_R2_TOKEN',
    'Web Experience',
    'RainbowSmoke',
    120,
    '2025-10-10T18:30:00Z',
    '2025-10-10T18:35:00Z',
    'verified',
    'active',
    'high',
    json_array('r2', 'storage'),
    'Review bucket bindings when rotating to avoid downtime.'
  );

INSERT INTO environment_rotation_logs (
  env_item_id, rotated_at, rotated_by, rotation_channel, rotation_status, ticket_url, summary, storage_reference_snapshot
)
SELECT ei.id, '2025-12-05T09:20:00Z', 'RainbowSmoke', 'manual', 'success', 'https://linear.app/rnbwsmk/issue/SEC-102', 'Key rotated after AI worker redeploy.', 'wrangler secret OPENAI_API_KEY updated 2025-12-05'
FROM environment_items ei
WHERE ei.key_name = 'OPENAI_API_KEY'
  AND NOT EXISTS (
    SELECT 1 FROM environment_rotation_logs erl
    WHERE erl.env_item_id = ei.id
      AND erl.rotated_at = '2025-12-05T09:20:00Z'
  );

INSERT INTO environment_rotation_logs (
  env_item_id, rotated_at, rotated_by, rotation_channel, rotation_status, ticket_url, summary, storage_reference_snapshot
)
SELECT ei.id, '2025-10-04T14:00:00Z', 'RainbowSmoke', 'manual', 'success', NULL, 'Gateway token rotated when moving to AI Gateway Phase 7.', 'wrangler secret AI_GATEWAY_TOKEN updated 2025-10-04'
FROM environment_items ei
WHERE ei.key_name = 'AI_GATEWAY_TOKEN'
  AND NOT EXISTS (
    SELECT 1 FROM environment_rotation_logs erl
    WHERE erl.env_item_id = ei.id
      AND erl.rotated_at = '2025-10-04T14:00:00Z'
  );

INSERT INTO environment_rotation_logs (
  env_item_id, rotated_at, rotated_by, rotation_channel, rotation_status, ticket_url, summary, storage_reference_snapshot
)
SELECT ei.id, '2025-11-30T22:00:00Z', 'RainbowSmoke', 'manual', 'success', NULL, 'NSFW password refreshed for new member invites.', 'wrangler secret NSFW_PASSWORD updated 2025-11-30'
FROM environment_items ei
WHERE ei.key_name = 'NSFW_PASSWORD'
  AND NOT EXISTS (
    SELECT 1 FROM environment_rotation_logs erl
    WHERE erl.env_item_id = ei.id
      AND erl.rotated_at = '2025-11-30T22:00:00Z'
  );

INSERT INTO environment_rotation_logs (
  env_item_id, rotated_at, rotated_by, rotation_channel, rotation_status, ticket_url, summary, storage_reference_snapshot
)
SELECT ei.id, '2025-08-15T10:00:00Z', 'RainbowSmoke', 'manual', 'success', NULL, 'Temporary GitHub PAT created for build agent.', '.dev.vars GITHUB_PAT updated 2025-08-15'
FROM environment_items ei
WHERE ei.key_name = 'GITHUB_PAT'
  AND NOT EXISTS (
    SELECT 1 FROM environment_rotation_logs erl
    WHERE erl.env_item_id = ei.id
      AND erl.rotated_at = '2025-08-15T10:00:00Z'
  );

INSERT INTO environment_rotation_logs (
  env_item_id, rotated_at, rotated_by, rotation_channel, rotation_status, ticket_url, summary, storage_reference_snapshot
)
SELECT ei.id, '2025-10-10T18:35:00Z', 'RainbowSmoke', 'manual', 'success', NULL, 'R2 token rotated before new video uploads.', 'wrangler secret CLOUDFLARE_R2_TOKEN updated 2025-10-10'
FROM environment_items ei
WHERE ei.key_name = 'CLOUDFLARE_R2_TOKEN'
  AND NOT EXISTS (
    SELECT 1 FROM environment_rotation_logs erl
    WHERE erl.env_item_id = ei.id
      AND erl.rotated_at = '2025-10-10T18:35:00Z'
  );
