import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GameSave } from "@/lib/localEntities";
import { Button } from "@/components/ui/button";
import { Bug, Calendar, Trophy, Users, Lock, Unlock, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { isFeatureUnlocked } from "@/lib/buildConfig";
import {
  isPaidContentUnlocked, setPaidContentUnlock,
  isProgressionUnlocked, setProgressionUnlock,
  isAllContentUnlocked, setAllContentUnlock,
} from "@/lib/debugOverrides";

// ── Toggle Button ─────────────────────────────────────────────────────────────
function DebugToggle({ label, sublabel, enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
        enabled
          ? "border-yellow-500 bg-yellow-100"
          : "border-yellow-300 bg-white/50 hover:bg-yellow-50"
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${enabled ? "bg-yellow-500" : "bg-yellow-200"}`}>
        {enabled ? <Unlock className="w-4 h-4 text-white" /> : <Lock className="w-4 h-4 text-yellow-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-xs text-yellow-800">{label}</p>
        <p className="font-body text-xs text-yellow-600 truncate">{sublabel}</p>
      </div>
      <div className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${enabled ? "bg-yellow-500" : "bg-yellow-300"}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
      </div>
    </button>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function DebugPanel({ saves, onOpenSpriteMenu }) {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  // Re-render when toggles change
  const [, forceUpdate] = useState(0);
  const allEnabled  = isAllContentUnlocked();
  const paidEnabled = isPaidContentUnlocked();
  const progEnabled = isProgressionUnlocked();

  const handleAllToggle = () => {
    setAllContentUnlock(!allEnabled);
    forceUpdate((n) => n + 1);
  };
  const handlePaidToggle = () => {
    setPaidContentUnlock(!paidEnabled);
    forceUpdate((n) => n + 1);
  };
  const handleProgToggle = () => {
    setProgressionUnlock(!progEnabled);
    forceUpdate((n) => n + 1);
  };

  const jumpToDay = async (save, day, week) => {
    const cappedWeek = isFeatureUnlocked("multipleWeeks") ? week : Math.min(week, 1);
    const cappedDay  = isFeatureUnlocked("multipleWeeks") ? day  : Math.min(day, 5);
    await GameSave.update(save.id, { current_day: cappedDay, current_week: cappedWeek });
    queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
    navigate(`/play?id=${save.id}`);
  };

  const jumpToWeeklySummary = async (save) => {
    await GameSave.update(save.id, { current_day: 6 });
    queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
    navigate(`/weekly-summary?id=${save.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-yellow-600" />
          <span className="font-display font-bold text-yellow-800 text-sm">Debug Controls</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" variant="outline"
            className="h-7 px-2 text-xs font-display border-yellow-400 bg-yellow-100 hover:bg-yellow-200"
            onClick={() => navigate("/arcade-setup")}
          >
            <Zap className="w-3 h-3 mr-1" /> Arcade
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-7 px-2 text-xs font-display border-yellow-400 bg-yellow-100 hover:bg-yellow-200"
            onClick={onOpenSpriteMenu}
          >
            <Users className="w-3 h-3 mr-1" /> Sprites
          </Button>
        </div>
      </div>

      {/* ── Debug Toggles ── */}
      <div className="space-y-2">
        <p className="font-display font-bold text-xs text-yellow-700 uppercase tracking-wide">Override Toggles</p>
        <DebugToggle
          label="Unlock Everything"
          sublabel="Master override: all content, all locales, all modes"
          enabled={allEnabled}
          onToggle={handleAllToggle}
        />
        <DebugToggle
          label="Unlock All Paid Content"
          sublabel="Hard, Expert + future paid features"
          enabled={paidEnabled}
          onToggle={handlePaidToggle}
        />
        <DebugToggle
          label="Unlock All Progression"
          sublabel="Easy, Medium, Frontier US + locale gates"
          enabled={progEnabled}
          onToggle={handleProgToggle}
        />
        {(allEnabled || paidEnabled || progEnabled) && (
          <p className="font-body text-xs text-yellow-600 text-center">
            ⚠ Debug overrides active — turn off to restore normal progression
          </p>
        )}
      </div>

      {/* ── Story Mode save controls ── */}
      {saves && saves.length > 0 && (
        <div className="space-y-2">
          <p className="font-display font-bold text-xs text-yellow-700 uppercase tracking-wide">Story Save Controls</p>
          {saves.map((save) => (
            <div key={save.id} className="bg-white/70 rounded-lg p-3 space-y-2">
              <p className="font-display font-bold text-xs text-yellow-800 truncate">{save.bakery_name}</p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5].map((day) => (
                  <Button
                    key={day} size="sm" variant="outline"
                    className="h-7 px-2 text-xs font-display border-yellow-300 hover:bg-yellow-100"
                    onClick={() => jumpToDay(save, day, save.current_week || 1)}
                  >
                    <Calendar className="w-3 h-3 mr-1" />D{day}
                  </Button>
                ))}
                <Button
                  size="sm" variant="outline"
                  className="h-7 px-2 text-xs font-display border-yellow-400 bg-yellow-100 hover:bg-yellow-200"
                  onClick={() => jumpToWeeklySummary(save)}
                >
                  <Trophy className="w-3 h-3 mr-1" />Summary
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}