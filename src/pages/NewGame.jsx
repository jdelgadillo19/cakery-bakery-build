import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GameSave } from "@/lib/localEntities";
import { VILLAGES, DIFFICULTY_CONFIG } from "@/lib/gameData";
import { ArrowLeft, ArrowRight, MapPin, Star, Lock, Sparkles } from "lucide-react";
import OwnerIntro from "@/components/game/OwnerIntro";
import UpgradeModal from "@/components/game/UpgradeModal";
import { isFeatureUnlocked } from "@/lib/buildConfig";
import { isLocalePlayableInFree } from "@/lib/freeSessionState";
import { isEasyUnlocked, isMediumUnlocked, MEDIUM_UNLOCK_THRESHOLD } from "@/lib/difficultyUnlocks";

// Ordered difficulty list
const DIFFICULTY_ORDER = ["beginner", "easy", "medium", "hard", "expert"];

const DIFFICULTY_STARS = {
  beginner: 0,
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4,
};

const FREE_LOCALE_MESSAGES = {
  frontier_us: "Complete Day 5 to permanently unlock Frontier US!",
  ming_china: "Get the full version to play in Suzhou Watertown!",
  london: "Get the full version to play in Covent Garden, London!",
};

function isVillageLocked(villageKey) {
  if (isFeatureUnlocked("multiVillage")) return false;
  if (villageKey === "paris") return false;
  if (villageKey === "frontier_us") return !isLocalePlayableInFree("frontier_us");
  return true;
}

function isVillageUpgradeRequired(villageKey) {
  return villageKey === "ming_china" || villageKey === "london" || villageKey === "frontier_us";
}

/**
 * Returns lock info for a difficulty key.
 * { locked: boolean, paywalled: boolean, reason: string }
 */
function getDifficultyLockInfo(key) {
  if (key === "beginner") return { locked: false, paywalled: false, reason: "" };
  if (key === "easy") {
    const unlocked = isEasyUnlocked();
    return {
      locked: !unlocked,
      paywalled: false,
      reason: "Complete your first run to unlock Easy!",
    };
  }
  if (key === "medium") {
    const unlocked = isMediumUnlocked();
    return {
      locked: !unlocked,
      paywalled: false,
      reason: `Reach a score of ${MEDIUM_UNLOCK_THRESHOLD} to unlock Medium!`,
    };
  }
  if (key === "hard") {
    return {
      locked: true,
      paywalled: true,
      reason: "Hard difficulty requires the full version!",
    };
  }
  if (key === "expert") {
    return {
      locked: true,
      paywalled: true,
      reason: "Expert difficulty requires the full version!",
    };
  }
  return { locked: false, paywalled: false, reason: "" };
}

export default function NewGame() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=village, 1=bakery, 2=difficulty, 3=intro
  const [village, setVillage] = useState(null);
  const [bakeryName, setBakeryName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [creating, setCreating] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState({ open: false, message: "" });

  const handleCreate = async () => {
    if (!village || !bakeryName.trim() || !playerName.trim()) return;
    const effectiveVillage = isVillageLocked(village) ? "paris" : village;
    // Ensure difficulty is actually selectable (security fallback)
    const lockInfo = getDifficultyLockInfo(difficulty);
    const effectiveDifficulty = lockInfo.paywalled ? "beginner" : difficulty;

    setCreating(true);
    const startWeek = isFeatureUnlocked("packagerRole") ? 0 : 1;

    const save = await GameSave.create({
      player_name: playerName.trim(),
      bakery_name: bakeryName.trim(),
      village: effectiveVillage,
      difficulty: effectiveDifficulty,
      current_week: startWeek,
      current_day: 1,
      total_coins: 0,
      experience: 0,
      level: 1,
      weekly_sales: [],
      streak: 0,
      total_customers_served: 0,
      badges: [],
      tutorial_complete: startWeek > 0,
    });
    navigate(`/play?id=${save.id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, message: "" })}
        message={upgradeModal.message}
      />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <button
          onClick={() => step > 0 ? setStep(step - 1) : navigate("/")}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-6 font-display text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Village Selection */}
          {step === 0 && (
            <motion.div
              key="village"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <h2 className="font-display font-bold text-3xl text-center text-foreground mb-2">
                Choose Your Village
              </h2>
              <p className="text-center font-body text-muted-foreground mb-8">
                Where in the world will your bakery be?
              </p>
              <div className="grid grid-cols-2 gap-4">
                {(["paris", "frontier_us", "ming_china", "london"].map(key => VILLAGES[key]).filter(Boolean)).map((v) => {
                  const locked = isVillageLocked(v.key);
                  const upgradeRequired = isVillageUpgradeRequired(v.key);

                  const handleClick = () => {
                    if (!locked) { setVillage(v.key); setStep(1); return; }
                    if (upgradeRequired) {
                      setUpgradeModal({ open: true, message: FREE_LOCALE_MESSAGES[v.key] || "Get the full version!" });
                    }
                  };

                  return (
                    <motion.button
                      key={v.key}
                      whileHover={!locked ? { scale: 1.03 } : {}}
                      whileTap={!locked ? { scale: 0.97 } : {}}
                      onClick={handleClick}
                      className={`relative overflow-hidden rounded-xl border-2 text-left transition-all ${
                        locked
                          ? "border-border opacity-70 cursor-not-allowed"
                          : village === v.key
                          ? "border-primary shadow-lg"
                          : "border-border hover:border-primary/50 cursor-pointer"
                      }`}
                    >
                      <div className="h-28 bg-muted relative">
                        <img src={v.bgImage} alt={v.name} className="w-full h-full object-cover opacity-60" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                        {locked && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="bg-card/90 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow">
                              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-display text-xs font-bold text-foreground">
                                {v.key === "frontier_us" ? "Complete Day 5" : "Full version"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-4 relative">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <h3 className="font-display font-bold text-foreground">{v.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground font-body">{v.era}</p>
                        <p className="text-xs text-muted-foreground font-body mt-1">{v.description}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 1: Bakery Name */}
          {step === 1 && (
            <motion.div
              key="bakery"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-sm mx-auto"
            >
              <h2 className="font-display font-bold text-3xl text-center text-foreground mb-2">Name Your Bakery</h2>
              <p className="text-center font-body text-muted-foreground mb-8">What should we call your delicious shop?</p>
              <div className="space-y-5">
                <div>
                  <Label className="font-display text-sm font-medium">Your Name</Label>
                  <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="e.g. Emma" className="mt-1.5 h-12 font-display text-lg" autoFocus />
                </div>
                <div>
                  <Label className="font-display text-sm font-medium">Bakery Name</Label>
                  <Input value={bakeryName} onChange={(e) => setBakeryName(e.target.value)} placeholder="e.g. Sweet Dreams Bakery" className="mt-1.5 h-12 font-display text-lg" />
                </div>
                <Button onClick={() => setStep(2)} disabled={!bakeryName.trim() || !playerName.trim()} size="lg" className="w-full h-12 font-display font-bold">
                  Continue <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Difficulty */}
          {step === 2 && (
            <motion.div
              key="difficulty"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-sm mx-auto"
            >
              <h2 className="font-display font-bold text-3xl text-center text-foreground mb-2">Choose Difficulty</h2>
              <p className="text-center font-body text-muted-foreground mb-6">How challenging should the math be?</p>
              <div className="space-y-2 mb-6">
                {DIFFICULTY_ORDER.map((key) => {
                  const config = DIFFICULTY_CONFIG[key];
                  if (!config) return null;
                  const { locked, paywalled, reason } = getDifficultyLockInfo(key);
                  const starCount = DIFFICULTY_STARS[key];
                  const isSelected = difficulty === key && !locked;

                  return (
                    <motion.button
                      key={key}
                      whileHover={!locked ? { scale: 1.02 } : {}}
                      whileTap={!locked ? { scale: 0.98 } : {}}
                      onClick={() => {
                        if (locked) {
                          if (paywalled) {
                            setUpgradeModal({ open: true, message: reason });
                          }
                          // non-paywalled locked: show nothing, just not selectable
                          return;
                        }
                        setDifficulty(key);
                      }}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all relative ${
                        locked
                          ? "border-border opacity-55 cursor-not-allowed"
                          : isSelected
                          ? "border-primary bg-primary/5 shadow-md"
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
                        {/* Stars — 0 stars for Beginner, fill up */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4].map((i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i <= starCount ? "text-primary fill-primary" : "text-muted"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-body">
                        {locked ? reason : config.description}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
              <Button onClick={() => setStep(3)} size="lg" className="w-full h-12 font-display font-bold">
                Meet Your Baker <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 3: Owner Intro */}
          {step === 3 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h2 className="font-display font-bold text-2xl text-center text-foreground mb-6">
                Meet the Head Baker
              </h2>
              {creating ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <OwnerIntro
                  villageKey={village}
                  playerName={playerName}
                  onDone={handleCreate}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}