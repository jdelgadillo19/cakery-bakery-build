import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GameSave } from "@/lib/localEntities";
import { VILLAGES } from "@/lib/gameData";
import { playSFX } from "@/lib/audio";
import {
  STORY_SLOT_COUNT,
  assignSaveToSlot,
  clearStorySlotIndex,
  firstEmptySlotIndex,
  getStorySlotAssignments,
  hashStoryPin,
  isStorySlotsFull,
  removeSaveFromStorySlots,
  verifyStoryPin,
} from "@/lib/storySlots";

function formatMoney(save, villageKey) {
  const v = VILLAGES[villageKey];
  const sym = v?.currency ?? "$";
  const n = Number(save?.total_coins ?? 0);
  return `${sym}${n.toFixed(2)}`;
}

export default function StorySaveSelect() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: saves = [] } = useQuery({
    queryKey: ["gameSaves"],
    queryFn: () => GameSave.list("-updated_date", 100),
    initialData: [],
  });

  const { data: slotAssignments } = useQuery({
    queryKey: ["storySlots"],
    queryFn: () => getStorySlotAssignments(),
    staleTime: 0,
  });

  const resolvedSlots =
    slotAssignments ??
    (typeof window !== "undefined" ? getStorySlotAssignments() : Array(STORY_SLOT_COUNT).fill(null));

  const savesById = useMemo(() => Object.fromEntries(saves.map((s) => [s.id, s])), [saves]);

  useEffect(() => {
    let cleared = false;
    for (let i = 0; i < resolvedSlots.length; i++) {
      const id = resolvedSlots[i];
      if (id && !savesById[id]) {
        clearStorySlotIndex(i);
        cleared = true;
      }
    }
    if (cleared) queryClient.invalidateQueries({ queryKey: ["storySlots"] });
  }, [resolvedSlots, savesById, queryClient]);

  const [pinTarget, setPinTarget] = useState(null); // { save, slotIndex } continue flow
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [lockTarget, setLockTarget] = useState(null); // save row
  const [lockPinA, setLockPinA] = useState("");
  const [lockPinB, setLockPinB] = useState("");
  const [lockError, setLockError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null); // { save, slotIndex }
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState(null); // save — pick target slot

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
    queryClient.invalidateQueries({ queryKey: ["storySlots"] });
  };

  const goNewInSlot = (slotIndex, replaceSaveId = null) => {
    navigate("/story/new", {
      state: { slotIndex, replaceSaveId },
    });
  };

  const handleCreateNewClick = () => {
    playSFX("click");
    const empty = firstEmptySlotIndex();
    if (empty >= 0) {
      goNewInSlot(empty);
      return;
    }
    setReplaceOpen(true);
  };

  const handleReplaceSlotChosen = (slotIndex) => {
    const id = resolvedSlots[slotIndex];
    if (!id) return;
    playSFX("click");
    setReplaceOpen(false);
    goNewInSlot(slotIndex, id);
  };

  const handleContinue = (save, slotIndex) => {
    playSFX("click");
    if (save.story_locked) {
      setPinTarget({ save, slotIndex });
      setPinInput("");
      setPinError("");
      return;
    }
    navigate(`/story/resume?id=${encodeURIComponent(save.id)}`);
  };

  const submitPinUnlock = () => {
    if (!pinTarget) return;
    if (!verifyStoryPin(pinTarget.save, pinInput)) {
      setPinError("Incorrect PIN.");
      playSFX("incorrect");
      return;
    }
    playSFX("click");
    navigate(`/story/resume?id=${encodeURIComponent(pinTarget.save.id)}`, {
      state: { storyUnlockVerified: true },
    });
    setPinTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    playSFX("click");
    await GameSave.delete(deleteTarget.save.id);
    removeSaveFromStorySlots(deleteTarget.save.id);
    setDeleteTarget(null);
    invalidateAll();
  };

  const handleDuplicate = async (sourceSave, targetSlotIndex, replacedSaveId) => {
    playSFX("click");
    try {
      if (replacedSaveId) {
        await GameSave.delete(replacedSaveId);
        removeSaveFromStorySlots(replacedSaveId);
      }
      const { id, story_locked, story_pin_hash, ...rest } = sourceSave;
      const row = await GameSave.create({
        ...rest,
        bakery_name: `${sourceSave.bakery_name} (Copy)`,
        story_locked: false,
        story_pin_hash: null,
      });
      assignSaveToSlot(targetSlotIndex, row.id);
      invalidateAll();
      setDuplicateSource(null);
    } catch (e) {
      console.error(e);
    }
  };

  const startDuplicateFlow = (save) => {
    const empty = firstEmptySlotIndex();
    if (empty >= 0) {
      handleDuplicate(save, empty, null);
      return;
    }
    setDuplicateSource(save);
  };

  const submitLock = async () => {
    if (!lockTarget) return;
    const a = lockPinA.replace(/\D/g, "").slice(0, 4);
    const b = lockPinB.replace(/\D/g, "").slice(0, 4);
    if (a.length !== 4 || b.length !== 4) {
      setLockError("Use two matching 4-digit PINs.");
      return;
    }
    if (a !== b) {
      setLockError("PINs do not match.");
      return;
    }
    await GameSave.update(lockTarget.id, {
      story_locked: true,
      story_pin_hash: hashStoryPin(a),
    });
    playSFX("click");
    setLockTarget(null);
    setLockPinA("");
    setLockPinB("");
    setLockError("");
    invalidateAll();
  };

  const submitUnlockSave = async (save) => {
    const a = lockPinA.replace(/\D/g, "").slice(0, 4);
    if (a.length !== 4) {
      setLockError("Enter your 4-digit PIN to unlock.");
      return;
    }
    if (!verifyStoryPin(save, a)) {
      setLockError("Incorrect PIN.");
      playSFX("incorrect");
      return;
    }
    await GameSave.update(save.id, {
      story_locked: false,
      story_pin_hash: null,
    });
    playSFX("click");
    setLockTarget(null);
    setLockPinA("");
    setLockPinB("");
    setLockError("");
    invalidateAll();
  };

  const slotTiles = [];
  for (let i = 0; i < STORY_SLOT_COUNT; i++) {
    const saveId = resolvedSlots[i];
    const save = saveId ? savesById[saveId] : null;

    if (!saveId || !save) {
      slotTiles.push(
        <motion.button
          key={`empty-${i}`}
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => {
            playSFX("click");
            goNewInSlot(i);
          }}
          className="rounded-2xl border-2 border-dashed border-white/35 bg-white/5 hover:bg-white/10 p-5 text-left min-h-[140px] flex flex-col justify-center transition-colors"
        >
          <p className="font-display font-bold text-white/90 text-sm mb-1">Empty slot</p>
          <p className="font-body text-white/60 text-sm">+ Create new bakery</p>
        </motion.button>,
      );
      continue;
    }

    const v = VILLAGES[save.village];
    const locked = !!save.story_locked;

    slotTiles.push(
      <motion.div
        key={save.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className="rounded-2xl border-2 border-white/25 bg-card/90 backdrop-blur-sm shadow-lg p-4 flex flex-col gap-3 min-h-[140px]"
      >
        <div className="flex justify-between gap-2 items-start">
          <div className="min-w-0">
            <p className="font-display font-bold text-foreground truncate flex items-center gap-1.5">
              {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              {save.bakery_name}
            </p>
            <p className="text-xs text-muted-foreground font-body truncate">{save.player_name}</p>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Week {save.current_week ?? 0} · Day {save.current_day ?? 1}
            </p>
            <p className="text-xs font-display font-bold text-primary mt-0.5">
              {formatMoney(save, save.village)} · {v?.name ?? save.village}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-muted text-foreground"
                aria-label="Slot options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="font-display cursor-pointer"
                onClick={() => startDuplicateFlow(save)}
              >
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                className="font-display cursor-pointer"
                onClick={() => {
                  playSFX("click");
                  setLockError("");
                  setLockPinA("");
                  setLockPinB("");
                  setLockTarget(save);
                }}
              >
                {locked ? "Unlock…" : "Lock…"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="font-display text-destructive focus:text-destructive cursor-pointer"
                onClick={() => setDeleteTarget({ save, slotIndex: i })}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full font-display font-bold mt-auto"
          onClick={() => handleContinue(save, i)}
        >
          {locked ? "Unlock" : "Continue"}
        </Button>
      </motion.div>,
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30 bg-cover bg-center"
        style={{
          backgroundImage: `url(${VILLAGES.paris.bgImage})`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => {
            playSFX("click");
            navigate("/");
          }}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-6 font-display text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Main menu
        </button>

        <h1 className="font-display font-bold text-3xl text-foreground mb-1">Story Mode</h1>
        <p className="font-body text-muted-foreground mb-8">
          Choose a save slot or start a new bakery. Up to five adventures on this device.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {slotTiles}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: STORY_SLOT_COUNT * 0.05 }}
            onClick={handleCreateNewClick}
            className="rounded-2xl border-2 border-primary/60 bg-primary/15 hover:bg-primary/25 p-5 text-left min-h-[140px] flex flex-col justify-center gap-2 transition-colors"
          >
            <div className="flex items-center gap-2 text-primary font-display font-bold">
              <Plus className="w-5 h-5" />
              Create new bakery
            </div>
            <p className="font-body text-sm text-muted-foreground">
              {isStorySlotsFull()
                ? "All slots are full — you’ll pick one to replace."
                : "Opens the setup flow in the next open slot."}
            </p>
          </motion.button>
        </div>
      </div>

      <Dialog open={!!pinTarget} onOpenChange={(o) => !o && setPinTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Enter PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="font-display text-sm">4-digit PIN</Label>
            <Input
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="font-mono text-lg tracking-widest"
            />
            {pinError ? <p className="text-sm text-destructive font-body">{pinError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="font-display" onClick={() => setPinTarget(null)}>
              Cancel
            </Button>
            <Button className="font-display font-bold" onClick={submitPinUnlock}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!lockTarget}
        onOpenChange={(o) => {
          if (!o) {
            setLockTarget(null);
            setLockPinA("");
            setLockPinB("");
            setLockError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {lockTarget?.story_locked ? "Unlock save" : "Lock save"}
            </DialogTitle>
          </DialogHeader>
          {lockTarget?.story_locked ? (
            <div className="space-y-2">
              <Label className="font-display text-sm">PIN</Label>
              <Input
                inputMode="numeric"
                maxLength={4}
                type="password"
                value={lockPinA}
                onChange={(e) => setLockPinA(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="font-mono text-lg tracking-widest"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="font-display text-sm">New PIN</Label>
                <Input
                  inputMode="numeric"
                  maxLength={4}
                  type="password"
                  value={lockPinA}
                  onChange={(e) => setLockPinA(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="font-mono text-lg tracking-widest"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-display text-sm">Confirm PIN</Label>
                <Input
                  inputMode="numeric"
                  maxLength={4}
                  type="password"
                  value={lockPinB}
                  onChange={(e) => setLockPinB(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="font-mono text-lg tracking-widest"
                />
              </div>
            </div>
          )}
          {lockError ? <p className="text-sm text-destructive font-body">{lockError}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="font-display" onClick={() => setLockTarget(null)}>
              Cancel
            </Button>
            <Button
              className="font-display font-bold"
              onClick={() => {
                if (lockTarget?.story_locked) submitUnlockSave(lockTarget);
                else submitLock();
              }}
            >
              {lockTarget?.story_locked ? "Unlock" : "Lock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete this bakery?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              This removes «{deleteTarget?.save?.bakery_name}» from this device. You cannot undo it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-display">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-display bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Choose a slot to replace</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              All five slots are in use. Pick which bakery will be overwritten when you create a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-2">
            {resolvedSlots.map((id, idx) => {
              const s = id ? savesById[id] : null;
              if (!s) return null;
              return (
                <Button
                  key={idx}
                  type="button"
                  variant="outline"
                  className="justify-start font-display h-auto py-3"
                  onClick={() => handleReplaceSlotChosen(idx)}
                >
                  <span className="truncate text-left">
                    Slot {idx + 1}: {s.bakery_name} ({s.player_name})
                  </span>
                </Button>
              );
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-display">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!duplicateSource} onOpenChange={(o) => !o && setDuplicateSource(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Duplicate into which slot?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              No empty slots. The bakery you pick will be replaced by a copy of «
              {duplicateSource?.bakery_name}».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-2 max-h-60 overflow-y-auto">
            {resolvedSlots.map((id, idx) => {
              const s = id ? savesById[id] : null;
              if (!s || s.id === duplicateSource?.id) return null;
              return (
                <Button
                  key={idx}
                  type="button"
                  variant="outline"
                  className="justify-start font-display h-auto py-3"
                  onClick={() => {
                    if (duplicateSource) handleDuplicate(duplicateSource, idx, s.id);
                  }}
                >
                  <span className="truncate text-left">
                    Slot {idx + 1}: {s.bakery_name}
                  </span>
                </Button>
              );
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-display">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
