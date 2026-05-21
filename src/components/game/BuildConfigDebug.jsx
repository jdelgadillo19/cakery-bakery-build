// ============================================================
// CAKERY BAKERY — Build Config Debug Panel
// Shows current build version and feature unlock matrix.
// Only mount this in dev/debug contexts.
// ============================================================

import React, { useState } from "react";
import { useBuildConfig } from "@/lib/BuildConfigContext";
import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";

export default function BuildConfigDebug() {
  const { buildVersion, getFeatureMatrix } = useBuildConfig();
  const { user, profileTier, setProfileTier, isSupabaseConfigured } = useAuth();
  const [open, setOpen] = useState(false);
  const matrix = getFeatureMatrix();

  const unlocked = Object.entries(matrix).filter(([, v]) => v.unlocked);
  const locked   = Object.entries(matrix).filter(([, v]) => !v.unlocked);

  return (
    <div className="fixed bottom-16 right-4 z-50 max-w-xs w-full">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-violet-400 bg-violet-900/80 text-violet-200 font-display w-full justify-between shadow-lg"
      >
        <span className="flex items-center gap-1.5">
          <Settings className="w-3 h-3" />
          Build: <span className="font-bold uppercase">{buildVersion}</span>
          <span className="ml-1 text-violet-400">
            {unlocked.length}/{Object.keys(matrix).length} features
          </span>
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            className="mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-3 border-b border-border bg-muted/40">
              <p className="font-display font-bold text-xs text-foreground uppercase tracking-wide">
                Feature Matrix — <span className="text-primary">{buildVersion}</span>
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
              {isSupabaseConfigured && user?.id !== "local" && (
                <div className="px-3 py-2 bg-muted/30">
                  <p className="font-display text-xs text-foreground mb-2">Profile Tier ({user.email || user.id})</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProfileTier("beef")}
                      className={`px-2 py-1 text-xs rounded border ${
                        profileTier !== "guac" && profileTier !== "gold" && profileTier !== "paid"
                          ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                          : "bg-transparent border-border text-muted-foreground"
                      }`}
                    >
                      Beef
                    </button>
                    <button
                      onClick={() => setProfileTier("guac")}
                      className={`px-2 py-1 text-xs rounded border ${
                        profileTier === "guac" || profileTier === "gold" || profileTier === "paid"
                          ? "bg-violet-600/20 border-violet-500 text-violet-300"
                          : "bg-transparent border-border text-muted-foreground"
                      }`}
                    >
                      Guac
                    </button>
                  </div>
                </div>
              )}
              {unlocked.map(([key, cfg]) => (
                <div key={key} className="flex items-start gap-2 px-3 py-2">
                  <CheckCircle className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-display text-xs font-semibold text-foreground truncate">{key}</p>
                    <p className="text-xs text-muted-foreground font-body leading-tight">{cfg.description}</p>
                  </div>
                </div>
              ))}

              {locked.length > 0 && (
                <>
                  <div className="px-3 py-1.5 bg-muted/60">
                    <p className="font-display text-xs text-muted-foreground uppercase tracking-wide">
                      Locked in this build
                    </p>
                  </div>
                  {locked.map(([key, cfg]) => (
                    <div key={key} className="flex items-start gap-2 px-3 py-2 opacity-60">
                      <XCircle className="w-3 h-3 mt-0.5 text-destructive shrink-0" />
                      <div className="min-w-0">
                        <p className="font-display text-xs font-semibold text-foreground truncate">{key}</p>
                        <p className="text-xs text-muted-foreground font-body leading-tight">
                          Requires: <span className="font-semibold">{cfg.minTier}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}