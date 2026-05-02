import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Save, Home, Play } from "lucide-react";

export default function GameMenu({ open, onClose, onSave, onQuit, isSaving }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.92, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 pointer-events-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🧁</span>
                  <h2 className="font-display font-bold text-xl text-foreground">Game Menu</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-12 font-display font-bold text-base justify-start gap-3"
                  onClick={onClose}
                >
                  <Play className="w-5 h-5 text-primary" />
                  Resume Game
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 font-display font-bold text-base justify-start gap-3"
                  onClick={onSave}
                  disabled={isSaving}
                >
                  <Save className="w-5 h-5 text-primary" />
                  {isSaving ? "Saving…" : "Save Game"}
                </Button>

                <div className="border-t border-border pt-3">
                  <Button
                    variant="destructive"
                    className="w-full h-12 font-display font-bold text-base justify-start gap-3"
                    onClick={onQuit}
                    disabled={isSaving}
                  >
                    <Home className="w-5 h-5" />
                    {isSaving ? "Saving & Quitting…" : "Quit to Main Menu"}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground font-body text-center mt-4">
                Your progress is saved automatically at the end of each day.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}