import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Narrator — a talking owl character with a typewriter speech bubble.
 * Props:
 *   messages: string[]   — list of lines to cycle through
 *   onDone: () => void   — called when user clicks past the last message
 *   autoAdvance: bool    — if true, advance automatically (no button)
 *   doneLabel: string    — label for the final "done" button
 *   className: string
 */
export default function Narrator({ messages = [], onDone, doneLabel = "Let's go! 🧁", className = "" }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);

  const currentMessage = messages[msgIndex] || "";

  // Typewriter effect
  useEffect(() => {
    setDisplayed("");
    setTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(currentMessage.slice(0, i));
      if (i >= currentMessage.length) {
        clearInterval(interval);
        setTyping(false);
      }
    }, 22);
    return () => clearInterval(interval);
  }, [msgIndex, currentMessage]);

  const handleNext = () => {
    if (typing) {
      // Skip typewriter — show full message immediately
      setDisplayed(currentMessage);
      setTyping(false);
      return;
    }
    if (msgIndex < messages.length - 1) {
      setMsgIndex((i) => i + 1);
    } else {
      onDone?.();
    }
  };

  const isLast = msgIndex === messages.length - 1;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Owl character */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <div className="text-6xl drop-shadow-xl select-none">🦉</div>
        {/* Sparkle dots */}
        <motion.div
          className="absolute -top-1 -right-2 text-xs"
          animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        >✨</motion.div>
      </motion.div>

      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={msgIndex}
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.25 }}
          className="relative bg-white border-2 border-amber-200 rounded-2xl px-5 py-4 shadow-lg max-w-xs text-center cursor-pointer"
          onClick={handleNext}
        >
          {/* Bubble tail pointing up */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-[14px] border-l-transparent border-r-transparent border-b-amber-200" />
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-b-[12px] border-l-transparent border-r-transparent border-b-white" />

          <p className="font-body text-sm text-amber-900 leading-relaxed min-h-[3em]">
            {displayed}
            {typing && <span className="inline-block w-1.5 h-3.5 bg-amber-400 ml-0.5 animate-pulse rounded-sm" />}
          </p>

          {!typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3"
            >
              {isLast ? (
                <span className="inline-block bg-amber-500 text-white text-xs font-display font-bold px-4 py-1.5 rounded-full shadow">
                  {doneLabel}
                </span>
              ) : (
                <span className="inline-block text-amber-400 text-xs font-display">
                  tap to continue →
                </span>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dot progress indicators */}
      {messages.length > 1 && (
        <div className="flex gap-1.5">
          {messages.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === msgIndex ? "bg-amber-500 w-3" : i < msgIndex ? "bg-amber-300" : "bg-amber-100"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}