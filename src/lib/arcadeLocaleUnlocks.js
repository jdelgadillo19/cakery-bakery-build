// ============================================================
// CAKERY BAKERY — Global arcade locale unlocks (Arcade + Story)
// ============================================================

import { isAllContentUnlocked } from "@/lib/debugOverrides";

const LS_KEY = "cb_arcade_locale_unlocks";

export const ARCADE_VILLAGE_ORDER = ["paris", "frontier_us", "london", "ming_china"];

export const LOCALE_GATE = {
  paris: { kind: "free" },
  frontier_us: { kind: "free_unlockable", scoreRequired: 50 },
  london: { kind: "paid" },
  ming_china: { kind: "paid_unlockable", scoreRequired: 200 },
};

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
  } catch {
    /* ignore */
  }
}

export function getBestSingleRunScore() {
  return load().bestSingleRunScore || 0;
}

/**
 * @param {number} score
 */
export function recordArcadeLocaleRunScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n) || n < 0) return;
  const data = load();
  data.bestSingleRunScore = Math.max(data.bestSingleRunScore || 0, n);
  save(data);
}

/**
 * Merge guest/device state into account session — favors more access.
 * @param {{ bestSingleRunScore?: number }} remote
 */
export function mergeArcadeLocaleUnlocks(remote = {}) {
  const local = load();
  const merged = {
    bestSingleRunScore: Math.max(
      local.bestSingleRunScore || 0,
      remote.bestSingleRunScore || 0,
    ),
  };
  save(merged);
  return merged;
}

export function hasFullAccountAccess(profileTier) {
  const t = String(profileTier || "").toLowerCase();
  return t === "guac" || t === "gold" || t === "paid";
}

/**
 * @param {string} villageKey
 * @param {boolean} hasGuac
 * @returns {{ accessible: boolean, wall: "none" | "paywall" | "achievement", message: string }}
 */
export function getLocaleGateStatus(villageKey, hasGuac) {
  if (isAllContentUnlocked()) {
    return { accessible: true, wall: "none", message: "" };
  }

  const gate = LOCALE_GATE[villageKey];
  if (!gate) {
    return { accessible: false, wall: "paywall", message: "Unavailable." };
  }

  const best = getBestSingleRunScore();

  if (gate.kind === "free") {
    return { accessible: true, wall: "none", message: "" };
  }

  if (gate.kind === "free_unlockable") {
    if (best >= gate.scoreRequired) {
      return { accessible: true, wall: "none", message: "" };
    }
    return {
      accessible: false,
      wall: "achievement",
      message: `Score ${gate.scoreRequired} points in one Arcade run to unlock.`,
    };
  }

  if (gate.kind === "paid") {
    if (!hasGuac) {
      return {
        accessible: false,
        wall: "paywall",
        message: "Full access required to play in Covent Garden, London.",
      };
    }
    return { accessible: true, wall: "none", message: "" };
  }

  if (gate.kind === "paid_unlockable") {
    if (!hasGuac) {
      return {
        accessible: false,
        wall: "paywall",
        message: "Full access required to unlock Suzhou Watertown.",
      };
    }
    if (best >= gate.scoreRequired) {
      return { accessible: true, wall: "none", message: "" };
    }
    return {
      accessible: false,
      wall: "achievement",
      message: `With full access, score ${gate.scoreRequired} in one Arcade run to unlock.`,
    };
  }

  return { accessible: false, wall: "paywall", message: "Locked." };
}

export function isLocaleAccessible(villageKey, hasGuac) {
  return getLocaleGateStatus(villageKey, hasGuac).accessible;
}
