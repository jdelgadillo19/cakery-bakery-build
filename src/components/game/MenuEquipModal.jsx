import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import MenuEquipBoard from "@/components/game/MenuEquipBoard";

/**
 * Full-screen modal that wraps the MenuEquipBoard. Used in both at-home and morning phases
 * so the same drag editor can be opened over either screen and dismissed back to it.
 */
export default function MenuEquipModal({ open, gameSave, onChange, onClose, title = "Edit recipe menu" }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="font-display font-bold gap-1 -ml-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <h2 className="font-display font-bold text-base text-foreground truncate">{title}</h2>
              <div className="w-16" />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              <MenuEquipBoard gameSave={gameSave} onChange={onChange} />
            </div>
            <div className="p-3 border-t border-border flex-shrink-0">
              <Button type="button" onClick={onClose} className="w-full font-display font-bold">
                Done
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
