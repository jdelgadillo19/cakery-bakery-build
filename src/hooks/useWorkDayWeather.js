import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build 0–2 rain intervals during the workday (real-time seconds).
 * @param {number} dayDurationSec
 * @param {number} [seed]
 * @returns {{ intervals: { start: number, end: number }[] }}
 */
export function buildRainSchedule(dayDurationSec, seed = Date.now() % 1e9) {
  const rng = mulberry32(seed);
  const intervals = [];
  const dur = Math.max(60, dayDurationSec);

  if (rng() > 0.4) return { intervals };

  const patches = rng() < 0.45 ? 2 : 1;
  for (let i = 0; i < patches; i++) {
    const span = 25 + rng() * Math.min(120, dur * 0.35);
    const startMax = Math.max(5, dur - span - 8);
    const start = rng() * startMax;
    const end = Math.min(dur - 2, start + span);
    intervals.push({ start, end });
  }
  intervals.sort((a, b) => a.start - b.start);
  return { intervals };
}

function isInsideIntervals(elapsedSec, intervals) {
  return intervals.some(({ start, end }) => elapsedSec >= start && elapsedSec < end);
}

/**
 * Live rain during the timed day + snapshot at clock-out for story rules.
 */
export function useWorkDayWeather(dayDurationSec, { active, resetKey }) {
  const [intervals, setIntervals] = useState(() => []);
  const [elapsed, setElapsed] = useState(0);
  const [rainingAtClockOut, setRainingAtClockOut] = useState(false);
  const clockOutCapturedRef = useRef(false);
  const rafRef = useRef(0);
  const startPerfRef = useRef(0);
  const rainingNowRef = useRef(false);

  useEffect(() => {
    clockOutCapturedRef.current = false;
    setRainingAtClockOut(false);
    if (!active) {
      setElapsed(0);
      setIntervals([]);
      rainingNowRef.current = false;
      return;
    }
    const seed = (resetKey ?? 0) ^ Math.floor(dayDurationSec * 2654435761);
    setIntervals(buildRainSchedule(dayDurationSec, seed).intervals);
    startPerfRef.current = performance.now();

    const tick = () => {
      const e = Math.min(dayDurationSec, (performance.now() - startPerfRef.current) / 1000);
      setElapsed(e);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, resetKey, dayDurationSec]);

  const isRaining = active && isInsideIntervals(elapsed, intervals);
  useEffect(() => {
    rainingNowRef.current = isRaining;
  }, [isRaining]);

  const captureClockOut = useCallback(() => {
    if (clockOutCapturedRef.current) return;
    clockOutCapturedRef.current = true;
    setRainingAtClockOut(rainingNowRef.current);
  }, []);

  return useMemo(
    () => ({ isRaining, rainingAtClockOut, captureClockOut }),
    [isRaining, rainingAtClockOut, captureClockOut],
  );
}
