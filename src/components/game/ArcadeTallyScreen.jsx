// ============================================================
// CAKERY BAKERY — ArcadeTallyScreen
//
// Shown AFTER the Head Baker dialogue, BEFORE end-of-run.
// Player must sum all receipts from the day.
// 2 attempts: first-try = $5 bonus, second-try/fail = proceed.
// Dialogue is handled externally (in ArcadePlay) — NOT here.
// ============================================================

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { playSFX } from "@/lib/audio";

const MAX_TALLY_ATTEMPTS = 2;

export default function ArcadeTallyScreen({
  villageKey,
  receipts,
  currency,
  onComplete, // onComplete(bonusEarned: number)
}) {
  const correctTotal = Math.round(receipts.reduce((s, r) => s + r, 0) * 100) / 100;

  const [inputVal, setInputVal]     = useState("");
  const [attempts, setAttempts]     = useState(0);
  const [feedback, setFeedback]     = useState(null); // null | { type, message }
  const [bonusEarned, setBonusEarned] = useState(0);
  const [done, setDone]             = useState(false);
  const inputRef                    = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  // ── Restrict input to digits and a single decimal point ──────────────────
  const handleInputChange = (e) => {
    const raw = e.target.value;
    // Allow only digits and one decimal point
    const filtered = raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setInputVal(filtered);
  };

  // Prevent scroll-wheel from changing the value
  const handleWheel = (e) => e.target.blur();

  const handleSubmit = () => {
    const entered = parseFloat(inputVal);
    if (isNaN(entered)) return;

    const correct     = Math.abs(entered - correctTotal) < 0.01;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (correct) {
      playSFX("correct");
      const bonus = newAttempts === 1 ? 5.00 : 0;
      setBonusEarned(bonus);
      setFeedback({
        type: "correct",
        message: newAttempts === 1
          ? `Spot on! ${currency}${correctTotal.toFixed(2)} — and a ${currency}5.00 bonus for getting it first try!`
          : `Correct! ${currency}${correctTotal.toFixed(2)} — great work today!`,
      });
      setDone(true);
    } else {
      playSFX("incorrect");
      if (newAttempts >= MAX_TALLY_ATTEMPTS) {
        setFeedback({
          type: "incorrect",
          message: `The total was ${currency}${correctTotal.toFixed(2)}. Better luck next time!`,
        });
        setDone(true);
      } else {
        setFeedback({
          type: "incorrect",
          message: `Not quite — add up all ${receipts.length} receipts again and try once more!`,
        });
        setInputVal("");
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto"
    >
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xl space-y-5">

        <div>
          <p className="font-display font-bold text-xs text-muted-foreground uppercase tracking-wide mb-2">Today's Receipts</p>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {receipts.map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-1.5">
                <span className="font-body text-xs text-muted-foreground">Customer {i + 1}</span>
                <span className="font-display font-bold text-sm text-foreground">{currency}{r.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border mt-2 pt-2">
            <span className="font-display font-bold text-sm text-foreground">Total</span>
            <span className="font-display font-bold text-sm text-muted-foreground">
              {done ? `${currency}${correctTotal.toFixed(2)}` : "???"}
            </span>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl px-4 py-2 text-sm font-body ${
              feedback.type === "correct" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.message}
          </motion.div>
        )}

        {/* Input area */}
        {!done && (
          <div className="space-y-3">
            <p className="font-display font-semibold text-sm text-foreground text-center">
              What's the total income from today?
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display font-bold text-muted-foreground select-none">
                  {currency}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  value={inputVal}
                  onChange={handleInputChange}
                  onWheel={handleWheel}
                  onKeyDown={(e) => e.key === "Enter" && inputVal && handleSubmit()}
                  placeholder="0.00"
                  className="w-full h-12 pl-8 pr-3 rounded-xl border border-input bg-background font-display text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!inputVal}
                size="lg"
                className="font-display font-bold px-6"
              >
                Submit
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-body text-center">
              Attempt {attempts + 1} of {MAX_TALLY_ATTEMPTS}
            </p>
          </div>
        )}

        {/* Continue button after result */}
        {done && (
          <Button
            onClick={() => { playSFX("click"); onComplete(bonusEarned); }}
            size="lg"
            className="w-full font-display font-bold"
          >
            {bonusEarned > 0 ? `Collect ${currency}${bonusEarned.toFixed(2)} Bonus & Continue` : "Continue"}
          </Button>
        )}

      </div>
    </motion.div>
  );
}