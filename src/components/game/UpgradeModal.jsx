// ============================================================
// CAKERY BAKERY — Upgrade CTA Modal
// Shown whenever a locked feature is tapped in free build.
// ============================================================

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, X } from "lucide-react";

/**
 * Placeholder — replace with real URL when ready.
 */
function handleUpgradeClick() {
  // TODO: replace with actual upgrade URL
  // window.open("https://your-upgrade-url.com", "_blank");
  console.log("[UpgradeModal] Upgrade button clicked — wire up URL here.");
}

/**
 * @param {{ open: boolean, onClose: () => void, message?: string }} props
 */
export default function UpgradeModal({ open, onClose, message }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <div className="relative">
                <Lock className="w-7 h-7 text-primary" />
                <Sparkles className="w-3.5 h-3.5 text-amber-400 absolute -top-1.5 -right-1.5" />
              </div>
            </div>

            {/* Heading */}
            <h2 className="font-display font-bold text-2xl text-foreground mb-2">
              Get the Full Version!
            </h2>

            {/* Sub-message */}
            <p className="font-body text-muted-foreground text-sm mb-2 leading-relaxed">
              {message || "This feature is part of the full Cakery Bakery experience."}
            </p>
            <p className="font-body text-muted-foreground text-sm mb-6 leading-relaxed">
              Unlock all villages, game modes, recipes, and unlimited weeks!
            </p>

            {/* CTA */}
            <Button
              size="lg"
              className="w-full h-12 font-display font-bold text-base shadow-lg"
              onClick={() => { handleUpgradeClick(); onClose(); }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>

            <button
              onClick={onClose}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors font-body"
            >
              Maybe later
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}