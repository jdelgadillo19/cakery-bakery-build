import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getWorkdaySceneUrl } from "@/lib/localeScenes";

const FADE = { duration: 0.85, ease: [0.4, 0, 0.2, 1] };

/**
 * Crossfading full-screen background for workday screens.
 */
export default function WorkdaySceneBackdrop({ villageKey, period, raining }) {
  const url = useMemo(
    () => getWorkdaySceneUrl(villageKey, { period, raining }),
    [villageKey, period, raining],
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={url}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={FADE}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${url})` }}
        />
      </AnimatePresence>
    </div>
  );
}
