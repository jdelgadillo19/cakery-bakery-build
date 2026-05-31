// ============================================================
// CAKERY BAKERY — Arcade Setup
// Configures a single Arcade Mode run.
// NO save files created. NO story progression touched.
// Data flows: ArcadeSetup → ArcadePlay → Leaderboard only.
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VILLAGES, DIFFICULTY_CONFIG } from "@/lib/gameData";
import { ArrowLeft, ArrowRight, MapPin, Star, Lock, Sparkles, Zap, Plus, Check, User, Trash2 } from "lucide-react";
import UpgradeModal from "@/components/game/UpgradeModal";
import { isEasyUnlocked, isMediumUnlocked, MEDIUM_UNLOCK_THRESHOLD } from "@/lib/difficultyUnlocks";
import { isFeatureUnlocked } from "@/lib/buildConfig";
import {
  ARCADE_VILLAGE_ORDER,
  getLocaleGateStatus,
  hasFullAccountAccess,
} from "@/lib/arcadeLocaleUnlocks";
import { getLocalNames, addLocalName, removeLocalName, getActivePlayerName } from "@/lib/localNames";
import { useAuth } from "@/lib/AuthContext";

const DIFFICULTY_ORDER = ["beginner", "easy", "medium", "hard", "expert"];
const DIFFICULTY_STARS = { beginner: 0, easy: 1, medium: 2, hard: 3, expert: 4 };

function getDifficultyLockInfo(key) {
  if (key === "beginner") return { locked: false, paywalled: false, reason: "" };
  if (key === "easy") return { locked: !isEasyUnlocked(), paywalled: false, reason: "Complete your first run to unlock Easy!" };
  if (key === "medium") return { locked: !isMediumUnlocked(), paywalled: false, reason: `Reach a score of ${MEDIUM_UNLOCK_THRESHOLD} to unlock Medium!` };
  if (key === "hard") return { locked: !isFeatureUnlocked("difficultyHard"), paywalled: !isFeatureUnlocked("difficultyHard"), reason: "Hard difficulty requires full access!" };
  if (key === "expert") return { locked: !isFeatureUnlocked("difficultyHard"), paywalled: !isFeatureUnlocked("difficultyHard"), reason: "Expert difficulty requires full access!" };
  return { locked: false, paywalled: false, reason: "" };
}

// ── Name Selector Component ───────────────────────────────────────────────────
function NameSelector({ onSelect }) {
  const [names, setNames] = useState([]);
  const [mode, setMode] = useState("list"); // "list" | "new"
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const stored = getLocalNames();
    setNames(stored);
    const active = getActivePlayerName();
    if (active && stored.includes(active)) {
      setSelected(active);
    } else if (stored.length === 0) {
      setMode("new");
    }
  }, []);

  const handleSelectExisting = (name) => {
    setSelected(name);
  };

  const handleConfirmExisting = () => {
    if (!selected) return;
    addLocalName(selected); // bumps to front + sets active
    onSelect(selected);
  };

  const handleCreateNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addLocalName(trimmed);
    onSelect(trimmed);
  };

  const handleRemoveName = (e, name) => {
    e.stopPropagation();
    const updated = getLocalNames().filter((n) => n !== name);
    removeLocalName(name);
    setNames(updated);
    if (selected === name) setSelected(updated[0] || null);
    if (updated.length === 0) setMode("new");
  };

  return (
    <div className="max-w-sm mx-auto space-y-5">
      <div className="text-center">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Who's Playing?</h2>
        <p className="font-body text-sm text-muted-foreground">Your name appears on the leaderboard. Names are saved on this device only.</p>
      </div>

      {/* Existing names list */}
      {mode === "list" && names.length > 0 && (
        <>
          <div className="space-y-2">
            {names.map((name) => (
              <button
                key={name}
                onClick={() => handleSelectExisting(name)}
                className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                  selected === name
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="font-display font-bold text-foreground flex-1">{name}</span>
                {selected === name && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                <button
                  onClick={(e) => handleRemoveName(e, name)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  title="Remove name"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full font-display font-semibold gap-2"
            onClick={() => { setMode("new"); setSelected(null); }}
          >
            <Plus className="w-4 h-4" />
            Add a new name
          </Button>

          <Button
            size="lg"
            className="w-full h-12 font-display font-bold"
            disabled={!selected}
            onClick={handleConfirmExisting}
          >
            Continue as {selected || "..."} <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </>
      )}

      {/* Create new name */}
      {mode === "new" && (
        <>
          <div className="space-y-3">
            <div>
              <Label className="font-display text-sm font-medium">Player Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Emma"
                className="mt-1.5 h-12 font-display text-lg"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && newName.trim() && handleCreateNew()}
              />
              <p className="font-body text-xs text-muted-foreground mt-1">Stored on this device only — not shared globally.</p>
            </div>
            <Button
              size="lg"
              className="w-full h-12 font-display font-bold"
              disabled={!newName.trim()}
              onClick={handleCreateNew}
            >
              Continue <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {names.length > 0 && (
            <button
              onClick={() => { setMode("list"); setNewName(""); }}
              className="w-full text-center font-display text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to existing names
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Setup Page ───────────────────────────────────────────────────────────
export default function ArcadeSetup() {
  const navigate = useNavigate();
  const { profileTier } = useAuth();
  const hasGuac = hasFullAccountAccess(profileTier);
  const [step, setStep] = useState(0); // 0=village, 1=name, 2=difficulty
  const [village, setVillage] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [upgradeModal, setUpgradeModal] = useState({ open: false, message: "" });
  const [achievementHint, setAchievementHint] = useState("");

  const handleStart = () => {
    const lockInfo = getDifficultyLockInfo(difficulty);
    const effectiveDifficulty = lockInfo.paywalled ? "beginner" : difficulty;
    const params = new URLSearchParams({
      village,
      difficulty: effectiveDifficulty,
      player: playerName.trim() || "Player",
    });
    navigate(`/arcade?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, message: "" })}
        message={upgradeModal.message}
      />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : navigate("/")}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-6 font-display text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="w-6 h-6 text-primary" />
          <h1 className="font-display font-bold text-3xl text-foreground">Arcade Mode</h1>
        </div>
        <p className="text-center font-body text-muted-foreground mb-8 text-sm">
          One run. Best score wins. No story, no saves — just math!
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* Step 0: Village */}
          {step === 0 && (
            <motion.div key="village" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="font-display font-bold text-2xl text-center text-foreground mb-2">Choose Your Village</h2>
              <p className="text-center font-body text-muted-foreground mb-6 text-sm">Where will today's run take place?</p>
              {achievementHint && (
                <p className="text-center font-body text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                  {achievementHint}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                {ARCADE_VILLAGE_ORDER.map((key) => {
                  const v = VILLAGES[key];
                  if (!v) return null;
                  const gate = getLocaleGateStatus(key, hasGuac);
                  const isLocked = !gate.accessible;
                  return (
                    <motion.button
                      key={key}
                      whileHover={!isLocked ? { scale: 1.03 } : {}}
                      whileTap={!isLocked ? { scale: 0.97 } : {}}
                      onClick={() => {
                        if (!isLocked) {
                          setAchievementHint("");
                          setVillage(key);
                          setStep(1);
                          return;
                        }
                        if (gate.wall === "paywall") {
                          setAchievementHint("");
                          setUpgradeModal({ open: true, message: gate.message });
                          return;
                        }
                        setAchievementHint(gate.message);
                      }}
                      className={`relative overflow-hidden rounded-xl border-2 text-left transition-all ${
                        isLocked ? "border-border opacity-60 cursor-not-allowed"
                        : village === key ? "border-primary shadow-lg"
                        : "border-border hover:border-primary/50 cursor-pointer"
                      }`}
                    >
                      <div className="h-28 bg-muted relative">
                        <img src={v.bgImage} alt={v.name} className="w-full h-full object-cover opacity-60" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                        {isLocked && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="bg-card/90 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow">
                              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-display text-xs font-bold text-foreground">
                                {gate.wall === "achievement" ? "Score to unlock" : "Full access"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <h3 className="font-display font-bold text-sm text-foreground">{v.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground font-body">{v.era}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 1: Name Selector */}
          {step === 1 && (
            <motion.div key="name" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <NameSelector
                onSelect={(name) => {
                  setPlayerName(name);
                  setStep(2);
                }}
              />
            </motion.div>
          )}

          {/* Step 2: Difficulty */}
          {step === 2 && (
            <motion.div key="difficulty" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-sm mx-auto">
              <h2 className="font-display font-bold text-2xl text-center text-foreground mb-2">Choose Difficulty</h2>
              <p className="text-center font-body text-muted-foreground mb-6 text-sm">Higher difficulty = higher score multiplier.</p>
              <div className="space-y-2 mb-6">
                {DIFFICULTY_ORDER.map((key) => {
                  const config = DIFFICULTY_CONFIG[key];
                  if (!config) return null;
                  const { locked, paywalled, reason } = getDifficultyLockInfo(key);
                  const starCount  = DIFFICULTY_STARS[key];
                  const isSelected = difficulty === key && !locked;
                  return (
                    <motion.button
                      key={key}
                      whileHover={!locked ? { scale: 1.02 } : {}}
                      whileTap={!locked ? { scale: 0.98 } : {}}
                      onClick={() => {
                        if (locked) { if (paywalled) setUpgradeModal({ open: true, message: reason }); return; }
                        setDifficulty(key);
                      }}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                        locked ? "border-border opacity-55 cursor-not-allowed"
                        : isSelected ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/30 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-foreground">{config.label}</h3>
                          {locked && !paywalled && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                          {paywalled && (
                            <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 font-display font-bold text-xs px-1.5 py-0.5 rounded-full">
                              <Sparkles className="w-2.5 h-2.5" /> Full
                            </span>
                          )}
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4].map((i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i <= starCount ? "text-primary fill-primary" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-body">{locked ? reason : config.description}</p>
                    </motion.button>
                  );
                })}
              </div>
              <Button onClick={handleStart} size="lg" className="w-full h-12 font-display font-bold">
                <Zap className="w-5 h-5 mr-2" />
                Start Run!
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}