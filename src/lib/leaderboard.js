// ============================================================
// CAKERY BAKERY — Leaderboard (device-local storage via localEntities)
//
// Rules:
//   - Each run creates EXACTLY ONE entry (dedup guard prevents double-writes)
//   - Personal best computed client-side from all entries for a given name
//   - No story progression or unlock logic here
// ============================================================

import { LeaderboardEntry } from "@/lib/localEntities";

// In-flight guard: tracks run fingerprints currently being written
// to prevent duplicate DB calls from React strict-mode double-invocations
const _inFlight = new Set();

function makeFingerprint({ playerName, score, difficulty, customersServed }) {
  // Stable key for a single run — score + difficulty + customers served is sufficient
  return `${playerName}|${score}|${difficulty}|${customersServed}|${Date.now().toString(36).slice(0, -2)}`;
}

/**
 * Record a new run entry in the global leaderboard.
 * Always creates a NEW record — never overwrites.
 * Has an in-flight dedup guard to prevent React double-invoke duplicates.
 */
export async function recordRun({
  playerName,
  bakeryName = "",
  score,
  difficulty,
  accuracyPct = 0,
  customersServed = 0,
  village = "",
  tipsEarned = 0,
  correctTransactions = 0,
}) {
  const fp = makeFingerprint({ playerName, score, difficulty, customersServed });
  if (_inFlight.has(fp)) return null; // duplicate call — skip
  _inFlight.add(fp);
  try {
    const entry = await LeaderboardEntry.create({
      player_name: playerName,
      bakery_name: bakeryName,
      score: Math.round(score * 100) / 100,
      difficulty,
      accuracy_pct: Math.round(accuracyPct),
      customers_served: customersServed,
      village,
      tips_earned: Math.round(tipsEarned * 100) / 100,
      correct_transactions: correctTransactions,
    });
    return entry;
  } finally {
    // Release after a short window so legitimate replays (Play Again) are allowed
    setTimeout(() => _inFlight.delete(fp), 3000);
  }
}

/**
 * Fetch all leaderboard entries sorted by score descending.
 */
export async function fetchLeaderboard(limit = 200) {
  return LeaderboardEntry.list("-score", limit);
}

/**
 * Fetch all entries for a specific player name.
 */
export async function fetchPlayerEntries(playerName) {
  return LeaderboardEntry.filter({ player_name: playerName }, "-score", 50);
}

/**
 * Delete a single leaderboard entry by id.
 */
export async function deleteEntry(id) {
  return LeaderboardEntry.delete(id);
}

/**
 * Clear ALL leaderboard entries.
 * Does NOT affect progression or unlock state.
 */
export async function clearAllEntries() {
  const all = await LeaderboardEntry.list("-score", 500);
  await Promise.all(all.map((e) => LeaderboardEntry.delete(e.id)));
}

/**
 * Get the personal best entry (highest score) from an array of entries.
 * Returns null if empty.
 */
export function getPersonalBest(entries) {
  if (!entries || entries.length === 0) return null;
  return entries.reduce((best, e) => (e.score > best.score ? e : best), entries[0]);
}

/**
 * Get the top N entries from an array (already sorted desc by score).
 */
export function getTopN(entries, n = 3) {
  return [...entries].sort((a, b) => b.score - a.score).slice(0, n);
}

// ── Legacy shims — kept so existing callers don't break ──────────────────────
export function recordScore() { return { isNewTop: false, previous: null, current: 0 }; }
export function getTopScore() { return null; }
export function clearLeaderboard() {}