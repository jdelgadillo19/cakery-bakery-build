// ============================================
// CAKERY BAKERY — Game Data & Configuration
// ============================================

import { loadSpriteConfig, pickName, getSpriteMetadata } from "@/lib/spriteConfig";
import { customerPortraitUrls } from "@/lib/localAssets";

// Character portraits per village — placeholders until art ships
export const CUSTOMER_PORTRAITS = {
  frontier_us: customerPortraitUrls("frontier_us"),
  paris: customerPortraitUrls("paris"),
  ming_china: customerPortraitUrls("ming_china"),
  london: customerPortraitUrls("london"),
};

export const VILLAGES = {
  frontier_us: {
    key: "frontier_us",
    name: "Dusty Trails, Montana",
    era: "American Frontier, 1870s",
    currency: "$",
    currencyName: "dollars",
    description: "A bustling frontier town where gold miners and cowboys need their daily bread.",
    bgImage: "/sprites/scenes/frontier_us.webp",
    accent: "from-amber-700 to-yellow-600",
    customerNames: [
      "Sheriff Buck", "Miss Dolly", "Old Pete", "Cowboy Jake", "Widow Martha",
      "Doc Holiday", "Little Timmy", "Prospector Dan", "Miss Clara", "Reverend John",
      "Farmer Hank", "Blacksmith Joe", "Teacher Anne", "Deputy Sam", "Rancher Bill"
    ],
  },
  paris: {
    key: "paris",
    name: "Montmartre, Paris",
    era: "Belle Époque Paris, 1890s",
    currency: "₣",
    currencyName: "francs",
    description: "A charming Parisian quarter where artists and poets crave your pastries.",
    bgImage: "/sprites/scenes/paris.webp",
    accent: "from-rose-600 to-pink-500",
    customerNames: [
      "Monsieur Pierre", "Madame Colette", "Le Petit Louis", "Mademoiselle Sophie",
      "Artiste Claude", "Chef André", "Fleuriste Marie", "Professeur Henri",
      "Boulanger Jean", "Danseuse Lila", "Poète Marcel", "Comtesse Élise",
      "Musicien Rémy", "Docteur François", "Couturière Amélie"
    ],
  },
  ming_china: {
    key: "ming_china",
    name: "Suzhou Watertown",
    era: "Late Qing Dynasty, 1880s",
    currency: "文",
    currencyName: "wén",
    description: "A peaceful watertown where scholars and merchants appreciate fine mooncakes.",
    bgImage: "/sprites/scenes/ming_china.webp",
    accent: "from-red-700 to-orange-600",
    customerNames: [
      "Scholar Wang", "Merchant Li", "Grandmother Chen", "Young Mei",
      "Fisherman Zhou", "Teacher Huang", "Healer Lin", "Captain Zhang",
      "Silk Weaver Bai", "Poet Su", "Farmer Guo", "Tea Master Wu",
      "Calligrapher Xu", "Herbalist Qian", "Boatman He"
    ],
  },
  london: {
    key: "london",
    name: "Covent Garden, London",
    era: "Victorian London, 1885",
    currency: "d",
    currencyName: "pence",
    description: "A foggy London market where chimney sweeps and lords alike love your scones.",
    bgImage: "/sprites/scenes/london.webp",
    accent: "from-slate-700 to-slate-500",
    customerNames: [
      "Lord Pemberton", "Mrs. Higgins", "Young Oliver", "Lady Ashworth",
      "Constable Wells", "Chimney Tom", "Miss Primrose", "Sir Reginald",
      "Cook Bertha", "Newsboy Charlie", "Governess Jane", "Butler Graves",
      "Flower Girl Eliza", "Professor Morley", "Merchant Brown"
    ],
  },
};

// Products per village — prices will be adjusted by difficulty
export const PRODUCTS = {
  frontier_us: [
    { id: "sourdough", name: "Sourdough Loaf", emoji: "🍞", basePrice: 3 },
    { id: "cornbread", name: "Cornbread", emoji: "🌽", basePrice: 2 },
    { id: "biscuit", name: "Buttermilk Biscuit", emoji: "🧈", basePrice: 1 },
    { id: "apple_pie", name: "Apple Pie", emoji: "🥧", basePrice: 5 },
    { id: "cookie", name: "Molasses Cookie", emoji: "🍪", basePrice: 1 },
    { id: "cinnamon_roll", name: "Cinnamon Roll", emoji: "🧁", basePrice: 2 },
  ],
  paris: [
    { id: "baguette", name: "Baguette", emoji: "🥖", basePrice: 3 },
    { id: "croissant", name: "Croissant", emoji: "🥐", basePrice: 2 },
    { id: "eclair", name: "Éclair", emoji: "⚡", basePrice: 4 },
    { id: "macaron", name: "Macaron", emoji: "🟣", basePrice: 2 },
    { id: "pain_chocolat", name: "Pain au Chocolat", emoji: "🍫", basePrice: 3 },
    { id: "tarte", name: "Tarte aux Fruits", emoji: "🍰", basePrice: 5 },
  ],
  ming_china: [
    { id: "mooncake", name: "Mooncake", emoji: "🥮", basePrice: 4 },
    { id: "mantou", name: "Mantou Bun", emoji: "🫓", basePrice: 1 },
    { id: "tangyuan", name: "Tangyuan", emoji: "🍡", basePrice: 2 },
    { id: "egg_tart", name: "Egg Tart", emoji: "🥧", basePrice: 3 },
    { id: "sesame_ball", name: "Sesame Ball", emoji: "🟤", basePrice: 2 },
    { id: "red_bean_bun", name: "Red Bean Bun", emoji: "🔴", basePrice: 2 },
  ],
  london: [
    { id: "scone", name: "Scone", emoji: "🫖", basePrice: 2 },
    { id: "crumpet", name: "Crumpet", emoji: "🥞", basePrice: 1 },
    { id: "meat_pie", name: "Meat Pie", emoji: "🥧", basePrice: 4 },
    { id: "victoria_sponge", name: "Victoria Sponge", emoji: "🎂", basePrice: 5 },
    { id: "shortbread", name: "Shortbread", emoji: "🍪", basePrice: 2 },
    { id: "chelsea_bun", name: "Chelsea Bun", emoji: "🧁", basePrice: 3 },
  ],
};

// Difficulty modifiers
export const DIFFICULTY_CONFIG = {
  beginner: {
    label: "Beginner",
    description: "Small orders, whole numbers only. Great for first-timers!",
    priceMultiplier: 1,
    useCents: false,
    centsOptions: [0],
    maxItems: 2,
    customersPerDay: 3,
    paymentBuffer: 5,
    xpMultiplier: 0.75,
    difficultyMult: 0.8,
    timeAdjust: 0,
  },
  easy: {
    label: "Easy",
    description: "Whole numbers only. Larger values, simple totals.",
    priceMultiplier: 1,
    useCents: false,
    centsOptions: [0],
    maxItems: 3,
    customersPerDay: 4,
    paymentBuffer: 5,
    xpMultiplier: 1,
    difficultyMult: 1.0,
    timeAdjust: 0,
  },
  medium: {
    label: "Medium",
    description: "Whole numbers and .50 increments only. No quarters!",
    priceMultiplier: 1,
    useCents: true,
    centsOptions: [0, 50],
    maxItems: 4,
    customersPerDay: 5,
    paymentBuffer: 10,
    xpMultiplier: 1.5,
    difficultyMult: 1.3,
    timeAdjust: 30,
  },
  hard: {
    label: "Hard",
    description: ".10 increments only (.10–.90). No .25, .50, or .75!",
    priceMultiplier: 1,
    useCents: true,
    centsOptions: [10, 20, 30, 40, 60, 70, 80, 90],
    maxItems: 5,
    customersPerDay: 6,
    paymentBuffer: 20,
    xpMultiplier: 2,
    difficultyMult: 1.6,
    timeAdjust: 60,
  },
  expert: {
    label: "Expert",
    description: "All decimals including .25 and .75. Mixed and unpredictable!",
    priceMultiplier: 1,
    useCents: true,
    centsOptions: [0, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90],
    maxItems: 6,
    customersPerDay: 8,
    paymentBuffer: 50,
    xpMultiplier: 3,
    difficultyMult: 2.0,
    timeAdjust: 120,
  },
};

// Level progression
export const LEVELS = [
  { level: 1, title: "Junior Cashier", xpRequired: 0, description: "You just started! Learn the basics." },
  { level: 2, title: "Senior Cashier", xpRequired: 200, description: "You're getting the hang of it!" },
  { level: 3, title: "Head Cashier", xpRequired: 500, description: "The boss trusts you with the till." },
  { level: 4, title: "Shift Manager", xpRequired: 1000, description: "You're running the show!" },
  { level: 5, title: "Bakery Manager", xpRequired: 2000, description: "The whole bakery is yours to manage." },
  { level: 6, title: "Bakery Owner", xpRequired: 4000, description: "Time to open a second location!" },
  { level: 7, title: "Chain Owner", xpRequired: 8000, description: "Your empire is growing!" },
];

// Generate adjusted prices based on difficulty
export function getProductsForDifficulty(villageKey, difficulty) {
  const products = PRODUCTS[villageKey] || [];
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;

  return products.map((p) => {
    let price = p.basePrice;
    if (config.useCents && config.centsOptions && config.centsOptions.length > 0) {
      const cents = config.centsOptions[Math.floor(Math.random() * config.centsOptions.length)];
      price = p.basePrice + cents / 100;
    }
    // Easy/Beginner: always whole number, no decimals
    if (!config.useCents) price = Math.round(price);
    return {
      ...p,
      price: Math.round(price * 100) / 100,
      image: `/sprites/products/${p.id}.png`,
    };
  });
}

// Pick a cents value for a product price at order-generation time (per-item randomness)
export function pickCentsForDifficulty(basePrice, difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  if (!config.useCents || !config.centsOptions || config.centsOptions.length === 0) {
    return Math.round(basePrice);
  }
  const cents = config.centsOptions[Math.floor(Math.random() * config.centsOptions.length)];
  return Math.round((basePrice + cents / 100) * 100) / 100;
}

// Generate a random customer order
export function generateCustomerOrder(villageKey, difficulty, products, couponPct = null) {
  const village = VILLAGES[villageKey];
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  if (!village || !products?.length) return null;

  const numItems = 1 + Math.floor(Math.random() * config.maxItems);

  const orderItems = [];
  const usedProducts = new Set();

  for (let i = 0; i < numItems; i++) {
    let product;
    do {
      product = products[Math.floor(Math.random() * products.length)];
    } while (usedProducts.has(product.id) && usedProducts.size < products.length);
    usedProducts.add(product.id);

    // Re-randomise price at order time so each customer gets fresh decimal values
    const livePrice = pickCentsForDifficulty(product.basePrice, difficulty);
    const quantity = 1 + Math.floor(Math.random() * 3);
    orderItems.push({
      ...product,
      price: livePrice,
      quantity,
      lineTotal: Math.round(livePrice * quantity * 100) / 100,
    });
  }

  const subtotal = Math.round(orderItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;

  // Apply coupon discount if present
  const discountAmount = couponPct ? Math.round(subtotal * couponPct / 100 * 100) / 100 : 0;
  const orderTotal = Math.round((subtotal - discountAmount) * 100) / 100;

  // Customer payment — realistic denomination: ends in 0 or 5, always > orderTotal
  const base = Math.ceil(orderTotal);
  const nextFive = base % 5 === 0 && base > orderTotal ? base : base + (5 - (base % 5));
  const nextTen = nextFive % 10 === 0 ? nextFive : nextFive + 5;
  const payment = Math.random() < 0.4 ? nextTen : nextFive;

  // Portrait — pick randomly from available portraits, then look up gender-validated name
  const portraits = CUSTOMER_PORTRAITS[villageKey] || [];
  const portraitIndex = portraits.length > 0 ? Math.floor(Math.random() * portraits.length) : 0;
  const entry = portraits[portraitIndex];
  const portrait = typeof entry === "string" ? entry : entry?.url ?? null;
  const portraitFallback = typeof entry === "string" ? null : entry?.fallback ?? null;

  // Sprite config — get gender for this portrait, then pick a matching name
  const spriteConfig = loadSpriteConfig();
  const spriteMeta = getSpriteMetadata(villageKey, portraitIndex, spriteConfig);
  const ageBand = spriteMeta.ageBand || "adult";
  const name = pickName(villageKey, spriteMeta.gender, ageBand, spriteConfig);

  return {
    customerName: name,
    customerGender: spriteMeta.gender,
    customerAgeBand: ageBand,
    customerTitle: spriteMeta.title,
    items: orderItems,
    subtotal,
    couponPct: couponPct || null,
    discountAmount,
    orderTotal,
    payment,
    correctChange: Math.round((payment - orderTotal) * 100) / 100,
    portrait,
    portraitIndex,
    portraitFallback,
  };
}

// ── Daily Missions ──────────────────────────────────────────────────────────
const MISSION_TEMPLATES = [
  { id: "serve_all", label: "Serve all customers without errors", target: 1, type: "perfect_day", reward_xp: 50 },
  { id: "streak_3", label: "Get a 3-answer streak", target: 3, type: "streak", reward_xp: 30 },
  { id: "streak_5", label: "Get a 5-answer streak", target: 5, type: "streak", reward_xp: 60 },
  { id: "correct_5", label: "Answer 5 questions correctly", target: 5, type: "correct_answers", reward_xp: 40 },
  { id: "correct_all", label: "Answer every question correctly today", target: 0, type: "perfect_accuracy", reward_xp: 75 },
  { id: "earn_10", label: "Earn at least 10 in sales today", target: 10, type: "earnings", reward_xp: 35 },
  { id: "earn_20", label: "Earn at least 20 in sales today", target: 20, type: "earnings", reward_xp: 55 },
];

export function generateDailyMissions(day, week) {
  // Pick 3 missions, vary by day
  const seed = day + week * 10;
  const selected = [];
  const indices = [seed % MISSION_TEMPLATES.length, (seed + 2) % MISSION_TEMPLATES.length, (seed + 4) % MISSION_TEMPLATES.length];
  const seen = new Set();
  for (const i of indices) {
    if (!seen.has(i)) {
      seen.add(i);
      const t = MISSION_TEMPLATES[i];
      selected.push({ ...t, progress: 0, completed: false, day, week });
    }
  }
  return selected;
}

export function updateMissionProgress(missions, event) {
  // event: { type: "correct_answers"|"streak"|"earnings"|"perfect_day"|"perfect_accuracy", value: number }
  return missions.map((m) => {
    if (m.completed) return m;
    let newProgress = m.progress;
    if (m.type === event.type) {
      if (m.type === "streak" || m.type === "correct_answers") {
        newProgress = Math.max(newProgress, event.value);
      } else if (m.type === "earnings") {
        newProgress = event.value;
      }
    }
    const completed = newProgress >= m.target && m.target > 0;
    return { ...m, progress: newProgress, completed };
  });
}

// ── Coupon / Loyalty (Hard mode) ─────────────────────────────────────────────
export const COUPON_DISCOUNTS = [10, 15, 20, 25];

export function maybeApplyCoupon(difficulty, loyaltyCards, customerName) {
  if (difficulty !== "hard" && difficulty !== "expert") return null;
  // 30% chance on hard, 50% on expert
  const threshold = difficulty === "expert" ? 0.5 : 0.3;
  if (Math.random() > threshold) return null;
  const pct = COUPON_DISCOUNTS[Math.floor(Math.random() * COUPON_DISCOUNTS.length)];
  return pct;
}

// XP rewards
export function calculateXP(correct, streak, difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const base = correct ? 20 : 0;
  const streakBonus = correct ? Math.min(streak * 5, 50) : 0;
  return Math.round((base + streakBonus) * (config?.xpMultiplier || 1));
}

export function getLevelForXP(xp) {
  let currentLevel = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.xpRequired) {
      currentLevel = level;
    } else {
      break;
    }
  }
  return currentLevel;
}

export function getNextLevel(xp) {
  for (const level of LEVELS) {
    if (xp < level.xpRequired) {
      return level;
    }
  }
  return null;
}