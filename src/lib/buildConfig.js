// ============================================================
// CAKERY BAKERY — Build Configuration System
// Central feature-flag registry for "free" vs "full" builds.
// ============================================================
//
// USAGE:
//   import { BUILD_VERSION, isFeatureUnlocked, FEATURES } from "@/lib/buildConfig";
//
//   if (isFeatureUnlocked("recipeBook"))   { ... }
//   if (isFeatureUnlocked("multiVillage")) { ... }
//
// ADDING A NEW FEATURE:
//   1. Add a key to FEATURE_REGISTRY with the minimum tier required.
//   2. Reference it via isFeatureUnlocked("yourFeatureKey").
//
// ADDING A NEW TIER (e.g. "comingSoon"):
//   1. Add the tier name to BUILD_TIERS.
//   2. Adjust TIER_RANK so the new tier sits in the right position.
//   3. FEATURE_REGISTRY entries can now use "comingSoon" as their minTier.
//   No other code needs to change.
// ============================================================

import { isAllContentUnlocked, isPaidContentUnlocked } from "@/lib/debugOverrides";

/** All valid build tiers, ordered from most-restricted to most-permissive. */
export const BUILD_TIERS = /** @type {const} */ (["free", "full"]);

/**
 * Numeric rank for each tier.
 * Higher rank = more permissive.
 * To add a tier such as "comingSoon", insert it at the appropriate position
 * and assign a rank that reflects where it falls relative to "free" and "full".
 *
 * Example with a future "pro" tier between full and something hypothetical:
 *   free: 0, full: 10, pro: 20
 */
const TIER_RANK = {
  free: 0,
  full: 10,
  // comingSoon: 5,  ← example of where a future tier would slot in
};

// ── Active build version ──────────────────────────────────────────────────────
// Change this single value to switch the entire build between modes.
// "free"  → only features with minTier "free" are unlocked.
// "full"  → all features are unlocked.
/** @type {"free"|"full"} */
export const BUILD_VERSION = "free";
/** @type {"free"|"full"} */
let runtimeBuildTier = BUILD_VERSION;
const runtimeTierListeners = new Set();

// ── Feature Registry ──────────────────────────────────────────────────────────
// Each entry defines:
//   minTier     — the minimum build tier required to access this feature.
//   description — plain-English explanation (used for debugging & docs).
//
// Add every gatable feature here. Features with minTier "free" are always on.
export const FEATURE_REGISTRY = {
  // ── Core gameplay (always on) ────────────────────────────────────────────
  tutorialMode:       { minTier: "free", description: "Tutorial days 1–3 cashier/packager/baker flow" },
  cashierRole:        { minTier: "free", description: "Cashier (calculate total + make change)" },
  basicAudio:         { minTier: "free", description: "Procedural SFX and background music" },
  weeklySummary:      { minTier: "free", description: "End-of-week earnings summary screen" },
  debugPanel:         { minTier: "free", description: "Developer debug overlay and panel" },
  difficultyEasy:     { minTier: "free", description: "Easy difficulty mode" },
  difficultyMedium:   { minTier: "free", description: "Medium difficulty mode — available immediately in free build" },
  saveContinue:       { minTier: "free", description: "Save game and continue from home screen" },
  // Locale gating — Paris always free; frontier_us session-unlockable (see freeSessionState)
  localeParis:        { minTier: "free", description: "Paris village always playable" },
  localeFrontierUs:   { minTier: "free", description: "Frontier US — session-unlockable after Day 5" },
  // Week cap — free build limited to 1 week (5 days)
  freeWeekCap:        { minTier: "free", description: "Enforces max 1 week in free build" },

  // ── Full-build features ──────────────────────────────────────────────────
  packagerRole:       { minTier: "full", description: "Packager (division problems)" },
  bakerRole:          { minTier: "full", description: "Baker (recipe scaling)" },
  recipeBook:         { minTier: "full", description: "Recipe book modal with purchase + equip system" },
  recipeSlotUpgrades: { minTier: "full", description: "Menu slot unlocking via coins" },
  multiVillage:       { minTier: "full", description: "Ming China and London villages" },
  difficultyHard:     { minTier: "full", description: "Hard difficulty mode with coupons/loyalty" },
  couponSystem:       { minTier: "full", description: "Coupon discounts on hard mode customer orders" },
  spriteProcessing:   { minTier: "full", description: "One-time sprite pipeline for custom portraits" },
  audioManager:       { minTier: "full", description: "User-facing music/SFX toggle controls" },
  weeklyChart:        { minTier: "full", description: "Bar chart of daily earnings in weekly summary" },
  managerOverview:    { minTier: "full", description: "Pre-day role-selection manager overview screen" },
  streakTracking:     { minTier: "full", description: "Streak counter and best-streak persistence" },
  multipleWeeks:      { minTier: "full", description: "Unlimited weekly progression beyond week 1" },
  // comingSoon examples (uncomment + adjust minTier when ready):
  // achievementBadges: { minTier: "comingSoon", description: "Badge system for milestones" },
  // leaderboard:       { minTier: "comingSoon", description: "Global leaderboard" },
};

// ── Core helper ───────────────────────────────────────────────────────────────

/**
 * Returns true if the given featureKey is accessible under the current BUILD_VERSION.
 *
 * @param {keyof typeof FEATURE_REGISTRY} featureKey
 * @returns {boolean}
 *
 * @example
 *   isFeatureUnlocked("recipeBook")   // false in "free", true in "full"
 *   isFeatureUnlocked("cashierRole")  // true in both
 */
export function isFeatureUnlocked(featureKey) {
  const feature = FEATURE_REGISTRY[featureKey];
  if (!feature) {
    // Unknown feature keys are treated as locked to surface typos early.
    console.warn(`[buildConfig] Unknown feature key: "${featureKey}". Check FEATURE_REGISTRY.`);
    return false;
  }

  // Debug panel "Unlock Everything" / paid toggle bypasses tier restrictions so QA can test full gameplay on free builds.
  try {
    if (isAllContentUnlocked() || isPaidContentUnlocked()) return true;
  } catch {
    /* SSR / tests without localStorage */
  }

  const currentRank = TIER_RANK[runtimeBuildTier] ?? 0;
  const requiredRank = TIER_RANK[feature.minTier] ?? Infinity;
  return currentRank >= requiredRank;
}

/**
 * Runtime tier override used by backend profile entitlements.
 * Accepts "free" or "full".
 * @param {"free"|"full"} tier
 */
export function setRuntimeBuildTier(tier) {
  const next = BUILD_TIERS.includes(tier) ? tier : BUILD_VERSION;
  if (runtimeBuildTier === next) return;
  runtimeBuildTier = next;
  for (const listener of runtimeTierListeners) {
    try {
      listener(runtimeBuildTier);
    } catch (e) {}
  }
}

/**
 * @returns {"free"|"full"}
 */
export function getRuntimeBuildTier() {
  return runtimeBuildTier;
}

/**
 * @param {(tier:"free"|"full") => void} listener
 * @returns {() => void}
 */
export function subscribeRuntimeBuildTier(listener) {
  runtimeTierListeners.add(listener);
  return () => runtimeTierListeners.delete(listener);
}


/**
 * Returns a snapshot of all features and their unlock status under the current build.
 * Useful for debugging or rendering a "feature matrix" in admin panels.
 *
 * @returns {Record<string, { unlocked: boolean, minTier: string, description: string }>}
 */
export function getFeatureMatrix() {
  return Object.fromEntries(
    Object.entries(FEATURE_REGISTRY).map(([key, cfg]) => [
      key,
      { unlocked: isFeatureUnlocked(key), minTier: cfg.minTier, description: cfg.description },
    ])
  );
}

/**
 * Returns only the feature keys that are currently unlocked.
 * @returns {string[]}
 */
export function getUnlockedFeatures() {
  return Object.keys(FEATURE_REGISTRY).filter(isFeatureUnlocked);
}

/**
 * Returns only the feature keys that are currently locked.
 * @returns {string[]}
 */
export function getLockedFeatures() {
  return Object.keys(FEATURE_REGISTRY).filter((k) => !isFeatureUnlocked(k));
}