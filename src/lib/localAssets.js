// ============================================================
// Local portraits — owner/NPC URLs; customer strip uses sprite_organizer index
// sprite_organizer index (see customerPortraitInventory.js) or SVG placeholders when empty.
// ============================================================

import { PORTRAITS_PER_VILLAGE } from "@/lib/spriteConfig";
import { publicUrl } from "@/lib/publicUrl";

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
      url: publicUrl(`sprites/owner/${k}.png`),
      fallback: svgDataPortrait("Owner", HUE[k]),
    },
  ]),
);

/** Neutral baker sprite if a locale owner asset is missing — no client-side processing. */
const DEFAULT_OWNER_PORTRAIT = publicUrl("sprites/npc/owner_baker_neutral.png");

/** Owner portrait for HUD / dialogue (static public URLs only). */
export function getOwnerPortraitUrl(villageKey) {
  return resolveAssetUrl(OWNER_PORTRAIT_BY_VILLAGE[villageKey]) || DEFAULT_OWNER_PORTRAIT;
}

/** SVG-only strip when portrait catalog is disabled or empty (SpriteMenu / legacy orders). */
export function customerPortraitSvgFallback(villageKey, portraitIndex) {
  const h = HUE[villageKey] ?? 200;
  return svgDataPortrait("Customer", (h + portraitIndex * 7) % 360);
}

export function customerPortraitSvgOnlyStrip(villageKey) {
  return Array.from({ length: PORTRAITS_PER_VILLAGE }, (_, portraitIndex) => ({
    url: null,
    fallback: customerPortraitSvgFallback(villageKey, portraitIndex),
  }));
}
