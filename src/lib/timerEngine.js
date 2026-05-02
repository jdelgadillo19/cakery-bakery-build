// ============================================================
// CAKERY BAKERY — Timer Engine
// Defines day duration constants. No scoring/difficulty logic.
// ============================================================

// Day duration in seconds per difficulty
export const DAY_DURATION_SECONDS = {
  beginner: 120,
  easy: 120,
  medium: 120,
  hard: 120,
  expert: 120,
};

/** Returns day duration in seconds for the given difficulty. */
export function getDayDuration(difficulty) {
  return DAY_DURATION_SECONDS[difficulty] || DAY_DURATION_SECONDS.easy;
}