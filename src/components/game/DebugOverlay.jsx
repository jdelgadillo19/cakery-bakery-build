import React from "react";
import { motion } from "framer-motion";

export default function DebugOverlay({ dayState, gameSave, customerIndex, totalProblems }) {
  if (!dayState) return null;

  const rows = [
    ["currentDay", dayState.currentDay],
    ["currentRole", dayState.currentRole],
    ["dayActive", String(dayState.dayActive)],
    ["dayComplete", String(dayState.dayComplete)],
    ["dayProgressComplete", String(dayState.dayProgressComplete)],
    ["completedOrders", dayState.completedOrders],
    ["totalProblemsSolved", dayState.totalProblemsSolved],
    ["totalProblems", totalProblems],
    ["receipts.length", (dayState.receipts || []).length],
    ["mistakesMade", dayState.mistakesMade],
    ["dayCorrect", dayState.dayCorrect],
    ["dayTotal", dayState.dayTotal],
    ["dayEarnings", typeof dayState.dayEarnings === "number" ? dayState.dayEarnings.toFixed(2) : dayState.dayEarnings],
    ["dayXP", dayState.dayXP],
    ["currentStreak", dayState.currentStreak],
    ["bestStreak", dayState.bestStreak],
    ["attempts", dayState.attempts],
    ["customerIndex", customerIndex],
    ...(gameSave ? [
      ["save.current_day", gameSave.current_day],
      ["save.current_week", gameSave.current_week],
      ["save.experience", gameSave.experience],
      ["save.total_coins", gameSave.total_coins],
    ] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-16 right-2 z-50 bg-black/85 text-yellow-300 text-[10px] font-mono rounded-lg p-3 max-h-[70vh] overflow-auto w-52 shadow-2xl border border-yellow-500/30"
    >
      <div className="font-bold text-yellow-400 mb-2 text-xs">🐛 DEBUG</div>
      <table className="w-full">
        <tbody>
          {rows.map(([key, val]) => (
            <tr key={key} className="border-b border-yellow-900/30">
              <td className="pr-2 py-0.5 text-yellow-500 whitespace-nowrap">{key}</td>
              <td className="py-0.5 text-yellow-200 font-bold text-right">{String(val)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}