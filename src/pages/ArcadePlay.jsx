// ============================================================
// CAKERY BAKERY — ArcadePlay
//
// ISOLATED single-run mode. Zero contact with:
//   - GameSave entity / story mode saves
//   - Week / day progression
//   - freeSessionState
//
// Earnings model (arcade):
//   correctTransactionTotal = sum of order.orderTotal for correct completions
//   tipsEarned              = +1.00 per perfect (all-phases first-try) transaction
//   finalScore              = correctTransactionTotal × difficultyMult
//   (tips tracked separately, NOT included in finalScore)
//
// Data lifecycle:
//   URL params → session state → ArcadeEndScreen → recordRun() → Leaderboard
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, Bug } from "lucide-react";
import { playBGM, playSFX, unlockAudio, playFastBGM, playSlowBGM } from "@/lib/audio";
import { getDayDuration } from "@/lib/timerEngine";
import { getDifficultyMult } from "@/lib/economyEngine";
import { recordRun } from "@/lib/leaderboard.js";
import { recordRunForUnlocks } from "@/lib/difficultyUnlocks.js";
import { useDayTimer } from "@/hooks/useDayTimer";
import { VILLAGES, DIFFICULTY_CONFIG, getProductsForDifficulty } from "@/lib/gameData";
import { generateCashierProblem } from "@/lib/gameEngine";
import AudioManager from "@/components/game/AudioManager";
import DayTimer from "@/components/game/DayTimer";
import GameHeader from "@/components/game/GameHeader";
import ProductMenu from "@/components/game/ProductMenu";
import CustomerOrder from "@/components/game/CustomerOrder";
import ProblemPanel from "@/components/game/ProblemPanel";
import DebugOverlay from "@/components/game/DebugOverlay";
import { useSpriteRegistry } from "@/hooks/useSpriteRegistry";
import SpriteProcessingOverlay from "@/components/game/SpriteProcessingOverlay";
import ArcadeEndScreen from "@/components/game/ArcadeEndScreen";
import ArcadeTallyScreen from "@/components/game/ArcadeTallyScreen";

const MAX_ATTEMPTS = 2;
const TIP_PER_PERFECT_TX = 1.00; // +$1.00 per fully first-try transaction

const SCENE_IMAGES = Object.fromEntries(
  Object.keys(VILLAGES).map((k) => [k, VILLAGES[k].bgImage]),
);

// Minimal session shape so shared components (GameHeader etc.) work
function buildArcadeSession(villageKey, difficulty, playerName) {
  return {
    player_name: playerName,
    bakery_name: `${playerName}'s Bakery`,
    village: villageKey,
    difficulty,
    total_coins: 0,
    current_week: 1,
    current_day: 1,
    tutorial_complete: true,
  };
}

function createFreshArcadeState() {
  return {
    completedOrders: 0,
    totalProblemsSolved: 0,
    dayCorrect: 0,
    dayTotal: 0,
    // correctTransactionTotal: sum of order.orderTotal for CORRECT completions (raw bakery $)
    correctTransactionTotal: 0,
    // tipsEarned: +TIP_PER_PERFECT_TX per perfect transaction
    tipsEarned: 0,
    tippedTransactions: 0,
    currentStreak: 0,
    bestStreak: 0,
    attempts: 0,
    // currentTxFirstTry: tracks if current tx has been first-try on EVERY phase so far
    currentTxFirstTry: true,
    receipts: [],
    mistakesMade: 0,
    currentRole: "cashier",
  };
}

/**
 * Build the arcade breakdown object from run state.
 * finalScore = (bakeryTotal × difficultyMult) + tipsEarned
 */
function buildArcadeBreakdown(ds, difficulty) {
  const difficultyMult  = getDifficultyMult(difficulty);
  const bakeryTotal     = Math.round((ds.correctTransactionTotal || 0) * 100) / 100;
  const tipsEarned      = Math.round((ds.tipsEarned || 0) * 100) / 100;
  const finalScore      = Math.round((bakeryTotal * difficultyMult + tipsEarned) * 100) / 100;
  const accuracyPct     = ds.dayTotal > 0 ? Math.round((ds.dayCorrect / ds.dayTotal) * 100) : 0;

  return {
    bakeryTotal,
    tipsEarned,
    tippedTransactions: ds.tippedTransactions || 0,
    difficultyMult,
    finalScore,
    playerEarningsScore: finalScore,
    accuracyPct,
    customersServed: ds.completedOrders || 0,
    difficulty,
  };
}

export default function ArcadePlay() {
  const navigate   = useNavigate();
  const params     = new URLSearchParams(window.location.search);
  const villageKey = params.get("village") || "paris";
  const difficulty = params.get("difficulty") || "beginner";
  const playerName = params.get("player") || "Player";

  const arcadeSession = buildArcadeSession(villageKey, difficulty, playerName);
  const village       = VILLAGES[villageKey];

  // Resources
  const [products, setProducts]         = useState([]);
  const [dayDuration, setDayDuration]   = useState(120);
  const resourcesReadyRef               = useRef(false);

  // Show tally for all difficulties except Beginner
  const showTally = difficulty !== "beginner";

  // Phase: "ready" | "playing" | "lastCall" | "tallyDialogue" | "tally" | "done"
  const [phase, setPhase]               = useState("ready");
  const phaseRef                        = useRef("ready");

  // Gameplay
  const [dayState, setDayState]         = useState(null);
  const dayStateRef                     = useRef(null);
  const [currentProblem, setCurrentProblem] = useState(null);
  const currentProblemRef               = useRef(null);
  const [feedback, setFeedback]         = useState(null);
  const [breakdown, setBreakdown]       = useState(null);
  const [tallyState, setTallyState]     = useState(null); // snapshot of dayState when tally begins

  const [debugMode, setDebugMode]       = useState(false);
  // ownerPortraitUrl resolved by sprite registry
  const { isProcessing, progress, getCustomerUrl, getOwnerUrl } = useSpriteRegistry();

  useEffect(() => { dayStateRef.current  = dayState; },  [dayState]);
  useEffect(() => { currentProblemRef.current = currentProblem; }, [currentProblem]);
  useEffect(() => { phaseRef.current     = phase; },     [phase]);

  // ── Init resources once ──────────────────────────────────────────────────
  useEffect(() => {
    if (resourcesReadyRef.current) return;
    resourcesReadyRef.current = true;
    setProducts(getProductsForDifficulty(villageKey, difficulty));
    setDayDuration(getDayDuration(difficulty));
    unlockAudio();
    playBGM(villageKey);
  }, []);

  // ── Timer expiry → lastCall ──────────────────────────────────────────────
  const handleTimerExpired = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    setPhase("lastCall");
    phaseRef.current = "lastCall";
    // If no active problem, go to tally (or done for beginner)
    if (!currentProblemRef.current) {
      if (showTally) enterTally(dayStateRef.current);
      else enterDone(dayStateRef.current);
    }
  }, []);

  const timer = useDayTimer(dayDuration, handleTimerExpired);

  // ── Build next cashier problem ───────────────────────────────────────────
  function nextProblem(prods) {
    const problem = generateCashierProblem(villageKey, difficulty, prods || products);
    if (problem?.order) {
      const idx = problem.order.portraitIndex ?? 0;
      const url = getCustomerUrl(villageKey, idx);
      if (url) return { ...problem, order: { ...problem.order, portrait: url } };
    }
    return problem;
  }

  // ── Enter tally phase: show baker dialogue first, then tally input ───────
  const enterTally = useCallback((stateOverride) => {
    if (phaseRef.current === "tallyDialogue" || phaseRef.current === "tally" || phaseRef.current === "done") return;
    timer.stop();
    setCurrentProblem(null);
    currentProblemRef.current = null;
    playSlowBGM(villageKey);
    const ds = stateOverride || dayStateRef.current;
    setTallyState(ds);
    setPhase("tallyDialogue");
    phaseRef.current = "tallyDialogue";
  }, [villageKey, timer]);

  // ── End run (called after tally completes, or directly for Beginner) ─────
  const enterDone = useCallback(async (stateOverride, tallyBonus = 0) => {
    if (phaseRef.current === "done") return;
    setPhase("done");
    phaseRef.current = "done";

    const ds = stateOverride || tallyState || dayStateRef.current;
    if (!ds) return;

    const bd = buildArcadeBreakdown(ds, difficulty);
    // Apply tally bonus to finalScore
    const bdWithBonus = tallyBonus > 0
      ? { ...bd, finalScore: Math.round((bd.finalScore + tallyBonus) * 100) / 100, playerEarningsScore: Math.round((bd.playerEarningsScore + tallyBonus) * 100) / 100 }
      : bd;
    setBreakdown(bdWithBonus);

    // Leaderboard + unlock — only DB/storage writes in arcade mode
    await recordRun({
      playerName,
      bakeryName: arcadeSession.bakery_name,
      score: bdWithBonus.finalScore,
      difficulty,
      accuracyPct: bdWithBonus.accuracyPct,
      customersServed: bdWithBonus.customersServed,
      village: villageKey,
      tipsEarned: ds.tipsEarned || 0,
      correctTransactions: ds.tippedTransactions || 0,
    });
    recordRunForUnlocks(bdWithBonus.finalScore);
  }, [villageKey, difficulty, playerName, tallyState]);

  // ── Start run ────────────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    playSFX("click");
    playFastBGM(villageKey);
    const fresh = createFreshArcadeState();
    dayStateRef.current = fresh;
    setDayState(fresh);
    setFeedback(null);
    setBreakdown(null);
    const first = nextProblem();
    currentProblemRef.current = first;
    setCurrentProblem(first);
    setPhase("playing");
    phaseRef.current = "playing";
    timer.reset(getDayDuration(difficulty));
    timer.start();
  }, [villageKey, difficulty, timer]);

  // ── Answer submission ────────────────────────────────────────────────────
  const handleSubmitAnswer = useCallback((value) => {
    if (!currentProblem || !dayState) return;
    if (phaseRef.current === "done") return;

    let correct = false;
    if (currentProblem.type === "cashier_total") {
      correct = currentProblem.phase === "calculate_total"
        ? Math.abs(value - currentProblem.order.orderTotal) < 0.01
        : Math.abs(value - currentProblem.order.correctChange) < 0.01;
    }

    const newAttempts    = dayState.attempts + 1;
    const isLastAttempt  = newAttempts >= MAX_ATTEMPTS;
    const isFirstAttempt = newAttempts === 1;
    const inLastCall     = phaseRef.current === "lastCall";

    if (correct) {
      playSFX("correct");
      const newStreak     = dayState.currentStreak + 1;
      const newBestStreak = Math.max(dayState.bestStreak, newStreak);

      // ── Phase 1 of 2: calculate_total → make_change ────────────────────
      if (currentProblem.phase === "calculate_total") {
        setFeedback({ type: "correct", message: "Correct! Now — how much change?" });
        setDayState((p) => ({
          ...p,
          dayCorrect: p.dayCorrect + 1,
          dayTotal:   p.dayTotal + 1,
          // If this phase wasn't first-try, mark tx as no longer first-try
          currentTxFirstTry: p.currentTxFirstTry && isFirstAttempt,
          currentStreak: newStreak, bestStreak: newBestStreak,
          attempts: 0,
        }));
        setTimeout(() => { setCurrentProblem((p) => ({ ...p, phase: "make_change" })); setFeedback(null); }, 1200);
        return;
      }

      // ── Phase 2 of 2: transaction fully complete ────────────────────────
      // txFirstTry = BOTH phases were answered correctly on first attempt
      const txFirstTry = dayState.currentTxFirstTry && isFirstAttempt;

      // Earnings = the actual order total (real bakery money)
      const txValue  = Math.round((currentProblem.order.orderTotal || 0) * 100) / 100;
      const newBakeryTotal = Math.round((dayState.correctTransactionTotal + txValue) * 100) / 100;

      // Tip = +1.00 for perfect transaction only
      const tipGain      = txFirstTry ? TIP_PER_PERFECT_TX : 0;
      const newTips      = Math.round((dayState.tipsEarned + tipGain) * 100) / 100;
      const newTippedTx  = txFirstTry ? dayState.tippedTransactions + 1 : dayState.tippedTransactions;
      const newCompleted = dayState.completedOrders + 1;
      const newSolved    = dayState.totalProblemsSolved + 1;

      const updated = {
        ...dayState,
        dayCorrect: dayState.dayCorrect + 1,
        dayTotal:   dayState.dayTotal + 1,
        currentStreak: newStreak, bestStreak: newBestStreak,
        correctTransactionTotal: newBakeryTotal,
        tipsEarned: newTips, tippedTransactions: newTippedTx,
        receipts: [...dayState.receipts, txValue],
        completedOrders: newCompleted, totalProblemsSolved: newSolved,
        attempts: 0, currentTxFirstTry: true, // reset for next tx
      };
      dayStateRef.current = updated;
      setDayState(updated);

      if (inLastCall) {
        playSFX("end_day");
        setFeedback({ type: "correct", message: "Last customer done — great work today!" });
        currentProblemRef.current = null;
        setTimeout(() => {
          if (showTally) enterTally(updated);
          else enterDone(updated);
        }, 1200);
      } else {
        playSFX("money");
        setFeedback({ type: "correct", message: "Correct! Next customer!" });
        setTimeout(() => {
          if (phaseRef.current !== "playing") return;
          setFeedback(null);
          const next = nextProblem();
          currentProblemRef.current = next;
          setCurrentProblem(next);
        }, 1000);
      }

    } else {
      // ── Incorrect ───────────────────────────────────────────────────────
      playSFX("incorrect");
      const newMistakes = dayState.mistakesMade + 1;

      if (isLastAttempt) {
        let revealMsg = "Moving on!";
        if (currentProblem.phase === "calculate_total") {
          revealMsg = `Total was ${village?.currency}${currentProblem.order.orderTotal.toFixed(2)}. Now make change.`;
        } else if (currentProblem.phase === "make_change") {
          revealMsg = `Change was ${village?.currency}${currentProblem.order.correctChange.toFixed(2)}.`;
        }
        setFeedback({ type: "incorrect", message: revealMsg });

        // Failed calculate_total → advance to make_change (tx is no longer first-try)
        if (currentProblem.phase === "calculate_total") {
          setDayState((p) => ({
            ...p,
            dayTotal: p.dayTotal + 1, currentStreak: 0,
            mistakesMade: newMistakes, attempts: 0, currentTxFirstTry: false,
          }));
          setTimeout(() => { setCurrentProblem((p) => ({ ...p, phase: "make_change" })); setFeedback(null); }, 2500);
          return;
        }

        // Failed make_change — transaction done (no earnings for this tx)
        const newCompleted = dayState.completedOrders + 1;
        const newSolved    = dayState.totalProblemsSolved + 1;
        const updated = {
          ...dayState,
          dayTotal: dayState.dayTotal + 1, currentStreak: 0, mistakesMade: newMistakes,
          receipts: [...dayState.receipts, currentProblem.order.orderTotal],
          completedOrders: newCompleted, totalProblemsSolved: newSolved,
          attempts: 0, currentTxFirstTry: true,
        };
        dayStateRef.current = updated;
        setDayState(updated);

        if (inLastCall) {
          currentProblemRef.current = null;
          setTimeout(() => {
            if (showTally) enterTally(updated);
            else enterDone(updated);
          }, 2500);
        } else {
          setTimeout(() => {
            if (phaseRef.current !== "playing") return;
            setFeedback(null);
            const next = nextProblem();
            currentProblemRef.current = next;
            setCurrentProblem(next);
          }, 2500);
        }

      } else {
        // First attempt wrong — give hint
        let hint = "Not quite! Try again.";
        if (currentProblem.phase === "make_change") {
          hint = `${village?.currency}${currentProblem.order.payment.toFixed(2)} − ${village?.currency}${currentProblem.order.orderTotal.toFixed(2)} = ?`;
        }
        setFeedback({ type: "incorrect", message: hint });
        setDayState((p) => ({
          ...p,
          dayTotal: p.dayTotal + 1, currentStreak: 0,
          mistakesMade: newMistakes, attempts: newAttempts, currentTxFirstTry: false,
        }));
      }
    }
  }, [currentProblem, dayState, difficulty, village, enterDone, enterTally, showTally]);

  const showTimer = phase === "playing" || phase === "lastCall";

  return (
    <div className="min-h-screen flex flex-col relative">
      <AnimatePresence>
        {isProcessing && <SpriteProcessingOverlay progress={progress} />}
      </AnimatePresence>

      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${SCENE_IMAGES[villageKey]})` }} />
      <div className="absolute inset-0 bg-black/30" />

      {import.meta.env.DEV && (
        <>
          {/* Debug toggle */}
          <button
            type="button"
            onClick={() => setDebugMode((v) => !v)}
            className={`fixed bottom-4 right-4 z-50 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-display ${
              debugMode ? "bg-yellow-400/30 border-yellow-400 text-yellow-300" : "bg-black/40 border-white/20 text-white/40 hover:text-white/60"
            }`}
          >
            <Bug className="w-3 h-3" />
            {debugMode ? `Debug [${phase}]` : "Debug"}
          </button>

          {debugMode && dayState && (
            <DebugOverlay dayState={dayState} gameSave={arcadeSession} customerIndex={dayState.completedOrders} totalProblems={null} />
          )}
        </>
      )}

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="relative">
          <GameHeader gameSave={arcadeSession} village={village} />
          <div className="absolute right-4 top-full mt-2 flex items-center gap-2 z-20">
            <AudioManager />
            <button
              onClick={() => { timer.stop(); navigate("/"); }}
              className="flex items-center gap-1.5 bg-card/80 hover:bg-card border border-border rounded-full px-3 py-1.5 font-display text-sm font-bold text-foreground transition-colors shadow"
            >
              ✕ Quit
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 pt-14 max-w-3xl mx-auto w-full">

          {/* Mode badge + timer */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-5">
            <div className="inline-flex items-center gap-2 bg-secondary/80 rounded-full px-4 py-2 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-display font-bold text-sm text-foreground">
                Arcade — {DIFFICULTY_CONFIG[difficulty]?.label || difficulty}
              </span>
              <span className="text-xs bg-primary/10 text-primary font-display font-semibold px-2 py-0.5 rounded-full">
                Cashier
              </span>
            </div>

            {showTimer && (
              <div className="flex items-center justify-center gap-3 mt-2">
                <DayTimer
                  secondsLeft={timer.secondsLeft}
                  totalSeconds={dayDuration}
                  hasExpired={phase === "lastCall" || phase === "done"}
                />
                {dayState && (
                  <span className="font-display text-xs text-white/70 inline-flex items-center gap-2">
                    <span>{dayState.completedOrders} served</span>
                    {dayState.currentStreak >= 2 && (
                      <span className="text-amber-200 font-semibold whitespace-nowrap" title="Customers served without a mistake">
                        {dayState.currentStreak} streak
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}

            <AnimatePresence>
              {phase === "lastCall" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/90 text-white font-display font-bold text-xs px-3 py-1 rounded-full shadow"
                >
                  🔔 Last Call — finish this customer!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── READY ── */}
          {phase === "ready" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto text-center">
              <div className="bg-card/90 border border-border rounded-2xl p-8 shadow-xl">
                <div className="text-5xl mb-4">⚡</div>
                <h2 className="font-display font-bold text-2xl text-foreground mb-2">Ready, {playerName}?</h2>
                <p className="font-body text-sm text-muted-foreground mb-1">
                  {village?.name} · {DIFFICULTY_CONFIG[difficulty]?.label}
                </p>
                <p className="font-body text-sm text-muted-foreground mb-4">
                  Serve as many customers as you can before time runs out!
                </p>
                <div className="rounded-xl bg-muted/40 border border-border/60 px-4 py-3 mb-6 text-left">
                  <p className="font-display text-xs font-bold text-foreground mb-2">Quick tips</p>
                  <ul className="font-body text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-snug">
                    <li>Use <strong className="text-foreground font-semibold">Today&apos;s Menu</strong> prices for every line item.</li>
                    <li>Enter the <strong className="text-foreground font-semibold">order total</strong> first.</li>
                    <li>Then enter <strong className="text-foreground font-semibold">change</strong> from what the customer pays.</li>
                  </ul>
                </div>
                <Button onClick={handleStart} size="lg" className="w-full h-12 font-display font-bold">
                  <Zap className="w-5 h-5 mr-2" />
                  Start Run!
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── PLAYING / LAST CALL ── */}
          {(phase === "playing" || phase === "lastCall") && dayState && (
            <div className="space-y-4">
              <ProductMenu products={products} currency={village?.currency} />
              {currentProblem?.order && (
                <CustomerOrder
                  order={currentProblem.order}
                  currency={village?.currency}
                  showTotal={currentProblem.phase === "make_change"}
                />
              )}
              <ProblemPanel
                problem={currentProblem}
                currency={village?.currency}
                onSubmit={handleSubmitAnswer}
                feedback={feedback}
                attempts={dayState.attempts}
                maxAttempts={MAX_ATTEMPTS}
              />
            </div>
          )}

          {/* ── TALLY DIALOGUE: Head Baker speaks before tally ── */}
          {phase === "tallyDialogue" && tallyState && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
              <div className="bg-card rounded-2xl border border-border p-6 shadow-xl space-y-5">
                {/* Owner portrait + speech bubble */}
                <div className="flex items-end gap-4">
                  <div className="w-20 h-20 flex-shrink-0">
                    {getOwnerUrl(villageKey)
                      ? <img src={getOwnerUrl(villageKey)} alt="Owner" className="w-full h-full object-contain drop-shadow-md" />
                      : <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-3xl">👨‍🍳</div>
                    }
                  </div>
                  <div className="flex-1 relative bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
                    <div className="absolute -left-2.5 bottom-4 w-0 h-0 border-t-8 border-t-transparent border-r-[10px] border-r-card border-b-8 border-b-transparent" />
                    <p className="font-body text-sm text-foreground leading-relaxed">
                      The day's done! Let's count up everything we made today.
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full font-display font-bold"
                  onClick={() => {
                    playSFX("click");
                    setPhase("tally");
                    phaseRef.current = "tally";
                  }}
                >
                  Count Up Receipts →
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── TALLY: Final tally challenge ── */}
          {phase === "tally" && tallyState && (
            <ArcadeTallyScreen
              villageKey={villageKey}
              receipts={tallyState.receipts || []}
              currency={village?.currency || "$"}
              onComplete={(bonus) => enterDone(tallyState, bonus)}
            />
          )}

          {/* ── DONE: End-of-run flow ── */}
          {phase === "done" && breakdown && (
            <ArcadeEndScreen
              villageKey={villageKey}
              breakdown={breakdown}
              playerName={playerName}
              currency={village?.currency || "$"}
              ownerPortraitUrl={getOwnerUrl(villageKey)}
            onPlayAgain={() => {
                setPhase("ready");
                phaseRef.current = "ready";
                setDayState(null);
                dayStateRef.current = null;
                setCurrentProblem(null);
                currentProblemRef.current = null;
                setFeedback(null);
                setBreakdown(null);
                setTallyState(null);
                timer.reset(getDayDuration(difficulty));
                playBGM(villageKey);
              }}
              onLeaderboard={() => navigate("/leaderboard")}
              onMainMenu={() => navigate("/")}
            />
          )}

        </div>
      </div>
    </div>
  );
}