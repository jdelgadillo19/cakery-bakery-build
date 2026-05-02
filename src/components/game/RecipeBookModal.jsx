import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { isRecipeBookUnlocked } from "@/lib/recipeBook";
import { VILLAGES } from "@/lib/gameData";
import RecipeBookPanel from "@/components/game/RecipeBookPanel";
import MenuEquipBoard from "@/components/game/MenuEquipBoard";

export default function RecipeBookModal({ gameSave, onClose, onPurchase, onEquipChange, onSlotUpgrade }) {
  const village = VILLAGES[gameSave.village];
  const currency = village?.currency || "$";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
    >
      <RecipeBookPanel
        variant="shop"
        viewSave={gameSave}
        currency={currency}
        unlocked={isRecipeBookUnlocked(gameSave)}
        title="Recipe Book"
        headerRight={
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        }
        headerBelow={
          isRecipeBookUnlocked(gameSave) ? (
            <div className="px-5 pb-3 border-b border-border overflow-y-auto max-h-[38vh] shrink-0">
              <MenuEquipBoard gameSave={gameSave} onChange={onEquipChange} />
            </div>
          ) : null
        }
        onPurchase={onPurchase}
        onSlotUpgrade={onSlotUpgrade}
      />
    </motion.div>
  );
}
