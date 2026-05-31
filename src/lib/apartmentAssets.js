import { publicUrl } from "@/lib/publicUrl";

/** @typedef {'furniture'|'wall_decor'|'tables'|'kitchen'|'carpets'} ApartmentCategory */

export const APARTMENT_LOCALES = ["paris", "london", "ming_china", "frontier_us"];

export const APARTMENT_CATEGORIES = {
  furniture: ["bed_basic", "bed_upgrade", "dresser", "armchair"],
  wall_decor: ["wall_clock", "framed_art", "wall_shelf"],
  tables: ["dining_table", "side_table"],
  kitchen: ["stove", "coffee_maker", "kitchen_sink"],
  carpets: ["rug_round", "rug_runner"],
};

const BG_PATH = (locale) => `sprites/apartment/backgrounds/${locale}_empty.png`;

const PROP_PATH = (locale, category, itemId) =>
  `sprites/apartment/${locale}/${category}/${itemId}.png`;

/** Empty apartment interior background for a story locale (768×512). */
export function getApartmentBackgroundUrl(locale) {
  const key = APARTMENT_LOCALES.includes(locale) ? locale : "paris";
  return publicUrl(BG_PATH(key));
}

/** Purchasable / equippable apartment prop sprite (transparent PNG). */
export function getApartmentPropUrl(locale, category, itemId) {
  const loc = APARTMENT_LOCALES.includes(locale) ? locale : "paris";
  return publicUrl(PROP_PATH(loc, category, itemId));
}

/** Flat list of all prop ids for a locale. */
export function listApartmentPropIds() {
  return Object.entries(APARTMENT_CATEGORIES).flatMap(([category, ids]) =>
    ids.map((id) => ({ category, id })),
  );
}

export function getApartmentAssetManifest(locale) {
  const loc = APARTMENT_LOCALES.includes(locale) ? locale : "paris";
  const props = listApartmentPropIds().map(({ category, id }) => ({
    category,
    id,
    url: getApartmentPropUrl(loc, category, id),
  }));
  return {
    locale: loc,
    backgroundUrl: getApartmentBackgroundUrl(loc),
    props,
  };
}
