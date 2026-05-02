// ============================================================
// CAKERY BAKERY — useDayTimer hook
//
// Fully imperative timer — can be reset between days.
// All state lives in refs; only secondsLeft is React state (for rendering).
// API:
//   start()  — begin countdown from current duration
//   stop()   — halt countdown (e.g. on lastCall entry)
//   reset(newDuration?)  — destroy old interval, reset to fresh duration
// ============================================================

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * @param {number} initialDuration  Starting duration in seconds
 * @param {() => void} onExpire     Called exactly once when timer hits 0
 */
export function useDayTimer(initialDuration, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(initialDuration);

  const intervalRef   = useRef(null);
  const secondsRef    = useRef(initialDuration);
  const onExpireRef   = useRef(onExpire);
  const firedRef      = useRef(false);   // has onExpire fired for this run?
  const runningRef    = useRef(false);

  // Keep callback fresh without restarting the timer
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  /** Internal: clear any existing interval safely */
  const _clearInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    runningRef.current = false;
  }, []);

  /** Start countdown. No-op if already running or already expired. */
  const start = useCallback(() => {
    if (runningRef.current || firedRef.current) return;
    runningRef.current = true;
    intervalRef.current = setInterval(() => {
      secondsRef.current -= 1;
      setSecondsLeft(secondsRef.current);

      if (secondsRef.current <= 0 && !firedRef.current) {
        firedRef.current = true;
        _clearInterval();
        onExpireRef.current?.();
      }
    }, 1000);
  }, [_clearInterval]);

  /** Stop the countdown (does not fire onExpire). */
  const stop = useCallback(() => {
    _clearInterval();
  }, [_clearInterval]);

  /**
   * Reset to a fresh duration. Clears any running interval.
   * Call this at the START of each new day before calling start().
   * @param {number} [newDuration]  If omitted, resets to initialDuration.
   */
  const reset = useCallback((newDuration) => {
    _clearInterval();
    const dur = newDuration ?? initialDuration;
    firedRef.current  = false;
    secondsRef.current = dur;
    setSecondsLeft(dur);
  }, [_clearInterval, initialDuration]);

  // Cleanup on unmount
  useEffect(() => () => _clearInterval(), [_clearInterval]);

  return {
    secondsLeft,
    isRunning: runningRef.current,
    hasExpired: firedRef.current,
    start,
    stop,
    reset,
  };
}