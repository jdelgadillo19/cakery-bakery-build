// Indexed portraits under public/sprites/customers_locale/<villageKey>/ (PNG bytes synced from sprite_organizer).
// Catalog: src/data/customerPortraitInventory.json

import inventory from "../data/customerPortraitInventory.json";
import { publicUrl } from "@/lib/publicUrl";

/** True when JSON lists at least one portrait for this village. */
export function hasPortraitInventoryForVillage(villageKey) {
  if (!inventory.enabled || !Array.isArray(inventory.entries)) return false;
  return inventory.entries.some((e) => e.villageKey === villageKey);
}

function matchesGenderAge(e, gender, ageBand) {
  return e.gender === gender && e.ageBand === ageBand;
}

/**
 * Pick a catalog portrait matching locale + demographics; widen gender-only then locale-only if sparse.
 */
export function pickPortraitCatalogEntry(villageKey, gender, ageBand) {
  const entries = inventory.entries || [];
  let pool = entries.filter((e) => e.villageKey === villageKey && matchesGenderAge(e, gender, ageBand));
  if (pool.length === 0) {
    pool = entries.filter((e) => e.villageKey === villageKey && e.gender === gender);
  }
  if (pool.length === 0) {
    pool = entries.filter((e) => e.villageKey === villageKey);
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function catalogEntryToUrl(entry) {
  if (!entry?.path) return null;
  return publicUrl(entry.path);
}
