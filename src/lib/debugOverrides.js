// ============================================================
// CAKERY BAKERY — Debug Overrides (localStorage-based)
//
// Three independent toggles, each fully reversible:
//
//   PAID_UNLOCK      — unlocks Hard, Expert, and future paid difficulties
//   PROGRESSION      — unlocks Easy, Medium (bypasses run-count / score gates)
//   ALL_CONTENT      — master override: bypasses ALL paywalls globally
//                      (all locales, story mode, all difficulties;
//                       buildConfig.isFeatureUnlocked also treats this + PAID as full-tier unlock)
//
// Turning any toggle off restores normal gating immediately.
// Normal state is never permanently modified.
// ============================================================

const LS_KEY = "cb_debug_overrides";

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}

function save(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
  catch {}
}

// ── Getters ───────────────────────────────────────────────────────────────────

/** Master override — bypasses ALL paywalls and progression gates. */
export function isAllContentUnlocked() {
  return load().overrideAllContent === true;
}

/** Returns true if "Unlock All Paid Content" debug toggle is ON. */
export function isPaidContentUnlocked() {
  return isAllContentUnlocked() || load().paidUnlock === true;
}

/** Returns true if "Unlock All Progression Content" debug toggle is ON. */
export function isProgressionUnlocked() {
  return isAllContentUnlocked() || load().progressionUnlock === true;
}

/** Returns true if all locale paywalls are bypassed. */
export function isAllLocalesUnlocked() {
  return isAllContentUnlocked();
}

// ── Setters ───────────────────────────────────────────────────────────────────

/** Enable or disable the master "unlock everything" override. */
export function setAllContentUnlock(enabled) {
  const data = load();
  data.overrideAllContent = !!enabled;
  save(data);
}

/** Enable or disable the paid content unlock override. */
export function setPaidContentUnlock(enabled) {
  const data = load();
  data.paidUnlock = !!enabled;
  save(data);
}

/** Enable or disable the progression unlock override. */
export function setProgressionUnlock(enabled) {
  const data = load();
  data.progressionUnlock = !!enabled;
  save(data);
}

/** Clear all debug overrides at once. */
export function clearAllDebugOverrides() {
  localStorage.removeItem(LS_KEY);
}