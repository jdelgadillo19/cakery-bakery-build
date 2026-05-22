import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GameSave } from "@/lib/localEntities";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, Trophy, Zap, BookMarked } from "lucide-react";
import VillageBackground from "@/components/game/VillageBackground";
import SaveManager from "@/components/game/SaveManager";
import DebugPanel from "@/components/game/DebugPanel";
import RecipeBookModal from "@/components/game/RecipeBookModal";
import AudioManager from "@/components/game/AudioManager";
import SpriteMenu from "@/components/game/SpriteMenu";
import { playBGM, playSFX, unlockAudio } from "@/lib/audio";
import BuildConfigDebug from "@/components/game/BuildConfigDebug";
import { getMenuSlotConfig } from "@/lib/recipeBook";
export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: saves, isLoading } = useQuery({
    queryKey: ["gameSaves"],
    queryFn: () => GameSave.list("-updated_date", 10),
    initialData: [],
  });

  const mostRecentVillage = saves?.[0]?.village || "paris";
  const [managingSave, setManagingSave] = useState(null);
  const [recipeBookSave, setRecipeBookSave] = useState(null);
  const [isRecipeBookOpen, setIsRecipeBookOpen] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [spriteMenuOpen, setSpriteMenuOpen] = useState(false);

  useEffect(() => {
    const onSavesSynced = () => {
      queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
    };
    window.addEventListener("gojito-cakery-saves-synced", onSavesSynced);
    return () => window.removeEventListener("gojito-cakery-saves-synced", onSavesSynced);
  }, [queryClient]);

  // Menu music follows this screen; streamed arcade/game BGM stops here immediately.
  // First interaction still unlocks AudioContext autoplay limits.
  useEffect(() => {
    unlockAudio();
    playBGM("menu");
    const handleFirstInteraction = () => {
      unlockAudio();
      playBGM("menu");
      document.removeEventListener("pointerdown", handleFirstInteraction);
    };
    document.addEventListener("pointerdown", handleFirstInteraction);
    return () => document.removeEventListener("pointerdown", handleFirstInteraction);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Village background scene */}
      <div className="fixed inset-0">
        <VillageBackground villageKey={mostRecentVillage} />
      </div>

      {/* Dark overlay so UI text stays readable */}
      <div className="fixed inset-0 bg-black/50" />

      {/* Scrollable content layer */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <motion.div
            className="mb-4 drop-shadow-xl flex justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <img
              src="/sprites/ui/menu_cupcake.png"
              alt="Floating cupcake"
              className="w-20 h-20 object-contain"
            />
          </motion.div>
          <h1 className="font-display font-bold text-5xl md:text-6xl text-white drop-shadow-lg mb-2">
            Cakery Bakery
          </h1>
          <p className="font-body text-lg text-white/80 max-w-md mx-auto italic drop-shadow">
            Run your own bakery, serve customers, and master the art of math!
          </p>
        </motion.div>

        {/* Mode Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md space-y-4"
        >

          {/* ── ARCADE MODE ── Primary CTA */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { playSFX("click"); navigate("/arcade-setup"); }}
            className="w-full text-left bg-primary rounded-2xl p-5 shadow-xl cursor-pointer border-2 border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0" aria-hidden>
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-xl text-white mb-0.5">Arcade Mode</h2>
                <p className="font-body text-sm text-white/80 leading-snug">
                  Single run, high score, leaderboard glory. No saves needed — just play!
                </p>
                <p className="mt-3 pt-3 border-t border-white/15 font-body text-xs text-white/70 leading-relaxed">
                  <span className="sr-only">Mode highlights: </span>
                  Quick sessions with global leaderboard rankings — runs stay on this device until you submit a score.
                </p>
              </div>
            </div>
          </motion.button>

          {/* ── STORY MODE ── */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { playSFX("click"); navigate("/story"); }}
            className="w-full text-left bg-card/20 border-2 border-white/30 rounded-2xl p-5 cursor-pointer hover:bg-card/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0" aria-hidden>
                <BookMarked className="w-6 h-6 text-white/80" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <h2 className="font-display font-bold text-xl text-white">Story Mode</h2>
                  <span className="bg-white/20 text-white font-display font-bold text-xs px-2 py-0.5 rounded-full" title="Story mode is still in beta">
                    Beta
                  </span>
                </div>
                <p className="font-body text-sm text-white/70 leading-snug">
                  Multi-week bakery journey across historic villages. Save your progress, unlock recipes, master every role.
                </p>
                <p className="mt-3 pt-3 border-t border-white/10 font-body text-xs text-white/60 leading-relaxed">
                  <span className="sr-only">Mode highlights: </span>
                  Multi-day pacing with up to five save slots on this device, recipe progression, and rotating roles.
                </p>
              </div>
            </div>
          </motion.button>

          {/* Leaderboard shortcut */}
          <Link to="/leaderboard" onClick={() => playSFX("click")}>
            <Button variant="outline" size="lg" className="w-full h-11 font-display font-bold rounded-xl bg-white/10 border-white/30 text-white hover:bg-white/20">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </Button>
          </Link>

        </motion.div>

        {import.meta.env.DEV && (
          <>
            {/* Debug mode panel */}
            <AnimatePresence>
              {debugMode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="w-full max-w-md mt-4"
                >
                  <DebugPanel saves={saves} onOpenSpriteMenu={() => setSpriteMenuOpen(true)} />
                </motion.div>
              )}
            </AnimatePresence>

            {debugMode && <BuildConfigDebug />}
          </>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <AudioManager />
          <p className="text-sm text-white/60 font-body text-center">A math adventure for curious minds 🧮</p>
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => setDebugMode((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-display ${
                debugMode ? "bg-yellow-400/20 border-yellow-400 text-yellow-300" : "bg-white/10 border-white/20 text-white/40 hover:text-white/60"
              }`}
            >
              <Bug className="w-3 h-3" />
              {debugMode ? "Debug ON" : "Debug"}
            </button>
          )}
        </motion.div>

      </div> {/* end content layer */}

      {/* Save Manager Modal */}
      <AnimatePresence>
        {managingSave && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <SaveManager save={managingSave} onClose={() => setManagingSave(null)} />
          </div>
        )}
      </AnimatePresence>

      {/* Sprite Menu Modal */}
      <AnimatePresence>
        {spriteMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <SpriteMenu onClose={() => setSpriteMenuOpen(false)} />
          </div>
        )}
      </AnimatePresence>

      {/* Recipe Book Modal */}
      {isRecipeBookOpen && recipeBookSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <AnimatePresence>
            <RecipeBookModal
              gameSave={recipeBookSave}
              onClose={() => { setIsRecipeBookOpen(false); setRecipeBookSave(null); }}
              onPurchase={async (recipe) => {
                playSFX("money");
                const save = recipeBookSave;
                const locale = save.village;
                const localeBook = save.recipe_book?.[locale] || { unlocked: true, tutorialComplete: true, ownedRecipeIds: [] };
                const newBook = {
                  ...save.recipe_book,
                  [locale]: {
                    ...localeBook,
                    ownedRecipeIds: [...(localeBook.ownedRecipeIds || []), recipe.id],
                  },
                };
                await GameSave.update(save.id, {
                  recipe_book: newBook,
                  total_coins: Math.round(((save.total_coins || 0) - recipe.cost) * 100) / 100,
                });
                queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
                setRecipeBookSave({ ...save, recipe_book: newBook, total_coins: Math.round(((save.total_coins || 0) - recipe.cost) * 100) / 100 });
              }}
              onEquipChange={async (newEquippedIds) => {
                playSFX("click");
                const save = recipeBookSave;
                const { unlockedSlots } = getMenuSlotConfig(save);
                const capped = [...newEquippedIds].slice(0, unlockedSlots);
                await GameSave.update(save.id, { equipped_recipe_ids: capped });
                queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
                setRecipeBookSave({ ...save, equipped_recipe_ids: capped });
              }}
              onSlotUpgrade={async (nextSlot, cost) => {
                playSFX("money");
                const save = recipeBookSave;
                const ms = getMenuSlotConfig(save);
                const newSlots = {
                  maxSlots: ms.maxSlots,
                  unlockedSlots: Math.min(ms.maxSlots, nextSlot),
                };
                await GameSave.update(save.id, {
                  menu_slots: newSlots,
                  total_coins: Math.round(((save.total_coins || 0) - cost) * 100) / 100,
                });
                queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
                setRecipeBookSave({ ...save, menu_slots: newSlots, total_coins: Math.round(((save.total_coins || 0) - cost) * 100) / 100 });
              }}
            />
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}