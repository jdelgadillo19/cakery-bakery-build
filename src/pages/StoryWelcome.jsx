import React, { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { verifyStoryPin } from "@/lib/storySlots";

function roleTeaser(save) {
  const w = save.current_week ?? 0;
  const d = save.current_day ?? 1;
  if (w === 0) {
    if (d === 1) return "Cashier — greeting customers and making change.";
    if (d === 2) return "Packager — dividing treats into boxes.";
    return "Baker — scaling recipes for the oven.";
  }
  return "Choose any station from the manager hub when you’re ready.";
}

export default function StoryWelcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const saveId = params.get("id");

  const [pinOpen, setPinOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const { data: save, isLoading } = useQuery({
    queryKey: ["gameSave", saveId],
    queryFn: () => GameSave.filter({ id: saveId }),
    enabled: !!saveId,
    select: (rows) => rows[0],
  });

  const handleContinue = () => {
    playSFX("click");
    if (!saveId) {
      navigate("/story");
      return;
    }
    if (save?.story_locked && !location.state?.storyUnlockVerified) {
      setPinOpen(true);
      setPinInput("");
      setPinError("");
      return;
    }
    navigate(`/play?id=${encodeURIComponent(saveId)}`);
  };

  const submitPin = () => {
    if (!save) return;
    if (!verifyStoryPin(save, pinInput)) {
      setPinError("Incorrect PIN.");
      playSFX("incorrect");
      return;
    }
    playSFX("click");
    setPinOpen(false);
    navigate(`/play?id=${encodeURIComponent(save.id)}`);
  };

  if (!saveId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Button className="font-display" onClick={() => navigate("/story")}>
          Back to saves
        </Button>
      </div>
    );
  }

  if (isLoading || !save) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const village = VILLAGES[save.village];
  const sym = village?.currency ?? "$";
  const coins = Number(save.total_coins ?? 0).toFixed(2);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${village?.bgImage})` }}
      />
      <div className="absolute inset-0 bg-black/55" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-card/95 backdrop-blur-md shadow-xl p-6"
      >
        <p className="text-xs font-display font-bold text-primary uppercase tracking-wide text-center mb-1">
          Welcome back
        </p>
        <h1 className="font-display font-bold text-2xl text-center text-foreground mb-1">
          {save.bakery_name}
        </h1>
        <p className="text-center text-muted-foreground font-body text-sm mb-6">{save.player_name}</p>

        <div className="space-y-3 font-body text-sm text-foreground mb-6 bg-muted/40 rounded-xl p-4">
          <p>
            <span className="text-muted-foreground">When we left off:</span> Week{" "}
            <span className="font-display font-bold">{save.current_week ?? 0}</span>, Day{" "}
            <span className="font-display font-bold">{save.current_day ?? 1}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Savings:</span>{" "}
            <span className="font-display font-bold">
              {sym}
              {coins}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Next up:</span> {roleTeaser(save)}
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full font-display font-bold gap-2"
          onClick={handleContinue}
        >
          {save.story_locked && !location.state?.storyUnlockVerified ? (
            <>
              <Lock className="w-4 h-4" /> Unlock & continue
            </>
          ) : (
            "Continue to manager overview"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full mt-2 font-display text-muted-foreground"
          onClick={() => {
            playSFX("click");
            navigate("/story");
          }}
        >
          Back to saves
        </Button>
      </motion.div>

      <Dialog open={pinOpen} onOpenChange={(o) => !o && setPinOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Enter PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="font-display text-sm">4-digit PIN</Label>
            <Input
              inputMode="numeric"
              maxLength={4}
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="font-mono text-lg tracking-widest"
            />
            {pinError ? <p className="text-sm text-destructive font-body">{pinError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="font-display" onClick={() => setPinOpen(false)}>
              Cancel
            </Button>
            <Button className="font-display font-bold" onClick={submitPin}>
              Unlock & continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
