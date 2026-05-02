// ============================================================
// Local placeholder portraits — PNG under /sprites/customers/
// Tile files tile_00…tile_17 from import script; villages rotate starting tile.
// ============================================================

import { PORTRAITS_PER_VILLAGE } from "@/lib/spriteConfig";

function svgDataPortrait(label, hue) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect fill="hsl(${hue},38%,22%)" width="160" height="160"/><ellipse cx="80" cy="58" rx="28" ry="32" fill="hsl(${hue},28%,78%)"/><rect x="48" y="98" width="64" height="40" rx="8" fill="hsl(${hue},35%,40%)"/><text x="80" y="152" font-size="10" fill="#e2e8f0" text-anchor="middle" font-family="system-ui,sans-serif">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const HUE = {
  frontier_us: 38,
  paris: 330,
  ming_china: 12,
  london: 215,
};

/** Rotates which coarse tile maps to portrait index 0 so villages don’t look identical. */
const TILE_ROTATION = {
  frontier_us: 0,
  ming_china: 5,
  paris: 11,
  london: 8,
};

/** Resolve `{ url, fallback }` or legacy string to display URL */
export function resolveAssetUrl(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  return entry.url ?? null;
}

export function resolveAssetFallback(entry) {
  if (!entry || typeof entry === "string") return null;
  return entry.fallback ?? null;
}

/** Baker / owner portrait per village — tries PNG first in UI with fallback */
export const OWNER_PORTRAIT_BY_VILLAGE = Object.fromEntries(
  Object.keys(HUE).map((k) => [
    k,
    {
      url: `/sprites/owner/${k}.png`,
      fallback: svgDataPortrait("Owner", HUE[k]),
    },
  ]),
);

/** Customer portraits — one URL per archetyped portrait slot (see spriteConfig). */
export function customerPortraitUrls(villageKey) {
  const h = HUE[villageKey] ?? 200;
  const rot = TILE_ROTATION[villageKey] ?? 0;
  return Array.from({ length: PORTRAITS_PER_VILLAGE }, (_, portraitIndex) => {
    const tileNum = (rot + portraitIndex) % PORTRAITS_PER_VILLAGE;
    return {
      url: `/sprites/customers/tile_${String(tileNum).padStart(2, "0")}.png`,
      fallback: svgDataPortrait("Customer", (h + portraitIndex * 7) % 360),
    };
  });
}
