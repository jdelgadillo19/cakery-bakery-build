// ============================================================
// CAKERY BAKERY — Free Build Persistent Unlock State
// Unlocks persist to localStorage so they survive page reloads.
// Only relevant when BUILD_VERSION === "free".
// ============================================================

const LS_KEY = "cb_free_unlocks";

/** Load persisted unlock data from localStorage. */
function loadUnlocks() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Persist unlock data to localStorage. */
function saveUnlocks(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

// ── In-memory cache (hydrated from localStorage on first import) ──────────────
const _unlocks = loadUnlocks();

// Always ensure paris is in the unlocked locales set
if (!_unlocks.locales) _unlocks.locales = ["paris"];
if (!_unlocks.locales.includes("paris")) _unlocks.locales.push("paris");

/**
 * Returns true if the locale is accessible in the free build.
 * Paris is always true. Frontier US persists after Day 5 completion.
 */
export function isLocalePlayableInFree(localeKey) {
  if (localeKey === "paris") return true;
  return Array.isArray(_unlocks.locales) && _unlocks.locales.includes(localeKey);
}

/**
 * Returns true if Hard difficulty has been permanently unlocked.
 */
export function isHardDifficultyUnlocked() {
  return !!_unlocks.hardDifficulty;
}

/**
 * Returns true if Day 5 has ever been completed (persists across sessions).
 */
export function hasDay5EverCompleted() {
  return !!_unlocks.day5Completed;
}

/**
 * Permanently unlock a locale (written to localStorage).
 * @param {string} localeKey
 */
export function persistUnlockLocale(localeKey) {
  if (!Array.isArray(_unlocks.locales)) _unlocks.locales = ["paris"];
  if (!_unlocks.locales.includes(localeKey)) {
    _unlocks.locales.push(localeKey);
    saveUnlocks(_unlocks);
  }
}

/**
 * Fire the unified Day 5 unlock event — permanently unlocks Frontier US + Hard difficulty.
 * Safe to call multiple times; returns true only the very first time it fires.
 * @returns {boolean} true if this is the first time (show the modal)
 */
export function triggerDay5Unlock() {
  const isFirstTime = !_unlocks.day5Completed;
  _unlocks.day5Completed = true;
  _unlocks.hardDifficulty = true;
  persistUnlockLocale("frontier_us");
  saveUnlocks(_unlocks);
  return isFirstTime;
}

/**
 * Returns all currently unlocked locale keys.
 */
export function getUnlockedLocales() {
  return Array.isArray(_unlocks.locales) ? [..._unlocks.locales] : ["paris"];
}