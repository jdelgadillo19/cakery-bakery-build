// ============================================================
// CAKERY BAKERY — Free Build End-of-Run Screen
// Replaces normal sleep screen after Day 5 in the free build.
// ============================================================

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, RotateCcw } from "lucide-react";

/**
 * @param {{
 *   bakeryName: string,
 *   totalEarned: number,
 *   currency: string,
 *   onPlayAgain: () => void,
 *   onMainMenu: () => void,
 * }} props
 */
export default function FreeRunEndScreen({ bakeryName, totalEarned, currency, onPlayAgain, onMainMenu }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto"
    >
      <div className="bg-card rounded-2xl border border-border p-8 shadow-xl text-center">
        <div className="text-5xl mb-4">🌙</div>

        <h2 className="font-display font-bold text-2xl text-foreground mb-1">
          Week Complete!
        </h2>
        <p className="font-body text-sm text-muted-foreground mb-2">
          {bakeryName}
        </p>

        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-6 inline-block w-full">
          <p className="font-body text-xs text-muted-foreground">Total Earned This Run</p>
          <p className="font-display font-bold text-3xl text-primary">
            {currency}{typeof totalEarned === "number" ? totalEarned.toFixed(2) : "0.00"}
          </p>
        </div>

        <p className="font-body text-sm text-muted-foreground mb-6 leading-relaxed">
          Want to keep going? Play again to try for a better score, or head back to the main menu.
        </p>

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full h-12 font-display font-bold"
            onClick={onPlayAgain}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Play Again
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-12 font-display font-bold"
            onClick={onMainMenu}
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Main Menu
          </Button>
        </div>

        <p className="mt-4 font-body text-xs text-muted-foreground">
          Session unlocks (Frontier US, Hard mode) remain available until you close the app.
        </p>
      </div>
    </motion.div>
  );
}