// ============================================================
// CAKERY BAKERY — Sprite Metadata & Name Pool System
// Handles gender-validated name assignment for all NPCs.
// Persisted to localStorage under "cakery_sprite_config".
// ============================================================

// ── Default Name Pools ───────────────────────────────────────────────────────

export const DEFAULT_MALE_NAMES = {
  frontier_us: ["Sheriff Buck", "Old Pete", "Cowboy Jake", "Doc Holiday", "Little Timmy", "Prospector Dan", "Reverend John", "Farmer Hank", "Blacksmith Joe", "Deputy Sam", "Rancher Bill"],
  paris:       ["Monsieur Pierre", "Le Petit Louis", "Artiste Claude", "Professeur Henri", "Boulanger Jean", "Poète Marcel", "Musicien Rémy", "Docteur François"],
  ming_china:  ["Scholar Wang", "Merchant Li", "Fisherman Zhou", "Teacher Huang", "Captain Zhang", "Poet Su", "Farmer Guo", "Tea Master Wu", "Calligrapher Xu", "Boatman He"],
  london:      ["Lord Pemberton", "Young Oliver", "Constable Wells", "Chimney Tom", "Sir Reginald", "Newsboy Charlie", "Butler Graves", "Professor Morley", "Merchant Brown"],
};

export const DEFAULT_FEMALE_NAMES = {
  frontier_us: ["Miss Dolly", "Widow Martha", "Miss Clara", "Teacher Anne"],
  paris:       ["Madame Colette", "Mademoiselle Sophie", "Fleuriste Marie", "Danseuse Lila", "Comtesse Élise", "Couturière Amélie"],
  ming_china:  ["Grandmother Chen", "Young Mei", "Healer Lin", "Silk Weaver Bai", "Herbalist Qian"],
  london:      ["Mrs. Higgins", "Lady Ashworth", "Miss Primrose", "Cook Bertha", "Governess Jane", "Flower Girl Eliza"],
};

// ── Sprite Definitions ───────────────────────────────────────────────────────
// Each sprite has a stable id, gender, and a portrait index (which image it maps to)

export const DEFAULT_SPRITES = {
  frontier_us: [
    { id: "frontier_us_0", gender: "male",   title: "customer", portraitIndex: 0, villageKey: "frontier_us" },
    { id: "frontier_us_1", gender: "female",  title: "customer", portraitIndex: 1, villageKey: "frontier_us" },
  ],
  paris: [
    { id: "paris_0", gender: "male",   title: "customer", portraitIndex: 0, villageKey: "paris" },
    { id: "paris_1", gender: "female",  title: "customer", portraitIndex: 1, villageKey: "paris" },
  ],
  ming_china: [
    { id: "ming_china_0", gender: "male",   title: "customer", portraitIndex: 0, villageKey: "ming_china" },
    { id: "ming_china_1", gender: "female",  title: "customer", portraitIndex: 1, villageKey: "ming_china" },
  ],
  london: [
    { id: "london_0", gender: "male",   title: "customer", portraitIndex: 0, villageKey: "london" },
    { id: "london_1", gender: "female",  title: "customer", portraitIndex: 1, villageKey: "london" },
  ],
};

export const SPRITE_TITLES = ["customer", "baker", "chef", "merchant", "scholar", "artist", "constable", "farmer"];

// ── LocalStorage persistence ─────────────────────────────────────────────────

const STORAGE_KEY = "cakery_sprite_config";

function getDefaults() {
  return {
    sprites: JSON.parse(JSON.stringify(DEFAULT_SPRITES)),
    maleNames: JSON.parse(JSON.stringify(DEFAULT_MALE_NAMES)),
    femaleNames: JSON.parse(JSON.stringify(DEFAULT_FEMALE_NAMES)),
  };
}

export function loadSpriteConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaults();
    const parsed = JSON.parse(raw);
    // Merge with defaults so new villages/sprites always appear
    const defaults = getDefaults();
    return {
      sprites:     { ...defaults.sprites,     ...(parsed.sprites || {}) },
      maleNames:   { ...defaults.maleNames,   ...(parsed.maleNames || {}) },
      femaleNames: { ...defaults.femaleNames, ...(parsed.femaleNames || {}) },
    };
  } catch {
    return getDefaults();
  }
}

export function saveSpriteConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function resetSpriteConfig() {
  localStorage.removeItem(STORAGE_KEY);
  return getDefaults();
}

// ── Name generation (gender-validated) ──────────────────────────────────────

/**
 * Pick a random name from the correct gender pool for a village.
 * @param {string} villageKey
 * @param {"male"|"female"} gender
 * @param {object} config  — loaded sprite config (contains maleNames, femaleNames)
 */
export function pickName(villageKey, gender, config) {
  const pool = gender === "female"
    ? (config.femaleNames[villageKey] || DEFAULT_FEMALE_NAMES[villageKey] || [])
    : (config.maleNames[villageKey]   || DEFAULT_MALE_NAMES[villageKey]   || []);

  if (pool.length === 0) return gender === "female" ? "Customer" : "Customer";
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Given a portrait index, look up the sprite definition for that village/index.
 * Returns the sprite metadata (gender, title) or a safe default.
 */
export function getSpriteMetadata(villageKey, portraitIndex, config) {
  const sprites = config.sprites[villageKey] || DEFAULT_SPRITES[villageKey] || [];
  return sprites.find((s) => s.portraitIndex === portraitIndex) || { gender: "male", title: "customer" };
}