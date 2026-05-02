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
