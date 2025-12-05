# D1 Migration – December 5, 2025

This runbook finishes the production D1 upgrade so the contact form schema matches the fields used in `src/index.js` (first/last name, NSFW flags, approval timestamps, etc.).

## Files

- `scripts/seed-db.sql` – rebuilt to create the new schema for any fresh environments.
- `scripts/migrations/2025-12-05-upgrade-contacts.sql` – in-place migration that preserves existing rows while adding the new columns and helper views.

## Prerequisites

1. Install Wrangler ≥ 4.53.0 (older builds choke on `.command` helpers and compatibility dates).
2. Ensure you have a Cloudflare API token with **D1:Edit** access on account `7fde695caf9cc41efca391316eb71003`.
3. (Optional) Export the current contacts table for backup:

```bash
npx wrangler d1 execute rainbowsmoke-db --remote \
  --command "SELECT * FROM contacts" > backups/contacts-before-2025-12-05.json
```

## Commands

```bash
# 1) Dry run locally against the dev DB
npx wrangler d1 execute rainbowsmoke-db \
  --file=./scripts/migrations/2025-12-05-upgrade-contacts.sql

# 2) Apply to production
npx wrangler d1 execute rainbowsmoke-db \
  --remote \
  --file=./scripts/migrations/2025-12-05-upgrade-contacts.sql
```

The migration performs these steps inside a transaction:

1. Drops helper views (`nsfw_access_requests`, `pending_approvals`).
2. Renames the old `contacts` table → `contacts_legacy`.
3. Creates the new schema.
4. Copies legacy data forward while:
   - splitting the single `name` column into `first_name`/`last_name`,
   - carrying `subject` into `admin_notes`,
   - defaulting new JSON/text fields.
5. Rebuilds indexes + helper views, then drops `contacts_legacy`.

## Verification

```bash
# Confirm columns exist
npx wrangler d1 execute rainbowsmoke-db --remote \
  --command "PRAGMA table_info('contacts');"

# Sanity-check the data survived
npx wrangler d1 execute rainbowsmoke-db --remote \
  --command "SELECT id, first_name, last_name, email, status FROM contacts LIMIT 5;"

# Views return rows
npx wrangler d1 execute rainbowsmoke-db --remote \
  --command "SELECT COUNT(*) AS pending FROM pending_approvals;"
```

## Rollback Plan

If something fails mid-flight:

1. The transaction automatically rolls back if the script errors before `COMMIT`.
2. If `contacts_legacy` still exists, you can restore it manually:
   ```sql
   DROP TABLE IF EXISTS contacts;
   ALTER TABLE contacts_legacy RENAME TO contacts;
   ```
3. Re-import the backup taken earlier if necessary.

## Notes

- The script is intentionally idempotent **only once**. Re-running it after a successful migration will fail because `ALTER TABLE contacts RENAME TO contacts_legacy;` no longer has the original structure. Keep the file for audit/history but do not reapply it to an already migrated database.
- Consider following up by wiring a formal migrations runner (e.g., `./scripts/migrate-d1.sh`) so future schema changes are versioned instead of ad-hoc.
