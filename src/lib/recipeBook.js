// ============================================================
// CAKERY BAKERY — Recipe Book System
// All locale recipes with rarity, cost, income multipliers
// ============================================================

import { pickCentsForDifficulty } from "@/lib/gameData";
import { computeRecipeDisplayPrice } from "@/lib/recipePricing";
import { bakedGoodsImageUrl } from "@/lib/bakedGoodsImageUrl";

export const RARITY_CONFIG = {
  common:     { label: "Common",     stars: 1, color: "text-muted-foreground", bg: "bg-muted/60",       multiplier: 1.0  },
  uncommon:   { label: "Uncommon",   stars: 2, color: "text-emerald-600",      bg: "bg-emerald-50",     multiplier: 1.35 },
  specialty:  { label: "Specialty",  stars: 3, color: "text-violet-600",       bg: "bg-violet-50",      multiplier: 2.0  },
  signature:  { label: "Signature",  stars: 4, color: "text-amber-500",        bg: "bg-amber-50",       multiplier: 3.0  },
};

// Spawn weights for gameplay variety
export const RARITY_WEIGHTS = {
  common: 50, uncommon: 30, specialty: 15, signature: 5,
};

// Slot upgrade costs (unlock slot index → price); caps at maxSlots (6 by default)
export const SLOT_UPGRADE_COSTS = { 5: 40, 6: 95 };

/** New story saves start with 4 active slots out of 6 max. Legacy saves omit menu_slots → treat as 6/6. */
export const DEFAULT_MENU_SLOTS = Object.freeze({ maxSlots: 6, unlockedSlots: 4 });

/** Maps recipe_book ids → legacy cashier sprite keys (see bakedGoodsImageUrl.js → sprites/baked_goods/) */
export const LEGACY_PRODUCT_SPRITE_BY_RECIPE_ID = {
  paris_baguette: "baguette",
  paris_croissant: "croissant",
  paris_macaron: "macaron",
  paris_pain_chocolat: "pain_chocolat",
  paris_eclair: "eclair",
  paris_tarte: "tarte",
  paris_mille: "tarte",
  paris_croquembouche: "tarte",
  frontier_sourdough: "sourdough",
  frontier_apple_pie: "apple_pie",
  frontier_cinnamon: "cinnamon_roll",
  frontier_cookie: "cookie",
  frontier_cornbread: "cornbread",
  frontier_pecan_pie: "apple_pie",
  frontier_layer_cake: "apple_pie",
  frontier_wedding: "apple_pie",
  ming_mooncake: "mooncake",
  ming_mantou: "mantou",
  ming_sesame: "sesame_ball",
  ming_red_bean: "red_bean_bun",
  ming_egg_tart: "egg_tart",
  ming_tangyuan: "tangyuan",
  ming_dragon_cake: "mooncake",
  ming_imperial: "mooncake",
  london_scone: "scone",
  london_victoria: "victoria_sponge",
  london_shortbread: "shortbread",
  london_chelsea: "chelsea_bun",
  london_crumpet: "crumpet",
  london_empire_biscuit: "shortbread",
  london_battenberg: "victoria_sponge",
  london_coronation: "victoria_sponge",
};

// ── Default recipes per locale (always available, free, common) ─────────────
const DEFAULT_PARIS = [
  { id: "paris_baguette",   name: "Baguette",         yield: 4,  rarity: "common",  cost: 0, base_price: 1.85, incomeMultiplier: 1.0, emoji: "🥖", ingredients: { flour: "6 cups", water: "2¼ cups", yeast: "2¼ tsp", salt: "2 tsp" }, ingredientsGrams: { flour: 720, water: 530, yeast: 12, salt: 12 } },
  { id: "paris_croissant",  name: "Croissant",         yield: 8,  rarity: "common",  cost: 0, base_price: 2.8,  incomeMultiplier: 1.0, emoji: "🥐", ingredients: { flour: "4¼ cups", butter: "1¼ cups", milk: "½ cup", sugar: "¼ cup", yeast: "1 tsp" }, ingredientsGrams: { flour: 500, butter: 300, milk: 120, sugar: 50, yeast: 10 } },
  { id: "paris_macaron",    name: "Macaron",           yield: 36, rarity: "common",  cost: 0, base_price: 3.75, incomeMultiplier: 1.0, emoji: "🟣", ingredients: { sugar: "1 cup", eggs: "4 eggs", butter: "1 cup", water: "3 tbsp", nuts: "¾ cup" }, ingredientsGrams: { sugar: 200, eggs: 4, butter: 230, water: 45, nuts: 110 } },
  { id: "paris_pain_chocolat", name: "Pain au Chocolat", yield: 8, rarity: "common", cost: 0, base_price: 4.7,  incomeMultiplier: 1.0, emoji: "🍫", ingredients: { flour: "3 cups", butter: "1 cup", milk: "½ cup", chocolate: "½ cup", yeast: "1 tsp", sugar: "2 tbsp" }, ingredientsGrams: { flour: 360, butter: 230, milk: 120, chocolate: 90, yeast: 10, sugar: 25 } },
];

const PURCHASABLE_PARIS = [
  { id: "paris_eclair",     name: "Éclair",            yield: 12, rarity: "uncommon", cost: 25, base_price: 4.5,  incomeMultiplier: 1.35, emoji: "⚡", ingredients: { flour: "1 cup", butter: "½ cup", eggs: "4 eggs", milk: "1 cup", chocolate: "¾ cup" }, ingredientsGrams: { flour: 120, butter: 115, eggs: 4, milk: 240, chocolate: 135 } },
  { id: "paris_tarte",      name: "Tarte Tatin",       yield: 8,  rarity: "uncommon", cost: 30, base_price: 5.2,  incomeMultiplier: 1.35, emoji: "🍰", ingredients: { flour: "2 cups", butter: "1 cup", sugar: "¾ cup", fruit: "2½ cups" }, ingredientsGrams: { flour: 240, butter: 230, sugar: 150, fruit: 375 } },
  { id: "paris_mille",      name: "Mille-feuille",     yield: 6,  rarity: "specialty",cost: 65, base_price: 8.5,  incomeMultiplier: 2.0,  emoji: "🥐", ingredients: { flour: "3 cups", butter: "1½ cups", milk: "2 cups", sugar: "1 cup", eggs: "4 eggs" }, ingredientsGrams: { flour: 360, butter: 345, milk: 480, sugar: 200, eggs: 4 } },
  { id: "paris_croquembouche", name: "Croquembouche",  yield: 20, rarity: "signature",cost: 180, base_price: 18, incomeMultiplier: 3.0,  emoji: "🎂", ingredients: { flour: "2 cups", butter: "1 cup", eggs: "8 eggs", chocolate: "2 cups", sugar: "2 cups" }, ingredientsGrams: { flour: 240, butter: 230, eggs: 8, chocolate: 360, sugar: 400 } },
];

const DEFAULT_FRONTIER = [
  { id: "frontier_sourdough",   name: "Sourdough Loaf",    yield: 2,  rarity: "common", cost: 0, base_price: 3.0, incomeMultiplier: 1.0, emoji: "🍞", ingredients: { flour: "5 cups", water: "1¾ cups", yeast: "1½ tsp", salt: "1½ tsp" }, ingredientsGrams: { flour: 600, water: 420, yeast: 8, salt: 10 } },
  { id: "frontier_apple_pie",   name: "Apple Pie",          yield: 8,  rarity: "common", cost: 0, base_price: 5.0, incomeMultiplier: 1.0, emoji: "🥧", ingredients: { flour: "3 cups", butter: "1 cup", sugar: "1 cup", fruit: "4 cups" }, ingredientsGrams: { flour: 360, butter: 230, sugar: 200, fruit: 600 } },
  { id: "frontier_cinnamon",    name: "Cinnamon Roll",      yield: 12, rarity: "common", cost: 0, base_price: 2.0, incomeMultiplier: 1.0, emoji: "🧁", ingredients: { flour: "4 cups", milk: "1 cup", butter: "½ cup", sugar: "½ cup", eggs: "2 eggs" }, ingredientsGrams: { flour: 480, milk: 240, butter: 115, sugar: 100, eggs: 2 } },
  { id: "frontier_cookie",      name: "Molasses Cookie",    yield: 24, rarity: "common", cost: 0, base_price: 1.0, incomeMultiplier: 1.0, emoji: "🍪", ingredients: { flour: "3 cups", butter: "½ cup", sugar: "1 cup", eggs: "2 eggs", milk: "2 tbsp" }, ingredientsGrams: { flour: 360, butter: 115, sugar: 200, eggs: 2, milk: 30 } },
];

const PURCHASABLE_FRONTIER = [
  { id: "frontier_cornbread",   name: "Skillet Cornbread",  yield: 8,  rarity: "uncommon", cost: 20,  incomeMultiplier: 1.35, emoji: "🌽", ingredients: { flour: "1½ cups", milk: "1 cup", butter: "¼ cup", sugar: "¼ cup", eggs: "2 eggs" } },
  { id: "frontier_pecan_pie",   name: "Pecan Pie",          yield: 8,  rarity: "uncommon", cost: 30,  incomeMultiplier: 1.35, emoji: "🥧", ingredients: { flour: "1½ cups", butter: "½ cup", sugar: "1½ cups", eggs: "3 eggs", nuts: "1½ cups" } },
  { id: "frontier_layer_cake",  name: "Layer Cake",         yield: 12, rarity: "specialty",cost: 60,  incomeMultiplier: 2.0,  emoji: "🎂", ingredients: { flour: "3 cups", butter: "1 cup", sugar: "2 cups", eggs: "4 eggs", milk: "1 cup" } },
  { id: "frontier_wedding",     name: "Wedding Cake",       yield: 24, rarity: "signature",cost: 160, incomeMultiplier: 3.0,  emoji: "💒", ingredients: { flour: "6 cups", butter: "2 cups", sugar: "4 cups", eggs: "8 eggs", milk: "2 cups" } },
];

const DEFAULT_MING = [
  { id: "ming_mooncake",     name: "Mooncake",         yield: 12, rarity: "common", cost: 0, base_price: 3.8, incomeMultiplier: 1.0, emoji: "🥮", ingredients: { flour: "2½ cups", sugar: "1 cup", butter: "½ cup", fruit: "2 cups", eggs: "2 eggs" }, ingredientsGrams: { flour: 300, sugar: 240, butter: 115, fruit: 300, eggs: 2 } },
  { id: "ming_mantou",       name: "Mantou Bun",       yield: 16, rarity: "common", cost: 0, base_price: 1.0, incomeMultiplier: 1.0, emoji: "🫓", ingredients: { flour: "4 cups", water: "1 cup", sugar: "¼ cup", yeast: "1½ tsp" }, ingredientsGrams: { flour: 480, water: 240, sugar: 50, yeast: 8 } },
  { id: "ming_sesame",       name: "Sesame Ball",       yield: 20, rarity: "common", cost: 0, base_price: 1.9, incomeMultiplier: 1.0, emoji: "🟤", ingredients: { flour: "3 cups", sugar: "¾ cup", water: "¾ cup", nuts: "¾ cup" }, ingredientsGrams: { flour: 360, sugar: 160, water: 200, nuts: 110 } },
  { id: "ming_red_bean",     name: "Red Bean Bun",     yield: 16, rarity: "common", cost: 0, base_price: 2.85, incomeMultiplier: 1.0, emoji: "🔴", ingredients: { flour: "4 cups", water: "1 cup", sugar: "¼ cup", fruit: "1½ cups", yeast: "1½ tsp" }, ingredientsGrams: { flour: 480, water: 240, sugar: 50, fruit: 240, yeast: 8 } },
];

const PURCHASABLE_MING = [
  { id: "ming_egg_tart",     name: "Egg Tart",          yield: 12, rarity: "uncommon", cost: 25,  incomeMultiplier: 1.35, emoji: "🥧", ingredients: { flour: "2 cups", butter: "¾ cup", sugar: "½ cup", eggs: "4 eggs", milk: "1 cup" } },
  { id: "ming_tangyuan",     name: "Tangyuan",          yield: 24, rarity: "uncommon", cost: 28,  incomeMultiplier: 1.35, emoji: "🍡", ingredients: { flour: "2 cups", water: "1 cup", sugar: "½ cup", fruit: "1 cup" } },
  { id: "ming_dragon_cake",  name: "Dragon Beard Cake", yield: 16, rarity: "specialty",cost: 70,  incomeMultiplier: 2.0,  emoji: "🎋", ingredients: { flour: "2 cups", sugar: "1½ cups", eggs: "4 eggs", nuts: "1 cup", butter: "½ cup" } },
  { id: "ming_imperial",     name: "Imperial Pastry",   yield: 8,  rarity: "signature",cost: 170, incomeMultiplier: 3.0,  emoji: "👑", ingredients: { flour: "3 cups", sugar: "2 cups", eggs: "6 eggs", butter: "1 cup", chocolate: "1½ cups", nuts: "1 cup" } },
];

const DEFAULT_LONDON = [
  { id: "london_scone",      name: "Scone",             yield: 12, rarity: "common", cost: 0, base_price: 1.9, incomeMultiplier: 1.0, emoji: "🫖", ingredients: { flour: "3 cups", butter: "½ cup", milk: "½ cup", sugar: "¼ cup", eggs: "2 eggs" }, ingredientsGrams: { flour: 360, butter: 115, milk: 120, sugar: 50, eggs: 2 } },
  { id: "london_victoria",   name: "Victoria Sponge",   yield: 8,  rarity: "common", cost: 0, base_price: 4.8, incomeMultiplier: 1.0, emoji: "🎂", ingredients: { flour: "2 cups", butter: "1 cup", sugar: "1 cup", eggs: "4 eggs", milk: "¼ cup" }, ingredientsGrams: { flour: 240, butter: 230, sugar: 200, eggs: 4, milk: 60 } },
  { id: "london_shortbread", name: "Shortbread",        yield: 24, rarity: "common", cost: 0, base_price: 2.9, incomeMultiplier: 1.0, emoji: "🍪", ingredients: { flour: "2½ cups", butter: "1 cup", sugar: "½ cup" }, ingredientsGrams: { flour: 300, butter: 230, sugar: 100 } },
  { id: "london_empire_biscuit", name: "Empire Biscuit", yield: 20, rarity: "common", cost: 0, base_price: 1.0, incomeMultiplier: 1.0, emoji: "🍪", ingredients: { flour: "2½ cups", butter: "¾ cup", sugar: "½ cup", fruit: "¼ cup" }, ingredientsGrams: { flour: 300, butter: 175, sugar: 100, fruit: 60 } },
];

const PURCHASABLE_LONDON = [
  { id: "london_chelsea",    name: "Chelsea Bun",       yield: 12, rarity: "uncommon", cost: 22,  incomeMultiplier: 1.35, emoji: "🧁", ingredients: { flour: "3 cups", milk: "1 cup", butter: "¼ cup", sugar: "½ cup", eggs: "2 eggs" } },
  { id: "london_crumpet",    name: "Crumpet Stack",     yield: 16, rarity: "uncommon", cost: 28,  incomeMultiplier: 1.35, emoji: "🥞", ingredients: { flour: "2 cups", milk: "1½ cups", water: "¼ cup", yeast: "1 tsp", sugar: "1 tsp" } },
  { id: "london_battenberg", name: "Battenberg Cake",   yield: 8,  rarity: "specialty",cost: 65,  incomeMultiplier: 2.0,  emoji: "🎂", ingredients: { flour: "2 cups", butter: "1 cup", sugar: "1 cup", eggs: "4 eggs", nuts: "½ cup" } },
  { id: "london_coronation", name: "Coronation Cake",   yield: 12, rarity: "signature",cost: 175, incomeMultiplier: 3.0,  emoji: "👑", ingredients: { flour: "3 cups", butter: "1½ cups", sugar: "2 cups", eggs: "6 eggs", chocolate: "1 cup", nuts: "¾ cup" } },
];

// ── Master lookup ─────────────────────────────────────────────────────────────
export const LOCALE_RECIPES = {
  paris:       { default: DEFAULT_PARIS,    purchasable: PURCHASABLE_PARIS },
  frontier_us: { default: DEFAULT_FRONTIER, purchasable: PURCHASABLE_FRONTIER },
  ming_china:  { default: DEFAULT_MING,     purchasable: PURCHASABLE_MING },
  london:      { default: DEFAULT_LONDON,   purchasable: PURCHASABLE_LONDON },
};

// ── Helpers ─────────────────────────────────────────────────────────────────--

/** Persisted menu slot config. Saves created before menu_slots existed behave as 6/6 unlocked. */
export function getMenuSlotConfig(gameSave) {
  const ms = gameSave?.menu_slots;
  if (!ms || typeof ms.unlockedSlots !== "number" || typeof ms.maxSlots !== "number") {
    return { maxSlots: 6, unlockedSlots: 6 };
  }
  const maxSlots = Math.min(99, Math.max(1, ms.maxSlots));
  const unlockedSlots = Math.min(maxSlots, Math.max(1, ms.unlockedSlots));
  return { maxSlots, unlockedSlots };
}

/** Cashier-facing catalog rows derived from equipped recipes (Story Mode). */
export function getMenuProducts(gameSave, difficulty) {
  const equipped = getEquippedRecipes(gameSave);
  const villageKey = gameSave.village;
  return equipped.map((r) => {
    const baseDisplay = computeRecipeDisplayPrice(r, { villageKey });
    const price = pickCentsForDifficulty(baseDisplay, difficulty);
    const legacy = LEGACY_PRODUCT_SPRITE_BY_RECIPE_ID[r.id];
    const spriteKey = legacy || r.id;
    return {
      id: r.id,
      name: r.name,
      emoji: r.emoji || "🧁",
      basePrice: baseDisplay,
      price,
      image: bakedGoodsImageUrl(spriteKey),
    };
  });
}

/** Seed fields for a newly created story bakery (tutorial-aware). */
export function getStoryNewSaveRecipeFields(localeKey, tutorialComplete) {
  const defaults = getDefaultRecipeIds(localeKey);
  const starter = defaults.slice(0, 4);
  return {
    menu_slots: { ...DEFAULT_MENU_SLOTS },
    equipped_recipe_ids: [...starter],
    recipe_book: tutorialComplete
      ? { [localeKey]: buildUnlockedBookEntry(localeKey) }
      : {},
  };
}

/** Get all recipes (default + owned purchasable) for a save's locale */
export function getOwnedRecipes(gameSave) {
  const locale = gameSave.village;
  const data = LOCALE_RECIPES[locale];
  if (!data) return [];

  const localeBook = gameSave.recipe_book?.[locale] || {};
  const ownedIds = new Set(localeBook.ownedRecipeIds || []);
  const purchasable = data.purchasable.filter((r) => ownedIds.has(r.id));
  return [...data.default, ...purchasable];
}

/** Get all purchasable recipes (not yet owned) */
export function getPurchasableRecipes(gameSave) {
  const locale = gameSave.village;
  const data = LOCALE_RECIPES[locale];
  if (!data) return [];
  const ownedIds = new Set((gameSave.recipe_book?.[locale]?.ownedRecipeIds) || []);
  return data.purchasable.filter((r) => !ownedIds.has(r.id));
}

/** Get currently equipped recipes (or default to first N owned where N = unlocked slots) */
export function getEquippedRecipes(gameSave) {
  const owned = getOwnedRecipes(gameSave);
  const equippedIds = gameSave.equipped_recipe_ids || [];
  const { unlockedSlots: slots } = getMenuSlotConfig(gameSave);

  if (equippedIds.length > 0) {
    const found = equippedIds.map((id) => owned.find((r) => r.id === id)).filter(Boolean);
    if (found.length > 0) return found.slice(0, slots);
  }
  return owned.slice(0, slots);
}

/** True if the recipe book is unlocked for this save's locale */
export function isRecipeBookUnlocked(gameSave) {
  return !!(gameSave.tutorial_complete || gameSave.recipe_book?.[gameSave.village]?.unlocked);
}

/** Get default recipe ids for a locale */
export function getDefaultRecipeIds(locale) {
  return (LOCALE_RECIPES[locale]?.default || []).map((r) => r.id);
}

/** Build the initial recipe_book entry for a locale after tutorial complete */
export function buildUnlockedBookEntry(locale) {
  return {
    unlocked: true,
    tutorialComplete: true,
    ownedRecipeIds: getDefaultRecipeIds(locale),
  };
}

/** Pick a recipe weighted by rarity for gameplay */
export function pickWeightedRecipe(recipes) {
  if (!recipes || recipes.length === 0) return null;
  const totalWeight = recipes.reduce((s, r) => s + (RARITY_WEIGHTS[r.rarity] || 10), 0);
  let rand = Math.random() * totalWeight;
  for (const r of recipes) {
    rand -= RARITY_WEIGHTS[r.rarity] || 10;
    if (rand <= 0) return r;
  }
  return recipes[0];
}