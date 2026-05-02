import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { OWNER_PORTRAITS, OWNER_INTRO_DIALOGUES } from "@/lib/gameEngine";
import { resolveAssetUrl, resolveAssetFallback } from "@/lib/localAssets";
import { playSFX } from "@/lib/audio";

export default function OwnerIntro({ villageKey, playerName, onDone }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const ownerEntry = OWNER_PORTRAITS[villageKey];
  const portraitPrimary = resolveAssetUrl(ownerEntry);
  const portraitFallback = resolveAssetFallback(ownerEntry);
  const [imgBroken, setImgBroken] = useState(false);
  useEffect(() => {
    setImgBroken(false);
  }, [villageKey, portraitPrimary]);
  const portraitSrc = imgBroken && portraitFallback ? portraitFallback : portraitPrimary;
  const messages = OWNER_INTRO_DIALOGUES[villageKey] || OWNER_INTRO_DIALOGUES.paris;
  const isLast = msgIndex >= messages.length - 1;
  const typingRef = useRef(null);

  // Play typing ticks when a new message appears
  useEffect(() => {
    if (typingRef.current) {
      clearInterval(typingRef.current);
    }
    const msg = messages[msgIndex] || "";
    let count = 0;
    const maxTicks = Math.min(msg.length, 40);
    typingRef.current = setInterval(() => {
      playSFX("type");
      count++;
      if (count >= maxTicks) {
        clearInterval(typingRef.current);
        typingRef.current = null;
      }
    }, 40);
    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, [msgIndex]);

  const advance = () => {
    // Stop typing sound immediately
    if (typingRef.current) {
      clearInterval(typingRef.current);
      typingRef.current = null;
    }
    playSFX("click");
    if (isLast) {
      onDone();
    } else {
      setMsgIndex((i) => i + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center gap-6 py-4"
    >
      <div className="flex items-end gap-5 w-full max-w-md">
        {/* Owner portrait */}
        <motion.div
          key={msgIndex}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-28 h-28 flex-shrink-0"
        >
          {portraitSrc ? (
            <img
              src={portraitSrc}
              alt="Bakery Owner"
              className="w-full h-full object-contain drop-shadow-lg"
              onError={() => setImgBroken(true)}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-4xl">👨‍🍳</div>
          )}
        </motion.div>

        {/* Speech bubble */}
        <AnimatePresence mode="wait">
          <motion.div
            key={msgIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex-1 relative bg-card border border-border rounded-2xl rounded-bl-sm p-4 shadow-md"
          >
            <div className="absolute -left-2.5 bottom-5 w-0 h-0 border-t-8 border-t-transparent border-r-[10px] border-r-card border-b-8 border-b-transparent" />
            <p className="font-body text-sm text-foreground leading-relaxed">
              {messages[msgIndex]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {messages.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${i === msgIndex ? "bg-primary" : i < msgIndex ? "bg-primary/40" : "bg-muted"}`}
          />
        ))}
      </div>

      <Button onClick={advance} size="lg" className="w-full max-w-xs font-display font-bold h-12">
        {isLast ? `Open the Bakery! 🧁` : "Continue"}
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );
}