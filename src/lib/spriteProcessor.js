// ============================================================
// CAKERY BAKERY — Sprite Processing Pipeline
// One-time client-side background removal + metadata binding.
// Results cached in localStorage under "cakery_processed_sprites".
// ============================================================

import { CUSTOMER_PORTRAITS } from "@/lib/gameData";
import { OWNER_PORTRAIT_BY_VILLAGE, resolveAssetUrl } from "@/lib/localAssets";
import { loadSpriteConfig, DEFAULT_SPRITES } from "@/lib/spriteConfig";

const OWNER_PORTRAITS_MAP = OWNER_PORTRAIT_BY_VILLAGE;

const CACHE_KEY = "cakery_processed_sprites";
const CACHE_VERSION = 6; // bump when portrait URLs / slot count changes

// ── Background removal via canvas ────────────────────────────────────────────

/**
 * Load an image from a URL through a canvas (requires CORS-friendly server).
 * If the image fails CORS, returns null (we keep the original URL as fallback).
 */
async function fetchImageBitmap(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    // Timeout after 8s
    setTimeout(() => resolve(null), 8000);
    img.src = url;
  });
}

/**
 * Remove solid/near-solid background from an ImageData using flood-fill
 * starting from all four corners. Pixels within `tolerance` of the sampled
 * corner colour are made transparent.
 */
function removeBackground(imageData, tolerance = 35) {
  const { data, width, height } = imageData;

  // Sample background colour from the four corners (average)
  function getPixel(x, y) {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  }

  function colorDistance(a, b) {
    return Math.sqrt(
      (a[0] - b[0]) ** 2 +
      (a[1] - b[1]) ** 2 +
      (a[2] - b[2]) ** 2
    );
  }

  // Collect corner samples
  const corners = [
    getPixel(0, 0),
    getPixel(width - 1, 0),
    getPixel(0, height - 1),
    getPixel(width - 1, height - 1),
  ];
  // Use the most common-ish colour (average of corners)
  const bgColor = [
    Math.round(corners.reduce((s, c) => s + c[0], 0) / 4),
    Math.round(corners.reduce((s, c) => s + c[1], 0) / 4),
    Math.round(corners.reduce((s, c) => s + c[2], 0) / 4),
    255,
  ];

  const visited = new Uint8Array(width * height);
  const queue = [];

  function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    const px = getPixel(x, y);
    if (px[3] === 0 || colorDistance(px, bgColor) <= tolerance) {
      queue.push([x, y]);
    }
  }

  // Seed from all edges
  for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    const i = (y * width + x) * 4;
    // Make transparent
    data[i + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return imageData;
}

/**
 * Process a single image URL:
 * 1. Fetch via canvas
 * 2. Remove background
 * 3. Return base64 PNG data URL (or null on failure)
 */
async function processImage(url) {
  const img = await fetchImageBitmap(url);
  if (!img) return null;

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    // CORS blocked — can't read pixels, return null
    return null;
  }

  const cleaned = removeBackground(imageData);
  ctx.putImageData(cleaned, 0, 0);
  return canvas.toDataURL("image/png");
}

// ── Main processor ───────────────────────────────────────────────────────────

/**
 * Build the full list of sprites to process from CUSTOMER_PORTRAITS + sprite config.
 */
function buildSpriteManifest(spriteConfig) {
  const manifest = [];

  for (const [villageKey, portraits] of Object.entries(CUSTOMER_PORTRAITS)) {
    const sprites = spriteConfig.sprites[villageKey] || DEFAULT_SPRITES[villageKey] || [];
    portraits.forEach((entry, idx) => {
      const originalUrl = resolveAssetUrl(entry);
      if (!originalUrl) return;
      const meta = sprites.find((s) => s.portraitIndex === idx) || {
        id: `${villageKey}_${idx}`,
        gender: "male",
        title: "customer",
        portraitIndex: idx,
        villageKey,
      };
      manifest.push({ ...meta, originalUrl, type: "customer" });
    });
  }

  // Owner portraits (baker/chef — always male owners in current data)
  for (const [villageKey, entry] of Object.entries(OWNER_PORTRAITS_MAP || {})) {
    const originalUrl = resolveAssetUrl(entry);
    if (!originalUrl) continue;
    manifest.push({
      id: `owner_${villageKey}`,
      gender: "male",
      title: "baker",
      portraitIndex: 0,
      villageKey,
      originalUrl,
      type: "owner",
    });
  }

  return manifest;
}

/**
 * Load the cached processed sprite registry.
 * Returns null if not present or version mismatch.
 */
export function loadProcessedSprites() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CACHE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Run the one-time sprite processing pipeline.
 * Skips sprites that are already in the cache.
 * Returns the final registry.
 *
 * @param {function} onProgress  callback(processed, total, currentId)
 */
export async function runSpriteProcessing(onProgress) {
  const existing = loadProcessedSprites();
  const spriteConfig = loadSpriteConfig();
  const manifest = buildSpriteManifest(spriteConfig);

  // Start from existing registry or fresh
  const registry = existing
    ? { ...existing }
    : { version: CACHE_VERSION, sprites: {}, processedAt: null };

  let processed = 0;
  const total = manifest.length;

  for (const sprite of manifest) {
    if (registry.sprites[sprite.id]) {
      // Already processed — skip
      processed++;
      onProgress?.(processed, total, sprite.id);
      continue;
    }

    onProgress?.(processed, total, sprite.id);
    const pngDataUrl = await processImage(sprite.originalUrl);

    registry.sprites[sprite.id] = {
      id: sprite.id,
      gender: sprite.gender,
      title: sprite.title,
      villageKey: sprite.villageKey,
      portraitIndex: sprite.portraitIndex,
      type: sprite.type,
      originalUrl: sprite.originalUrl,
      // If processing succeeded, use the cleaned PNG; otherwise fall back to original
      processedUrl: pngDataUrl || sprite.originalUrl,
      hasTransparency: !!pngDataUrl,
    };

    processed++;
    onProgress?.(processed, total, sprite.id);
  }

  registry.processedAt = new Date().toISOString();

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(registry));
  } catch (e) {
    // localStorage quota exceeded (base64 images are large) — store metadata only
    const metaOnly = {
      ...registry,
      sprites: Object.fromEntries(
        Object.entries(registry.sprites).map(([k, v]) => [
          k,
          { ...v, processedUrl: v.originalUrl, hasTransparency: false },
        ])
      ),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(metaOnly));
    return metaOnly;
  }

  return registry;
}

/**
 * Get the best URL for a sprite by id.
 * Falls back to the original URL if not yet processed.
 */
export function getProcessedUrl(spriteId, registry) {
  if (!registry || !registry.sprites[spriteId]) return null;
  return registry.sprites[spriteId].processedUrl;
}

/**
 * Given a villageKey + portraitIndex, get the sprite's processed URL from the registry.
 */
export function getCustomerSpriteUrl(villageKey, portraitIndex, registry) {
  const id = `${villageKey}_${portraitIndex}`;
  return getProcessedUrl(id, registry) || null;
}

/**
 * Given a villageKey, get the owner's processed URL from the registry.
 */
const DEFAULT_OWNER_SPRITE = "/sprites/npc/owner_baker_neutral.png";

export function getOwnerSpriteUrl(villageKey, registry) {
  const id = `owner_${villageKey}`;
  return getProcessedUrl(id, registry) || DEFAULT_OWNER_SPRITE;
}

/**
 * Clear the processed sprite cache (forces re-processing on next load).
 */
export function clearSpriteCache() {
  localStorage.removeItem(CACHE_KEY);
}