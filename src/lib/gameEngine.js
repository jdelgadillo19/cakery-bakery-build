// ============================================================
// CAKERY BAKERY — Game Engine
// Day-specific problem generation, state management helpers
// ============================================================

import {
  VILLAGES,
  getProductsForDifficulty,
  generateCustomerOrder,
  maybeApplyCoupon,
} from "@/lib/gameData";
import { isFeatureUnlocked } from "@/lib/buildConfig";
import { OWNER_PORTRAIT_BY_VILLAGE } from "@/lib/localAssets";

// Tutorial day roles
export const DAY_ROLES = {
  1: "cashier",   // Multiply & total
  2: "packager",  // Division
  3: "baker",     // Recipe scaling
};

// Baker owner portraits per village (local placeholders)
export const OWNER_PORTRAITS = OWNER_PORTRAIT_BY_VILLAGE;

// Intro dialogues per village (owner speaks, post locale-selection)
export const OWNER_INTRO_DIALOGUES = {
  paris: [
    "Bienvenue! I am your head baker here in Montmartre.",
    "We serve the finest pastries in all of Paris — but running a bakery takes sharp maths!",
    "Day 1: You will work the cash register. Add up each customer's order correctly.",
    "Allons-y — let's open the shop!",
  ],
  frontier_us: [
    "Howdy, partner! Welcome to the bakery — biggest one in Dusty Trails!",
    "We bake fresh every mornin' for miners, cowboys, and townsfolk alike.",
    "Day 1: You're on the till. Count those dollars carefully — no short-changing allowed!",
    "Let's get this show on the road!",
  ],
  ming_china: [
    "Welcome, young apprentice! Our shop has served Suzhou for three generations.",
    "Every mooncake, every bun must be counted with precision and care.",
    "Day 1: You will manage the cashier's desk. Calculate totals for each customer.",
    "Take a breath — and let us begin.",
  ],
  london: [
    "Right then! Welcome to the bakery — finest scones in all of Covent Garden.",
    "Our customers include lords, labourers, and everyone in between.",
    "Day 1: You're on the register. Add up each order correctly — no funny business!",
    "Chop chop — customers are waiting!",
  ],
};

// (Grandma's recipe replaced by locale-based recipe system in lib/recipeData.js)

// ── Pluralization helpers ────────────────────────────────────────────────────
function singularize(word) {
  if (!word) return word;
  // Handle "xes" → "x": boxes → box, foxes → fox
  if (word.endsWith("xes")) return word.slice(0, -2);
  // Handle "ches" → "ch": batches → batch
  if (word.endsWith("ches")) return word.slice(0, -2);
  // Handle "shes" → "sh": dishes → dish
  if (word.endsWith("shes")) return word.slice(0, -2);
  // Handle "ses" → "s": buses → bus
  if (word.endsWith("ses")) return word.slice(0, -2);
  // Handle plain "s": bags → bag, trays → tray, sets → set
  if (word.endsWith("s") && word.length > 2) return word.slice(0, -1);
  return word;
}

// Days per working week (week >= 1), then weekend
export const DAYS_PER_WORKING_WEEK = 5;

// ── Fresh day state factory ──────────────────────────────────────────────────
export function createFreshDayState(dayNumber, gameSave) {
  const week = gameSave?.current_week ?? 0;
  const isTutorial = week === 0;

  // Determine tutorial-assigned role, then safeguard against locked roles in free build
  let assignedRole = isTutorial ? (DAY_ROLES[dayNumber] || "cashier") : "cashier";
  if (assignedRole === "packager" && !isFeatureUnlocked("packagerRole")) assignedRole = "cashier";
  if (assignedRole === "baker" && !isFeatureUnlocked("bakerRole")) assignedRole = "cashier";

  return {
    currentDay: dayNumber,
    currentRole: assignedRole,
    dayActive: true,
    dayComplete: false,
    isTutorial,
    // Gameplay
    customerQueue: [],
    completedOrders: 0,        // total customers fully served
    totalProblemsSolved: 0,    // total problem steps solved (multi-phase = multiple steps)
    dayProgressComplete: false,
    // Timed-day: set to true when timer expires; day ends after current transaction done
    timerExpired: false,
    lastCallActive: false,     // true while serving the final transaction post-timer
    // orderLog: cashier receipts for end-day sum
    orderLog: [],
    receipts: [],
    // packagingLog: packager results for end-day total boxes question
    packagingLog: [],
    // ingredientTotals: baker — accumulated scaled ingredient usage per day
    ingredientTotals: {},
    mistakesMade: 0,
    currentProblem: null,
    // Stats — timed tracking
    dayCorrect: 0,              // correct answers (first or second try)
    dayTotal: 0,               // total answer attempts
    firstTryCorrect: 0,        // correct on first attempt
    secondTryCorrect: 0,       // correct on second attempt (after one wrong)
    dayEarnings: 0,
    correctTransactionTotal: 0, // sum of transaction values for correct completions only
    tipsEarned: 0,              // total tip coins (first-try perfect transactions)
    tippedTransactions: 0,      // count of first-try correct completions
    currentStreak: 0,
    bestStreak: 0,
    attempts: 0,                // attempts on current problem step
    currentTxFirstTry: true,    // tracks if current transaction is still on first try
  };
}

// ── DAY 1: Cashier Problems ──────────────────────────────────────────────────
export function generateCashierProblem(villageKey, difficulty, products) {
  const coupon = maybeApplyCoupon(difficulty);
  const safeProducts =
    Array.isArray(products) && products.length > 0
      ? products
      : getProductsForDifficulty(villageKey, difficulty);
  let order = generateCustomerOrder(villageKey, difficulty, safeProducts, coupon);
  if (!order) {
    order = generateCustomerOrder(villageKey, "easy", safeProducts, maybeApplyCoupon("easy"));
  }
  if (!order) {
    order = generateCustomerOrder(
      villageKey,
      "easy",
      getProductsForDifficulty(villageKey, "easy"),
      null,
    );
  }
  if (!order) {
    return {
      type: "cashier_total",
      order: {
        customerName: "Guest",
        customerGender: null,
        customerTitle: null,
        items: [{ id: "fallback", name: "Pastry", emoji: "🧁", basePrice: 3, price: 3, quantity: 1, lineTotal: 3 }],
        subtotal: 3,
        couponPct: null,
        discountAmount: 0,
        orderTotal: 3,
        payment: 5,
        correctChange: 2,
        portrait: null,
        portraitIndex: 0,
        portraitFallback: null,
      },
      phase: "calculate_total",
      answer: 3,
    };
  }
  return {
    type: "cashier_total",
    order,
    phase: "calculate_total", // calculate_total | make_change
    answer: order.orderTotal,
  };
}

// ── DAY 2: Packager Problems ─────────────────────────────────────────────────

// Fixed packaging config per item — sizes and container labels never change
const PACKAGING_CONFIG = {
  // frontier_us
  "Biscuits":         { sizes: [4, 6, 8, 12], container: "bags" },
  "Cornbread Slices": { sizes: [4, 6, 8, 10], container: "boxes" },
  "Cinnamon Rolls":   { sizes: [4, 6, 8, 12], container: "trays" },
  "Cookies":          { sizes: [6, 8, 10, 12], container: "boxes" },
  // paris
  "Macarons":         { sizes: [4, 6, 7, 9, 12], container: "boxes" },
  "Croissants":       { sizes: [4, 6, 8, 12], container: "bags" },
  "Éclairs":          { sizes: [6, 7, 8, 12], container: "trays" },
  "Pain au Chocolat": { sizes: [2, 4, 6, 8, 10, 12], container: "boxes" },
  "Tarte aux Fruits": { sizes: [4, 6, 8], container: "sets" },
  // ming_china
  "Sesame Balls":     { sizes: [4, 6, 8, 12], container: "bags" },
  "Red Bean Buns":    { sizes: [4, 6, 8, 10, 12], container: "boxes" },
  "Egg Tarts":        { sizes: [4, 6, 9, 12], container: "trays" },
  "Tangyuan":         { sizes: [6, 8, 10, 12], container: "boxes" },
  // london
  "Scones":           { sizes: [4, 6, 8, 12], container: "boxes" },
  "Crumpets":         { sizes: [4, 6, 8, 12], container: "bags" },
  "Shortbread Pieces":{ sizes: [6, 8, 10, 12], container: "boxes" },
  "Chelsea Buns":     { sizes: [4, 6, 8, 12], container: "trays" },
};

const PACKAGER_ITEMS = {
  frontier_us: ["Biscuits", "Cornbread Slices", "Cinnamon Rolls", "Cookies"],
  paris: ["Macarons", "Croissants", "Éclairs", "Pain au Chocolat", "Tarte aux Fruits"],
  ming_china: ["Sesame Balls", "Red Bean Buns", "Egg Tarts", "Tangyuan"],
  london: ["Scones", "Crumpets", "Shortbread Pieces", "Chelsea Buns"],
};

// Box count distribution biased toward 2–6, ~1-in-20 chance of 1 box
const BOX_COUNT_POOL = {
  easy:   [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 2, 3, 4, 5, 6, 3, 4, 3, 4, 1],
  medium: [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 3, 4, 5, 6, 4, 5, 3, 1],
  hard:   [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 4, 5, 6, 7, 8, 5, 6, 7, 4, 1],
};

export function generatePackagerProblem(villageKey, difficulty) {
  const items = PACKAGER_ITEMS[villageKey] || ["Biscuits"];
  const itemName = items[Math.floor(Math.random() * items.length)];

  const cfg = PACKAGING_CONFIG[itemName] || { sizes: [4, 6, 8], container: "boxes" };
  // Restrict to smaller sizes on easy
  const availableSizes = difficulty === "easy"
    ? cfg.sizes.filter((s) => s <= 8).length > 0
      ? cfg.sizes.filter((s) => s <= 8)
      : cfg.sizes.slice(0, 2)
    : cfg.sizes;

  const boxSize = availableSizes[Math.floor(Math.random() * availableSizes.length)];

  // Pick number of boxes — biased toward multi-box
  const countPool = BOX_COUNT_POOL[difficulty] || BOX_COUNT_POOL.easy;
  const numBoxes = countPool[Math.floor(Math.random() * countPool.length)];

  // Derive total from boxes × size (never backwards)
  const totalItems = boxSize * numBoxes;

  // Easy: clean division only (always exact, no remainder)
  // Medium/Hard: sometimes add a remainder
  let finalTotal = totalItems;
  let remainder = 0;
  if (difficulty !== "easy" && Math.random() < 0.6) {
    // Add a non-trivial remainder (1 to boxSize-1)
    remainder = 1 + Math.floor(Math.random() * (boxSize - 1));
    finalTotal = totalItems + remainder;
  }

  const container = cfg.container;

  return {
    type: "packager_division",
    itemName,
    itemType: itemName,
    container,
    totalItems: finalTotal,
    boxSize,
    answer: numBoxes,         // full boxes (no floating point weirdness)
    remainder,
    hasRemainder: remainder > 0,
    phase: "boxes",
    promptText: `You have ${finalTotal} ${itemName}. Each ${singularize(container)} holds ${boxSize}.`,
  };
}

// Baker problems are now generated via generateBakerProblemFromRecipes() in lib/recipeData.js
// Re-exported at the top of this file for convenience.

// ── XP per role ──────────────────────────────────────────────────────────────
export function calculateRoleXP(correct, streak, difficulty, role) {
  const multipliers = { easy: 1, medium: 1.5, hard: 2 };
  const roleBonus = { cashier: 1, packager: 1.2, baker: 1.5 };
  const base = correct ? 20 : 0;
  const streakBonus = correct ? Math.min(streak * 5, 50) : 0;
  return Math.round((base + streakBonus) * (multipliers[difficulty] || 1) * (roleBonus[role] || 1));
}

// How many problems per day
export const PROBLEMS_PER_DAY = {
  easy: 4,
  medium: 5,
  hard: 6,
};