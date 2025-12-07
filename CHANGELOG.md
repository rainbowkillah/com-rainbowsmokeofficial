# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and follows semantic versioning where applicable.  

---

## [Unreleased]

### Added
- `/admin/env-hub` dashboard with stats, filters, edit form, rotation logging, and activity feed.
- Admin-only API endpoints for Env Hub inventory (`/api/admin/env/items`, `/api/admin/env/summary`, `/api/admin/env/items/:id/rotation`, etc.).
- D1 schema additions: `environment_items`, `environment_rotation_logs`, and the `environment_items_with_health` view with seed data + a standalone migration (`scripts/migrations/2025-12-06-env-hub.sql`).
- Seed/import script (`scripts/migrations/2025-12-06-env-hub-import-notion.sql`) generated from the Notion Markdown/CSV export so the hub starts with the Cloudflare IDs already documented elsewhere.
- Documentation for Env Hub usage + rotation workflow (`docs/ENV-HUB.md`).

## [1.0.0] - 2025-12-02

### Added  
- -

### Changed  
- —  

### Fixed  
- —  

### Removed  
- —  
