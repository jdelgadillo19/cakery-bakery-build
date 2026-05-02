import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Package, ChefHat, Lock } from "lucide-react";
import { isFeatureUnlocked } from "@/lib/buildConfig";
import UpgradeModal from "@/components/game/UpgradeModal";

const ROLES = [
  {
    key: "cashier",
    label: "Cashier",
    icon: ShoppingCart,
    description: "Calculate order totals & make change",
    tutorialDay: 1,
    emoji: "🪙",
  },
  {
    key: "packager",
    label: "Packager",
    icon: Package,
    description: "Divide items into boxes using division",
    tutorialDay: 2,
    emoji: "📦",
  },
  {
    key: "baker",
    label: "Baker",
    icon: ChefHat,
    description: "Scale recipes to meet production targets",
    tutorialDay: 3,
    emoji: "🧁",
  },
];

/**
 * Manager Overview — shown at the start of each day.
 * isTutorial: locks all roles except the current tutorial day's role
 * currentDay: used to determine which role is unlocked in tutorial
 * onSelectRole: (roleKey) => void
 */
const ROLE_FEATURE_MAP = {
  cashier: "cashierRole",
  packager: "packagerRole",
  baker: "bakerRole",
};

const ROLE_UPGRADE_MESSAGES = {
  packager: "The Packager role (division problems) is available in the full version!",
  baker: "The Baker role (recipe scaling) is available in the full version!",
};

export default function ManagerOverview({ isTutorial, currentDay, onSelectRole }) {
  const [upgradeModal, setUpgradeModal] = useState({ open: false, message: "" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto"
    >
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xl">
        <h2 className="font-display font-bold text-xl text-foreground text-center mb-1">
          {isTutorial ? "Training Day" : "Manager Overview"}
        </h2>
        <p className="font-body text-sm text-muted-foreground text-center mb-6">
          {isTutorial
            ? "Complete today's training station to finish the day."
            : "Choose a station to work. Complete it to end the day."}
        </p>

        <div className="space-y-3">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const tutorialLocked = isTutorial && role.tutorialDay !== currentDay;
            const buildLocked = !isFeatureUnlocked(ROLE_FEATURE_MAP[role.key]);
            const isLocked = tutorialLocked || buildLocked;
            const isActive = isTutorial && role.tutorialDay === currentDay;

            const handleClick = () => {
              if (tutorialLocked) return;
              if (buildLocked) {
                setUpgradeModal({ open: true, message: ROLE_UPGRADE_MESSAGES[role.key] || "Get the full version!" });
                return;
              }
              onSelectRole(role.key);
            };

            return (
              <motion.button
                key={role.key}
                whileHover={!isLocked ? { scale: 1.02 } : {}}
                whileTap={!isLocked ? { scale: 0.98 } : {}}
                onClick={handleClick}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all flex items-center gap-4 ${
                  isLocked
                    ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                    : isActive
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/50 hover:bg-secondary/40 cursor-pointer"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                  isLocked ? "bg-muted" : "bg-primary/10"
                }`}>
                  {isLocked ? <Lock className="w-5 h-5 text-muted-foreground" /> : role.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-foreground">{role.label}</h3>
                    {isActive && (
                      <span className="text-[10px] bg-primary text-primary-foreground font-display font-bold px-1.5 py-0.5 rounded-full">
                        TODAY
                      </span>
                    )}
                    {tutorialLocked && isTutorial && (
                      <span className="text-[10px] bg-muted text-muted-foreground font-display font-bold px-1.5 py-0.5 rounded-full">
                        Day {role.tutorialDay}
                      </span>
                    )}
                    {buildLocked && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-display font-bold px-1.5 py-0.5 rounded-full">
                        Full version
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    {buildLocked ? "Available in the full version — tap to learn more." : role.description}
                  </p>
                </div>
                {!isLocked && (
                  <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, message: "" })}
        message={upgradeModal.message}
      />
    </motion.div>
  );
}