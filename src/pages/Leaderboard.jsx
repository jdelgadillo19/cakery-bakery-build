// ============================================================
// CAKERY BAKERY — Leaderboard
//
// Global tab:  all runs ranked by score, filterable by difficulty
// My Runs tab: runs for the locally-active player name (device-local identity)
//              shows personal best + top 3
//
// Navigation: Main Menu | Play Arcade
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Star, Trash2, User, Globe, RefreshCw, AlertTriangle, Zap, BookMarked } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard, deleteEntry, clearAllEntries, getPersonalBest, getTopN } from "@/lib/leaderboard";
import { clearDifficultyUnlocks } from "@/lib/difficultyUnlocks";
import { getLocalNames, getActivePlayerName, setActivePlayerName } from "@/lib/localNames";
import { VILLAGES, DIFFICULTY_CONFIG } from "@/lib/gameData";
import { GameSave } from "@/lib/localEntities";
import { getStorySlotAssignments } from "@/lib/storySlots";
import { isStorySave } from "@/lib/storyStats";

const DIFFICULTY_ORDER = ["beginner", "easy", "medium", "hard", "expert"];

const DIFFICULTY_COLORS = {
  beginner: "bg-emerald-100 text-emerald-700",
  easy:     "bg-blue-100 text-blue-700",
  medium:   "bg-amber-100 text-amber-700",
  hard:     "bg-orange-100 text-orange-700",
  expert:   "bg-red-100 text-red-700",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel }) {
  // Use refs to ensure callbacks never go stale and backdrop click only cancels
  const onConfirmRef = React.useRef(onConfirm);
  const onCancelRef  = React.useRef(onCancel);
  React.useEffect(() => { onConfirmRef.current = onConfirm; }, [onConfirm]);
  React.useEffect(() => { onCancelRef.current  = onCancel;  }, [onCancel]);

  const handleConfirm = (e) => { e.stopPropagation(); onConfirmRef.current(); };
  const handleCancel  = (e) => { e.stopPropagation(); onCancelRef.current();  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={handleCancel}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="font-display font-bold text-foreground">Are you sure?</h3>
        </div>
        <p className="font-body text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 font-display" onClick={handleCancel}>Cancel</Button>
          <Button variant="destructive" className="flex-1 font-display" onClick={handleConfirm}>Confirm</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-amber-500 font-display font-bold text-sm">🥇</span>;
  if (rank === 2) return <span className="text-slate-400 font-display font-bold text-sm">🥈</span>;
  if (rank === 3) return <span className="text-amber-700 font-display font-bold text-sm">🥉</span>;
  return <span className="font-display text-xs text-muted-foreground w-5 text-center">#{rank}</span>;
}

function EntryRow({ entry, rank, isMe, showDelete, onDelete }) {
  const village  = VILLAGES[entry.village];
  const diffLabel = DIFFICULTY_CONFIG[entry.difficulty]?.label || entry.difficulty;
  const diffColor = DIFFICULTY_COLORS[entry.difficulty] || "bg-muted text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${isMe ? "bg-primary/5 border-primary/30" : "bg-card border-border"}`}
    >
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-bold text-foreground text-sm truncate">{entry.player_name}</span>
          {isMe && <span className="text-xs bg-primary/10 text-primary font-display font-semibold px-1.5 py-0.5 rounded-full">You</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-xs font-display font-semibold px-1.5 py-0.5 rounded-full ${diffColor}`}>{diffLabel}</span>
          {village && <span className="text-xs text-muted-foreground font-body">{village.name}</span>}
          <span className="text-xs text-muted-foreground font-body">{entry.accuracy_pct ?? 0}% acc · {entry.customers_served ?? 0} served</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-display font-bold text-foreground">{(entry.score || 0).toFixed(2)}</p>
      </div>
      {showDelete && (
        <button
          onClick={() => onDelete(entry)}
          className="ml-1 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
          title="Remove entry"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}

function StorySaveCard({ save, slotLabel }) {
  const village = VILLAGES[save.village];
  const sym = village?.currency ?? "$";
  const stats = save.story_stats_v1;
  const life = stats?.lifetime_total_earnings ?? 0;
  const best = stats?.best || {};
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-xl px-4 py-3 bg-card border-border"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-display font-bold text-foreground truncate">{save.bakery_name}</p>
          <p className="font-body text-xs text-muted-foreground truncate">{save.player_name}</p>
        </div>
        {slotLabel != null && (
          <span className="text-[10px] font-display font-bold bg-muted px-2 py-0.5 rounded-full shrink-0">
            Slot {slotLabel + 1}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground font-body mb-2">{village?.name || save.village}</p>
      <div className="grid grid-cols-2 gap-2 text-xs font-body">
        <div className="bg-muted/40 rounded-lg px-2 py-1.5">
          <span className="text-muted-foreground block">Lifetime earnings</span>
          <span className="font-display font-bold text-foreground">{sym}{Number(life).toFixed(2)}</span>
        </div>
        <div className="bg-muted/40 rounded-lg px-2 py-1.5">
          <span className="text-muted-foreground block">Best day (score)</span>
          <span className="font-display font-bold text-foreground">{(best.single_day_score ?? 0).toFixed(2)}</span>
        </div>
        <div className="bg-muted/40 rounded-lg px-2 py-1.5">
          <span className="text-muted-foreground block">Best day (pay)</span>
          <span className="font-display font-bold text-foreground">{sym}{(best.single_day_net_pay ?? 0).toFixed(2)}</span>
        </div>
        <div className="bg-muted/40 rounded-lg px-2 py-1.5">
          <span className="text-muted-foreground block">Best customers / day</span>
          <span className="font-display font-bold text-foreground">{best.customers_served_day ?? 0}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  const navigate = useNavigate();

  const [category, setCategory] = useState("arcade"); // "arcade" | "story"
  const [tab, setTab] = useState("global"); // "global" | "personal"
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  // Local identity: active player name (device-only)
  const [activeName, setActiveName] = useState(() => getActivePlayerName());
  const [localNames] = useState(() => getLocalNames());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const all = await fetchLeaderboard(200);
      setEntries(all);
    } catch (e) {
      console.warn("[Leaderboard] Failed to load entries:", e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { data: storySaves = [], isLoading: storyLoading } = useQuery({
    queryKey: ["gameSaves", "storyLeaderboard"],
    queryFn: () => GameSave.list("-updated_date", 50),
    select: (rows) => rows.filter((s) => isStorySave(s)),
    enabled: category === "story",
  });

  const slotAssignments = category === "story" ? getStorySlotAssignments() : [];
  const slotIndexBySaveId = useMemo(() => {
    const m = {};
    slotAssignments.forEach((id, i) => {
      if (id) m[id] = i;
    });
    return m;
  }, [slotAssignments, category]);

  // Derived data
  const allSorted = [...entries].sort((a, b) => b.score - a.score);

  const personalEntries = activeName
    ? allSorted.filter((e) => e.player_name === activeName)
    : [];

  const filteredGlobal = filterDifficulty === "all"
    ? allSorted
    : allSorted.filter((e) => e.difficulty === filterDifficulty);

  const personalBest = getPersonalBest(personalEntries);
  const top3Personal  = getTopN(personalEntries, 3);

  const displayEntries = tab === "global" ? filteredGlobal : personalEntries;

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleDeleteEntry = (entry) => {
    setConfirmDialog({
      message: `Remove ${entry.player_name}'s run (score: ${entry.score.toFixed(2)}) from the leaderboard?`,
      onConfirm: async () => {
        await deleteEntry(entry.id);
        setConfirmDialog(null);
        load();
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleClearLeaderboard = () => {
    setConfirmDialog({
      message: "This will permanently delete ALL leaderboard entries. This does not affect unlock data.",
      onConfirm: async () => {
        await clearAllEntries();
        setConfirmDialog(null);
        load();
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleClearUnlocks = () => {
    setConfirmDialog({
      message: "This will reset all difficulty unlock data (Easy and Medium will be locked again). Leaderboard entries are not affected.",
      onConfirm: () => {
        clearDifficultyUnlocks();
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <AnimatePresence>
        {confirmDialog && (
          <ConfirmDialog
            message={confirmDialog.message}
            onConfirm={confirmDialog.onConfirm}
            onCancel={confirmDialog.onCancel}
          />
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors font-display text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Main Menu
          </button>
          <Button
            size="sm"
            className="font-display font-bold gap-1.5"
            onClick={() => navigate("/arcade-setup")}
          >
            <Zap className="w-3.5 h-3.5" />
            Play Arcade
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-foreground">Leaderboard</h1>
              <p className="font-body text-xs text-muted-foreground">
                {category === "arcade" ? "Arcade runs ranked by score" : "Story saves — lifetime stats"}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={load} className="ml-auto" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Category: Arcade vs Story */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setCategory("arcade")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-display font-semibold text-sm transition-colors ${
                category === "arcade" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Arcade
            </button>
            <button
              type="button"
              onClick={() => setCategory("story")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-display font-semibold text-sm transition-colors ${
                category === "story" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              Story
            </button>
          </div>

          {category === "story" && (
            <div className="mb-6 space-y-3">
              <p className="font-body text-sm text-muted-foreground">
                Story Mode tracks totals on each save file — not individual arcade-style runs.
              </p>
              {storyLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : storySaves.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <p className="font-display font-bold text-foreground mb-1">No Story saves yet</p>
                  <p className="font-body text-sm text-muted-foreground mb-4">Start Story Mode from the main menu.</p>
                  <Button size="sm" className="font-display font-bold" onClick={() => navigate("/story")}>
                    Story Mode
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {storySaves.map((s) => (
                    <StorySaveCard
                      key={s.id}
                      save={s}
                      slotLabel={slotIndexBySaveId[s.id] ?? null}
                    />
                  ))}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 font-display font-bold" onClick={() => navigate("/")}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Main Menu
                </Button>
                <Button className="flex-1 font-display font-bold gap-1.5" onClick={() => navigate("/story")}>
                  <BookMarked className="w-4 h-4" />
                  Story
                </Button>
              </div>
            </div>
          )}

          {category === "arcade" && (
          <>
          {/* Personal Best Banner */}
          {personalBest && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
              <Star className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="font-display font-bold text-sm text-foreground">
                  {activeName}'s Best · {personalBest.score.toFixed(2)}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {DIFFICULTY_CONFIG[personalBest.difficulty]?.label} · {personalBest.accuracy_pct ?? 0}% accuracy · {personalBest.customers_served ?? 0} served
                </p>
              </div>
            </div>
          )}

          {/* Name picker (if multiple local names exist) */}
          {localNames.length > 1 && (
            <div className="flex gap-1.5 flex-wrap mb-4">
              <span className="font-display text-xs text-muted-foreground self-center mr-1">Viewing as:</span>
              {localNames.map((name) => (
                <button
                  key={name}
                  onClick={() => { setActiveName(name); setActivePlayerName(name); setTab("personal"); }}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full font-display text-xs font-semibold transition-colors ${
                    activeName === name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="w-2.5 h-2.5" />
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab("global")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-display font-semibold text-sm transition-colors ${
                tab === "global" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              All Runs ({allSorted.length})
            </button>
            <button
              onClick={() => setTab("personal")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-display font-semibold text-sm transition-colors ${
                tab === "personal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              My Runs {activeName ? `(${personalEntries.length})` : ""}
            </button>
          </div>

          {/* Difficulty filter (global tab only) */}
          {tab === "global" && (
            <div className="flex gap-1.5 flex-wrap mb-4">
              {["all", ...DIFFICULTY_ORDER].map((d) => (
                <button
                  key={d}
                  onClick={() => setFilterDifficulty(d)}
                  className={`px-3 py-1 rounded-full font-display text-xs font-semibold transition-colors ${
                    filterDifficulty === d ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d === "all" ? "All" : DIFFICULTY_CONFIG[d]?.label || d}
                </button>
              ))}
            </div>
          )}

          {/* Personal Top 3 (personal tab only) */}
          {tab === "personal" && top3Personal.length > 0 && (
            <div className="bg-muted/50 rounded-xl px-4 py-3 mb-4">
              <p className="font-display font-bold text-xs text-muted-foreground uppercase tracking-wide mb-2">Top 3 Scores</p>
              <div className="flex gap-4 justify-around">
                {top3Personal.map((e, i) => (
                  <div key={e.id} className="text-center">
                    <RankBadge rank={i + 1} />
                    <p className="font-display font-bold text-sm text-foreground mt-1">{e.score.toFixed(2)}</p>
                    <p className="font-body text-xs text-muted-foreground">{DIFFICULTY_CONFIG[e.difficulty]?.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entries */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : loadError ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="font-display font-bold text-foreground mb-1">Couldn't load scores</p>
              <p className="font-body text-sm text-muted-foreground mb-4">A server error occurred. Please try again.</p>
              <Button size="sm" className="font-display font-bold gap-1.5" onClick={load}>
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
            </div>
          ) : displayEntries.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🏆</div>
              <p className="font-display font-bold text-foreground mb-1">No runs yet</p>
              <p className="font-body text-sm text-muted-foreground mb-4">
                {tab === "personal"
                  ? activeName ? `No runs recorded for "${activeName}" yet.` : "Select a name above to see your runs."
                  : "Be the first to play!"}
              </p>
              <Button size="sm" className="font-display font-bold gap-1.5" onClick={() => navigate("/arcade-setup")}>
                <Zap className="w-3.5 h-3.5" /> Play Now
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {displayEntries.map((entry, i) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  rank={tab === "global" ? i + 1 : allSorted.findIndex((e) => e.id === entry.id) + 1}
                  isMe={entry.player_name === activeName}
                  showDelete={true}
                  onDelete={handleDeleteEntry}
                />
              ))}
            </div>
          )}

          {/* Bottom Navigation */}
          <div className="mt-8 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 font-display font-bold"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Main Menu
            </Button>
            <Button
              className="flex-1 font-display font-bold gap-1.5"
              onClick={() => navigate("/arcade-setup")}
            >
              <Zap className="w-4 h-4" />
              Play Arcade
            </Button>
          </div>

          {/* Data Controls */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="font-display font-bold text-sm text-foreground mb-3">Data Controls</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline" size="sm"
                className="font-display text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={handleClearLeaderboard}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear Leaderboard
              </Button>
              <Button
                variant="outline" size="sm"
                className="font-display text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={handleClearUnlocks}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reset Unlock Data
              </Button>
            </div>
            <p className="font-body text-xs text-muted-foreground mt-2">
              Clearing leaderboard does not affect unlock data. Resetting unlocks does not affect leaderboard entries.
            </p>
          </div>
          </>
          )}

        </motion.div>
      </div>
    </div>
  );
}