import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight, TrendingUp } from "lucide-react";

export default function DaySummary({
  dayNumber,
  customersServed,
  correctAnswers,
  totalAnswers,
  dayEarnings,
  xpEarned,
  streak,
  currency,
  onContinue,
  isLastDay,
  playerName,
  saving = false,
}) {
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
  const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0;

  const summaryMessage = accuracy >= 90
    ? `Outstanding${playerName ? `, ${playerName}` : ""}! ${accuracy}% accuracy — brilliant work!`
    : accuracy >= 60
    ? `Good effort${playerName ? `, ${playerName}` : ""}! ${accuracy}% accuracy today.`
    : `Tough day${playerName ? `, ${playerName}` : ""}. ${accuracy}% accuracy — you'll do better tomorrow!`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto"
    >
      <div className="bg-card rounded-2xl border border-border p-8 shadow-xl text-center">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">
          Day {dayNumber} Complete!
        </h2>
        <p className="font-body text-sm text-muted-foreground italic mb-5">{summaryMessage}</p>

        <div className="flex justify-center gap-1 mb-6">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.15 }}
            >
              <Star className={`w-8 h-8 ${i <= stars ? "text-primary fill-primary" : "text-muted"}`} />
            </motion.div>
          ))}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center bg-muted/50 rounded-lg px-4 py-3">
            <span className="font-display text-sm text-muted-foreground">Problems Solved</span>
            <span className="font-display font-bold text-foreground">{customersServed}</span>
          </div>
          <div className="flex justify-between items-center bg-muted/50 rounded-lg px-4 py-3">
            <span className="font-display text-sm text-muted-foreground">Accuracy</span>
            <span className="font-display font-bold text-foreground">{accuracy}%</span>
          </div>
          {dayEarnings > 0 && (
            <div className="flex justify-between items-center bg-muted/50 rounded-lg px-4 py-3">
              <span className="font-display text-sm text-muted-foreground">Earnings</span>
              <span className="font-display font-bold text-primary">{currency}{dayEarnings.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center bg-muted/50 rounded-lg px-4 py-3">
            <span className="font-display text-sm text-muted-foreground">XP Earned</span>
            <span className="font-display font-bold text-accent">+{xpEarned} XP</span>
          </div>
          {streak > 2 && (
            <div className="flex justify-between items-center bg-primary/5 rounded-lg px-4 py-3 border border-primary/20">
              <span className="font-display text-sm text-primary flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Best Streak
              </span>
              <span className="font-display font-bold text-primary">{streak} in a row!</span>
            </div>
          )}
        </div>

        <Button onClick={onContinue} disabled={saving} size="lg" className="w-full font-display font-bold text-base">
          {saving ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              {isLastDay ? "View Weekly Report" : "Next Day"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}