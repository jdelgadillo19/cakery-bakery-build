// ============================================================
// CAKERY BAKERY — DayTimer
// Visual countdown display. Shows minutes:seconds + progress bar.
// Turns red in final 20 seconds.
// ============================================================

import React from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

export default function DayTimer({ secondsLeft, totalSeconds, hasExpired }) {
  const pct = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const isUrgent = secondsLeft <= 20 && !hasExpired;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <motion.div
      animate={isUrgent ? { scale: [1, 1.04, 1] } : {}}
      transition={isUrgent ? { repeat: Infinity, duration: 0.8 } : {}}
      className={`flex items-center gap-2 bg-card/90 border rounded-xl px-3 py-1.5 shadow ${
        hasExpired
          ? "border-muted text-muted-foreground"
          : isUrgent
          ? "border-destructive/60 text-destructive"
          : "border-border text-foreground"
      }`}
    >
      <Clock className={`w-4 h-4 flex-shrink-0 ${isUrgent && !hasExpired ? "text-destructive" : "text-muted-foreground"}`} />
      <span className="font-display font-bold text-sm tabular-nums">{hasExpired ? "Time's up!" : display}</span>

      {/* Progress bar */}
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isUrgent && !hasExpired ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </motion.div>
  );
}