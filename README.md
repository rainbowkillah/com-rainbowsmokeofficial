# RainbowSmoke Official Website

Official website for Mr. RainbowSmoke - DC native, Systems Engineer, gamer, vlogger, LGBTQ+ content creator.

## 🌈 About

This is a bold, rainbow-themed personal brand website built on Cloudflare Workers (Free Tier) featuring:

- **7 Pages**: Home, About, Gallery, Contact, Terms/Privacy, NSFW Members, Admin Dashboard
- **Bold Rainbow Theme**: Vibrant gradients with Adobe Fonts integration
- **Mixed Media Gallery**: Images + YouTube/Twitch/TikTok embeds with lightbox
- **Contact Form**: D1 database storage + email notifications
- **Password Protection**: NSFW members area + admin dashboard
- **Responsive Design**: Mobile-first with accessibility features

## 🚀 Tech Stack

- **Platform**: Cloudflare Workers (Edge Computing)
- **Framework**: Hono (Lightweight web framework)
- **Storage**: Workers KV (sessions) + D1 Database (contacts, gallery)
- **Email**: Cloudflare Email Workers
- **Static Assets**: Workers Static Assets binding
- **Fonts**: Adobe Fonts (Typekit)

## 📁 Project Structure

```
com-rainbowsmokeofficial/
├── src/
│   └── index.js              # Main worker entry point
├── public/                    # Static assets
│   ├── css/                  # Stylesheets (rainbow theme)
│   ├── js/                   # Client-side JavaScript
│   ├── images/               # Images and hero banners
│   └── icons/social/         # Social media icons
├── scripts/
│   ├── seed-db.sql           # D1 database schema
│   ├── create-kv.sh          # Create KV namespaces
│   ├── create-d1.sh          # Create D1 database
│   └── deploy.sh             # Deployment helper
├── docs/
│   ├── DEPLOYMENT-SUMMARY.md # Recent deploy notes
│   └── D1-MIGRATION-2025-12-05.md # D1 upgrade runbook
├── wrangler.jsonc            # Cloudflare Workers config
└── package.json              # Dependencies
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+ and npm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with Workers enabled

### Installation

```bash
# Clone or navigate to project directory
cd /home/dfox/projects/www/com-rainbowsmokeofficial

# Install dependencies
npm install

# Create KV namespaces (already done)
npm run kv:create

# Create D1 database (already done)
npm run d1:create

# Run database migration (already done)
npm run d1:migrate

# Set secrets
wrangler secret put NSFW_PASSWORD
wrangler secret put ADMIN_PASSWORD
wrangler secret put SESSION_SECRET

# Start development server
npm run dev
```

## 🔧 Configuration

### KV Namespaces

- **AUTH_KV**: `ca1f11867da141fbacdd9f05b844ab53`
- **SESSIONS_KV**: `21514fdd1c6b45d696cd0cfb98c1c4cb`

### D1 Database

- **Name**: `rainbowsmoke-db`
- **ID**: `415b01fb-4509-4bc2-95b2-e02b53aecca1`

#### Migrations

- `npm run d1:migrate` – recreates the local database using `scripts/seed-db.sql` (drops/rebuilds contacts, sessions, gallery tables, plus helper views).
- Production/remote upgrade: apply `scripts/migrations/2025-12-05-upgrade-contacts.sql` once to promote the legacy `name/subject` schema to the new multi-field schema:

```bash
# local dry run
npx wrangler d1 execute rainbowsmoke-db --file=./scripts/migrations/2025-12-05-upgrade-contacts.sql

# production (requires valid API token)
npx wrangler d1 execute rainbowsmoke-db \
  --remote \
  --file=./scripts/migrations/2025-12-05-upgrade-contacts.sql
```

> **Note:** The migration keeps existing rows by splitting the legacy `name` field into first/last names and moves the old `subject` field into `admin_notes`. Take a snapshot/backup before running against production.

### Environment Variables

Set in `wrangler.jsonc`:
- `SITE_NAME`: RainbowSmoke Official
- `SITE_DOMAIN`: rainbowsmokeofficial.com
- `ADMIN_EMAIL`: 64zgd764sm@privaterelay.appleid.com

### Secrets

Set via `wrangler secret put`:
- `NSFW_PASSWORD`: Password for NSFW members area
- `ADMIN_PASSWORD`: Password for admin dashboard
- `SESSION_SECRET`: For signing session cookies

## 📝 Development

```bash
# Start local development server
npm run dev

# Access at http://localhost:8787

# View logs
npm run tail

# Deploy to production
npm run deploy
```

## 🌐 Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Configure custom domain in Cloudflare Dashboard:
# Workers & Pages → rainbowsmokeofficial-com → Settings → Domains & Routes
```

## 📄 Pages

1. **Home** (`/`) - Hero with rainbow gradient, intro, featured content
2. **About** (`/about`) - Bio, interests, profile photo
3. **Gallery** (`/gallery`) - Mixed media with lightbox
4. **Contact** (`/contact`) - Form with email + D1 storage
5. **Terms/Privacy** (`/terms`, `/privacy`) - Legal pages
6. **NSFW Members** (`/nsfw`) - Password-protected adult content links
7. **Admin Dashboard** (`/admin/dashboard`) - Manage contact submissions

## 🔐 Environment Hub (`/admin/env-hub`)

An internal-only dashboard that mirrors the Notion "Environment Config Hub" in a D1 database so rotations live inside Cloudflare Workers.

- **Inventory**: `/api/admin/env/items` exposes everything recorded in the `environment_items` table with derived health states (healthy, due soon, past due). Filters cover status, risk, storage, and service area.
- **Rotation logging**: `/api/admin/env/items/:id/rotation` appends to `environment_rotation_logs` and automatically updates the parent record's `last_rotated_at`, status, and verification state.
- **Activity + history**: `/api/admin/env/rotations/recent` feeds the sidebar while `/api/admin/env/items/:id/rotations` powers the per-record history list.

### Database tables

The Env Hub lives inside the existing `rainbowsmoke-db` D1 instance:

| Table/View | Purpose |
|------------|---------|
| `environment_items` | Canonical metadata for each variable/secret (key name, storage surface, owner, cadence, risk, etc.). |
| `environment_rotation_logs` | Append-only log capturing who rotated what, when, and via which channel. |
| `environment_items_with_health` | View adding derived fields (`rotation_due_at`, `rotation_health`, last rotation log). |

### Migrating existing databases

1. **Local** – `npm run d1:migrate` drops/recreates everything from `scripts/seed-db.sql` (contacts + Env Hub).
2. **Remote upgrade** – run `npx wrangler d1 execute rainbowsmoke-db --remote --file=./scripts/migrations/2025-12-06-env-hub.sql` after taking a snapshot.

See [`docs/ENV-HUB.md`](../../docs/ENV-HUB.md) for workflow details, rotation-playbook, and backlog items.

## 🔐 Authentication

- **NSFW Area**: Password-protected with 24-hour session
- **Admin Dashboard**: Separate admin password with 1-hour session
- **Sessions**: Stored in Workers KV with HttpOnly cookies

## 🎨 Design

- **Rainbow Colors**: 7-color gradient (#FF0000 → #9400D3)
- **Demi-Boy Theme**: Secondary palette (#7F7F7F, #C4C4C4, #FFFFFF, #9AD9EB)
- **Adobe Fonts**: Backstroke (headers), Le Havre Rounded (body), Sketchnote Text (playful)
- **Responsive**: Mobile-first design with breakpoints

## 📊 Free Tier Limits

| Resource | Limit | Status |
|----------|-------|--------|
| Requests | 100,000/day | ✅ |
| KV Reads | 100,000/day | ✅ |
| KV Writes | 1,000/day | ✅ |
| D1 Rows Read | 5M/day | ✅ |
| D1 Rows Written | 100k/day | ✅ |
| Email | 100/day | ✅ |

## 🔗 Social Media

- **TikTok**: [@rainbowsmoke_us](https://tiktok.com/@rainbowsmoke_us)
- **Twitch**: [rainbowsmoke_us](https://twitch.tv/rainbowsmoke_us)
- **YouTube**: [UC-a69hBxIpH-Stm6NDEYYiA](https://www.youtube.com/channel/UC-a69hBxIpH-Stm6NDEYYiA)
- **Twitter/X**: [@RainbowKillah](https://x.com/RainbowKillah)
- **GitHub**: [rainbowkillah](https://github.com/rainbowkillah)
- **LinkedIn**: [dehavillandfox](https://www.linkedin.com/in/dehavillandfox)

## 📜 License

UNLICENSED - Private project for Mr. RainbowSmoke LLC

## 👤 Author

**Mr. RainbowSmoke**
- Company: Mr. RainbowSmoke LLC / Fox Technologies LLC
- Location: Washington, D.C.
- Role: Systems Engineer

---

**Built with 🌈 by Mr. RainbowSmoke**
