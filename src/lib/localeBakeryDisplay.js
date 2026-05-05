import { PRODUCTS } from "@/lib/gameData";

/**
 * The six default menu items per locale (from PRODUCTS).
 * Use in image-generation prompts so counter/display art matches in-game goods only.
 */
export function getLocaleBakeryProductNames(localeKey) {
  const list = PRODUCTS[localeKey] || PRODUCTS.paris;
  return list.map((p) => p.name);
}

/**
 * Tight instruction block for scene / sprite generation (reference + style models).
 */
export function getLocaleBakeryDisplayPromptAddendum(localeKey) {
  const names = getLocaleBakeryProductNames(localeKey);
  return [
    "Baked goods rule: show ONLY these six items on shelves, in the glass case, and on the counter —",
    "no baguettes, macarons, or other regional pastries that belong to a different locale.",
    `The only products visible: ${names.join(", ")}.`,
  ].join(" ");
}
