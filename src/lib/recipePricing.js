// ============================================================
// Recipe customer-facing price — base_price + modifiers → display
// Gameplay should use display price only (not raw base_price).
// ============================================================

const RARITY_DISPLAY_MULT = {
  common: 1,
  uncommon: 1.12,
  specialty: 1.28,
  signature: 1.45,
};

const LOCALE_DISPLAY_MULT = {
  paris: 1.06,
  frontier_us: 1,
  ming_china: 1.05,
  london: 1.04,
};

/**
 * @param {object} recipe — row from recipeBook (expects optional base_price)
 * @param {{ villageKey?: string }} [context]
 */
export function computeRecipeDisplayPrice(recipe, context = {}) {
  if (!recipe) return 0;
  const locale = context.villageKey || context.locale || "paris";
  const base = Number(recipe.base_price ?? fallbackBaseFromRecipe(recipe));
  const rarityMult = RARITY_DISPLAY_MULT[recipe.rarity] ?? 1;
  const locMult = LOCALE_DISPLAY_MULT[locale] ?? 1;
  return Math.round(base * rarityMult * locMult * 100) / 100;
}

function fallbackBaseFromRecipe(recipe) {
  if (recipe.cost != null && recipe.cost > 0) return Math.max(1.5, recipe.cost * 0.25);
  return 3;
}
