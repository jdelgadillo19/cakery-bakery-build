import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

/**
 * ScoreBreakdown — clean arcade score display.
 * Props:
 *   breakdown: object from computeFinalScore
 *   currency: string
 *   isNewTop: boolean
 */
export default function ScoreBreakdown({ breakdown, currency = "$", isNewTop = false }) {
  if (!breakdown) return null;

  const {
    correctTransactionTotal = 0,
    playerEarningsScore     = 0,
    tipsEarned              = 0,
    tipsAfterMult           = 0,
    tippedTransactions      = 0,
    difficultyMult          = 1,
    accuracyPct             = 0,
    customersServed         = 0,
    finalScore              = 0,
    difficulty              = "easy",
  } = breakdown;

  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  const rows = [
    {
      label: `Correct transactions (×${difficultyMult.toFixed(1)} ${diffLabel})`,
      value: `${currency}${playerEarningsScore.toFixed(2)}`,
      highlight: false,
    },
    {
      label: `Tips earned (${tippedTransactions} perfect tx)`,
      value: `+${currency}${tipsAfterMult.toFixed(2)}`,
      highlight: false,
    },
    {
      label: "Customers served",
      value: customersServed,
      highlight: false,
    },
    {
      label: "Accuracy",
      value: `${accuracyPct}%`,
      highlight: false,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {isNewTop && (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center justify-center gap-2 bg-amber-100 border border-amber-300 rounded-xl px-4 py-2"
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="font-display font-bold text-amber-700 text-sm">New Personal Best!</span>
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
        </motion.div>
      )}

      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-between bg-muted/50 rounded-lg px-3 py-2">
            <span className="font-display text-sm text-muted-foreground">{row.label}</span>
            <span className="font-display font-bold text-sm text-foreground">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
        <span className="font-display font-bold text-foreground">Final Score</span>
        <span className="font-display font-bold text-xl text-primary">{currency}{finalScore.toFixed(2)}</span>
      </div>
    </motion.div>
  );
}