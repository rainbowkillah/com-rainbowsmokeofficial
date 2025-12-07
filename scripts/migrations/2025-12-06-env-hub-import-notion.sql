-- Import Environment Hub records from Notion export (downloaded 2025-12-06)
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS tmp_env_upsert;
CREATE TEMP TABLE tmp_env_upsert (
  key_name TEXT PRIMARY KEY,
  display_name TEXT,
  description TEXT,
  service_area TEXT,
  environments TEXT,
  secret_type TEXT,
  sensitivity TEXT,
  storage_surface TEXT,
  storage_reference TEXT,
  owner_team TEXT,
  point_of_contact TEXT,
  rotation_frequency_days INTEGER,
  last_rotated_at TEXT,
  last_verified_at TEXT,
  verification_status TEXT,
  status TEXT,
  risk_level TEXT,
  tags TEXT,
  notes TEXT
);

INSERT INTO tmp_env_upsert VALUES
  (
    'CLOUDFLARE_ACCOUNT_ID',
    'Cloudflare Account ID',
    'cf account for Mr. RainbowSmoke LLC',
    'platform-tooling',
    json_array('all-environments'),
    'misc',
    'internal',
    'other',
    'Reference: wrangler vars + README',
    'Platform Ops',
    'RainbowSmoke',
    365,
    NULL,
    '2025-12-06T00:00:00Z',
    'verified',
    'active',
    'medium',
    json_array('notion-export', 'env_var', 'cloudflare'),
    'Public ID from Notion export. Value: 7fde695caf9cc41efca391316eb71003'
  ),
  (
    'CLOUDFLARE_IMAGES_ACCOUNT_ID',
    'Cloudflare Images Account ID',
    'Account ID used for Workers Images + media uploads.',
    'marketing-site',
    json_array('production', 'staging'),
    'misc',
    'internal',
    'other',
    'Reference: wrangler vars + Notion export',
    'Web Experience',
    'RainbowSmoke',
    365,
    NULL,
    '2025-12-06T00:00:00Z',
    'verified',
    'active',
    'medium',
    json_array('notion-export', 'env_var', 'cloudflare'),
    'Public ID from Notion export. Value: 7fde695caf9cc41efca391316eb71003'
  ),
  (
    'CLOUDFLARE_ZONE_ID_MRRNBWSMOKE',
    'Cloudflare Zone ID (mrrainbowsmoke.com)',
    'Zone identifier for mrrainbowsmoke.com routing.',
    'com-mrrainbowsmoke',
    json_array('production'),
    'misc',
    'internal',
    'other',
    'Reference: wrangler vars + dashboard',
    'Web Experience',
    'RainbowSmoke',
    365,
    NULL,
    '2025-12-06T00:00:00Z',
    'verified',
    'active',
    'low',
    json_array('notion-export', 'env_var', 'cloudflare'),
    'Original Notion key duplicated; this entry captures the mrrainbowsmoke.com zone. Value: fc658a5841a38a9489deb99e3fc7c611'
  ),
  (
    'CLOUDFLARE_ZONE_ID_RAINBOWSMOKEOFFICIAL',
    'Cloudflare Zone ID (rainbowsmokeofficial.com)',
    'Zone identifier for rainbowsmokeofficial.com routing.',
    'com-rainbowsmokeofficial',
    json_array('production'),
    'misc',
    'internal',
    'other',
    'Reference: wrangler vars + dashboard',
    'Web Experience',
    'RainbowSmoke',
    365,
    NULL,
    '2025-12-06T00:00:00Z',
    'verified',
    'active',
    'low',
    json_array('notion-export', 'env_var', 'cloudflare'),
    'Original Notion key duplicated; this entry captures the rainbowsmokeofficial.com zone. Value: 08799f5ad74531bce78685c902d164ef'
  ),
  (
    'CLOUDFLARE_IMAGES_ACCOUNT_HASH',
    'Cloudflare Images Account Hash',
    'Secret hash required for Workers Images + delivery URLs.',
    'marketing-site',
    json_array('production'),
    'api_token',
    'critical',
    'wrangler_secret',
    'wrangler secret CLOUDFLARE_IMAGES_ACCOUNT_HASH',
    'Web Experience',
    'RainbowSmoke',
    90,
    NULL,
    '2025-12-06T00:00:00Z',
    'unknown',
    'needs_rotation',
    'high',
    json_array('notion-export', 'secret', 'cloudflare'),
    'Imported metadata only. Secret value redacted; rotate and store via wrangler secret.'
  );

INSERT INTO environment_items (
  key_name,
  display_name,
  description,
  service_area,
  environments,
  secret_type,
  sensitivity,
  storage_surface,
  storage_reference,
  owner_team,
  point_of_contact,
  rotation_frequency_days,
  last_rotated_at,
  last_verified_at,
  verification_status,
  status,
  risk_level,
  tags,
  notes
)
SELECT *
FROM tmp_env_upsert
WHERE NOT EXISTS (
  SELECT 1 FROM environment_items ei WHERE ei.key_name = tmp_env_upsert.key_name
);

UPDATE environment_items
SET
  display_name = (SELECT display_name FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  description = (SELECT description FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  service_area = (SELECT service_area FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  environments = (SELECT environments FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  secret_type = (SELECT secret_type FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  sensitivity = (SELECT sensitivity FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  storage_surface = (SELECT storage_surface FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  storage_reference = (SELECT storage_reference FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  owner_team = (SELECT owner_team FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  point_of_contact = (SELECT point_of_contact FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  rotation_frequency_days = (SELECT rotation_frequency_days FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  last_rotated_at = (SELECT last_rotated_at FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  last_verified_at = (SELECT last_verified_at FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  verification_status = (SELECT verification_status FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  status = (SELECT status FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  risk_level = (SELECT risk_level FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  tags = (SELECT tags FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  notes = (SELECT notes FROM tmp_env_upsert WHERE tmp_env_upsert.key_name = environment_items.key_name),
  updated_at = CASE
    WHEN key_name IN (SELECT key_name FROM tmp_env_upsert) THEN CURRENT_TIMESTAMP
    ELSE updated_at
  END
WHERE key_name IN (SELECT key_name FROM tmp_env_upsert);

DROP TABLE tmp_env_upsert;
