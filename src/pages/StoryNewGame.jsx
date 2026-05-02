import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Lock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GameSave } from "@/lib/localEntities";
import { getStoryNewSaveRecipeFields } from "@/lib/recipeBook";
import { VILLAGES } from "@/lib/gameData";
import { isFeatureUnlocked } from "@/lib/buildConfig";
import { isLocalePlayableInFree } from "@/lib/freeSessionState";
import UpgradeModal from "@/components/game/UpgradeModal";
import { playBGM, playSFX, unlockAudio } from "@/lib/audio";
import {
  STORY_SLOT_COUNT,
  assignSaveToSlot,
  getStorySlotAssignments,
  removeSaveFromStorySlots,
} from "@/lib/storySlots";

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

const STEPS = ["names", "locale", "tutorial", "review"];

export default function StoryNewGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const slotIndex =
    typeof location.state?.slotIndex === "number" ? location.state.slotIndex : NaN;
  const replaceSaveId = location.state?.replaceSaveId ?? null;

  const [upgradeModal, setUpgradeModal] = useState({ open: false, message: "" });

  const [step, setStep] = useState("names");
  const [playerName, setPlayerName] = useState("");
  const [bakeryName, setBakeryName] = useState("");

  const [localeDraft, setLocaleDraft] = useState(null);
  const [localeConfirmed, setLocaleConfirmed] = useState(null);

  const [tutorialChoice, setTutorialChoice] = useState(null); // boolean | null

  const [reviewEditMode, setReviewEditMode] = useState(true);
  const [creating, setCreating] = useState(false);

  const [previewLocale, setPreviewLocale] = useState("paris");

  useEffect(() => {
    const unlockedAudio = () => {
      unlockAudio();
      document.removeEventListener("pointerdown", unlockedAudio);
    };
    document.addEventListener("pointerdown", unlockedAudio);
    return () => document.removeEventListener("pointerdown", unlockedAudio);
  }, []);

  useEffect(() => {
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= STORY_SLOT_COUNT) {
      navigate("/story", { replace: true });
      return;
    }
    const slots = getStorySlotAssignments();
    const occupiedId = slots[slotIndex];
    if (occupiedId && replaceSaveId !== occupiedId) {
      navigate("/story", { replace: true });
    }
    if (!occupiedId && replaceSaveId) {
      navigate("/story", { replace: true });
    }
  }, [slotIndex, replaceSaveId, navigate]);

  useEffect(() => {
    const locale = localeConfirmed ?? localeDraft ?? "paris";
    setPreviewLocale(locale);
  }, [localeConfirmed, localeDraft, step]);

  useEffect(() => {
    if (step !== "review") return;
    playBGM(previewLocale);
  }, [step, previewLocale]);

  const changeReviewLocale = (nextKey) => {
    playSFX("click");
    playBGM(nextKey);
    setPreviewLocale(nextKey);
    setLocaleConfirmed(nextKey);
  };

  const effectiveTutorialWeek =
    tutorialChoice === true && isFeatureUnlocked("packagerRole");

  const handleStartGame = async () => {
    const village =
      localeConfirmed ||
      localeDraft ||
      "paris";
    const effectiveVillage = isVillageLocked(village) ? "paris" : village;
    if (!playerName.trim() || !bakeryName.trim()) return;
    if (tutorialChoice === null) return;

    setCreating(true);
    try {
      if (replaceSaveId) {
        await GameSave.delete(replaceSaveId);
        removeSaveFromStorySlots(replaceSaveId);
      }

      const current_week = effectiveTutorialWeek ? 0 : 1;
      const tutorial_complete = !effectiveTutorialWeek;

      const recipeSeed = getStoryNewSaveRecipeFields(effectiveVillage, tutorial_complete);

      const save = await GameSave.create({
        game_mode: "story",
        player_name: playerName.trim(),
        bakery_name: bakeryName.trim(),
        village: effectiveVillage,
        difficulty: "beginner",
        current_week,
        current_day: 1,
        total_coins: 0,
        experience: 0,
        level: 1,
        weekly_sales: [],
        streak: 0,
        total_customers_served: 0,
        badges: [],
        tutorial_complete,
        ...recipeSeed,
      });

      assignSaveToSlot(slotIndex, save.id);
      queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
      queryClient.invalidateQueries({ queryKey: ["storySlots"] });
      queryClient.setQueryData(["gameSave", save.id], [save]);

      playSFX("click");
      navigate(`/play?id=${save.id}`);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  const villageKeys = ["paris", "frontier_us", "ming_china", "london"];

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, message: "" })}
        message={upgradeModal.message}
      />

      {step === "review" && (
        <div className="pointer-events-none absolute inset-0 z-0">
          {villageKeys.map((key) => (
            <div
              key={key}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
              style={{
                backgroundImage: `url(${VILLAGES[key].bgImage})`,
                opacity: previewLocale === key ? 1 : 0,
              }}
            />
          ))}
          <div className="absolute inset-0 bg-black/45" />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative z-10 w-full max-w-2xl mx-auto p-4 flex-1 flex flex-col ${step === "review" ? "pt-6" : ""}`}
      >
        <button
          type="button"
          onClick={() => {
            playSFX("click");
            if (step === "names") navigate("/story");
            else {
              const i = STEPS.indexOf(step);
              setStep(STEPS[Math.max(0, i - 1)]);
            }
          }}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-4 font-display text-sm self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < stepIndex ? "bg-primary" : i === stepIndex ? "bg-primary/60" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === "names" && (
            <motion.div
              key="names"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="max-w-sm mx-auto w-full space-y-5"
            >
              <h2 className="font-display font-bold text-3xl text-center text-foreground">
                Your bakery
              </h2>
              <p className="text-center font-body text-muted-foreground text-sm">
                Names are saved only after you finish setup on the last screen.
              </p>
              <div>
                <Label className="font-display text-sm font-medium">Your name</Label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. Emma"
                  className="mt-1.5 h-12 font-display text-lg"
                  autoFocus
                />
              </div>
              <div>
                <Label className="font-display text-sm font-medium">Bakery name</Label>
                <Input
                  value={bakeryName}
                  onChange={(e) => setBakeryName(e.target.value)}
                  placeholder="e.g. Sweet Dreams Bakery"
                  className="mt-1.5 h-12 font-display text-lg"
                />
              </div>
              <Button
                size="lg"
                className="w-full h-12 font-display font-bold"
                disabled={!bakeryName.trim() || !playerName.trim()}
                onClick={() => {
                  playSFX("click");
                  setLocaleDraft(localeConfirmed || "paris");
                  setStep("locale");
                }}
              >
                Continue <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === "locale" && (
            <motion.div
              key="locale"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <h2 className="font-display font-bold text-3xl text-center text-foreground mb-2">
                Choose locale
              </h2>
              <p className="text-center font-body text-muted-foreground mb-6 text-sm">
                Tap a village, then accept to lock in your choice.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {villageKeys.map((key) => {
                  const v = VILLAGES[key];
                  const locked = isVillageLocked(key);
                  const upgradeRequired = isVillageUpgradeRequired(key);
                  const selected = localeDraft === key;
                  return (
                    <motion.button
                      key={key}
                      type="button"
                      whileHover={!locked ? { scale: 1.02 } : {}}
                      whileTap={!locked ? { scale: 0.98 } : {}}
                      onClick={() => {
                        if (!locked) {
                          setLocaleDraft(key);
                          playSFX("click");
                          return;
                        }
                        if (upgradeRequired) {
                          setUpgradeModal({
                            open: true,
                            message: FREE_LOCALE_MESSAGES[key] || "Get the full version!",
                          });
                        }
                      }}
                      className={`relative overflow-hidden rounded-xl border-2 text-left transition-all ${
                        locked
                          ? "border-border opacity-70 cursor-not-allowed"
                          : selected
                            ? "border-primary shadow-lg"
                            : "border-border hover:border-primary/50 cursor-pointer"
                      }`}
                    >
                      <div className="h-24 bg-muted relative">
                        <img
                          src={v.bgImage}
                          alt={v.name}
                          className="w-full h-full object-cover opacity-70"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                        {locked && (
                          <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          <h3 className="font-display font-bold text-sm text-foreground">{v.name}</h3>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <Button
                size="lg"
                className="w-full h-12 font-display font-bold"
                disabled={!localeDraft || isVillageLocked(localeDraft)}
                onClick={() => {
                  playSFX("click");
                  setLocaleConfirmed(localeDraft);
                  setStep("tutorial");
                }}
              >
                Accept locale <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === "tutorial" && (
            <motion.div
              key="tutorial"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="max-w-sm mx-auto w-full space-y-6"
            >
              <h2 className="font-display font-bold text-3xl text-center text-foreground">
                Tutorial
              </h2>
              <p className="text-center font-body text-muted-foreground text-sm">
                Training week walks you through Cashier, Packager, and Baker across three days. Challenge
                ramps up as you grow your recipe menu — same baked-in baseline as Arcade Beginner to start.
                {!isFeatureUnlocked("packagerRole") && (
                  <span className="block mt-2 text-amber-700 font-medium">
                    Full tutorial requires roles unlocked in the full build — otherwise you’ll start
                    in week one with every station open when available.
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={tutorialChoice === true ? "default" : "outline"}
                  className="h-14 font-display font-bold"
                  onClick={() => {
                    playSFX("click");
                    setTutorialChoice(true);
                  }}
                >
                  Yes, tutorial
                </Button>
                <Button
                  type="button"
                  variant={tutorialChoice === false ? "default" : "outline"}
                  className="h-14 font-display font-bold"
                  onClick={() => {
                    playSFX("click");
                    setTutorialChoice(false);
                  }}
                >
                  Skip
                </Button>
              </div>
              <Button
                size="lg"
                className="w-full h-12 font-display font-bold"
                disabled={tutorialChoice === null}
                onClick={() => {
                  playSFX("click");
                  setReviewEditMode(true);
                  setStep("review");
                }}
              >
                Continue <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="max-w-lg mx-auto w-full"
            >
              <div className="rounded-2xl border border-white/20 bg-card/95 backdrop-blur-md shadow-xl p-6">
                <p className="text-center text-xs font-display font-bold text-primary mb-1 uppercase tracking-wide">
                  Now previewing: {VILLAGES[previewLocale]?.name ?? previewLocale}
                </p>
                <h2 className="font-display font-bold text-2xl text-center text-foreground mb-6">
                  Review your bakery
                </h2>

                {!reviewEditMode ? (
                  <div className="space-y-2 font-body text-sm mb-6">
                    <p>
                      <span className="text-muted-foreground">Player:</span>{" "}
                      <span className="font-semibold text-foreground">{playerName.trim()}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Bakery:</span>{" "}
                      <span className="font-semibold text-foreground">{bakeryName.trim()}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Locale:</span>{" "}
                      <span className="font-semibold text-foreground">
                        {VILLAGES[localeConfirmed]?.name}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Tutorial:</span>{" "}
                      <span className="font-semibold text-foreground">
                        {effectiveTutorialWeek ? "Training week" : "Skipped"}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    <div>
                      <Label className="font-display text-xs">Player</Label>
                      <Input
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="mt-1 font-display"
                      />
                    </div>
                    <div>
                      <Label className="font-display text-xs">Bakery</Label>
                      <Input
                        value={bakeryName}
                        onChange={(e) => setBakeryName(e.target.value)}
                        className="mt-1 font-display"
                      />
                    </div>
                    <div>
                      <Label className="font-display text-xs">Locale</Label>
                      <Select
                        value={localeConfirmed || "paris"}
                        onValueChange={(v) => changeReviewLocale(v)}
                      >
                        <SelectTrigger className="mt-1 font-display">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {villageKeys.map((k) => (
                            <SelectItem key={k} value={k} disabled={isVillageLocked(k)}>
                              {VILLAGES[k].name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-display text-xs">Tutorial</Label>
                      <Select
                        value={tutorialChoice === true ? "yes" : "no"}
                        onValueChange={(v) => {
                          setTutorialChoice(v === "yes");
                          playSFX("click");
                        }}
                      >
                        <SelectTrigger className="mt-1 font-display">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Training week</SelectItem>
                          <SelectItem value="no">Skip</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 font-display"
                    onClick={() => {
                      playSFX("click");
                      setReviewEditMode((e) => !e);
                    }}
                  >
                    {reviewEditMode ? "View summary" : "Edit"}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 font-display font-bold"
                    disabled={
                      creating ||
                      !playerName.trim() ||
                      !bakeryName.trim() ||
                      tutorialChoice === null
                    }
                    onClick={handleStartGame}
                  >
                    {creating ? "Starting…" : "Start game"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
