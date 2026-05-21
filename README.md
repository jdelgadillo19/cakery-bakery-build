# Cakery Bakery

React + Vite bakery math game. **Offline-first:** story saves and the arcade leaderboard persist in the browser via `localStorage` ([`src/lib/localEntities.js`](src/lib/localEntities.js)). No hosted vendor backend is required.

## Prerequisites

- Node.js 18+ (20+ recommended)

## Local development

```bash
npm install   # regenerates package-lock.json on a fresh clone
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Supabase profiles and tiers

This app can run fully local (no Supabase), but profile-backed free/paid gating uses Supabase Auth + a `profiles` table.

1. Copy `.env.example` to `.env.local`
2. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project
3. Enable Supabase Auth providers:
   - Google
   - Email/Password
4. Create a `profiles` table keyed by auth user id with tier, display name, and email columns

Profile rows include:
- `tier: "beef" | "guac"` (legacy `free` / `paid` normalized on read)
- `display_name`, `email`, `created_at`, `updated_at`

### Manual paid flag (first rollout)

- In dev, open the existing debug panel and use the profile tier buttons to set Beef or Guac.
- This writes directly to the current user’s Supabase profile row.
- Feature gating then follows that tier sitewide using the existing feature registry.

## Build

```bash
npm run build
npm run preview   # optional: serve production build locally
```

## Project notes

- Optional JSON **field reference** schemas: [`schemas/entities/`](schemas/entities/) (not loaded at runtime).
- Architecture overview: [`CODEBASE_GUIDE.md`](CODEBASE_GUIDE.md).
- Release notes and update history: [`CHANGELOG.md`](CHANGELOG.md).

## Sprite tooling (offline)

Character/customer **extraction**, **pixel cleanup**, **duplicate audits**, **locale organization**, and **bad-cut QA** live outside this repo in **`../Sprite Cleanup Tools/`** (see `README.md` there). Run those scripts with `--repo` pointing at this game directory, or set `CAKERY_SPRITE_REPO`.

Other asset helpers remain under **`scripts/`** (for example `process_baked_goods_sheet.py`, `import-sticker-assets.mjs`). Customer portraits use **static URLs** in the app.

## Lint / types

```bash
npm run lint
npm run typecheck
```
