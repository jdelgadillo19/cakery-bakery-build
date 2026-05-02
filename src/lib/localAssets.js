// ============================================================
// Local placeholder portraits — PNG under /sprites/ with SVG fallback.
// ============================================================

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
      url: `/sprites/owner/${k}.png`,
      fallback: svgDataPortrait("Owner", HUE[k]),
    },
  ]),
);

/** Two alternating customer placeholders per village */
export function customerPortraitUrls(villageKey) {
  const h = HUE[villageKey] ?? 200;
  return [0, 1].map((idx) => ({
    url: `/sprites/customers/${villageKey}_${idx}.png`,
    fallback: svgDataPortrait("Customer", idx === 0 ? h : h + 14),
  }));
}
