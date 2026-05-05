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

## Firebase profiles and tiers

This app can run fully local (no Firebase), but profile-backed free/paid gating uses Firebase Auth + Firestore.

1. Copy `.env.example` to `.env.local`
2. Fill in `VITE_FIREBASE_*` values from your Firebase project
3. Enable Firebase Auth providers:
   - Google
   - Email/Password
4. Create a Firestore database and allow user profile docs under `users/{uid}`

User profile docs include:
- `tier: "free" | "paid"`
- `displayName`, `email`, `createdAt`, `updatedAt`

### Manual paid flag (first rollout)

- In dev, open the existing debug panel and use the profile tier buttons to set `Free` or `Paid`.
- This writes directly to the current user’s Firestore profile.
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
