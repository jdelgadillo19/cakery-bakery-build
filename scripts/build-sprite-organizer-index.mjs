#!/usr/bin/env node
/**
 * Scan public/sprites/sprite_organizer/<village>/<male|female>/*.png and write
 * src/data/spriteOrganizerPortraitIndex.json for runtime random portrait picks.
 *
 * Run: npm run build-sprite-index
 *      (re-run after adding/removing character PNGs under sprite_organizer)
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ORG = path.join(ROOT, "public", "sprites", "sprite_organizer");
const OUT = path.join(ROOT, "src", "data", "spriteOrganizerPortraitIndex.json");

const VILLAGES = ["frontier_us", "paris", "ming_china", "london"];
const GENDERS = ["male", "female"];

async function listPngs(dir, villageKey, gender) {
  try {
    const names = await fs.readdir(dir);
    return names
      .filter((n) => n.toLowerCase().endsWith(".png"))
      .map((n) => `sprites/sprite_organizer/${villageKey}/${gender}/${n}`)
      .sort();
  } catch {
    return [];
  }
}

async function main() {
  const byVillage = {};
  for (const vk of VILLAGES) {
    byVillage[vk] = { male: [], female: [] };
    for (const g of GENDERS) {
      const dir = path.join(ORG, vk, g);
      byVillage[vk][g] = await listPngs(dir, vk, g);
    }
  }

  const payload = {
    version: 1,
    generated_by: "scripts/build-sprite-organizer-index.mjs",
    byVillage,
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log("Wrote", path.relative(ROOT, OUT));
  for (const vk of VILLAGES) {
    console.log(`  ${vk}: male ${byVillage[vk].male.length}, female ${byVillage[vk].female.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
