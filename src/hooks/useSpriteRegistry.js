// ============================================================
// useSpriteRegistry — loads or runs the one-time sprite
// processing pipeline and exposes the finished registry.
// ============================================================

import { useState, useEffect, useRef } from "react";
import {
  loadProcessedSprites,
  runSpriteProcessing,
  getCustomerSpriteUrl,
  getOwnerSpriteUrl,
} from "@/lib/spriteProcessor";

/**
 * Returns:
 *  - registry    : the processed sprite registry (null while loading)
 *  - isProcessing: true while the pipeline is running for the first time
 *  - progress    : { done, total, currentId }
 *  - getCustomerUrl(villageKey, portraitIndex) → best URL
 *  - getOwnerUrl(villageKey) → best URL
 */
export function useSpriteRegistry() {
  const [registry, setRegistry] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, currentId: "" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const cached = loadProcessedSprites();
    if (cached) {
      setRegistry(cached);
      return;
    }

    // First time — run the pipeline
    setIsProcessing(true);
    runSpriteProcessing((done, total, currentId) => {
      setProgress({ done, total, currentId });
    }).then((result) => {
      setRegistry(result);
      setIsProcessing(false);
    });
  }, []);

  return {
    registry,
    isProcessing,
    progress,
    getCustomerUrl: (villageKey, portraitIndex) =>
      getCustomerSpriteUrl(villageKey, portraitIndex, registry),
    getOwnerUrl: (villageKey) =>
      getOwnerSpriteUrl(villageKey, registry),
  };
}