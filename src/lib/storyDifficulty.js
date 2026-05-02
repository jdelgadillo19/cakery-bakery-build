// ============================================================
// Story Mode — derive gameplay difficulty from menu progression
// Arcade saves use persisted difficulty unchanged.
// ============================================================

import { RARITY_CONFIG, getEquippedRecipes, getMenuSlotConfig } from "@/lib/recipeBook";

const ORDER = ["beginner", "easy", "medium", "hard", "expert"];

/**
 * Effective difficulty key for timers / problem generation / scoring.
 */
export function getEffectiveDifficulty(gameSave) {
  if (!gameSave || gameSave.game_mode !== "story") {
    return gameSave?.difficulty || "beginner";
  }

  const recipes = getEquippedRecipes(gameSave);
  let maxStars = 1;
  for (const r of recipes) {
    const stars = RARITY_CONFIG[r.rarity]?.stars ?? 1;
    maxStars = Math.max(maxStars, stars);
  }
  const { unlockedSlots } = getMenuSlotConfig(gameSave);
  const slotBoost = Math.max(0, unlockedSlots - 4);
  const tierIndex = Math.min(
    ORDER.length - 1,
    Math.max(0, maxStars - 1 + Math.floor(slotBoost / 2)),
  );
  return ORDER[tierIndex];
}
