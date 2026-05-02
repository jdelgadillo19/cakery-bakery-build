// ============================================================
// CAKERY BAKERY — Local Name Registry + Profile Persistence
//
// Stores player names and per-profile stats in localStorage ONLY.
// Names are device-local — never synced globally.
//
// Storage format:
//   cakery_player_names  → ["Name1", "Name2", ...]   (ordered MRU first)
//   cakery_active_player → "Name1"
//   cakery_profiles      → { "Name1": { scores: {}, stats: {} }, ... }
// ============================================================

const STORAGE_KEY   = "cakery_player_names";
const ACTIVE_KEY    = "cakery_active_player";
const PROFILES_KEY  = "cakery_profiles";

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || "{}"); }
  catch { return {}; }
}

function saveProfiles(profiles) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); }
  catch {}
}

// ── Name list ─────────────────────────────────────────────────────────────────

/**
 * Get all names stored on this device, ordered by most-recently-used first.
 * @returns {string[]}
 */
export function getLocalNames() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Add a new name (or bump it to the front if it already exists).
 * If new, creates an empty profile immediately.
 * @param {string} name
 */
export function addLocalName(name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  // Bump name to front of list
  const existing = getLocalNames().filter((n) => n !== trimmed);
  const updated = [trimmed, ...existing].slice(0, 20); // cap at 20 names
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  setActivePlayerName(trimmed);

  // Create profile if it doesn't exist yet
  const profiles = loadProfiles();
  if (!profiles[trimmed]) {
    profiles[trimmed] = { scores: {}, stats: {} };
    saveProfiles(profiles);
  }
}

/**
 * Remove a name from the local registry (and its profile).
 * @param {string} name
 */
export function removeLocalName(name) {
  const updated = getLocalNames().filter((n) => n !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  if (getActivePlayerName() === name) {
    localStorage.removeItem(ACTIVE_KEY);
  }
  // Remove profile
  const profiles = loadProfiles();
  delete profiles[name];
  saveProfiles(profiles);
}

// ── Active player ─────────────────────────────────────────────────────────────

/**
 * Set the currently active player name (persisted between sessions).
 * @param {string} name
 */
export function setActivePlayerName(name) {
  localStorage.setItem(ACTIVE_KEY, name.trim());
}

/**
 * Get the currently active player name.
 * Falls back to the first stored name, or null.
 * @returns {string|null}
 */
export function getActivePlayerName() {
  try {
    const active = localStorage.getItem(ACTIVE_KEY);
    if (active) return active;
    const names = getLocalNames();
    return names.length > 0 ? names[0] : null;
  } catch {
    return null;
  }
}

// ── Profile data ──────────────────────────────────────────────────────────────

/**
 * Get profile data for a specific player name.
 * Returns { scores: {}, stats: {} } if not found.
 * @param {string} name
 * @returns {{ scores: object, stats: object }}
 */
export function getProfile(name) {
  const profiles = loadProfiles();
  return profiles[name] || { scores: {}, stats: {} };
}

/**
 * Update (merge) profile data for a player.
 * @param {string} name
 * @param {{ scores?: object, stats?: object }} updates
 */
export function updateProfile(name, updates) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const profiles = loadProfiles();
  const existing = profiles[trimmed] || { scores: {}, stats: {} };
  profiles[trimmed] = {
    scores: { ...existing.scores, ...(updates.scores || {}) },
    stats:  { ...existing.stats,  ...(updates.stats  || {}) },
  };
  saveProfiles(profiles);
}

/**
 * Get all profiles as a map.
 * @returns {object}
 */
export function getAllProfiles() {
  return loadProfiles();
}