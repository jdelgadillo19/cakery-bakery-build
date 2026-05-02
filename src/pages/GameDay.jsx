// ============================================================
// CAKERY BAKERY — GameDay
//
// Day lifecycle state machine:
//   "preDay"      → Manager overview, role selection. Timer stopped/reset.
//   "activeDay"   → Timer running, infinite customer spawning.
//   "lastCall"    → Timer expired. Finish current transaction only. No new customers.
//   "dayComplete" → Debrief / persist. Timer stopped.
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GameSave } from "@/lib/localEntities";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Bug } from "lucide-react";
import { playBGM, playSFX, unlockAudio, playFastBGM, playSlowBGM } from "@/lib/audio";
import { isFeatureUnlocked } from "@/lib/buildConfig";
import { triggerDay5Unlock, isLocalePlayableInFree } from "@/lib/freeSessionState";
import { getDayDuration } from "@/lib/timerEngine";
import { computeFinalScore, calcProblemEarnings } from "@/lib/economyEngine";
import { recordRun } from "@/lib/leaderboard.js";
import { recordRunForUnlocks } from "@/lib/difficultyUnlocks.js";
import { isStorySave, mergeStoryStatsAfterDay } from "@/lib/storyStats";
import { getEffectiveDifficulty } from "@/lib/storyDifficulty";
import { useDayTimer } from "@/hooks/useDayTimer";
import UpgradeModal from "@/components/game/UpgradeModal";
import Day5UnlockModal from "@/components/game/Day5UnlockModal";
import FreeRunEndScreen from "@/components/game/FreeRunEndScreen";
import AudioManager from "@/components/game/AudioManager";
import DayTimer from "@/components/game/DayTimer";
import { VILLAGES, getProductsForDifficulty } from "@/lib/gameData";
import {
  buildUnlockedBookEntry,
  DEFAULT_MENU_SLOTS,
  getEquippedRecipes,
  getMenuProducts,
} from "@/lib/recipeBook";
import { computeRecipeDisplayPrice } from "@/lib/recipePricing";
import { DAYS_PER_WORKING_WEEK, createFreshDayState, generateCashierProblem, generatePackagerProblem } from "@/lib/gameEngine";
import { convertRecipesForDifficulty, generateBakerProblemFromRecipes } from "@/lib/recipeData";
import GameHeader from "@/components/game/GameHeader";
import ProductMenu from "@/components/game/ProductMenu";
import CustomerOrder from "@/components/game/CustomerOrder";
import ProblemPanel from "@/components/game/ProblemPanel";
import DebugOverlay from "@/components/game/DebugOverlay";
import EndDayDebrief from "@/components/game/EndDayDebrief";
import ManagerOverview from "@/components/game/ManagerOverview";
import GameMenu from "@/components/game/GameMenu";
import SpriteProcessingOverlay from "@/components/game/SpriteProcessingOverlay";
import { useSpriteRegistry } from "@/hooks/useSpriteRegistry";

const SCENE_IMAGES = Object.fromEntries(
  Object.keys(VILLAGES).map((k) => [k, VILLAGES[k].bgImage]),
);

const MAX_ATTEMPTS = 2;

// ── Day lifecycle states ──────────────────────────────────────────────────────
// "preDay" | "activeDay" | "lastCall" | "dayComplete" | "freeRunEnd"
// ─────────────────────────────────────────────────────────────────────────────

export default function GameDay() {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const saveId        = new URLSearchParams(window.location.search).get("id");

  const { data: gameSave, isLoading } = useQuery({
    queryKey: ["gameSave", saveId],
    queryFn:  () => GameSave.filter({ id: saveId }),
    enabled:  !!saveId,
    select:   (data) => data[0],
  });

  // ── Shared gameplay resources (stable across days) ────────────────────────
  const [convertedRecipes, setConvertedRecipes] = useState(null);
  const [products,         setProducts]         = useState([]);
  const [dayDuration,      setDayDuration]      = useState(120);
  // ── Day lifecycle ─────────────────────────────────────────────────────────
  const [dayPhase,       setDayPhase]       = useState("preDay"); // the state machine
  const [dayState,       setDayState]       = useState(null);
  const [selectedRole,   setSelectedRole]   = useState(null);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [feedback,       setFeedback]       = useState(null);

  // Ref mirror of dayState for use in async/timer callbacks
  const dayStateRef  = useRef(null);
  const dayPhaseRef  = useRef("preDay");

  useEffect(() => { dayStateRef.current  = dayState;  }, [dayState]);
  useEffect(() => { dayPhaseRef.current  = dayPhase;  }, [dayPhase]);

  const [pendingScoreBreakdown, setPendingScoreBreakdown] = useState(null);
  const [pendingWalletAfterPay, setPendingWalletAfterPay] = useState(null);
  const [pendingIsNewTop,       setPendingIsNewTop]       = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [debugMode,         setDebugMode]         = useState(false);
  const [savingDay,         setSavingDay]          = useState(false);
  const [menuOpen,          setMenuOpen]           = useState(false);
  const [upgradeModal,      setUpgradeModal]       = useState({ open: false, message: "" });
  const [day5UnlockModal,   setDay5UnlockModal]    = useState(false);
  const [freeRunTotalEarned,setFreeRunTotalEarned] = useState(0);

  const { isProcessing, progress, getCustomerUrl, getOwnerUrl } = useSpriteRegistry();

  const village = gameSave ? VILLAGES[gameSave.village] : null;

  // ── Timer ─────────────────────────────────────────────────────────────────
  // onExpire: transition preDay→lastCall. Guard: only fires during activeDay.
  const handleTimerExpired = useCallback(() => {
    if (dayPhaseRef.current !== "activeDay") return;
    // Stop spawning — enter lastCall
    setDayPhase("lastCall");
    dayPhaseRef.current = "lastCall";
    // If no problem is currently active, go straight to dayComplete
    if (!currentProblemRef.current) {
      enterDayComplete();
    }
   
  }, []); // intentionally no deps — uses refs

  const timer = useDayTimer(dayDuration, handleTimerExpired);

  // ── currentProblem ref for use inside timer callback ─────────────────────
  const currentProblemRef = useRef(null);
  useEffect(() => { currentProblemRef.current = currentProblem; }, [currentProblem]);

  // ── Security: locale access in free build ────────────────────────────────
  useEffect(() => {
    if (!gameSave) return;
    if (!isFeatureUnlocked("multiVillage")) {
      const v = gameSave.village;
      if (v !== "paris" && !isLocalePlayableInFree(v)) navigate("/");
    }
  }, [gameSave]);

  // ── One-time resource initialisation (stable across days) ────────────────
  useEffect(() => {
    if (!gameSave) return;
    const diff = getEffectiveDifficulty(gameSave);

    let prods =
      gameSave.game_mode === "story"
        ? getMenuProducts(gameSave, diff)
        : getProductsForDifficulty(gameSave.village, diff);
    if (gameSave.game_mode === "story" && (!Array.isArray(prods) || prods.length === 0)) {
      prods = getProductsForDifficulty(gameSave.village, diff);
    }
    setProducts(prods);

    const allConverted    = convertRecipesForDifficulty(gameSave.village, diff);
    const equippedRecipes = getEquippedRecipes(gameSave);
    const equippedIds     = new Set(equippedRecipes.map((r) => r.id));
    const filtered        = allConverted.filter((r) => equippedIds.has(r.recipeId));
    setConvertedRecipes(filtered.length > 0 ? filtered : allConverted);

    const dur = getDayDuration(diff);
    setDayDuration(dur);

    unlockAudio();
    playBGM(gameSave.village);
  }, [
    gameSave,
    gameSave.equipped_recipe_ids,
    gameSave.menu_slots,
    gameSave.recipe_book,
    gameSave.game_mode,
    gameSave.village,
  ]);

  // ── Build next problem ────────────────────────────────────────────────────
  function buildNextProblem(role, save, prods, recipes, problemIndex) {
    const diff = getEffectiveDifficulty(save);
    let problem;
    if      (role === "cashier")  problem = generateCashierProblem(save.village, diff, prods);
    else if (role === "packager") problem = generatePackagerProblem(save.village, diff);
    else if (role === "baker") {
      problem = generateBakerProblemFromRecipes(recipes, diff, problemIndex);
      const equipped = getEquippedRecipes(save);
      const row = equipped.find((r) => r.id === problem.recipeId);
      if (row) {
        const display_price = computeRecipeDisplayPrice(row, { villageKey: save.village });
        problem = { ...problem, activeRecipe: { ...row, display_price } };
      }
    }
    else                          problem = generateCashierProblem(save.village, diff, prods);

    // Resolve processed portrait
    if (problem?.order) {
      const idx = problem.order.portraitIndex ?? 0;
      const url = getCustomerUrl(save.village, idx);
      if (url) problem = { ...problem, order: { ...problem.order, portrait: url } };
    }
    return problem;
  }

  // ── Enter dayComplete phase ───────────────────────────────────────────────
  const enterDayComplete = useCallback(() => {
    if (dayPhaseRef.current === "dayComplete") return; // guard: no double-trigger
    setDayPhase("dayComplete");
    dayPhaseRef.current = "dayComplete";
    timer.stop();
    setCurrentProblem(null);
    currentProblemRef.current = null;
    playSlowBGM(gameSave?.village);

    const save = gameSave;
    const ds = dayStateRef.current;
    if (save && ds) {
      const eff = getEffectiveDifficulty(save);
      const breakdown = computeFinalScore({
        correctTransactionTotal: ds.correctTransactionTotal || 0,
        tipsEarned: ds.tipsEarned || 0,
        tippedTransactions: ds.tippedTransactions || 0,
        dayCorrect: ds.dayCorrect,
        dayTotal: ds.dayTotal,
        customersServed: ds.completedOrders,
        difficulty: eff,
      });
      setPendingScoreBreakdown(breakdown);
      const pay = breakdown.playerEarningsScore;
      setPendingWalletAfterPay(Math.round(((save.total_coins || 0) + pay) * 100) / 100);
    }
  }, [gameSave, timer]);

  // ── Role selection → enter activeDay ─────────────────────────────────────
  const handleSelectRole = useCallback((role) => {
    if (!gameSave || !convertedRecipes) return;
    if (role === "packager" && !isFeatureUnlocked("packagerRole")) {
      setUpgradeModal({ open: true, message: "The Packager role is available in the full version!" });
      return;
    }
    if (role === "baker" && !isFeatureUnlocked("bakerRole")) {
      setUpgradeModal({ open: true, message: "The Baker role is available in the full version!" });
      return;
    }

    playSFX("click");
    playFastBGM(gameSave.village);

    // Reset timer for this day (critical: destroys any previous interval)
    timer.reset(getDayDuration(getEffectiveDifficulty(gameSave)));

    const dayNumber = gameSave.current_day || 1;
    const fresh = createFreshDayState(dayNumber, gameSave);
    fresh.currentRole = role;
    dayStateRef.current = fresh;
    setDayState(fresh);
    setSelectedRole(role);
    setFeedback(null);

    const firstProblem = buildNextProblem(role, gameSave, products, convertedRecipes, 0);
    currentProblemRef.current = firstProblem;
    setCurrentProblem(firstProblem);

    // Transition to activeDay and start timer
    setDayPhase("activeDay");
    dayPhaseRef.current = "activeDay";
    timer.start();
  }, [gameSave, convertedRecipes, products, timer]);

  // ── Answer submission ─────────────────────────────────────────────────────
  const handleSubmitAnswer = useCallback((value) => {
    if (!currentProblem || !dayState || !gameSave) return;
    // Block new answers if already in dayComplete
    if (dayPhaseRef.current === "dayComplete") return;

    let correct = false;
    if (currentProblem.type === "cashier_total") {
      correct = currentProblem.phase === "calculate_total"
        ? Math.abs(value - currentProblem.order.orderTotal) < 0.01
        : Math.abs(value - currentProblem.order.correctChange) < 0.01;
    } else if (currentProblem.type === "packager_division") {
      correct = currentProblem.phase === "boxes"
        ? value === currentProblem.answer
        : value === currentProblem.remainder;
    } else if (currentProblem.type === "baker_scaling") {
      correct = Math.abs(value - currentProblem.answer) < 0.05;
    }

    const newAttempts    = dayState.attempts + 1;
    const isLastAttempt  = newAttempts >= MAX_ATTEMPTS;
    const isFirstAttempt = newAttempts === 1;
    const inLastCall     = dayPhaseRef.current === "lastCall";

    if (correct) {
      playSFX("correct");
      const newStreak    = dayState.currentStreak + 1;
      const newBestStreak = Math.max(dayState.bestStreak, newStreak);
      const earning      = calcProblemEarnings(getEffectiveDifficulty(gameSave), currentProblem.activeRecipe || null);

      // ── Multi-phase: cashier total → change ───────────────────────────
      if (currentProblem.type === "cashier_total" && currentProblem.phase === "calculate_total") {
        setFeedback({ type: "correct", message: "Correct! Now — how much change?" });
        setDayState((prev) => ({
          ...prev,
          dayCorrect: prev.dayCorrect + 1, dayTotal: prev.dayTotal + 1,
          firstTryCorrect:  isFirstAttempt ? prev.firstTryCorrect + 1  : prev.firstTryCorrect,
          secondTryCorrect: !isFirstAttempt ? prev.secondTryCorrect + 1 : prev.secondTryCorrect,
          // If this phase was wrong, the whole tx loses first-try status
          currentTxFirstTry: prev.currentTxFirstTry && isFirstAttempt,
          currentStreak: newStreak, bestStreak: newBestStreak, attempts: 0,
        }));
        setTimeout(() => { setCurrentProblem((p) => ({ ...p, phase: "make_change" })); setFeedback(null); }, 1200);
        return;
      }

      // ── Multi-phase: packager boxes → remainder ────────────────────────
      if (currentProblem.type === "packager_division" && currentProblem.phase === "boxes" && currentProblem.hasRemainder) {
        setFeedback({ type: "correct", message: `${currentProblem.answer} boxes! Now — how many left over?` });
        setDayState((prev) => ({
          ...prev,
          dayCorrect: prev.dayCorrect + 1, dayTotal: prev.dayTotal + 1,
          firstTryCorrect:  isFirstAttempt ? prev.firstTryCorrect + 1  : prev.firstTryCorrect,
          secondTryCorrect: !isFirstAttempt ? prev.secondTryCorrect + 1 : prev.secondTryCorrect,
          currentTxFirstTry: prev.currentTxFirstTry && isFirstAttempt,
          currentStreak: newStreak, bestStreak: newBestStreak, attempts: 0,
        }));
        setTimeout(() => { setCurrentProblem((p) => ({ ...p, phase: "remainder" })); setFeedback(null); }, 1200);
        return;
      }

      // ── Transaction fully solved ───────────────────────────────────────
      // Score = transaction value (earned correctly)
      // Tips  = +$0.50 per phase if ALL phases were first-try
      const txIsFirstTry     = dayState.currentTxFirstTry && isFirstAttempt;
      const newEarnings      = Math.round((dayState.dayEarnings + earning) * 100) / 100;
      const newCorrectTotal  = Math.round((dayState.correctTransactionTotal + earning) * 100) / 100;

      // Tip: +$0.50 per correct phase on first try
      // cashier = 2 phases (cost + change), packager/baker = 1 phase
      const phaseTipValue = txIsFirstTry ? 0.50 : 0;
      const newTipsEarned = Math.round((dayState.tipsEarned + phaseTipValue) * 100) / 100;
      const newTippedTx   = txIsFirstTry ? dayState.tippedTransactions + 1 : dayState.tippedTransactions;

      const newSolved    = dayState.totalProblemsSolved + 1;
      const newCompleted = dayState.completedOrders + 1;

      const newReceipts = currentProblem.type === "cashier_total"
        ? [...dayState.receipts, currentProblem.order.orderTotal] : dayState.receipts;
      const newOrderLog = currentProblem.type === "cashier_total"
        ? [...dayState.orderLog, { role: dayState.currentRole, total: currentProblem.order.orderTotal }] : dayState.orderLog;
      const newPackagingLog = currentProblem.type === "packager_division"
        ? [...dayState.packagingLog, { itemType: currentProblem.itemType, boxSize: currentProblem.boxSize, boxesUsed: currentProblem.answer }]
        : dayState.packagingLog;

      let newIngredients = { ...dayState.ingredientTotals };
      if (currentProblem.type === "baker_scaling") {
        const key = currentProblem.ingredientKey;
        const val = currentProblem.ingredient.rawValue !== undefined
          ? currentProblem.ingredient.amount * currentProblem.multiplier : currentProblem.answer;
        newIngredients[key] = Math.round(((newIngredients[key] || 0) + val) * 100) / 100;
      }

      const updated = {
        ...dayState,
        dayCorrect: dayState.dayCorrect + 1, dayTotal: dayState.dayTotal + 1,
        firstTryCorrect:  isFirstAttempt ? dayState.firstTryCorrect + 1  : dayState.firstTryCorrect,
        secondTryCorrect: !isFirstAttempt ? dayState.secondTryCorrect + 1 : dayState.secondTryCorrect,
        currentStreak: newStreak, bestStreak: newBestStreak,
        dayEarnings: newEarnings,
        correctTransactionTotal: newCorrectTotal,
        tipsEarned: newTipsEarned,
        tippedTransactions: newTippedTx,
        receipts: newReceipts, orderLog: newOrderLog,
        packagingLog: newPackagingLog, ingredientTotals: newIngredients,
        completedOrders: newCompleted, totalProblemsSolved: newSolved,
        attempts: 0, currentTxFirstTry: true, // reset for next transaction
      };
      dayStateRef.current = updated;
      setDayState(updated);

      if (inLastCall) {
        // ── Last Call transaction done → dayComplete ───────────────────
        playSFX("end_day");
        setFeedback({ type: "correct", message: "Last customer done — great work today!" });
        currentProblemRef.current = null;
        setTimeout(() => enterDayComplete(), 1000);
      } else {
        // ── Spawn next customer ────────────────────────────────────────
        playSFX("money");
        setFeedback({ type: "correct", message: "Correct! Next customer!" });
        setTimeout(() => {
          // Guard: don't spawn if we transitioned to lastCall during the delay
          if (dayPhaseRef.current !== "activeDay") return;
          setFeedback(null);
          const next = buildNextProblem(dayState.currentRole, gameSave, products, convertedRecipes, newSolved);
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
        if (currentProblem.type === "cashier_total" && currentProblem.phase === "calculate_total") {
          revealMsg = `Total was ${village?.currency}${currentProblem.order.orderTotal.toFixed(2)}. Let's make change.`;
        } else if (currentProblem.type === "cashier_total" && currentProblem.phase === "make_change") {
          revealMsg = `Change was ${village?.currency}${currentProblem.order.correctChange.toFixed(2)}.`;
        } else if (currentProblem.type === "packager_division" && currentProblem.phase === "boxes") {
          revealMsg = `Answer: ${currentProblem.answer} ${currentProblem.container || "boxes"}.${currentProblem.hasRemainder ? " Now the remainder." : ""}`;
        } else if (currentProblem.type === "packager_division" && currentProblem.phase === "remainder") {
          revealMsg = `Remainder: ${currentProblem.remainder} ${currentProblem.itemName}.`;
        } else if (currentProblem.type === "baker_scaling") {
          revealMsg = `You needed ${currentProblem.answerDisplay || currentProblem.answer}.`;
        }
        setFeedback({ type: "incorrect", message: revealMsg });

        // Multi-phase: failed cashier total → advance to change phase (tx lost first-try status)
        if (currentProblem.type === "cashier_total" && currentProblem.phase === "calculate_total") {
          setDayState((prev) => ({ ...prev, dayTotal: prev.dayTotal + 1, currentStreak: 0, mistakesMade: newMistakes, attempts: 0, currentTxFirstTry: false }));
          setTimeout(() => { setCurrentProblem((p) => ({ ...p, phase: "make_change" })); setFeedback(null); }, 2500);
          return;
        }
        // Multi-phase: failed packager boxes → advance to remainder (tx lost first-try status)
        if (currentProblem.type === "packager_division" && currentProblem.phase === "boxes" && currentProblem.hasRemainder) {
          setDayState((prev) => ({ ...prev, dayTotal: prev.dayTotal + 1, currentStreak: 0, mistakesMade: newMistakes, attempts: 0, currentTxFirstTry: false }));
          setTimeout(() => { setCurrentProblem((p) => ({ ...p, phase: "remainder" })); setFeedback(null); }, 2500);
          return;
        }

        // Problem done (failed)
        const newSolved    = dayState.totalProblemsSolved + 1;
        const newCompleted = dayState.completedOrders + 1;
        const newReceipts  = currentProblem.type === "cashier_total"
          ? [...dayState.receipts, currentProblem.order.orderTotal] : dayState.receipts;
        const newOrderLog  = currentProblem.type === "cashier_total"
          ? [...dayState.orderLog, { role: dayState.currentRole, total: currentProblem.order.orderTotal }] : dayState.orderLog;
        const newPackagingLog = currentProblem.type === "packager_division"
          ? [...dayState.packagingLog, { itemType: currentProblem.itemType, boxSize: currentProblem.boxSize, boxesUsed: currentProblem.answer }]
          : dayState.packagingLog;
        let newIngredients = { ...dayState.ingredientTotals };
        if (currentProblem.type === "baker_scaling") {
          const key = currentProblem.ingredientKey;
          const val = currentProblem.ingredient.amount * currentProblem.multiplier;
          newIngredients[key] = Math.round(((newIngredients[key] || 0) + val) * 100) / 100;
        }

        const updated = {
          ...dayState,
          dayTotal: dayState.dayTotal + 1, currentStreak: 0, mistakesMade: newMistakes,
          receipts: newReceipts, orderLog: newOrderLog, packagingLog: newPackagingLog,
          ingredientTotals: newIngredients,
          completedOrders: newCompleted, totalProblemsSolved: newSolved,
          attempts: 0, currentTxFirstTry: true, // reset for next transaction
        };
        dayStateRef.current = updated;
        setDayState(updated);

        if (inLastCall) {
          // Last Call failed → still end the day
          currentProblemRef.current = null;
          setTimeout(() => enterDayComplete(), 2500);
        } else {
          setTimeout(() => {
            if (dayPhaseRef.current !== "activeDay") return;
            setFeedback(null);
            const next = buildNextProblem(dayState.currentRole, gameSave, products, convertedRecipes, newSolved);
            currentProblemRef.current = next;
            setCurrentProblem(next);
          }, 2500);
        }

      } else {
        // First attempt wrong — hint
        let hint = "Not quite! Try again.";
        if (currentProblem.type === "cashier_total" && currentProblem.phase === "make_change") {
          hint = `${village?.currency}${currentProblem.order.payment.toFixed(2)} − ${village?.currency}${currentProblem.order.orderTotal.toFixed(2)} = ?`;
        } else if (currentProblem.type === "packager_division" && currentProblem.phase === "boxes") {
          hint = `How many times does ${currentProblem.boxSize} go into ${currentProblem.totalItems}?`;
        } else if (currentProblem.type === "packager_division" && currentProblem.phase === "remainder") {
          hint = `${currentProblem.totalItems} ÷ ${currentProblem.boxSize} = ${currentProblem.answer} remainder ?`;
        } else if (currentProblem.type === "baker_scaling") {
          hint = `Multiply ${currentProblem.ingredient?.display} by ${currentProblem.multiplier}.`;
        }
        setFeedback({ type: "incorrect", message: hint });
        setDayState((prev) => ({ ...prev, dayTotal: prev.dayTotal + 1, currentStreak: 0, mistakesMade: newMistakes, attempts: newAttempts, currentTxFirstTry: false }));
      }
    }
  }, [currentProblem, dayState, gameSave, village, products, convertedRecipes, enterDayComplete]);

  // ── Persist day in two phases ─────────────────────────────────────────────
  // Phase 1: commitPaycheck — runs once when player advances out of the
  // earnings screen. Banks day pay, weekly_sales, streak, customers served,
  // story stats, and (if tutorial just ended) tutorial_complete + recipe_book.
  // Does NOT advance day/week, does NOT apply shopping debit, does NOT
  // touch equipped_recipe_ids / menu_slots.
  const paycheckCommittedRef = useRef(false);

  const commitPaycheck = async () => {
    if (!gameSave || !dayState) return;
    if (paycheckCommittedRef.current) return;
    paycheckCommittedRef.current = true;
    setSavingDay(true);

    const currentWeek = gameSave.current_week ?? 0;
    const currentDay  = gameSave.current_day || 1;
    const isTutorial  = currentWeek === 0;
    const effDifficulty = getEffectiveDifficulty(gameSave);

    const scoreBreakdown = pendingScoreBreakdown || computeFinalScore({
      correctTransactionTotal: dayState.correctTransactionTotal || 0,
      tipsEarned:              dayState.tipsEarned || 0,
      tippedTransactions:      dayState.tippedTransactions || 0,
      dayCorrect:              dayState.dayCorrect,
      dayTotal:                dayState.dayTotal,
      customersServed:         dayState.completedOrders,
      difficulty:              effDifficulty,
    });
    const earned   = scoreBreakdown.playerEarningsScore;
    const newCoins = Math.round(((gameSave.total_coins || 0) + earned) * 100) / 100;

    if (!isStorySave(gameSave)) {
      await recordRun({
        playerName: gameSave.player_name,
        bakeryName: gameSave.bakery_name,
        score: earned,
        difficulty: effDifficulty,
        accuracyPct: scoreBreakdown.accuracyPct ?? 0,
        customersServed: dayState.completedOrders,
        village: gameSave.village,
        tipsEarned: dayState.tipsEarned || 0,
        correctTransactions: dayState.tippedTransactions || 0,
      });
      recordRunForUnlocks(earned);
    }
    setPendingScoreBreakdown(scoreBreakdown);
    setPendingIsNewTop(false);

    const weeklySales = [...(gameSave.weekly_sales || [])];
    const weekIdx = weeklySales.findIndex((w) => w.week === currentWeek);
    if (weekIdx >= 0) {
      weeklySales[weekIdx].daily_totals.push(earned);
      weeklySales[weekIdx].weekly_total = Math.round((weeklySales[weekIdx].weekly_total + earned) * 100) / 100;
    } else {
      weeklySales.push({ week: currentWeek, daily_totals: [earned], weekly_total: earned, accuracy: scoreBreakdown.accuracyPct });
    }

    let recipeBookPatch = null;
    let tutorialCompleteFlag = gameSave.tutorial_complete || false;
    const tutorialEnding = isTutorial && currentDay >= 3 && isFeatureUnlocked("packagerRole");
    if (tutorialEnding && !tutorialCompleteFlag) {
      tutorialCompleteFlag = true;
      recipeBookPatch = {
        ...(gameSave.recipe_book || {}),
        [gameSave.village]: buildUnlockedBookEntry(gameSave.village),
      };
    }

    const storyStatsPatch = isStorySave(gameSave)
      ? mergeStoryStatsAfterDay(gameSave.story_stats_v1, {
          customersServed: dayState.completedOrders,
          netPay: earned,
          score: earned,
        })
      : {};

    const updatePayload = {
      total_coins:            newCoins,
      weekly_sales:           weeklySales,
      streak:                 Math.max(gameSave.streak || 0, dayState.bestStreak),
      total_customers_served: (gameSave.total_customers_served || 0) + dayState.completedOrders,
      tutorial_complete:      tutorialCompleteFlag,
      ...storyStatsPatch,
    };
    if (recipeBookPatch) updatePayload.recipe_book = recipeBookPatch;

    await GameSave.update(gameSave.id, updatePayload);
    setPendingWalletAfterPay(newCoins);
    queryClient.invalidateQueries({ queryKey: ["gameSave", saveId] });
    setSavingDay(false);
  };

  // Phase 2: commitDayAdvance — runs at the end of the morning dialogue.
  // Applies shopping debit + equipped_recipe_ids + menu_slots and advances
  // current_day / current_week (with Day-5 / weekend branching). Assumes
  // commitPaycheck has already banked the paycheck.
  const handleDayComplete = async (shoppingOpts = null) => {
    if (!gameSave || !dayState) return;
    setSavingDay(true);

    const currentWeek = gameSave.current_week ?? 0;
    const currentDay  = gameSave.current_day || 1;
    const isTutorial  = currentWeek === 0;

    const isFreeBuild      = !isFeatureUnlocked("multipleWeeks");
    const isDay5Completion = isFreeBuild && !isTutorial && currentDay >= DAYS_PER_WORKING_WEEK;
    let shouldShowDay5Modal = false;
    if (isDay5Completion) shouldShowDay5Modal = triggerDay5Unlock();

    let newDay = 1, newWeek = currentWeek, goToWeekend = false;
    if (isTutorial) {
      if (currentDay >= 3) { newDay = 1; newWeek = 1; }
      else                 { newDay = currentDay + 1; }
    } else {
      if (currentDay >= DAYS_PER_WORKING_WEEK) { newDay = 1; newWeek = currentWeek + 1; goToWeekend = true; }
      else                                     { newDay = currentDay + 1; }
    }

    const shop = shoppingOpts?.shopping;
    const shopDebit = shop?.coinsSpent ?? 0;
    // total_coins is already the banked paycheck — only debit shopping spend
    const finalCoins = Math.round(((gameSave.total_coins || 0) - shopDebit) * 100) / 100;

    const equipFinal =
      shoppingOpts?.equipped_recipe_ids ??
      shop?.equipped_recipe_ids ??
      gameSave.equipped_recipe_ids ??
      [];

    const nextRecipeBook = shop ? shop.recipe_book : (gameSave.recipe_book || {});
    const nextMenuSlots = shop?.menu_slots ?? gameSave.menu_slots ?? { ...DEFAULT_MENU_SLOTS };

    const updatePayload = {
      current_day:         isDay5Completion ? 1 : newDay,
      current_week:        isDay5Completion ? 1 : newWeek,
      total_coins:         finalCoins,
      recipe_book:         nextRecipeBook,
      equipped_recipe_ids: equipFinal,
      menu_slots:          nextMenuSlots,
    };
    if (isDay5Completion) updatePayload.weekly_sales = [];

    await GameSave.update(gameSave.id, updatePayload);

    queryClient.invalidateQueries({ queryKey: ["gameSave", saveId] });
    setSavingDay(false);
    paycheckCommittedRef.current = false;

    if (isDay5Completion) {
      if (shouldShowDay5Modal) setDay5UnlockModal(true);
      setFreeRunTotalEarned(gameSave.total_coins || 0);
      setDayPhase("freeRunEnd");
      return;
    }

    if (goToWeekend) {
      navigate(`/weekly-summary?id=${saveId}`);
      return;
    }

    // ── Start next day: reset all day-scoped state, back to preDay ───────
    setDayState(null);
    setSelectedRole(null);
    setCurrentProblem(null);
    currentProblemRef.current = null;
    setFeedback(null);
    const saveForNextDifficulty = {
      ...gameSave,
      recipe_book: nextRecipeBook,
      equipped_recipe_ids: equipFinal,
      menu_slots: nextMenuSlots,
    };
    timer.reset(getDayDuration(getEffectiveDifficulty(saveForNextDifficulty))); // destroy old timer
    setDayPhase("preDay");
    dayPhaseRef.current = "preDay";
  };

  // ── Menu actions ──────────────────────────────────────────────────────────
  const handleMenuSave = async () => {
    if (!gameSave) return;
    setSavingDay(true);
    await GameSave.update(gameSave.id, {
      current_day: gameSave.current_day || 1,
      current_week: gameSave.current_week ?? 0,
      total_coins: gameSave.total_coins || 0,
      tutorial_complete: gameSave.tutorial_complete || false,
      recipe_book: gameSave.recipe_book || {},
      equipped_recipe_ids: gameSave.equipped_recipe_ids || [],
      menu_slots: gameSave.menu_slots || { ...DEFAULT_MENU_SLOTS },
    });
    queryClient.invalidateQueries({ queryKey: ["gameSave", saveId] });
    setSavingDay(false);
    setMenuOpen(false);
  };

  const handleMenuQuit = async () => {
    if (!gameSave) { navigate("/"); return; }
    timer.stop();
    setSavingDay(true);
    // Record partial run to leaderboard even if quitting mid-run
    const quitState = dayStateRef.current;
    if (!isStorySave(gameSave) && quitState && quitState.completedOrders > 0) {
      const quitScore = quitState.correctTransactionTotal || 0;
      const quitAccuracy = quitState.dayTotal > 0
        ? Math.round((quitState.dayCorrect / quitState.dayTotal) * 100) : 0;
      await recordRun({
        playerName: gameSave.player_name,
        bakeryName: gameSave.bakery_name,
        score: quitScore,
        difficulty: getEffectiveDifficulty(gameSave),
        accuracyPct: quitAccuracy,
        customersServed: quitState.completedOrders,
        village: gameSave.village,
        tipsEarned: quitState.tipsEarned || 0,
        correctTransactions: quitState.tippedTransactions || 0,
      });
      recordRunForUnlocks(quitScore);
    }
    await GameSave.update(gameSave.id, {
      current_day: gameSave.current_day || 1,
      current_week: gameSave.current_week ?? 0,
      total_coins: gameSave.total_coins || 0,
      tutorial_complete: gameSave.tutorial_complete || false,
      recipe_book: gameSave.recipe_book || {},
      equipped_recipe_ids: gameSave.equipped_recipe_ids || [],
      menu_slots: gameSave.menu_slots || { ...DEFAULT_MENU_SLOTS },
    });
    queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
    setSavingDay(false);
    navigate("/");
  };

  const handleFreePlayAgain = () => {
    queryClient.invalidateQueries({ queryKey: ["gameSave", saveId] });
    timer.reset(getDayDuration(gameSave ? getEffectiveDifficulty(gameSave) : "easy"));
    setDayState(null);
    setSelectedRole(null);
    setCurrentProblem(null);
    currentProblemRef.current = null;
    setFeedback(null);
    setFreeRunTotalEarned(0);
    setDayPhase("preDay");
    dayPhaseRef.current = "preDay";
  };

  // ── Derived display values ────────────────────────────────────────────────
  if (isLoading || !gameSave || !convertedRecipes) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const currentWeek = gameSave.current_week ?? 0;
  const isTutorial  = currentWeek === 0;
  const role        = selectedRole || dayState?.currentRole;
  const roleLabel   = role === "cashier" ? "Cashier" : role === "packager" ? "Packager" : role === "baker" ? "Baker" : "";
  const showTimer   = dayPhase === "activeDay" || dayPhase === "lastCall";

  return (
    <div className="min-h-screen flex flex-col relative">
      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, message: "" })}
        message={upgradeModal.message}
      />
      <Day5UnlockModal open={day5UnlockModal} onClose={() => setDay5UnlockModal(false)} />

      <AnimatePresence>
        {isProcessing && <SpriteProcessingOverlay progress={progress} />}
      </AnimatePresence>

      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${SCENE_IMAGES[gameSave.village]})` }} />
      <div className="absolute inset-0 bg-black/30" />

      {import.meta.env.DEV && (
        <>
          {/* Debug toggle */}
          <button
            type="button"
            onClick={() => setDebugMode((v) => !v)}
            className={`fixed bottom-4 right-4 z-50 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-display ${
              debugMode ? "bg-yellow-400/30 border-yellow-400 text-yellow-300"
                        : "bg-black/40 border-white/20 text-white/40 hover:text-white/60"}`}
          >
            <Bug className="w-3 h-3" />
            {debugMode ? `Debug ON [${dayPhase}]` : "Debug"}
          </button>

          {debugMode && dayState && (
            <DebugOverlay dayState={dayState} gameSave={gameSave}
              customerIndex={dayState.completedOrders} totalProblems={null} />
          )}
        </>
      )}

      <GameMenu open={menuOpen} onClose={() => setMenuOpen(false)}
        onSave={handleMenuSave} onQuit={handleMenuQuit} isSaving={savingDay} />

      <div className="relative z-10 flex flex-col min-h-screen min-h-0">
        <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border shadow-sm">
          <GameHeader gameSave={gameSave} village={village} />
          <div className="flex justify-end items-center gap-2 px-4 pb-2">
            <AudioManager />
            <button
              type="button"
              onClick={() => { playSFX("click"); setMenuOpen(true); }}
              className="flex items-center gap-1.5 bg-secondary/80 hover:bg-secondary border border-border rounded-full px-3 py-1.5 font-display text-sm font-bold text-foreground transition-colors shadow"
            >
              ☰ Menu
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 max-w-6xl mx-auto w-full">
          {/* ── Day header ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-4 sm:mb-5">
            <div className="inline-flex items-center gap-2 bg-secondary/80 rounded-full px-4 py-2 mb-1">
              <Sun className="w-4 h-4 text-primary" />
              <span className="font-display font-bold text-sm text-foreground">
                {isTutorial ? "Tutorial" : `Week ${currentWeek}`} — Day {gameSave.current_day || 1}
              </span>
              {role && (
                <span className="text-xs bg-primary/10 text-primary font-display font-semibold px-2 py-0.5 rounded-full">
                  {roleLabel}
                </span>
              )}
            </div>

            {/* Timer row */}
            {showTimer && (
              <div className="flex items-center justify-center gap-3 mt-2">
                <DayTimer
                  secondsLeft={timer.secondsLeft}
                  totalSeconds={dayDuration}
                  hasExpired={dayPhase === "lastCall" || dayPhase === "dayComplete"}
                />
                {dayState && (
                  <span className="font-display text-xs text-white/70">
                    {dayState.completedOrders} served
                  </span>
                )}
              </div>
            )}

            {/* Last Call banner */}
            <AnimatePresence>
              {dayPhase === "lastCall" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/90 text-white font-display font-bold text-xs px-3 py-1 rounded-full shadow"
                >
                  🔔 Last Call — finish this customer!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── preDay: Manager Overview ── */}
          {dayPhase === "preDay" && (
            <ManagerOverview
              isTutorial={isTutorial}
              currentDay={gameSave.current_day || 1}
              onSelectRole={handleSelectRole}
            />
          )}

          {/* ── activeDay / lastCall: Gameplay ── */}
          {(dayPhase === "activeDay" || dayPhase === "lastCall") && dayState && (
            <div className="flex flex-col gap-3 lg:gap-4 min-h-0 pb-6">
              {role === "cashier" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4 items-start">
                  <div className="md:col-span-2 lg:col-span-4 md:order-3 lg:order-1">
                    <ProductMenu products={products} currency={village.currency} />
                  </div>
                  {currentProblem?.order && (
                    <div className="md:col-span-1 lg:col-span-5 md:order-1 lg:order-2">
                      <CustomerOrder
                        order={currentProblem.order}
                        currency={village.currency}
                        showTotal={currentProblem.phase === "make_change"}
                      />
                    </div>
                  )}
                  <div className="md:col-span-1 lg:col-span-3 md:order-2 lg:order-3 min-h-0 max-h-[56vh] md:max-h-[62vh] lg:max-h-none overflow-y-auto lg:overflow-visible">
                    <ProblemPanel
                      problem={currentProblem}
                      currency={village.currency}
                      onSubmit={handleSubmitAnswer}
                      feedback={feedback}
                      attempts={dayState.attempts}
                      maxAttempts={MAX_ATTEMPTS}
                    />
                  </div>
                </div>
              ) : (
                <div className="max-w-xl mx-auto w-full min-h-0 max-h-[62vh] sm:max-h-none overflow-y-auto sm:overflow-visible">
                  <ProblemPanel
                    problem={currentProblem}
                    currency={village.currency}
                    onSubmit={handleSubmitAnswer}
                    feedback={feedback}
                    attempts={dayState.attempts}
                    maxAttempts={MAX_ATTEMPTS}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── freeRunEnd ── */}
          {dayPhase === "freeRunEnd" && (
            <FreeRunEndScreen
              bakeryName={gameSave.bakery_name}
              totalEarned={freeRunTotalEarned}
              currency={village?.currency || "$"}
              onPlayAgain={handleFreePlayAgain}
              onMainMenu={() => navigate("/")}
            />
          )}

          {/* ── dayComplete: Debrief ── */}
          {dayPhase === "dayComplete" && dayState && (
            <EndDayDebrief
              gameSave={gameSave}
              villageKey={gameSave.village}
              currency={village.currency}
              role={role}
              receipts={dayState.receipts}
              packagingLog={dayState.packagingLog}
              ingredientTotals={dayState.ingredientTotals}
              dayCorrect={dayState.dayCorrect}
              dayTotal={dayState.dayTotal}
              dayEarnings={dayState.dayEarnings}
              correctTransactionTotal={dayState.correctTransactionTotal || 0}
              tipsEarned={dayState.tipsEarned || 0}
              tippedTransactions={dayState.tippedTransactions || 0}
              difficulty={getEffectiveDifficulty(gameSave)}
              walletAfterPay={pendingWalletAfterPay ?? (gameSave.total_coins || 0)}
              currentDay={gameSave.current_day || 1}
              isTutorial={isTutorial}
              ownerPortraitUrl={getOwnerUrl(gameSave.village)}
              scoreBreakdown={pendingScoreBreakdown}
              isNewTop={pendingIsNewTop}
              onComplete={handleDayComplete}
              onPaycheckCommit={commitPaycheck}
            />
          )}
        </div>
      </div>
    </div>
  );
}