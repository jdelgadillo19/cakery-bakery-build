// ============================================================
// CAKERY BAKERY — Day 5 Unlock Modal
// Shown once per session when Day 5 is completed in free build.
// Celebrates unlocking Frontier US locale + Hard difficulty.
// ============================================================

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, MapPin } from "lucide-react";
import { playSFX } from "@/lib/audio";
import { VILLAGES } from "@/lib/gameData";

const FRONTIER_IMAGE = VILLAGES.frontier_us.bgImage;

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function Day5UnlockModal({ open, onClose }) {
  useEffect(() => {
    if (open) playSFX("correct");
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 28 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
          >
            {/* Locale image banner */}
            <div className="relative h-36 w-full overflow-hidden">
              <img
                src={FRONTIER_IMAGE}
                alt="Frontier US"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-4 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span className="font-display font-bold text-white text-base drop-shadow">Frontier US Unlocked!</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                className="text-4xl mb-3"
              >
                🎉
              </motion.div>

              <h2 className="font-display font-bold text-2xl text-foreground mb-2">
                Day 5 Complete!
              </h2>
              <p className="font-body text-sm text-muted-foreground mb-5 leading-relaxed">
                You've permanently unlocked two new options:
              </p>

              {/* Unlock list */}
              <div className="space-y-2 mb-6 text-left">
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                  <span className="text-xl">🤠</span>
                  <div>
                    <p className="font-display font-bold text-sm text-foreground">Frontier US</p>
                    <p className="font-body text-xs text-muted-foreground">New bakery locale permanently unlocked</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  <div className="flex gap-0.5">
                    {[1,2,3].map((i) => <Star key={i} className="w-4 h-4 text-red-500 fill-red-500" />)}
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm text-foreground">Hard Difficulty</p>
                    <p className="font-body text-xs text-muted-foreground">Permanently unlocked for your account</p>
                  </div>
                </div>
              </div>

              <p className="font-body text-xs text-muted-foreground mb-4 leading-relaxed">
                These unlocks are saved permanently. Get the full version for all locales and game modes!
              </p>

              <Button
                size="lg"
                className="w-full h-11 font-display font-bold"
                onClick={onClose}
              >
                Awesome! 🎊
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}