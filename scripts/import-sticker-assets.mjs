#!/usr/bin/env node
/**
 * Import sticker sheets from a local folder (default: ~/Downloads/Assets) into public/sprites/.
 *
 * Products — labeled grid (row = locale, column = item left→right):
 *   "ChatGPT Image Apr 28, 2026, 07_12_59 PM.png" → 4×6 crops → product ids (PNG)
 *
 * Scenes — 2×2 bakery interiors:
 *   "Four charming bakery scenes across cultures.png"
 *
 * Customers — coarse grid from keyed historical sheet → tile_00…tile_17.png ;
 *   optional *_generated_image.png (white keyed) pasted onto girl slots (15–17).
 *
 * NPC — baker duo from a5856f827_generated_image.png (white keyed, split).
 *
 * Run: npm run import-assets
 *      ASSETS_DIR=/path/to/folder npm run import-assets
 */

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_SCENES = path.join(ROOT, "public/sprites/scenes");
const OUT_PRODUCTS = path.join(ROOT, "public/sprites/products");
const OUT_CUSTOMERS = path.join(ROOT, "public/sprites/customers");
const OUT_NPC = path.join(ROOT, "public/sprites/npc");
const OUT_SOURCE = path.join(ROOT, "public/sprites/source");

const BLACK_KEY = 34;
const WHITE_KEY = 248;

async function ensureDir(d) {
  await fs.mkdir(d, { recursive: true });
}

/** @param {"black" | "white"} mode */
async function keySolidBackdrop(pngBuffer, mode) {
  const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) throw new Error(`Expected RGBA, got ${channels} channels`);
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i],
      g = out[i + 1],
      b = out[i + 2];
    if (mode === "black") {
      if (r <= BLACK_KEY && g <= BLACK_KEY && b <= BLACK_KEY) out[i + 3] = 0;
    } else if (r >= WHITE_KEY && g >= WHITE_KEY && b >= WHITE_KEY) {
      out[i + 3] = 0;
    }
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png();
}

async function splitFourPanels(imagePath) {
  const meta = await sharp(imagePath).metadata();
  const W = meta.width;
  const H = meta.height;
  if (!W || !H || W % 2 || H % 2) {
    throw new Error(`Expected even dimensions for 2×2 split, got ${W}×${H}`);
  }
  const hw = W / 2;
  const hh = H / 2;
  const regions = [
    { left: 0, top: 0, width: hw, height: hh },
    { left: hw, top: 0, width: hw, height: hh },
    { left: 0, top: hh, width: hw, height: hh },
    { left: hw, top: hh, width: hw, height: hh },
  ];
  return regions.map((r) => sharp(imagePath).extract(r));
}

/**
 * Uniform grid crops (row-major). Optional full-frame backdrop removal before slicing.
 */
async function extractGridBuffers(imagePath, rows, cols, { backdropKey } = {}) {
  let pipeline = sharp(imagePath);
  let buf = await pipeline.png().toBuffer();
  if (backdropKey) buf = await keySolidBackdrop(buf, backdropKey).then((s) => s.png().toBuffer());

  const meta = await sharp(buf).metadata();
  const W = meta.width;
  const H = meta.height;
  if (!W || !H) throw new Error("Missing dimensions");
  const cw = Math.floor(W / cols);
  const ch = Math.floor(H / rows);
  const tiles = [];
  const img = sharp(buf);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tileBuf = await img
        .clone()
        .extract({ left: c * cw, top: r * ch, width: cw, height: ch })
        .png()
        .toBuffer();
      tiles.push(tileBuf);
    }
  }
  return { tiles, cellWidth: cw, cellHeight: ch };
}

async function keyTileBlack(tileBuf) {
  return keySolidBackdrop(tileBuf, "black").then((s) => s.png().toBuffer());
}

async function fitSpriteIntoTile(spriteBuf, cw, ch, pad = 12) {
  const innerW = Math.max(32, cw - pad * 2);
  const innerH = Math.max(32, ch - pad * 2);
  const resized = await sharp(spriteBuf)
    .resize({ width: innerW, height: innerH, fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: cw,
      height: ch,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toBuffer();
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const ASSETS_DIR = process.env.ASSETS_DIR || path.join(os.homedir(), "Downloads", "Assets");

  await ensureDir(OUT_SCENES);
  await ensureDir(OUT_PRODUCTS);
  await ensureDir(OUT_CUSTOMERS);
  await ensureDir(OUT_NPC);
  await ensureDir(OUT_SOURCE);

  const sceneFile = path.join(ASSETS_DIR, "Four charming bakery scenes across cultures.png");
  /** Labeled 4-row × 6-column sheet (French, US, China, British rows — matches game village catalogs). */
  const foodsLabelledGrid = path.join(ASSETS_DIR, "ChatGPT Image Apr 28, 2026, 07_12_59 PM.png");
  const charSheet = path.join(ASSETS_DIR, "Historical characters in vibrant cultures.png");
  const bakerDuo = path.join(ASSETS_DIR, "a5856f827_generated_image.png");

  // ── Bakery interiors ──────────────────────────────────────────────────────
  if (await fileExists(sceneFile)) {
    console.log("Scenes:", sceneFile);
    const panels = await splitFourPanels(sceneFile);
    const keys = ["frontier_us", "ming_china", "paris", "london"];
    for (let i = 0; i < 4; i++) {
      const webpPath = path.join(OUT_SCENES, `${keys[i]}.webp`);
      await panels[i].webp({ quality: 86, effort: 6 }).toFile(webpPath);
      console.log("  wrote", path.relative(ROOT, webpPath));
    }
  } else {
    console.warn("Skip scenes — missing:", sceneFile);
  }

  // ── Products — labeled grid (matches printed labels under each pastry) ───────
  if (await fileExists(foodsLabelledGrid)) {
    console.log("Food grid:", foodsLabelledGrid);
    const ids = [
      "baguette",
      "croissant",
      "macaron",
      "tarte",
      "pain_chocolat",
      "eclair",
      "sourdough",
      "cornbread",
      "biscuit",
      "apple_pie",
      "cookie",
      "cinnamon_roll",
      "mooncake",
      "mantou",
      "tangyuan",
      "sesame_ball",
      "egg_tart",
      "red_bean_bun",
      "scone",
      "shortbread",
      "meat_pie",
      "victoria_sponge",
      "crumpet",
      "chelsea_bun",
    ];
    const { tiles } = await extractGridBuffers(foodsLabelledGrid, 4, 6, { backdropKey: null });
    if (tiles.length !== ids.length) throw new Error(`Expected ${ids.length} tiles, got ${tiles.length}`);
    for (let i = 0; i < ids.length; i++) {
      let buf = tiles[i];
      const meta = await sharp(buf).metadata();
      if (!meta.hasAlpha || meta.channels === 3) buf = await keyTileBlack(buf);
      const dest = path.join(OUT_PRODUCTS, `${ids[i]}.png`);
      await fs.writeFile(dest, buf);
      console.log("  wrote", path.relative(ROOT, dest));
    }
  } else {
    console.warn("Skip products — missing:", foodsLabelledGrid);
  }

  // ── Customer placeholders — Historical sheet coarse grid ───────────────────
  if (await fileExists(charSheet)) {
    console.log("Customer tiles from:", charSheet);
    const buf = await sharp(charSheet).png().toBuffer();
    const keyed = await keySolidBackdrop(buf, "black");
    const keyedBuf = await keyed.png().toBuffer();
    await fs.writeFile(path.join(OUT_SOURCE, "historical_characters_keyed.png"), keyedBuf);

    const { tiles, cellWidth, cellHeight } = await extractGridBuffers(
      path.join(OUT_SOURCE, "historical_characters_keyed.png"),
      3,
      6,
      { backdropKey: null },
    );
    console.log(`  grid cells ~${cellWidth}×${cellHeight}px`);

    let idx = 0;
    for (const tileBuf of tiles) {
      if (idx >= 18) break;
      const dest = path.join(OUT_CUSTOMERS, `tile_${String(idx).padStart(2, "0")}.png`);
      await fs.writeFile(dest, tileBuf);
      console.log("  wrote", path.relative(ROOT, dest));
      idx++;
    }

    const entries = await fs.readdir(ASSETS_DIR).catch(() => []);
    const generatedFiles = entries
      .filter((f) => f.endsWith("_generated_image.png") && f !== "a5856f827_generated_image.png")
      .sort();

    const cw = cellWidth;
    const ch = cellHeight;
    const overlays = [];
    for (const gf of generatedFiles) {
      const p = path.join(ASSETS_DIR, gf);
      const raw = await sharp(p).png().toBuffer();
      const keyedGen = await keySolidBackdrop(raw, "white");
      const kb = await keyedGen.png().toBuffer();
      const safeName = gf.replace(/[^a-z0-9_-]/gi, "_");
      await fs.writeFile(path.join(OUT_SOURCE, `generated_keyed_${safeName}`), kb);
      overlays.push(await fitSpriteIntoTile(kb, cw, ch));
      console.log("  keyed generated sprite:", gf);
    }

    // Paste generated sprites onto archetyped **girl** portrait indices only (15–17),
    // so we don’t visually mismatch male-child slots. Extra generated PNGs are keyed to /source only.
    if (overlays[0]) {
      for (const gIdx of [15, 16, 17]) {
        const dest = path.join(OUT_CUSTOMERS, `tile_${String(gIdx).padStart(2, "0")}.png`);
        await fs.writeFile(dest, overlays[0]);
        console.log("  pasted generated sprite onto girl tile →", path.relative(ROOT, dest));
      }
    }
    if (overlays.length > 1) {
      console.log(`  note: ${overlays.length - 1} additional generated PNG(s) keyed under sprites/source — assign manually when art direction is clearer`);
    }
  } else {
    console.warn("Skip customer tiles — missing:", charSheet);
  }

  // ── Baker duo ───────────────────────────────────────────────────────────────
  if (await fileExists(bakerDuo)) {
    console.log("Baker duo:", bakerDuo);
    const base = await sharp(bakerDuo).png().toBuffer();
    const keyedSharp = await keySolidBackdrop(base, "white");
    const meta = await keyedSharp.metadata();
    const W = meta.width || 0;
    const H = meta.height || 0;
    const half = Math.floor(W / 2);
    await keyedSharp.clone().extract({ left: 0, top: 0, width: half, height: H }).png().toFile(path.join(OUT_NPC, "owner_baker_carrying.png"));
    await keyedSharp.clone().extract({ left: half, top: 0, width: W - half, height: H }).png().toFile(path.join(OUT_NPC, "owner_baker_neutral.png"));
    console.log("  wrote", path.relative(ROOT, path.join(OUT_NPC, "owner_baker_carrying.png")));
    console.log("  wrote", path.relative(ROOT, path.join(OUT_NPC, "owner_baker_neutral.png")));
  } else {
    console.warn("Skip baker duo — missing:", bakerDuo);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
