// ============================================================
// CAKERY BAKERY — Economy Engine
// Arcade scoring model:
//   playerEarningsScore = sum(correct transaction values) × difficultyMult
//   tipsEarned          = count(perfect transactions) × tipPerTransaction
//   finalScore          = playerEarningsScore + (tipsEarned × difficultyMult)
// ============================================================

const DIFFICULTY_MULT = { beginner: 0.8, easy: 1.0, medium: 1.5, hard: 2.0, expert: 2.5 };

// Tip awarded per phase completed on first try
const TIP_PER_PHASE = 0.50; // +0.50 cost calc + 0.50 change calc = $1.00 for perfect cashier tx

/**
 * Get the difficulty multiplier for a given difficulty string.
 */
export function getDifficultyMult(difficulty) {
  return DIFFICULTY_MULT[difficulty] || 1.0;
}

/**
 * Base earnings for a single correctly solved transaction.
 * recipe: optional recipe object with incomeMultiplier (baker role)
 */
export function calcProblemEarnings(difficulty, recipe = null) {
  if (recipe?.display_price != null) {
    return Math.round(Number(recipe.display_price) * 100) / 100;
  }
  const BASE = { easy: 3, medium: 6, hard: 12 };
  const base = BASE[difficulty] || BASE.easy;
  const mult = recipe?.incomeMultiplier || 1.0;
  return Math.round(base * mult * 100) / 100;
}

/**
 * Compute the final score from day state.
 *
 * correctTransactionTotal: sum of calcProblemEarnings for every fully-correct transaction
 * tipsEarned:              total tip coins from first-try completions
 * tippedTransactions:      count of transactions completed first-try
 * dayCorrect, dayTotal:    for accuracy display only
 * difficulty:              string
 *
 * Returns:
 * {
 *   correctTransactionTotal,
 *   difficultyMult,
 *   playerEarningsScore,   ← correct totals × difficulty (step 1)
 *   tipsEarned,
 *   tippedTransactions,
 *   tipsAfterMult,         ← tips × difficulty (step 2 component)
 *   finalScore,            ← playerEarningsScore + tipsAfterMult
 *   total,                 ← alias for finalScore
 *   accuracyPct,
 *   customersServed,
 * }
 */
export function computeFinalScore({
  correctTransactionTotal,
  tipsEarned,
  tippedTransactions,
  dayCorrect,
  dayTotal,
  customersServed,
  difficulty,
}) {
  const difficultyMult       = getDifficultyMult(difficulty);
  const playerEarningsScore  = Math.round(correctTransactionTotal * difficultyMult * 100) / 100;
  const tipsAfterMult        = Math.round(tipsEarned * difficultyMult * 100) / 100;
  const finalScore           = Math.round((playerEarningsScore + tipsAfterMult) * 100) / 100;
  const accuracyPct          = dayTotal > 0 ? Math.round((dayCorrect / dayTotal) * 100) : 0;

  return {
    correctTransactionTotal,
    difficultyMult,
    playerEarningsScore,
    tipsEarned,
    tippedTransactions: tippedTransactions || 0,
    tipsAfterMult,
    finalScore,
    total: finalScore,
    accuracyPct,
    customersServed: customersServed || 0,
    difficulty,
  };
}

/**
 * Legacy alias — kept for EndDayDebrief fallback path.
 * Uses the new arcade model internally.
 */
export function buildDaySummary({ firstTryValue, secondTryValue, rawEarnings, accuracy, problemsCorrect, dayTotal, difficulty }) {
  // Reconstruct a minimal breakdown for display in the debrief
  const accuracyPct = Math.round((accuracy || 0) * 100);
  const difficultyMult = getDifficultyMult(difficulty);
  const playerEarningsScore = Math.round((rawEarnings || 0) * difficultyMult * 100) / 100;
  return {
    correctTransactionTotal: rawEarnings || 0,
    difficultyMult,
    playerEarningsScore,
    tipsEarned: 0,
    tippedTransactions: 0,
    tipsAfterMult: 0,
    finalScore: playerEarningsScore,
    total: playerEarningsScore,
    accuracyPct,
    customersServed: problemsCorrect || 0,
    difficulty,
  };
}