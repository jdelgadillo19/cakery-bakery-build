# Cakery Bakery Codebase Guide

## What This Project Is

Cakery Bakery is a React + Vite web game with **offline-first** persistence (`localStorage` on the device—no hosted backend).

- Core gameplay theme: run a bakery and solve math challenges.
- Main game modes:
  - Arcade mode (single run, leaderboard score)
  - Story mode (save progression across days/weeks)

---

## Tech Stack

- Frontend: React 18, Vite
- Routing: `react-router-dom`
- Data fetching/caching: `@tanstack/react-query`
- Persistence: `src/lib/localEntities.js` (`GameSave`, `LeaderboardEntry` in `localStorage`)
- UI primitives: Radix + custom UI components in `src/components/ui`
- Animation: `framer-motion`
- Styling: Tailwind CSS

---

## Top-Level Layout

- `src/main.jsx`  
  App bootstrap (renders `<App />`).

- `src/App.jsx`  
  App shell and providers:
  - `BuildConfigProvider`
  - `AuthProvider`
  - `QueryClientProvider`
  - Router + routes

- `src/pages/`  
  Route-level screens (Home, GameDay, ArcadePlay, Leaderboard, etc.).

- `src/components/game/`  
  Gameplay UI pieces (header, problem panels, menus, debrief screens, overlays).

- `src/lib/`  
  Core game/business logic (engines, recipes, leaderboard, build config, timers, audio).

- `src/hooks/`  
  Reusable hooks (day timer, mobile detection, sprite registry).

---

## App Routing Map

Defined in `src/App.jsx`:

- `/` -> `src/pages/Home.jsx`
- `/story` -> `src/pages/StorySaveSelect.jsx` — five save slots, PIN lock, duplicate/delete, **Create new bakery**
- `/story/new` -> `src/pages/StoryNewGame.jsx` — names → locale → tutorial → review → `GameSave.create` + slot assignment → redirects to `/play`
- `/story/resume` -> `src/pages/StoryWelcome.jsx` — welcome back summary → `/play?id=…`
- `/new-game` -> redirects to `/story` (legacy bookmark compatibility; implementation lives in `StoryNewGame`, not `NewGame.jsx`)
- `/play` -> `src/pages/GameDay.jsx`
- `/weekly-summary` -> `src/pages/WeeklySummary.jsx`
- `/leaderboard` -> `src/pages/Leaderboard.jsx`
- `/arcade-setup` -> `src/pages/ArcadeSetup.jsx`
- `/arcade` -> `src/pages/ArcadePlay.jsx`

### Story-only helper module

- [`src/lib/storySlots.js`](src/lib/storySlots.js) — fixed five-slot assignments (`localStorage` key `cakery_story_slots_v1`), migrate-from-saves on first run, PIN hash helpers, `assignSaveToSlot` / `removeSaveFromStorySlots`.

### Story vs Arcade leaderboard & stats

- Arcade runs use `LeaderboardEntry` / `recordRun` only for saves that are **not** Story mode (`game_mode === "story"` is skipped).
- Story saves accumulate `story_stats_v1` on each `GameSave` (lifetime earnings + per-day bests). The Leaderboard page **Story** tab reads these aggregates from listed saves.

### Sprite assets under `public/sprites/`

Ship PNGs/WebP here (optional — the UI falls back to emoji or SVG placeholders if files are missing):

- **Customer portraits (runtime):** `public/sprites/sprite_organizer/<villageKey>/<male|female>/character_*.png` — filenames indexed in [`src/data/spriteOrganizerPortraitIndex.json`](src/data/spriteOrganizerPortraitIndex.json) (regenerate with `npm run build-sprite-index`). [`pickHonorificForLocale`](src/lib/customerHonorifics.js) fixes **gender** per locale; [`pickName`](src/lib/spriteConfig.js) uses the same gender + **age band** from that honorific. Each order picks a **random** PNG in the matching village + gender folder via [`pickPortraitCatalogEntry`](src/lib/customerPortraitInventory.js). [`CUSTOMER_PORTRAITS`](src/lib/gameData.js) uses [`buildCatalogPortraitStrip`](src/lib/customerPortraitInventory.js) for Sprite Menu (deterministic per slot).
- **Locale backdrops:** `public/sprites/scenes/<villageKey>.webp` — village `bgImage` in [`src/lib/gameData.js`](src/lib/gameData.js) via [`publicUrl`](src/lib/publicUrl.js).
- **Baker / owner:** `public/sprites/owner/<villageKey>.png` per locale from **`Head Bakers-Photoroom.png`** (`public/sprites/source/`): run [`Sprite Cleanup Tools/tools/extract_head_bakers_sheet.py`](../Sprite%20Cleanup%20Tools/tools/extract_head_bakers_sheet.py) (4-column strip **Paris \| London \| Ming China \| Frontier US** left→right). Extraction keeps only the **largest opaque connected component** (removes floating islands and stray caption pixels), crops with padding, then **centers** the sprite on a transparent square canvas. Re-run **`--refine-owner-dir-only`** if you hand-edit PNGs. Copies Paris into `npc/owner_baker_neutral.png` & `owner_baker_carrying.png` until carrying-specific art ships ([`getOwnerPortraitUrl`](src/lib/localAssets.js)).
- **Cashier products:** `public/sprites/baked_goods/{file}.png` — [`src/lib/bakedGoodsImageUrl.js`](src/lib/bakedGoodsImageUrl.js) + [`src/lib/gameData.js`](src/lib/gameData.js) / [`src/lib/recipeBook.js`](src/lib/recipeBook.js).
- **Source-only (not loaded by the game):** `public/sprites/source/` — keyed sheets and intermediates from [`scripts/import-sticker-assets.mjs`](scripts/import-sticker-assets.mjs) for offline promotion into the folders above.

**No runtime sprite processing:** the game loads static URLs only. If you need background removal or cleanup, do it in your asset pipeline before committing PNGs. **QA:** `../Sprite Cleanup Tools/audits/report_border_line_sprites.py` scores **straight silhouette segments** with separate **vertical vs horizontal** σ thresholds (including **soft** LR and **top-only loose** bands gated on color), merges gaps, ignores the bottom **26%** of rows for left/right (legs), and adds **color confidence**. It writes `_border_line_audit.json` / `_border_line_audit_report.md` next to the sprites (**gitignored** during pipeline churn). Optional **`--enforce-straight-cut-contract`** applies CI checks only after you repopulate calibrated ID sets at the top of that script.

### Story difficulty & end-of-day recipe shop

- New Story bakeries persist baseline `difficulty: "beginner"`; gameplay timers and generators use [`getEffectiveDifficulty`](src/lib/storyDifficulty.js) from equipped recipe rarity and unlocked menu slots.
- After the paycheck step in [`EndDayDebrief`](src/components/game/EndDayDebrief.jsx), Story saves with an unlocked recipe book get a **Recipe Shop** phase; purchases update a draft applied in [`handleDayComplete`](src/pages/GameDay.jsx) (`recipeShopping.js` helpers).

### Legacy page (no route)

- `src/pages/NewGame.jsx` — older linear setup flow; **not mounted** in `App.jsx`. Story entry uses `/story` → `StoryNewGame` instead.

---

## Core Screens and Responsibilities

### `src/pages/Home.jsx`

Main menu and mode entry point:

- Shows Arcade vs Story mode cards
- **Story Mode** navigates to `/story`
- Loads recent saves (`GameSave.list`)
- Opens debug/sprite/recipe modals
- Starts menu BGM and handles lightweight navigation UX

### `src/pages/StorySaveSelect.jsx`

Story Mode hub after the main menu:

- Five slots mapped to `GameSave.id` values via `storySlots.js`
- Empty slot or **Create new bakery** → `/story/new` (with optional replace flow when all slots are full)
- **Continue** / unlock PIN → `/story/resume?id=…` (PIN-verified navigations pass `storyUnlockVerified` state so Welcome Back does not re-prompt)

### `src/pages/StoryNewGame.jsx`

New story save pipeline only (Arcade is unaffected):

- Collects names, locale and difficulty each with an explicit **Accept**, tutorial choice, then editable **review** screen
- Creates save with `game_mode: "story"` and tutorial/week branching aligned with `GameDay`
- Assigns the new save to the chosen slot and navigates to `/play?id=…`

### `src/pages/StoryWelcome.jsx`

Resume garnish screen:

- Shows week/day, savings, and a short “what’s next” teaser before `/play`

### `src/pages/GameDay.jsx` (Story Mode Runtime)

State-machine style day lifecycle:

- `preDay` -> role selection / prep
- `activeDay` -> timer running, problems ongoing
- `lastCall` -> timer ended, finish current transaction
- `dayComplete` -> debrief + persistence
- `freeRunEnd` (when relevant to free-session flow)

Handles:

- Problem generation by role (cashier/packager/baker)
- Attempt handling, streaks, earnings, scoring
- Save progression updates through local `GameSave` persistence
- Unlock hooks and leaderboard recording

For phased story-mode design goals, checklists, and notes imported from the ChatGPT project, see [`docs/STORY_MODE_DEVELOPMENT_STEPS.md`](docs/STORY_MODE_DEVELOPMENT_STEPS.md). Prefer aligning behavior and copy with that doc when changing progression or saves.

### `src/pages/ArcadePlay.jsx` (Arcade Runtime)

Isolated single-run session (no story save mutation):

- Builds an in-memory arcade session from URL params
- Runs timer-driven cashier gameplay
- Computes arcade breakdown/final score
- Writes only run results/unlocks (leaderboard + difficulty unlock tracking)

---

## Gameplay Logic (Where Rules Live)

### `src/lib/gameEngine.js`

- Problem generation functions (cashier/packager flows)
- Day-state helpers and shared constants (`DAYS_PER_WORKING_WEEK`, etc.)

### `src/lib/economyEngine.js`

- Earnings and score calculations
- Day summary construction
- Difficulty multiplier and final score behavior

### `src/lib/timerEngine.js`

- Difficulty-based day duration and timing-related configuration

### `src/lib/gameData.js`

- Static/config-like game content:
  - villages
  - difficulty config
  - products
  - portraits and related content maps

### `src/lib/recipeData.js` + `src/lib/recipeBook.js`

- Recipe conversion by difficulty
- Baker role recipe-driven question generation
- Owned/equipped/purchasable recipe logic

### `src/lib/leaderboard.js`

- Recording and querying run results for ranking displays

---

## Data Layer (local)

### Module

- [`src/lib/localEntities.js`](src/lib/localEntities.js) — `GameSave` and `LeaderboardEntry` APIs mirroring the old SDK shape (`list`, `filter`, `create`, `update`, `delete`).

### Keys

- Story saves: `cakery_bakery_v1_game_saves`
- Story slot index (five UUIDs or nulls): `cakery_story_slots_v1` — see `src/lib/storySlots.js`
- Leaderboard rows: `cakery_bakery_v1_leaderboard_entries`

### Reference schemas

Optional JSON schemas under [`schemas/entities/`](schemas/entities/) describe save/leaderboard fields; they are **not** loaded at runtime (`localEntities` is authoritative).

React Query wraps `GameSave` / `LeaderboardEntry` calls for caching and invalidation. Story UI also uses query key `["storySlots"]` alongside `["gameSaves"]` when slots change.

---

## UI Layers

### Game Components (`src/components/game`)

Domain-specific components:

- HUD and top controls (`GameHeader`, `GameMenu`)
- Problem/order presentation (`ProblemPanel`, `CustomerOrder`, `ProductMenu`)
- Phase/end screens (`EndDayDebrief`, `ArcadeEndScreen`, `ArcadeTallyScreen`)
- Diagnostics (`DebugOverlay`, `DebugPanel`)
- Audio helper (`AudioManager`)

### Generic UI Components (`src/components/ui`)

Reusable UI primitives (buttons, dialogs, popovers, form controls, etc.) used across pages.

---

## Cross-Cutting Systems

### Auth and Access

- `src/lib/AuthContext.jsx`
- `src/components/ProtectedRoute.jsx`
- `src/components/UserNotRegisteredError.jsx`

`src/App.jsx` gates app rendering based on auth/public settings load state.

### Build/Feature Flags

- `src/lib/BuildConfigContext.jsx`
- `src/lib/buildConfig.js`
- Optional debug controls in `BuildConfigDebug`

Used to unlock/limit features (for example role availability in free vs full behavior).

### Audio

- `src/lib/audio.js`
- `AudioManager` component and page-level music/sfx triggers

### Customer portraits & sprite metadata

- [`src/lib/spriteConfig.js`](src/lib/spriteConfig.js) — per-slot gender/age bands, editable name pools (Sprite Menu / localStorage).
- [`src/lib/customerHonorifics.js`](src/lib/customerHonorifics.js) — locale honorific pools used when the portrait catalog is enabled.
- [`src/lib/customerPortraitInventory.js`](src/lib/customerPortraitInventory.js) — reads `spriteOrganizerPortraitIndex.json`, picks portraits from `sprite_organizer/<village>/<gender>/` (random at order time).

Static URLs only at runtime; preprocessing lives under `scripts/`.

---

## Typical Runtime Flows

### Story Flow

1. From Home, user opens `/story` and picks a slot (**Continue**), starts **Create new bakery** (`/story/new`), or manages a slot (duplicate, lock, delete).
2. New saves: setup completes on `StoryNewGame`, then `/play?id=…`. Returning saves: `/story/resume?id=…`, then **Continue** → `/play`.
3. `GameDay` fetches save + initializes resources (products/recipes/timer/audio).
4. Player selects role and solves generated problems.
5. Day transitions through lifecycle phases.
6. Debrief and persistence update save + optional leaderboard/unlock systems.

### Arcade Flow

1. Setup screen passes URL params (village/difficulty/player).
2. `ArcadePlay` creates in-memory session and starts timed run.
3. Score breakdown is computed at end.
4. Run result is recorded to leaderboard.

---

## Quick Start (Local)

1. Install deps:
   - `npm install`
2. Run:
   - `npm run dev`

Reference: `README.md`

---

## Where To Edit For Common Tasks

- Add a new route/page:
  - create in `src/pages/`
  - wire route in `src/App.jsx`

- Change scoring/economy:
  - `src/lib/economyEngine.js`

- Change generated math problems:
  - `src/lib/gameEngine.js`
  - `src/lib/recipeData.js` (baker-specific)

- Change save behavior/progression:
  - `src/pages/GameDay.jsx`
  - Story entry/slots: `src/pages/StorySaveSelect.jsx`, `StoryNewGame.jsx`, `StoryWelcome.jsx`, `src/lib/storySlots.js`
  - [`src/lib/localEntities.js`](src/lib/localEntities.js) (persisted JSON shape)

- Change leaderboard logic:
  - `src/lib/leaderboard.js`
  - `src/pages/Leaderboard.jsx`

- Adjust feature access/free-full behavior:
  - `src/lib/buildConfig.js`
  - `src/lib/freeSessionState.js`

- Customer portraits / locale extracts:
  - Generation (outside repo): `../Sprite Cleanup Tools/tools/process_character_sheet.py`, `../Sprite Cleanup Tools/tools/audit_and_organize_customers.py`, `../Sprite Cleanup Tools/tools/customer_locale_config.json`
  - Bad-cut report: `../Sprite Cleanup Tools/audits/report_border_line_sprites.py` → `_border_line_audit_report.md` (alongside sprites; gitignored by default)
  - Runtime: [`src/lib/gameData.js`](src/lib/gameData.js) (`generateCustomerOrder`), [`src/lib/customerPortraitInventory.js`](src/lib/customerPortraitInventory.js)

