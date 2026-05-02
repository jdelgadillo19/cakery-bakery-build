// ============================================================
// CAKERY BAKERY — Difficulty Unlock Logic
// Completely separate from freeSessionState and leaderboard.
// Easy   → unlocked after first completed run
// Medium → unlocked after reaching score threshold
// Hard   → paywalled (or debug override)
// Expert → paywalled (or debug override)
//
// Debug overrides (from lib/debugOverrides) layer on top —
// turning them off instantly restores normal progression.
// ============================================================

import { isPaidContentUnlocked, isProgressionUnlocked } from "@/lib/debugOverrides";

const LS_KEY = "cb_difficulty_unlocks";

const MEDIUM_UNLOCK_SCORE = 20; // Score threshold to unlock Medium

function load() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Record a completed run — updates unlock progression.
 * Call this after EVERY run (including quits).
 * @param {number} score
 */
export function recordRunForUnlocks(score) {
  const data = load();
  data.runsCompleted = (data.runsCompleted || 0) + 1;
  data.highScore = Math.max(data.highScore || 0, score);
  save(data);
}

/**
 * Returns the number of completed runs.
 */
export function getRunsCompleted() {
  return load().runsCompleted || 0;
}

/**
 * Returns the all-time high score across all difficulties.
 */
export function getAllTimeHighScore() {
  return load().highScore || 0;
}

/**
 * Returns true if Easy is unlocked (after first run, or debug override).
 */
export function isEasyUnlocked() {
  if (isProgressionUnlocked()) return true;
  return getRunsCompleted() >= 1;
}

/**
 * Returns true if Medium is unlocked (score threshold reached, or debug override).
 */
export function isMediumUnlocked() {
  if (isProgressionUnlocked()) return true;
  return getAllTimeHighScore() >= MEDIUM_UNLOCK_SCORE;
}

/**
 * Returns true if Hard difficulty is accessible (paid override only).
 */
export function isHardUnlocked() {
  return isPaidContentUnlocked();
}

/**
 * Returns true if Expert difficulty is accessible (paid override only).
 */
export function isExpertUnlocked() {
  return isPaidContentUnlocked();
}

/**
 * Returns true if Frontier US is unlocked.
 * Unlocked after reaching Medium score threshold (same as Medium unlock),
 * OR via progression debug override.
 */
export function isFrontierUnlocked() {
  if (isProgressionUnlocked()) return true;
  return getAllTimeHighScore() >= MEDIUM_UNLOCK_SCORE;
}

/**
 * The score threshold needed to unlock Medium.
 */
export const MEDIUM_UNLOCK_THRESHOLD = MEDIUM_UNLOCK_SCORE;

/**
 * Clear all difficulty unlock data (does NOT touch leaderboard).
 */
export function clearDifficultyUnlocks() {
  save({});
}