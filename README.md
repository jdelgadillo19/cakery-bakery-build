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

## Build

```bash
npm run build
npm run preview   # optional: serve production build locally
```

## Project notes

- Optional JSON **field reference** schemas: [`schemas/entities/`](schemas/entities/) (not loaded at runtime).
- Architecture overview: [`CODEBASE_GUIDE.md`](CODEBASE_GUIDE.md).

## Lint / types

```bash
npm run lint
npm run typecheck
```
