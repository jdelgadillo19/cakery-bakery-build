import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronRight, TrendingUp, BookOpen, Home } from "lucide-react";
import NumericInput from "@/components/game/NumericInput";
import { OWNER_PORTRAITS } from "@/lib/gameEngine";
import { buildDaySummary } from "@/lib/economyEngine";
import { playSFX, playSlowBGM, playFastBGM } from "@/lib/audio";
import ScoreBreakdown from "@/components/game/ScoreBreakdown";
import RecipeBookPanel from "@/components/game/RecipeBookPanel";
import MenuEquipModal from "@/components/game/MenuEquipModal";
import { isStorySave } from "@/lib/storyStats";
import { isRecipeBookUnlocked } from "@/lib/recipeBook";
import {
  createShoppingDraft,
  patchRecipePurchase,
  patchSlotUpgrade,
} from "@/lib/recipeShopping";
import { resolveAssetUrl, resolveAssetFallback } from "@/lib/localAssets";

function OwnerSpeech({ villageKey, message, ownerPortraitUrl }) {
  const typingRef = useRef(null);

  useEffect(() => {
    if (typingRef.current) clearInterval(typingRef.current);
    let count = 0;
    const maxTicks = Math.min((message || "").length, 40);
    typingRef.current = setInterval(() => {
      playSFX("type");
      count++;
      if (count >= maxTicks) {
        clearInterval(typingRef.current);
        typingRef.current = null;
      }
    }, 40);
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [message]);

  const ownerEntry = OWNER_PORTRAITS[villageKey];
  const primary =
    (typeof ownerPortraitUrl === "string" ? ownerPortraitUrl : resolveAssetUrl(ownerPortraitUrl)) ||
    resolveAssetUrl(ownerEntry);
  const fb = resolveAssetFallback(ownerEntry);
  const [imgBroken, setImgBroken] = useState(false);
  useEffect(() => {
    setImgBroken(false);
  }, [primary, villageKey]);
  const portraitSrc = imgBroken && fb ? fb : primary;

  return (
    <div className="flex items-end gap-4 w-full">
      <div className="w-20 h-20 flex-shrink-0">
        {portraitSrc ? (
          <img
            src={portraitSrc}
            alt="Owner"
            className="w-full h-full object-contain drop-shadow-md"
            onError={() => setImgBroken(true)}
          />
        ) : (
          <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-3xl">👨‍🍳</div>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="flex-1 relative bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-md"
        >
          <div className="absolute -left-2.5 bottom-4 w-0 h-0 border-t-8 border-t-transparent border-r-[10px] border-r-card border-b-8 border-b-transparent" />
          <p className="font-body text-sm text-foreground leading-relaxed">{message}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Narrator/internal monologue — no portrait, italic styling, different visual treatment
function NarratorSpeech({ message }) {
  const typingRef = useRef(null);
  useEffect(() => {
    if (typingRef.current) clearInterval(typingRef.current);
    let count = 0;
    const maxTicks = Math.min((message || "").length, 40);
    typingRef.current = setInterval(() => {
      playSFX("type");
      count++;
      if (count >= maxTicks) { clearInterval(typingRef.current); typingRef.current = null; }
    }, 40);
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [message]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="w-full text-center px-4 py-5"
      >
        {/* Decorative line */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-lg">✦</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>
        <p className="font-body italic text-muted-foreground leading-relaxed text-sm">{message}</p>
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-xs text-muted-foreground/50 font-display uppercase tracking-widest">~</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Scrollable list for sum-check rows: taller viewport (~5½ rows) + fade + hint when more content exists */
function ScrollableSumRows({ rowCount, children }) {
  const ref = useRef(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const overflow = el.scrollHeight > el.clientHeight + 1;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 8;
      setShowHint(overflow && !atBottom);
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [rowCount]);

  return (
    <div className="space-y-1">
      <div className="relative rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
        <div
          ref={ref}
          className="space-y-1.5 max-h-[min(44vh,18.75rem)] overflow-y-auto overscroll-contain px-2 py-2 pr-2.5 [-webkit-overflow-scrolling:touch]"
        >
          {children}
        </div>
        {showHint && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card via-card/90 to-transparent"
          />
        )}
      </div>
      {showHint && (
        <p className="text-center text-[11px] font-display font-semibold text-muted-foreground tracking-wide">
          Scroll for more ↓
        </p>
      )}
    </div>
  );
}

function AnswerForm({ prefix, answerSuffix, onSubmit, attempts, maxAttempts, feedback, placeholder = "0", allowDecimals = true }) {
  const [val, setVal] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    const n = parseFloat(val);
    if (isNaN(n) || val.trim() === "") return;
    onSubmit(n);
    setVal("");
  };
  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key={feedback.type + feedback.message}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`flex items-start gap-2 rounded-lg p-3 ${feedback.type === "correct" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
          >
            {feedback.type === "correct" ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <X className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <p className="font-display text-sm font-medium">{feedback.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <form onSubmit={handleSubmit} className="flex gap-2 items-start">
        <NumericInput
          value={val}
          onChange={setVal}
          placeholder={placeholder}
          prefix={prefix}
          suffix={answerSuffix || undefined}
          allowDecimals={allowDecimals}
          autoFocus
        />
        <Button type="submit" size="lg" className="h-12 px-5 font-display font-bold flex-shrink-0">
          <Check className="w-5 h-5 mr-1" /> Submit
        </Button>
      </form>
      <p className="text-xs font-display text-muted-foreground text-center">
        Attempt {attempts + 1} of {maxAttempts}
      </p>
    </div>
  );
}

const NEXT_ROLE = { 1: "packager", 2: "baker" };

/**
 * EndDayDebrief — unified end-of-day flow for all three roles.
 * Phases: opening → sum_check → earnings → closing
 */
export default function EndDayDebrief({
  gameSave,
  walletAfterPay,
  villageKey,
  currency,
  role,
  receipts = [],
  packagingLog = [],
  ingredientTotals = {},
  dayCorrect,
  dayTotal,
  dayEarnings,
  correctTransactionTotal = 0,
  tipsEarned = 0,
  tippedTransactions = 0,
  difficulty,
  currentDay,
  isTutorial,
  ownerPortraitUrl,
  scoreBreakdown = null,
  isNewTop = false,
  onComplete,
  onPaycheckCommit,
}) {
  const isStory = !!(gameSave && isStorySave(gameSave));
  const showRecipeShop = !!(isStory && isRecipeBookUnlocked(gameSave));
  const accuracy = dayTotal > 0 ? dayCorrect / dayTotal : 0;
  const accuracyPct = Math.round(accuracy * 100);
  const daySummary = buildDaySummary({ rawEarnings: correctTransactionTotal, accuracy, problemsCorrect: dayCorrect, dayTotal, difficulty: difficulty || "easy" });

  const { correctAnswer, sumLabel, itemRows, questionText, answerPrefix, answerSuffix } = buildSumCheckData(
    role, receipts, packagingLog, ingredientTotals, currency
  );

  const openingLines = buildOpeningLines(accuracyPct, role);
  const closingLines = buildClosingLines(currentDay, isTutorial, accuracyPct);

  const [phase, setPhase] = useState("opening"); // opening | sum_check | earnings | farewell | travel_choice | market_choice | apartment_shop_stub | recipe_shop | closing | home | night | morning
  const [shoppingDraft, setShoppingDraft] = useState(null);
  const [morningEquipIds, setMorningEquipIds] = useState(null);
  const [equipModalOpen, setEquipModalOpen] = useState(false);
  const paycheckCommittedRef = useRef(false);

  const syntheticShopSave = useMemo(() => {
    if (!shoppingDraft || !gameSave) return null;
    const spendable =
      Math.round(((walletAfterPay ?? (gameSave.total_coins || 0)) - shoppingDraft.coinsSpent) * 100) / 100;
    return {
      ...gameSave,
      recipe_book: shoppingDraft.recipe_book,
      equipped_recipe_ids: shoppingDraft.equipped_recipe_ids,
      menu_slots: shoppingDraft.menu_slots,
      total_coins: spendable,
    };
  }, [shoppingDraft, gameSave, walletAfterPay]);

  const morningEquipSave = useMemo(() => {
    if (!gameSave) return null;
    const ids =
      morningEquipIds ??
      shoppingDraft?.equipped_recipe_ids ??
      gameSave.equipped_recipe_ids ??
      [];
    const draft = shoppingDraft;
    return {
      ...gameSave,
      recipe_book: draft ? draft.recipe_book : gameSave.recipe_book,
      equipped_recipe_ids: ids,
      menu_slots: draft ? draft.menu_slots : gameSave.menu_slots,
      total_coins: Math.round(((walletAfterPay ?? (gameSave.total_coins || 0)) - (draft?.coinsSpent ?? 0)) * 100) / 100,
    };
  }, [gameSave, shoppingDraft, morningEquipIds, walletAfterPay]);

  useEffect(() => {
    if (phase !== "morning") return;
    setMorningEquipIds((prev) => {
      if (prev !== null) return prev;
      const fromDraft = shoppingDraft?.equipped_recipe_ids;
      if (fromDraft && fromDraft.length) return [...fromDraft];
      return [...(gameSave.equipped_recipe_ids || [])];
    });
  }, [phase, shoppingDraft, gameSave]);

  const [openingIndex, setOpeningIndex] = useState(0);
  const [closingIndex, setClosingIndex] = useState(0);
  const [sumAttempts, setSumAttempts] = useState(0);
  const [sumFeedback, setSumFeedback] = useState(null);
  const [sumDone, setSumDone] = useState(false);

  const advanceOpening = () => {
    playSFX("click");
    if (openingIndex < openingLines.length - 1) {
      setOpeningIndex((i) => i + 1);
    } else {
      setPhase("sum_check");
    }
  };

  const advanceFromSumCheck = () => { playSFX("click"); setPhase("earnings"); };

  const handleSumSubmit = (val) => {
    const correct = Math.abs(val - correctAnswer) < 0.05;
    const newAttempts = sumAttempts + 1;

    if (correct) {
      setSumFeedback({ type: "correct", message: `Correct! The answer is ${answerPrefix}${formatAnswer(correctAnswer)}${answerSuffix}.` });
      setSumAttempts(newAttempts);
      setSumDone(true);
      setTimeout(() => { setSumFeedback(null); setPhase("earnings"); }, 1200);
    } else if (newAttempts >= 2) {
      setSumFeedback({ type: "incorrect", message: `The correct answer was ${answerPrefix}${formatAnswer(correctAnswer)}${answerSuffix}. Keep practicing!` });
      setSumAttempts(newAttempts);
      setSumDone(true);
      setTimeout(() => { setSumFeedback(null); setPhase("earnings"); }, 2500);
    } else {
      setSumFeedback({ type: "incorrect", message: "Not quite — check your working and try again." });
      setSumAttempts(newAttempts);
    }
  };

  const advanceClosing = () => {
    playSFX("click");
    if (closingIndex < closingLines.length - 1) {
      setClosingIndex((i) => i + 1);
    } else {
      playSlowBGM(villageKey); // slow BGM for home/night/morning phases
      setPhase("home");
    }
  };

  const commitPaycheckOnce = () => {
    if (paycheckCommittedRef.current) return;
    paycheckCommittedRef.current = true;
    onPaycheckCommit?.();
  };

  const advanceFromEarnings = () => {
    playSFX("click");
    commitPaycheckOnce();
    setPhase("farewell");
  };

  // [HOME PHASE] — player presses "Go to Bed" → night dialogue → morning → onComplete
  const nightLines = buildNightLines(accuracyPct);
  const morningLines = buildMorningLines();
  const [nightIndex, setNightIndex] = useState(0);
  const [morningIndex, setMorningIndex] = useState(0);

  const handleGoToBed = () => {
    playSFX("click");
    setPhase("night");
  };

  const advanceNight = () => {
    playSFX("click");
    if (nightIndex < nightLines.length - 1) {
      setNightIndex((i) => i + 1);
    } else {
      // Transition to morning
      setPhase("morning");
    }
  };

  const advanceMorning = () => {
    playSFX("click");
    if (morningIndex < morningLines.length - 1) {
      setMorningIndex((i) => i + 1);
    } else {
      // [ADVANCE_DAY] — fires fast BGM then advances (optional recipe shop snapshot)
      playFastBGM(villageKey);
      const equipOut =
        morningEquipIds ??
        shoppingDraft?.equipped_recipe_ids ??
        gameSave.equipped_recipe_ids ??
        [];
      onComplete({
        ...(shoppingDraft ? { shopping: shoppingDraft } : {}),
        ...(isStory ? { equipped_recipe_ids: equipOut } : {}),
      });
    }
  };

  const goHomeFromMarketShops = () => {
    playSFX("click");
    setPhase("closing");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-5 px-1"
    >
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xl space-y-5">
        {phase === "opening" && (
          <>
            <OwnerSpeech
              villageKey={villageKey}
              message={openingLines[openingIndex]}
              ownerPortraitUrl={ownerPortraitUrl}
            />
            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                {openingLines.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === openingIndex ? "bg-primary" : i < openingIndex ? "bg-primary/30" : "bg-muted"}`} />
                ))}
              </div>
              <Button onClick={advanceOpening} className="font-display font-bold gap-1">
                {openingIndex < openingLines.length - 1 ? "Continue" : "See today's work"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {phase === "sum_check" && (
          <>
            <OwnerSpeech
              villageKey={villageKey}
              message={buildSumCheckOwnerIntro(role)}
              ownerPortraitUrl={ownerPortraitUrl}
            />
            <p className="font-display font-bold text-foreground text-sm">{sumLabel}</p>
            <ScrollableSumRows rowCount={itemRows.length}>
              {itemRows.map((row, i) => (
                <div key={i} className="flex justify-between bg-muted/50 rounded-lg px-3 py-2">
                  <span className="font-display text-sm text-muted-foreground">{row.label}</span>
                  <span className="font-display font-bold text-sm text-foreground">{row.value}</span>
                </div>
              ))}
            </ScrollableSumRows>
            <p className="font-body text-sm text-muted-foreground italic">{questionText}</p>
            {!sumDone && (
              <AnswerForm
                prefix={answerPrefix}
                answerSuffix={answerSuffix}
                onSubmit={handleSumSubmit}
                attempts={sumAttempts}
                maxAttempts={2}
                feedback={sumFeedback}
                placeholder={role === "cashier" ? "0.00" : "0"}
                allowDecimals={role !== "packager"}
              />
            )}
            {sumDone && sumFeedback && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-start gap-2 rounded-lg p-3 ${sumFeedback.type === "correct" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
              >
                {sumFeedback.type === "correct" ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <X className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <p className="font-display text-sm font-medium">{sumFeedback.message}</p>
              </motion.div>
            )}
          </>
        )}

        {phase === "earnings" && (
          <>
            <OwnerSpeech
              villageKey={villageKey}
              message="Here's how your numbers landed today — scan the breakdown before we clock out."
              ownerPortraitUrl={ownerPortraitUrl}
            />
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-foreground">Today's Score</h3>
            </div>
            <ScoreBreakdown
              breakdown={scoreBreakdown || daySummary}
              currency={currency}
              isNewTop={isNewTop}
            />
            <div className="flex justify-end pt-3">
              <Button
                onClick={advanceFromEarnings}
                className="font-display font-bold gap-1"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {phase === "farewell" && (
          <>
            <OwnerSpeech
              villageKey={villageKey}
              message={buildFarewellLine(accuracyPct)}
              ownerPortraitUrl={ownerPortraitUrl}
            />
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  playSFX("click");
                  if (isStory) setPhase("travel_choice");
                  else setPhase("closing");
                }}
                className="font-display font-bold gap-1"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {phase === "travel_choice" && (
          <>
            <NarratorSpeech message="Sun's dropping behind the roofs. Swing by the market, or cut straight home?" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="font-display font-bold h-12"
                onClick={() => {
                  playSFX("click");
                  setPhase("closing");
                }}
              >
                Head straight home
              </Button>
              <Button
                type="button"
                className="font-display font-bold h-12"
                onClick={() => {
                  playSFX("click");
                  setPhase("market_choice");
                }}
              >
                Go to the market
              </Button>
            </div>
          </>
        )}

        {phase === "market_choice" && (
          <>
            <NarratorSpeech message="Stalls are still lit. Recipes first, or poke at apartment stuff?" />
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                className="font-display font-bold h-11"
                disabled={!showRecipeShop}
                title={!showRecipeShop ? "Unlocks after you finish training" : undefined}
                onClick={() => {
                  if (!showRecipeShop) return;
                  playSFX("click");
                  if (!shoppingDraft) setShoppingDraft(createShoppingDraft(gameSave));
                  setPhase("recipe_shop");
                }}
              >
                Recipe market
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="font-display font-bold h-11"
                onClick={() => {
                  playSFX("click");
                  setPhase("apartment_shop_stub");
                }}
              >
                Apartment improvements
              </Button>
              <Button type="button" variant="ghost" className="font-display text-xs" onClick={() => { playSFX("click"); setPhase("travel_choice"); }}>
                ← Leave the market
              </Button>
            </div>
          </>
        )}

        {phase === "apartment_shop_stub" && (
          <>
            <NarratorSpeech message="Mostly quiet here — nothing worth opening my wallet for yet. Décor's still just a rumor." />
            <div className="text-center py-2">
              <div className="text-4xl">🏠</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1 font-display font-bold"
                onClick={() => { playSFX("click"); setPhase("market_choice"); }}
              >
                ← Back to market
              </Button>
              <Button
                type="button"
                className="flex-1 font-display font-bold gap-1"
                onClick={goHomeFromMarketShops}
              >
                <Home className="w-4 h-4" />
                Go home
              </Button>
            </div>
          </>
        )}

        {phase === "recipe_shop" && syntheticShopSave && (
          <>
            <NarratorSpeech message="Recipe sellers are still hawking rolls and margins. I'll browse — spend if it feels worth it." />
            <div className="rounded-xl border border-border overflow-hidden bg-card flex flex-col max-h-[min(72vh,560px)] min-h-0 shadow-inner">
              <RecipeBookPanel
                variant="shop"
                viewSave={syntheticShopSave}
                currency={currency}
                unlocked
                title="Recipe Shop"
                onPurchase={(recipe) => setShoppingDraft((d) => patchRecipePurchase(d, gameSave, recipe))}
                onSlotUpgrade={(slot, cost) => setShoppingDraft((d) => patchSlotUpgrade(d, slot, cost))}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  playSFX("click");
                  setPhase("market_choice");
                }}
                className="flex-1 font-display font-bold"
              >
                ← Back to market
              </Button>
              <Button
                type="button"
                className="flex-1 font-display font-bold gap-1"
                onClick={goHomeFromMarketShops}
              >
                <Home className="w-4 h-4" />
                Go home
              </Button>
            </div>
          </>
        )}

        {phase === "closing" && (
          <>
            <NarratorSpeech message={closingLines[closingIndex]} />
            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                {closingLines.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === closingIndex ? "bg-primary" : i < closingIndex ? "bg-primary/30" : "bg-muted"}`} />
                ))}
              </div>
              <Button onClick={advanceClosing} className="font-display font-bold gap-1">
                {closingIndex < closingLines.length - 1 ? "Continue" : "Head Home"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* [HOME PHASE] — waits for explicit "Go to Bed" button press */}
        {phase === "home" && (
          <>
            <div className="text-center py-2">
              <div className="text-4xl mb-3">🏠</div>
              <h3 className="font-display font-bold text-lg text-foreground mb-1">Back Home</h3>
              <p className="font-body text-sm text-muted-foreground mb-5 italic leading-relaxed">
                Pay sheet shows {currency}{(scoreBreakdown || daySummary).finalScore?.toFixed(2) ?? daySummary.total.toFixed(2)} after today&apos;s shift — not thinking about ovens until morning.
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 mb-4">
              <p className="font-display text-xs text-muted-foreground text-center font-semibold uppercase tracking-wide mb-2">Today's Summary</p>
              <div className="flex justify-around text-center">
                <div>
                  <p className="font-display font-bold text-foreground">{accuracyPct}%</p>
                  <p className="font-display text-xs text-muted-foreground">Accuracy</p>
                </div>
                <div>
                  <p className="font-display font-bold text-foreground">{currency}{((scoreBreakdown || daySummary).finalScore ?? daySummary.total).toFixed(2)}</p>
                  <p className="font-display text-xs text-muted-foreground">Score</p>
                </div>
              </div>
            </div>
            {/* [CRITICAL] — day does NOT advance until this button is pressed */}
            <div className="space-y-2">
              {showRecipeShop && morningEquipSave && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { playSFX("click"); setEquipModalOpen(true); }}
                  className="w-full font-display font-bold text-base h-11 gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Edit recipe menu
                </Button>
              )}
              <Button
                onClick={handleGoToBed}
                className="w-full font-display font-bold text-base h-12 gap-2"
              >
                🌙 Go to Bed
              </Button>
            </div>
          </>
        )}

        {/* [NIGHT PHASE] — narrator/internal monologue after "go to bed" */}
        {phase === "night" && (
          <>
            <div className="text-center mb-1">
              <div className="text-3xl">🌙</div>
            </div>
            <NarratorSpeech message={nightLines[nightIndex]?.text || nightLines[nightIndex]} />
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-1">
                {nightLines.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === nightIndex ? "bg-primary" : i < nightIndex ? "bg-primary/30" : "bg-muted"}`} />
                ))}
              </div>
              <Button onClick={advanceNight} className="font-display font-bold gap-1">
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* [MORNING PHASE] — Owner greeting before new day starts */}
        {phase === "morning" && (
          <>
            <div className="text-center mb-1">
              <div className="text-3xl">☀️</div>
            </div>
            <OwnerSpeech
              villageKey={villageKey}
              message={morningLines[morningIndex]}
              ownerPortraitUrl={ownerPortraitUrl}
            />
            {showRecipeShop && morningEquipSave && (
              <Button
                type="button"
                variant="outline"
                onClick={() => { playSFX("click"); setEquipModalOpen(true); }}
                className="w-full font-display font-bold text-base h-11 gap-2 mt-2"
              >
                <BookOpen className="w-4 h-4" />
                Edit recipe menu
              </Button>
            )}
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-1">
                {morningLines.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === morningIndex ? "bg-primary" : i < morningIndex ? "bg-primary/30" : "bg-muted"}`} />
                ))}
              </div>
              <Button onClick={advanceMorning} className="font-display font-bold gap-1">
                {morningIndex < morningLines.length - 1 ? "Continue" : "Start Day!"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {showRecipeShop && morningEquipSave && (
        <MenuEquipModal
          open={equipModalOpen}
          gameSave={morningEquipSave}
          onChange={(ids) => setMorningEquipIds(ids)}
          onClose={() => setEquipModalOpen(false)}
        />
      )}
    </motion.div>
  );
}

function buildFarewellLine(accuracyPct = 0) {
  if (accuracyPct >= 95) return "Outstanding work today — see you tomorrow!";
  if (accuracyPct >= 80) return "Great work today — see you tomorrow!";
  if (accuracyPct >= 60) return "Solid effort — get some rest, see you tomorrow!";
  return "Tough one out there — tomorrow's a fresh start. See you then!";
}

function buildSumCheckOwnerIntro(role) {
  if (role === "cashier") return "Before we wrap up, let's add up today's receipts together.";
  if (role === "packager") return "One more step — let's tally everything you packed today.";
  return "Let's verify your ingredient totals before we close out.";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAnswer(n) {
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(2)).toString();
}

function buildSumCheckData(role, receipts, packagingLog, ingredientTotals, currency) {
  if (role === "cashier") {
    const correctAnswer = receipts.reduce((s, r) => Math.round((s + r) * 100) / 100, 0);
    return {
      correctAnswer,
      sumLabel: "Today's Receipts",
      itemRows: receipts.map((r, i) => ({ label: `Order ${i + 1}`, value: `${currency}${r.toFixed(2)}` })),
      questionText: "Add up all the receipts. What is the total for today?",
      answerPrefix: currency,
      answerSuffix: "",
    };
  }

  if (role === "packager") {
    const totalBoxes = packagingLog.reduce((s, p) => s + p.boxesUsed, 0);
    return {
      correctAnswer: totalBoxes,
      sumLabel: "Today's Packaging",
      itemRows: packagingLog.map((p, i) => ({
        label: `${p.itemType} (×${p.boxSize}/box)`,
        value: `${p.boxesUsed} boxes`,
      })),
      questionText: "How many boxes did you pack in total today?",
      answerPrefix: "",
      answerSuffix: " boxes",
    };
  }

  if (role === "baker") {
    // Pick one ingredient to ask about (the one with the highest total)
    const entries = Object.entries(ingredientTotals).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      return {
        correctAnswer: 0,
        sumLabel: "Today's Baking",
        itemRows: [],
        questionText: "No ingredients tracked today.",
        answerPrefix: "",
        answerSuffix: "",
      };
    }
    const [targetKey, targetTotal] = entries[Math.floor(Math.random() * entries.length)];
    return {
      correctAnswer: targetTotal,
      sumLabel: "Today's Ingredient Usage",
      itemRows: entries.map(([k, v]) => ({
        label: k.charAt(0).toUpperCase() + k.slice(1),
        value: formatAnswer(v),
      })),
      questionText: `How much ${targetKey} did you use in total today?`,
      answerPrefix: "",
      answerSuffix: "",
    };
  }

  return { correctAnswer: 0, sumLabel: "", itemRows: [], questionText: "", answerPrefix: "", answerSuffix: "" };
}

function buildOpeningLines(accuracy, role) {
  const accuracyLine = accuracy >= 80
    ? `You wrapped the shift at ${accuracy}% accuracy — that's what I like to see.`
    : accuracy >= 50
    ? `${accuracy}% today — solid enough; we'll tighten the loose ends tomorrow.`
    : `${accuracy}% isn't where we want it yet — we'll drill it until it sticks.`;

  const roleIntro = role === "cashier"
    ? "Before you head out, we'll reconcile what rang through on your drawer."
    : role === "packager"
    ? "One more habit: we count boxes and labels before we call it closed."
    : "I need your numbers on ingredients before I sign off on the day.";

  return [accuracyLine, roleIntro];
}

// First-person internal monologue after the player is home (not the owner).
function buildNightLines(accuracyPct) {
  if (accuracyPct >= 80) {
    return [
      { speaker: "narrator", text: "Door shut. Apron finally off. The flat's quiet — I notice I can still smell flour on my sleeves." },
      { speaker: "narrator", text: "I'll roll into bed early. Tomorrow's orders can wait until morning." },
    ];
  } else if (accuracyPct >= 50) {
    return [
      { speaker: "narrator", text: "Home. I drape the apron over the chair and don't look at it again tonight." },
      { speaker: "narrator", text: "Food, shower, sleep — in that order, if I'm lucky." },
    ];
  } else {
    return [
      { speaker: "narrator", text: "The walk back is too long. I'm picking at every mistake I can remember." },
      { speaker: "narrator", text: "Still... bed. Blank slate tomorrow. No use spiraling." },
    ];
  }
}

/** Owner addressing the employee on the threshold of a new shift */
function buildMorningLines() {
  return [
    "Morning. You look rested — good. Hydrate before the rush hits.",
    "Openers are my call; you keep the line moving. Ready when you are.",
  ];
}

const TUTORIAL_NEXT_STATION_LABEL = { packager: "packaging", baker: "the ovens", cashier: "the counter" };

/** Player's thoughts while leaving the bakery (narrator); not the owner's voice */
function buildClosingLines(currentDay, isTutorial, accuracy) {
  const open = accuracy >= 80
    ? "Locking up. Feet are tired in a good way — I know what I earned today."
    : accuracy >= 50
    ? "Clocking out. Not my cleanest shift, but it's in the books."
    : "Rough one. I'm leaving it on this side of the door.";

  const lines = [open];

  if (isTutorial) {
    const nextRole = NEXT_ROLE[currentDay];
    if (nextRole) {
      const where = TUTORIAL_NEXT_STATION_LABEL[nextRole] || nextRole;
      lines.push(`Word is tomorrow they park me on ${where}. Different muscle memory — I'll adapt.`);
      lines.push("Tonight I eat something hot and pretend flour isn't a food group.");
    } else {
      lines.push("Three training rotations done — counter, packaging, ovens.");
      lines.push("Next week's the real tempo: whole bakery, no training wheels.");
    }
  }

  lines.push("Same apron tomorrow. For now — sidewalk, bus, whatever gets me away from ovens.");

  return lines;
}