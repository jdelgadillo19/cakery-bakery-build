// ============================================================
// CAKERY BAKERY — Recipe Database & Conversion System
// ============================================================

// Grams per 1 cup (or per 1 unit for eggs)
export const CONVERSION_TABLE = {
  flour:     120,
  sugar:     200,
  butter:    230,
  water:     240,
  milk:      240,
  chocolate: 180,
  yeast:     150,
  fruit:     150,
  nuts:   110,
  eggs:      1,   // eggs are counted, not weighed
};

// Raw recipes per locale — ingredients in grams (eggs as count)
export const RAW_RECIPES = {
  paris: [
    {
      recipeId: "paris_baguette",
      name: "Baguette",
      yield: 4,
      ingredients: { flour: 720, water: 530, yeast: 12, salt: 12 },
    },
    {
      recipeId: "paris_croissant",
      name: "Croissant",
      yield: 8,
      ingredients: { flour: 500, butter: 300, milk: 120, sugar: 50, yeast: 10 },
    },
    {
      recipeId: "paris_macaron",
      name: "Macaron",
      yield: 36,
      ingredients: { sugar: 200, eggs: 4, butter: 230, water: 45, nuts: 110 },
    },
    {
      recipeId: "paris_pain_chocolat",
      name: "Pain au Chocolat",
      yield: 8,
      ingredients: { flour: 360, butter: 230, milk: 120, chocolate: 90, yeast: 10, sugar: 25 },
    },
  ],
  frontier_us: [
    {
      recipeId: "frontier_sourdough",
      name: "Sourdough Loaf",
      yield: 2,
      ingredients: { flour: 600, water: 420, yeast: 8, salt: 10 },
    },
    {
      recipeId: "frontier_apple_pie",
      name: "Apple Pie",
      yield: 8,
      ingredients: { flour: 360, butter: 230, sugar: 200, fruit: 600 },
    },
    {
      recipeId: "frontier_cinnamon",
      name: "Cinnamon Roll",
      yield: 12,
      ingredients: { flour: 480, milk: 240, butter: 115, sugar: 100, eggs: 2 },
    },
    {
      recipeId: "frontier_cookie",
      name: "Molasses Cookie",
      yield: 24,
      ingredients: { flour: 360, butter: 115, sugar: 200, eggs: 2, milk: 30 },
    },
  ],
  ming_china: [
    {
      recipeId: "ming_mooncake",
      name: "Mooncake",
      yield: 12,
      ingredients: { flour: 300, sugar: 240, butter: 115, fruit: 300, eggs: 2 },
    },
    {
      recipeId: "ming_mantou",
      name: "Mantou Bun",
      yield: 16,
      ingredients: { flour: 480, water: 240, sugar: 50, yeast: 8 },
    },
    {
      recipeId: "ming_sesame",
      name: "Sesame Ball",
      yield: 20,
      ingredients: { flour: 360, sugar: 160, water: 200, nuts: 110 },
    },
    {
      recipeId: "ming_red_bean",
      name: "Red Bean Bun",
      yield: 16,
      ingredients: { flour: 480, water: 240, sugar: 50, fruit: 240, yeast: 8 },
    },
  ],
  london: [
    {
      recipeId: "london_scone",
      name: "Scone",
      yield: 12,
      ingredients: { flour: 360, butter: 115, milk: 120, sugar: 50, eggs: 2 },
    },
    {
      recipeId: "london_victoria",
      name: "Victoria Sponge",
      yield: 8,
      ingredients: { flour: 240, butter: 230, sugar: 200, eggs: 4, milk: 60 },
    },
    {
      recipeId: "london_shortbread",
      name: "Shortbread",
      yield: 24,
      ingredients: { flour: 300, butter: 230, sugar: 100 },
    },
    {
      recipeId: "london_empire_biscuit",
      name: "Empire Biscuit",
      yield: 20,
      ingredients: { flour: 300, butter: 175, sugar: 100, fruit: 60 },
    },
  ],
};

// ── Conversion helpers ────────────────────────────────────────────────────────

/** Round to nearest 0.25 */
function roundQuarter(n) {
  return Math.round(n * 4) / 4;
}

/** Format a cup value as a readable string */
function formatCups(val) {
  if (val === 0) return "0 cups";
  if (val >= 0.25) {
    const label = val === 1 ? "cup" : "cups";
    return `${val} ${label}`;
  }
  // Convert to tablespoons / teaspoons
  const tbsp = val * 16;
  if (tbsp >= 1) {
    const rounded = roundQuarter(tbsp);
    const label = rounded === 1 ? "tbsp" : "tbsp";
    return `${rounded} ${label}`;
  }
  const tsp = val * 48;
  const rounded = roundQuarter(tsp);
  return `${rounded} tsp`;
}

/** Convert a single ingredient amount (grams) for a given difficulty */
function convertIngredient(ingredient, grams, difficulty) {
  if (ingredient === "eggs") {
    return { value: grams, display: grams === 1 ? "1 egg" : `${grams} eggs`, unit: "eggs", rawValue: grams };
  }

  const gramsPerCup = CONVERSION_TABLE[ingredient] || 200;

  if (difficulty === "easy") {
    // grams → cups, rounded to 0.25, with tbsp/tsp fallback
    const cups = grams / gramsPerCup;
    const rounded = roundQuarter(cups);
    const display = formatCups(rounded || cups); // if rounds to 0, use raw
    return { value: rounded || cups, display, unit: "cups", rawValue: rounded || cups };
  }

  if (difficulty === "medium") {
    // grams → ounces (1 oz = 28.35 g), rounded to 0.25
    const oz = grams / 28.35;
    const rounded = roundQuarter(oz);
    const label = rounded === 1 ? "oz" : "oz";
    return { value: rounded, display: `${rounded} oz`, unit: "oz", rawValue: rounded };
  }

  // hard: keep grams
  return { value: grams, display: `${grams} g`, unit: "g", rawValue: grams };
}

/**
 * Convert all recipes for a given locale + difficulty.
 * Called ONCE at the start of the playthrough.
 *
 * Returns: Array of converted recipes:
 * [
 *   {
 *     name, yield,
 *     ingredients: { flour: { value, display, unit, rawValue }, ... }
 *   }
 * ]
 */
export function convertRecipesForDifficulty(villageKey, difficulty) {
  const recipes = RAW_RECIPES[villageKey] || RAW_RECIPES.paris;
  return recipes.map((recipe) => {
    const convertedIngredients = {};
    for (const [ingredient, grams] of Object.entries(recipe.ingredients)) {
      convertedIngredients[ingredient] = convertIngredient(ingredient, grams, difficulty);
    }
    return {
      recipeId: recipe.recipeId,
      name: recipe.name,
      yield: recipe.yield,
      ingredients: convertedIngredients,
    };
  });
}

function buildBakerPrompt(recipeName, baseYield, targetYield, baseIngredient, ingredientKey) {
  // Avoid "X eggs of eggs" — eggs already have their own display ("2 eggs")
  const isEggs = ingredientKey === "eggs";
  const usesText = isEggs
    ? `uses ${baseIngredient.display}`
    : `uses ${baseIngredient.display} of ${ingredientKey}`;
  const howMuchText = isEggs ? `How many eggs do you need?` : `How much ${ingredientKey} do you need?`;
  return `The ${recipeName} recipe makes ${baseYield} items and ${usesText}. You need to make ${targetYield} items. ${howMuchText}`;
}

/**
 * Generate a baker problem from a converted recipe.
 * Picks a random recipe + multiplier + ingredient to ask about.
 *
 * Returns problem object compatible with the existing type: "baker_scaling" shape.
 */
export function generateBakerProblemFromRecipes(convertedRecipes, difficulty, problemIndex) {
  const MULTIPLIERS = {
    easy: [2, 3, 4, 5],
    medium: [1.5, 2.5, 3, 4, 6],
    hard: [1.25, 2.5, 3.5, 7.5, 10],
  };
  const multipliers = MULTIPLIERS[difficulty] || MULTIPLIERS.easy;
  const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];

  // Pick recipe (cycle through them)
  const recipe = convertedRecipes[problemIndex % convertedRecipes.length];

  // Pick ingredient to ask about — exclude ones with very small values for easy
  const ingredientKeys = Object.keys(recipe.ingredients);
  const eligibleKeys = difficulty === "easy"
    ? ingredientKeys.filter((k) => recipe.ingredients[k].value >= 0.25)
    : ingredientKeys;
  const targetKey = eligibleKeys[Math.floor(Math.random() * eligibleKeys.length)] || ingredientKeys[0];

  const baseIngredient = recipe.ingredients[targetKey];
  const scaledRaw = baseIngredient.rawValue * multiplier;

  // Round answer based on difficulty
  let answer, answerDisplay;
  if (difficulty === "easy") {
    answer = Math.round(scaledRaw * 4) / 4; // round to 0.25
    answerDisplay = formatCups(answer);
  } else if (difficulty === "medium") {
    answer = Math.round(scaledRaw * 4) / 4; // round to 0.25 oz
    answerDisplay = `${answer} oz`;
  } else {
    answer = Math.round(scaledRaw * 100) / 100; // grams, 2dp
    answerDisplay = `${answer} g`;
  }

  const targetYield = recipe.yield * multiplier;

  return {
    type: "baker_scaling",
    recipeId: recipe.recipeId,
    recipeName: recipe.name,
    baseYield: recipe.yield,
    targetYield,
    multiplier,
    ingredientKey: targetKey,
    ingredient: {
      name: targetKey,
      amount: baseIngredient.value,
      unit: baseIngredient.unit,
      display: baseIngredient.display,
    },
    convertedRecipe: recipe, // full recipe for the recipe card UI
    answer,
    answerDisplay,
    promptText: buildBakerPrompt(recipe.name, recipe.yield, targetYield, baseIngredient, targetKey),
  };
}