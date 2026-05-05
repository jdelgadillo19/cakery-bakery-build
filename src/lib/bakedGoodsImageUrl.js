/**
 * Cashier / menu product art lives under public/sprites/baked_goods/
 * (filenames from the baked-goods export sheet; keys match legacy product ids or recipe sprite keys).
 */
import { publicUrl } from "@/lib/publicUrl";

/** Legacy sprite key / product id → PNG stem under sprites/baked_goods/ */
const BAKED_GOOD_STEM = {
  apple_pie: "apple_pie",
  baguette: "baguette",
  biscuit: "buttermilk_biscuit",
  chelsea_bun: "chelsea_bun",
  cinnamon_roll: "cinnamon_roll",
  cookie: "molasses_cookie",
  cornbread: "cornbread",
  croissant: "croissant",
  crumpet: "crumpet",
  eclair: "eclair",
  egg_tart: "egg_tart",
  macaron: "macaron",
  mantou: "mantou_bun",
  meat_pie: "meat_pie",
  mooncake: "mooncake",
  pain_chocolat: "pain_au_chocolat",
  red_bean_bun: "red_bean_bun",
  scone: "scone",
  sesame_ball: "sesame_ball",
  shortbread: "shortbread",
  sourdough: "sourdough_loaf",
  tangyuan: "tangyuan",
  tarte: "tarte_aux_fruits",
  victoria_sponge: "victoria_sponge",
};

/**
 * @param {string} spriteKey Product id from PRODUCTS, or legacy sprite key from recipe map
 */
export function bakedGoodsImageUrl(spriteKey) {
  const stem = BAKED_GOOD_STEM[spriteKey] ?? spriteKey;
  return publicUrl(`sprites/baked_goods/${stem}.png`);
}
