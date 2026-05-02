// SpriteProcessingOverlay — shown once during first-time sprite processing
import React from "react";
import { motion } from "framer-motion";

export default function SpriteProcessingOverlay({ progress }) {
  const { done, total, currentId } = progress;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70"
    >
      <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-xs w-full text-center space-y-4">
        <div className="text-4xl">🎨</div>
        <h3 className="font-display font-bold text-lg text-foreground">Preparing Sprites</h3>
        <p className="font-body text-sm text-muted-foreground">
          Processing character art for the first time…
        </p>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <p className="font-display text-xs text-muted-foreground">
          {done} / {total} sprites — {pct}%
        </p>
        {currentId && (
          <p className="font-display text-[10px] text-muted-foreground/60 truncate">{currentId}</p>
        )}
        <p className="font-display text-xs text-muted-foreground/50 italic">This only happens once.</p>
      </div>
    </motion.div>
  );
}