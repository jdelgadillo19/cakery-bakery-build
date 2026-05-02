import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function DailyMissions({ missions = [] }) {
  const [open, setOpen] = useState(false);
  if (missions.length === 0) return null;

  const completed = missions.filter((m) => m.completed).length;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          <span className="font-display font-bold text-sm text-foreground">Daily Missions</span>
          <span className="text-xs bg-accent/10 text-accent font-display font-semibold px-2 py-0.5 rounded-full">
            {completed}/{missions.length}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2 border-t border-border pt-3">
              {missions.map((m) => {
                const pct = Math.min((m.progress / m.target) * 100, 100);
                return (
                  <div key={m.id} className={`rounded-lg px-3 py-2 ${m.completed ? "bg-success/8" : "bg-muted/40"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {m.completed
                          ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                          : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        }
                        <span className={`font-display text-xs font-medium ${m.completed ? "text-success line-through" : "text-foreground"}`}>
                          {m.label}
                        </span>
                      </div>
                      <span className="text-xs font-display text-accent font-bold">+{m.reward_xp} XP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-[10px] font-display text-muted-foreground whitespace-nowrap">
                        {m.progress}/{m.target}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}