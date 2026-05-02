# Future Ideas (Parking Lot)

Ideas captured here are intentionally **not yet implemented**. Promote items out of this file (and into a real plan) when scope and design are ready. Keep entries terse — design depth lives in the eventual plan.

---

## Arcade Mode: Recipe Progression

Independent recipe unlocks for Arcade Mode. Same/similar recipe pool as Story Mode, but unlock state is tracked separately so progress in one mode does not leak into the other.

- **Storage:** likely a new `localStorage` key (e.g. `cakery_arcade_unlocks_v1`), separate from `GameSave.recipe_book`. Should NOT live on `GameSave` since arcade has no save.
- **Suggested shape:** `{ [recipeId]: { unlockedAt: ISODate, source: "lootbox" | "criteria" | "starter" } }`
- **Unlock models to consider:**
  - **Lootbox** — randomized recipe gift at end of an arcade run (weighted by rarity, biased toward unowned).
  - **Smash-Bros-style criteria** — explicit unlock conditions (e.g. "score X on Frontier Hard", "complete a run with no missed orders", "use only Paris recipes for a full run").
  - **Hybrid** — lootboxes for common/uncommon recipes, criteria for rare/legendary.
- **Open design questions:**
  - Per-device unlocks vs per-leaderboard-name?
  - Should arcade-unlocked recipes be flagged in the Home recipe book UI as "Arcade earned" so the player knows where they came from?
  - Reveal/celebration UI at end of arcade run.
  - How to share recipe definitions cleanly between modes without coupling unlock state.

## Arcade Mode: Single-Viewport Layout

Optimize Arcade Mode to fit on one screen with no scrolling. Currently identical layout to Story Mode. Deferred until after Story Mode layout changes settle so we don't churn shared components twice.

- Likely scope: Arcade-only wrapper that constrains height, denser `ProductMenu` / `ProblemPanel` variants, possibly a compact `GameHeader`.
- Keep shared components backward-compatible with Story Mode (variant prop, not a fork).

## Apartment Improvement Shop (Content)

The selection screen for "Apartment Market" exists as a stub after the menu rebuild. Fill in actual purchasable content next.

- Reuse the existing unused [`BakeryCustomizer.jsx`](../src/components/game/BakeryCustomizer.jsx) (sign / walls / counter / banner) as the base data model (`bakery_decor` on `GameSave`).
- Decide whether decor purchases drive any gameplay effect (cosmetic only vs e.g. comfort buffs / customer patience).
- Mirror the recipe shop draft pattern (`recipeShopping.js`) with an `apartmentShopping.js` and a draft applied in `GameDay.handleDayComplete`.

## Stylized Travel Transitions

When the player picks Market vs Home (and Recipe vs Apartment within Market), play a short "traveling" sequence so the transition feels like the character actually walks/rides somewhere.

- Frame between phase transitions in `EndDayDebrief`.
- Could reuse village background art with a parallax pass, or a small sprite walk animation.

## Packager Items: Unify with Equipped Recipes

`PACKAGER_ITEMS` / `PACKAGING_CONFIG` in [`src/lib/gameEngine.js`](../src/lib/gameEngine.js) is a third parallel catalog (alongside `PRODUCTS` and `LOCALE_RECIPES`). After the cashier menu unification ships, do the same for the packager role so all three roles share one item taxonomy.

## Recipe Sprite Assets

After menu unification, the cashier `ProductMenu` keys off `recipe.id` (e.g. `paris_eclair`) instead of legacy product ids (e.g. `eclair`). Existing PNGs under `public/sprites/products/` use legacy ids.

- Short term: a recipe-id-to-legacy-sprite map for the four default recipes per locale (handled inside the menu rebuild plan).
- Long term: drop new PNGs as `public/sprites/products/{recipe.id}.png` so the map can be removed.

## Locale-authentic customer portraits (18 × 4 locales)

Today `tile_00…tile_17` come from a **coarse grid** on `Historical characters in vibrant cultures.png`, rotated per village — fine as placeholders, not as final gender/locale reads.

Target:

- **18 archetypes per locale**: 3 elder men, 3 elder women, 3 adult men, 3 adult women, 3 boys, 3 girls — **locale-costumed** (Paris ≠ Montana ≠ Suzhou ≠ London).
- **Data binding**: each PNG maps to `{ portraitIndex, gender, ageBand }`; names come only from matching buckets in `namePools` (already enforced in game logic).

Suggested pipeline:

1. Commission or generate consistent sheets per locale (same body proportions / brush style as sticker reference).
2. Export transparent PNGs named e.g. `public/sprites/customers/paris/elder_male_0.png` … or keep flat tiles + manifest JSON mapping filename → `{ villageKey, portraitIndex }`.
3. Replace `customerPortraitUrls()` rotation hack with explicit URLs per village × index (or keep tiles but separate folders per locale).
4. Optional: light QA tool that previews portrait + rolled name pool bucket so writers catch mismatches before shipping.

Until those assets exist, rely on Sprite Menu overrides + keyed exports under `sprites/source/` from `npm run import-assets`.
