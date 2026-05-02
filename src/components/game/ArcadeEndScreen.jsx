// ============================================================
// CAKERY BAKERY — ArcadeEndScreen
//
// Flow (all difficulties):
//   tallyDialogue → tally (ArcadePlay) → baker → narrator → CTA
//
// Tally is handled externally in ArcadePlay before this screen.
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, Trophy } from "lucide-react";
import { OWNER_PORTRAITS } from "@/lib/gameEngine";
import { resolveAssetUrl, resolveAssetFallback } from "@/lib/localAssets";
import { playSFX } from "@/lib/audio";

// ── Speech components ────────────────────────────────────────────────────────

function OwnerSpeech({ villageKey, message, ownerPortraitUrl }) {
  const typingRef = useRef(null);
  const ownerEntry = OWNER_PORTRAITS[villageKey];
  const primary =
    (typeof ownerPortraitUrl === "string" ? ownerPortraitUrl : resolveAssetUrl(ownerPortraitUrl)) ||
    resolveAssetUrl(ownerEntry);
  const fb = resolveAssetFallback(ownerEntry);
  const [imgBroken, setImgBroken] = useState(false);
  useEffect(() => {
    setImgBroken(false);
  }, [primary, villageKey]);

  useEffect(() => {
    if (typingRef.current) clearInterval(typingRef.current);
    let count = 0;
    const max = Math.min((message || "").length, 40);
    typingRef.current = setInterval(() => {
      playSFX("type");
      if (++count >= max) { clearInterval(typingRef.current); typingRef.current = null; }
    }, 40);
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [message]);

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

function NarratorSpeech({ message }) {
  const typingRef = useRef(null);
  useEffect(() => {
    if (typingRef.current) clearInterval(typingRef.current);
    let count = 0;
    const max = Math.min((message || "").length, 40);
    typingRef.current = setInterval(() => {
      playSFX("type");
      if (++count >= max) { clearInterval(typingRef.current); typingRef.current = null; }
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

// ── CTA Screen ────────────────────────────────────────────────────────────────

function CTAScreen({ breakdown, currency, onPlayAgain, onLeaderboard, onMainMenu }) {
  const { finalScore, accuracyPct, customersServed } = breakdown;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Quick recap pill */}
      <div className="flex items-center justify-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
        <div className="text-center">
          <p className="font-display font-bold text-xl text-primary">{currency}{finalScore.toFixed(2)}</p>
          <p className="font-body text-xs text-muted-foreground">Final Score</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <p className="font-display font-bold text-foreground">{accuracyPct}%</p>
          <p className="font-body text-xs text-muted-foreground">Accuracy</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <p className="font-display font-bold text-foreground">{customersServed}</p>
          <p className="font-body text-xs text-muted-foreground">Served</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 font-display font-bold" onClick={onPlayAgain}>
          Play Again
        </Button>
        <Button className="flex-1 font-display font-bold" onClick={onLeaderboard}>
          <Trophy className="w-4 h-4 mr-1.5" />
          Leaderboard
        </Button>
      </div>
      <Button variant="ghost" className="w-full font-display text-muted-foreground hover:text-foreground" onClick={onMainMenu}>
        Main Menu
      </Button>
    </motion.div>
  );
}

// ── Dialogue helpers ──────────────────────────────────────────────────────────

function buildBakerLines(accuracyPct, customersServed) {
  if (accuracyPct >= 90) return [
    "Outstanding work today! You handled every customer with precision.",
    "The till is perfectly balanced — I couldn't have done better myself.",
  ];
  if (accuracyPct >= 70) return [
    `You served ${customersServed} customer${customersServed !== 1 ? "s" : ""} today — solid effort!`,
    "A few stumbles, but your heart was in the right place. Practice makes perfect!",
  ];
  return [
    "It was a tough shift today — the maths isn't easy!",
    `Still, ${customersServed} customer${customersServed !== 1 ? "s" : ""} served is nothing to scoff at. Keep at it!`,
  ];
}

function buildNarratorLines(accuracyPct) {
  if (accuracyPct >= 90) return [
    "You step outside into the cool evening air, satisfied. The numbers felt effortless today.",
    "You wonder if there's a version of this — every day, every village — that you haven't seen yet...",
  ];
  if (accuracyPct >= 70) return [
    "You close your apron pocket and take a slow breath. Not perfect — but real progress.",
    "Somewhere out there, more bakeries wait. More customers. More chances to get it right.",
  ];
  return [
    "You sit down on the bakery steps as the last customer leaves. The sums were hard today.",
    "But you stayed. That counts for something. Tomorrow, the numbers will be kinder.",
  ];
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * ArcadeEndScreen
 *
 * showTally (bool): if true → tally → baker → narrator → cta
 *                   if false (Beginner) → baker → narrator → cta
 */
export default function ArcadeEndScreen({
  villageKey,
  breakdown,
  playerName,
  currency,
  ownerPortraitUrl,
  showTally,       // true for Easy/Medium; false for Beginner
  onPlayAgain,
  onLeaderboard,
  onMainMenu,
}) {
  // Always start with baker dialogue — tally is handled externally before this screen
  const [phase, setPhase] = useState("baker");
  const [bakerIdx, setBakerIdx] = useState(0);
  const [narratorIdx, setNarratorIdx] = useState(0);

  const bakerLines    = buildBakerLines(breakdown.accuracyPct, breakdown.customersServed);
  const narratorLines = buildNarratorLines(breakdown.accuracyPct);

  const advanceBaker = () => {
    playSFX("click");
    if (bakerIdx < bakerLines.length - 1) { setBakerIdx((i) => i + 1); }
    else { setPhase("narrator"); }
  };

  const advanceNarrator = () => {
    playSFX("click");
    if (narratorIdx < narratorLines.length - 1) { setNarratorIdx((i) => i + 1); }
    else { setPhase("cta"); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto space-y-4"
    >
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xl space-y-5">

        {/* ── HEAD BAKER DIALOGUE ── */}
        {phase === "baker" && (
          <>
            <OwnerSpeech villageKey={villageKey} message={bakerLines[bakerIdx]} ownerPortraitUrl={ownerPortraitUrl} />
            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                {bakerLines.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === bakerIdx ? "bg-primary" : i < bakerIdx ? "bg-primary/30" : "bg-muted"}`} />
                ))}
              </div>
              <Button onClick={advanceBaker} className="font-display font-bold gap-1">
                {bakerIdx < bakerLines.length - 1 ? "Continue" : "Thanks..."}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* ── NARRATOR / INTERNAL MONOLOGUE ── */}
        {phase === "narrator" && (
          <>
            <NarratorSpeech message={narratorLines[narratorIdx]} />
            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                {narratorLines.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === narratorIdx ? "bg-primary" : i < narratorIdx ? "bg-primary/30" : "bg-muted"}`} />
                ))}
              </div>
              <Button onClick={advanceNarrator} className="font-display font-bold gap-1">
                {narratorIdx < narratorLines.length - 1 ? "Continue" : "See Results"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* ── CTA ── */}
        {phase === "cta" && (
          <CTAScreen
            breakdown={breakdown}
            currency={currency}
            onPlayAgain={onPlayAgain}
            onLeaderboard={onLeaderboard}
            onMainMenu={onMainMenu}
          />
        )}

      </div>
    </motion.div>
  );
}