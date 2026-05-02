// ============================================================
// CAKERY BAKERY — Sprite metadata & name pools (gender × age band)
// Portrait index i maps to archetype bands (3 sprites each):
//   0–2 elder men, 3–5 elder women, 6–8 adult men, 9–11 adult women,
//   12–14 boys, 15–17 girls — consistent across villages (tile art rotates).
// Persisted under localStorage "cakery_sprite_config".
// ============================================================

export const VILLAGE_KEYS = ["frontier_us", "paris", "ming_china", "london"];

/** Three portraits per archetype × six archetypes = 18 slots / village */
export const PORTRAITS_PER_VILLAGE = 18;

export const SPRITE_TITLES = ["customer", "baker", "chef", "merchant", "scholar", "artist", "constable", "farmer"];

/** Archetype for portrait indices 0–17 (repeat pattern every village). */
function archetypeAtIndex(portraitIndex) {
  const bands = [
    { gender: "male", ageBand: "elder" },
    { gender: "female", ageBand: "elder" },
    { gender: "male", ageBand: "adult" },
    { gender: "female", ageBand: "adult" },
    { gender: "male", ageBand: "child" },
    { gender: "female", ageBand: "child" },
  ];
  const band = bands[Math.floor(portraitIndex / 3)];
  return band || { gender: "male", ageBand: "adult" };
}

export function buildDefaultSpritesForVillage(villageKey) {
  return Array.from({ length: PORTRAITS_PER_VILLAGE }, (_, portraitIndex) => {
    const { gender, ageBand } = archetypeAtIndex(portraitIndex);
    return {
      id: `${villageKey}_${portraitIndex}`,
      gender,
      ageBand,
      title: "customer",
      portraitIndex,
      villageKey,
    };
  });
}

/** Curated pools — ≥3 names per bucket per locale for rotation variety. */
export const DEFAULT_NAME_POOLS = {
  frontier_us: {
    male: {
      elder: ["Old Pete", "Prospector Dan", "Reverend John"],
      adult: ["Sheriff Buck", "Cowboy Jake", "Farmer Hank", "Deputy Sam", "Rancher Bill", "Blacksmith Joe"],
      child: ["Little Timmy", "Young Caleb", "Billy Tate"],
    },
    female: {
      elder: ["Widow Martha", "Granny Lou", "Miss Agnes Hart"],
      adult: ["Miss Dolly", "Miss Clara", "Teacher Anne"],
      child: ["Little Annie", "Sally Mae", "Young Lucy"],
    },
  },
  paris: {
    male: {
      elder: ["Monsieur Étienne", "Monsieur Laurent", "Monsieur Aubert"],
      adult: ["Monsieur Pierre", "Artiste Claude", "Professeur Henri", "Boulanger Jean", "Poète Marcel", "Musicien Rémy"],
      child: ["Le Petit Louis", "Young Antoine", "Little Gaston"],
    },
    female: {
      elder: ["Madame Thérèse", "Madame Blanche", "Grand-mère Solène"],
      adult: ["Madame Colette", "Mademoiselle Sophie", "Fleuriste Marie", "Danseuse Lila", "Comtesse Élise", "Couturière Amélie"],
      child: ["Little Cosette", "Young Fleur", "Little Marie"],
    },
  },
  ming_china: {
    male: {
      elder: ["Grandfather Chen", "Elder Zhou", "Old Teacher Huang"],
      adult: ["Scholar Wang", "Merchant Li", "Fisherman Zhou", "Captain Zhang", "Poet Su", "Farmer Guo"],
      child: ["Young Wei", "Boy Xiaolong", "Little Feng"],
    },
    female: {
      elder: ["Grandmother Chen", "Old Maid Lin", "Elder Aunt Bai"],
      adult: ["Young Mei", "Healer Lin", "Silk Weaver Bai", "Herbalist Qian", "Tea Mistress Wu", "Boatwoman Su"],
      child: ["Little Mei-Lin", "Girl Xiao Qing", "Young Ping"],
    },
  },
  london: {
    male: {
      elder: ["Old Mr. Pemberton", "Elder Tom Grey", "Grandfather Wells"],
      adult: ["Lord Pemberton", "Constable Wells", "Sir Reginald", "Butler Graves", "Professor Morley", "Merchant Brown"],
      child: ["Young Oliver", "Newsboy Charlie", "Boy Pip"],
    },
    female: {
      elder: ["Mrs. Abernathy", "Old Widow Higgins", "Grandmother Primrose"],
      adult: ["Mrs. Higgins", "Lady Ashworth", "Miss Primrose", "Cook Bertha", "Governess Jane", "Flower Girl Eliza"],
      child: ["Little Jane", "Girl Annie", "Young Rose"],
    },
  },
};

export const DEFAULT_SPRITES = Object.fromEntries(
  VILLAGE_KEYS.map((vk) => [vk, buildDefaultSpritesForVillage(vk)]),
);

const STORAGE_KEY = "cakery_sprite_config";

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

function mergeNamePools(base, overlay) {
  const out = clone(base);
  if (!overlay) return out;
  for (const vk of VILLAGE_KEYS) {
    if (!overlay[vk]) continue;
    for (const gender of ["male", "female"]) {
      if (!overlay[vk][gender]) continue;
      for (const band of ["elder", "adult", "child"]) {
        const patch = overlay[vk][gender][band];
        if (!Array.isArray(patch) || patch.length === 0) continue;
        const merged = [...(out[vk][gender][band] || []), ...patch];
        out[vk][gender][band] = [...new Set(merged.map((s) => String(s).trim()).filter(Boolean))];
      }
    }
  }
  return out;
}

function migrateLegacyNamePools(parsed, basePools) {
  const out = clone(basePools);
  for (const vk of VILLAGE_KEYS) {
    const males = parsed.maleNames?.[vk];
    const females = parsed.femaleNames?.[vk];
    if (Array.isArray(males) && males.length) {
      out[vk].male.adult = [...new Set([...out[vk].male.adult, ...males.map(String)])];
    }
    if (Array.isArray(females) && females.length) {
      out[vk].female.adult = [...new Set([...out[vk].female.adult, ...females.map(String)])];
    }
  }
  return out;
}

function mergeSpritesForVillage(villageKey, savedSprites, defaultList) {
  if (!Array.isArray(savedSprites) || savedSprites.length === 0) return defaultList;
  return defaultList.map((def) => {
    const saved = savedSprites.find((s) => s.portraitIndex === def.portraitIndex);
    if (!saved) return def;
    return {
      ...def,
      ...saved,
      gender: saved.gender === "female" || saved.gender === "male" ? saved.gender : def.gender,
      ageBand: ["elder", "adult", "child"].includes(saved.ageBand) ? saved.ageBand : def.ageBand,
      title: saved.title || def.title,
      portraitIndex: def.portraitIndex,
      villageKey,
    };
  });
}

function getDefaults() {
  return {
    sprites: clone(DEFAULT_SPRITES),
    namePools: clone(DEFAULT_NAME_POOLS),
  };
}

export function loadSpriteConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const defaults = getDefaults();
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);

    const sprites = {};
    for (const vk of VILLAGE_KEYS) {
      sprites[vk] = mergeSpritesForVillage(vk, parsed.sprites?.[vk], defaults.sprites[vk]);
    }

    const namePools = parsed.namePools
      ? mergeNamePools(defaults.namePools, parsed.namePools)
      : migrateLegacyNamePools(parsed, defaults.namePools);

    return { sprites, namePools };
  } catch {
    return getDefaults();
  }
}

export function saveSpriteConfig(config) {
  const payload = {
    sprites: config.sprites,
    namePools: config.namePools,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function resetSpriteConfig() {
  localStorage.removeItem(STORAGE_KEY);
  return getDefaults();
}

/**
 * Random name matching gender + age band, with graceful fallback within gender.
 */
export function pickName(villageKey, gender, ageBand, config) {
  const poolsRoot = config?.namePools || DEFAULT_NAME_POOLS;
  const v = poolsRoot[villageKey];
  if (!v) return "Guest";

  const gKey = gender === "female" ? "female" : "male";
  const genderPools = v[gKey];
  if (!genderPools) return "Guest";

  const band = ["elder", "adult", "child"].includes(ageBand) ? ageBand : "adult";

  let pool = genderPools[band];
  if (!Array.isArray(pool) || pool.length === 0) pool = genderPools.adult;
  if (!Array.isArray(pool) || pool.length === 0) {
    pool = [...(genderPools.elder || []), ...(genderPools.child || [])];
  }
  if (!Array.isArray(pool) || pool.length === 0) return "Guest";
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getSpriteMetadata(villageKey, portraitIndex, config) {
  const sprites = config.sprites[villageKey] || DEFAULT_SPRITES[villageKey] || [];
  const hit = sprites.find((s) => s.portraitIndex === portraitIndex);
  if (hit) return hit;
  const { gender, ageBand } = archetypeAtIndex(portraitIndex);
  return {
    id: `${villageKey}_${portraitIndex}_fallback`,
    gender,
    ageBand,
    title: "customer",
    portraitIndex,
    villageKey,
  };
}
