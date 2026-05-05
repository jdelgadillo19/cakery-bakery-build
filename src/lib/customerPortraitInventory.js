// Customer portraits from public/sprites/sprite_organizer/<village>/<male|female>/
// (correct gender folders). Index: src/data/spriteOrganizerPortraitIndex.json
// — regenerate with: npm run build-sprite-index

import organizerIndex from "../data/spriteOrganizerPortraitIndex.json";
import { publicUrl } from "@/lib/publicUrl";
import { archetypeAtIndex, PORTRAITS_PER_VILLAGE } from "@/lib/spriteConfig";
import { customerPortraitSvgFallback } from "@/lib/localAssets";

/** @param {"male"|"female"} gender */
function pathsForGender(villageKey, gender) {
  const v = organizerIndex.byVillage?.[villageKey];
  if (!v) return [];
  const g = gender === "female" ? "female" : "male";
  const list = v[g];
  return Array.isArray(list) ? list : [];
}

/** True when organizer has at least one portrait for this village. */
export function hasPortraitInventoryForVillage(villageKey) {
  return pathsForGender(villageKey, "male").length + pathsForGender(villageKey, "female").length > 0;
}

/**
 * Random portrait for cashier customers: `sprite_organizer/<village>/<gender>/`.
 * Widen to the other gender’s folder if the preferred pool is empty.
 */
export function pickPortraitCatalogEntry(villageKey, gender) {
  const makePool = (g) => pathsForGender(villageKey, g).map((p) => ({ id: p.replace(/[^\w]/g, "_"), path: p }));

  let pool = makePool(gender);
  if (pool.length === 0) {
    const alt = gender === "male" ? "female" : "male";
    pool = makePool(alt);
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function catalogEntryToUrl(entry) {
  if (!entry?.path) return null;
  return publicUrl(entry.path);
}

/**
 * One `{ url, fallback }` per cashier sprite slot (0–17), by archetype gender
 * (stable picks for SpriteMenu; age band is not encoded in filenames).
 */
export function buildCatalogPortraitStrip(villageKey) {
  return Array.from({ length: PORTRAITS_PER_VILLAGE }, (_, portraitIndex) => {
    const { gender } = archetypeAtIndex(portraitIndex);
    const paths = pathsForGender(villageKey, gender);
    const path = paths.length ? paths[portraitIndex % paths.length] : null;
    return {
      url: path ? publicUrl(path) : null,
      fallback: customerPortraitSvgFallback(villageKey, portraitIndex),
    };
  });
}
