import { publicUrl } from "@/lib/publicUrl";
import { analyzeLoopPoints } from "@/lib/bgmLoopAnalyzer";
import loopConstraints from "@/data/bgmLoopConstraints.json";
const LOOP_CONSTRAINTS_STORAGE_KEY = "cakery:bgmLoopConstraints:v1";

const PARIS_PIANO_URL = publicUrl("audio/bgm/paris_piano.mp3");
const LONDON_PIANO_URL = publicUrl("audio/bgm/london_piano.mp3");
const FRONTIER_BAND_URL = publicUrl("audio/bgm/frontier_band.mp3");

const STREAM_SRC = {
  paris: PARIS_PIANO_URL,
  paris_fast: PARIS_PIANO_URL,
  london: LONDON_PIANO_URL,
  london_fast: LONDON_PIANO_URL,
  frontier_us: FRONTIER_BAND_URL,
  frontier_us_fast: FRONTIER_BAND_URL,
};
const STREAM_LOOP_OPTIONS = {};
const DEFAULT_MANUAL_TUNING = {
  startGridOffset: 0,
  startFineAdjustSec: 0,
  endGridOffset: 0,
  endFineAdjustSec: 0,
  firstPassFromFileStart: true,
};

let bgmCtx = null;
let masterGain = null;
let decodedBuffer = null;
let decodedUrl = null;
let sourceNode = null;
let activeStreamTrack = null;
let loadedUrl = null;
let playSeq = 0;
const computedLoopPoints = new Map();
const manualTuning = new Map();
const loopDiagnostics = new Map();
let currentLoopPoints = null;
let currentBufferDurationSec = 0;
let sourceStartCtxSec = 0;
let sourceOffsetSec = 0;
let runtimeConstraints = {
  version: loopConstraints?.version ?? 1,
  tracks: { ...(loopConstraints?.tracks || {}) },
};

try {
  const raw = window.localStorage.getItem(LOOP_CONSTRAINTS_STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed?.tracks && typeof parsed.tracks === "object") {
      runtimeConstraints = {
        version: parsed?.version ?? runtimeConstraints.version,
        tracks: {
          ...runtimeConstraints.tracks,
          ...parsed.tracks,
        },
      };
    }
  }
} catch (e) {}

function assetPathFromUrl(url) {
  if (!url) return null;
  const marker = "audio/bgm/";
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return url.slice(idx);
}

function urlFromAssetPath(assetPath) {
  if (!assetPath) return null;
  for (const [, url] of Object.entries(STREAM_SRC)) {
    if (assetPathFromUrl(url) === assetPath) return url;
  }
  return null;
}

function manualForAsset(assetPath) {
  if (!manualTuning.has(assetPath)) {
    manualTuning.set(assetPath, { ...DEFAULT_MANUAL_TUNING });
  }
  return manualTuning.get(assetPath);
}

function getBgmCtx() {
  if (!bgmCtx) {
    bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = bgmCtx.createGain();
    masterGain.gain.value = 0.38;
    masterGain.connect(bgmCtx.destination);
  }
  return bgmCtx;
}

function stopSource() {
  if (!sourceNode) return;
  try {
    sourceNode.stop();
  } catch (e) {}
  try {
    sourceNode.disconnect();
  } catch (e) {}
  sourceNode = null;
}

function startLoopingSource(buffer, loopPoints, offsetSec = 0) {
  const c = getBgmCtx();
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.loopStart = loopPoints.start;
  src.loopEnd = Math.min(loopPoints.end, buffer.duration);
  src.connect(masterGain);
  const safeOffset = Math.max(0, Math.min(buffer.duration, offsetSec));
  src.start(0, safeOffset);
  sourceNode = src;
  currentLoopPoints = { start: src.loopStart, end: src.loopEnd };
  currentBufferDurationSec = buffer.duration;
  sourceStartCtxSec = c.currentTime;
  sourceOffsetSec = safeOffset;
}

async function loadBuffer(url) {
  if (decodedUrl === url && decodedBuffer) return decodedBuffer;
  const ctx = getBgmCtx();
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  decodedBuffer = await ctx.decodeAudioData(arr.slice(0));
  decodedUrl = url;
  return decodedBuffer;
}

function refreshActiveStreamLoop() {
  if (!activeStreamTrack) return;
  const currentTrack = activeStreamTrack;
  const shouldResume = bgmCtx?.state === "running";
  loadedUrl = null;
  stopSource();
  playStreamTrack(currentTrack, shouldResume);
}

export function setStreamLoopManualTuning(assetPath, patch) {
  if (!assetPath) return;
  const current = manualForAsset(assetPath);
  const next = {
    startGridOffset: Number.isFinite(patch?.startGridOffset) ? Math.trunc(patch.startGridOffset) : current.startGridOffset,
    startFineAdjustSec: Number.isFinite(patch?.startFineAdjustSec) ? patch.startFineAdjustSec : current.startFineAdjustSec,
    endGridOffset: Number.isFinite(patch?.endGridOffset) ? Math.trunc(patch.endGridOffset) : current.endGridOffset,
    endFineAdjustSec: Number.isFinite(patch?.endFineAdjustSec) ? patch.endFineAdjustSec : current.endFineAdjustSec,
    firstPassFromFileStart:
      typeof patch?.firstPassFromFileStart === "boolean" ? patch.firstPassFromFileStart : current.firstPassFromFileStart,
  };
  manualTuning.set(assetPath, next);
  const url = urlFromAssetPath(assetPath);
  if (url) computedLoopPoints.delete(url);
  refreshActiveStreamLoop();
}

export function getStreamLoopManualTuning(assetPath) {
  return { ...manualForAsset(assetPath) };
}

export function resetStreamLoopManualTuning(assetPath) {
  manualTuning.set(assetPath, { ...DEFAULT_MANUAL_TUNING });
  const url = urlFromAssetPath(assetPath);
  if (url) computedLoopPoints.delete(url);
  refreshActiveStreamLoop();
}

export function getStreamLoopDiagnostics(assetPath) {
  return loopDiagnostics.get(assetPath) || null;
}

export function getCurrentStreamAssetPath() {
  return assetPathFromUrl(loadedUrl);
}

export function getKnownStreamAssets() {
  return Array.from(new Set(Object.values(STREAM_SRC).map((url) => assetPathFromUrl(url)).filter(Boolean)));
}

function persistRuntimeConstraints() {
  try {
    window.localStorage.setItem(LOOP_CONSTRAINTS_STORAGE_KEY, JSON.stringify(runtimeConstraints));
  } catch (e) {}
}

export function getRuntimeLoopConstraint(assetPath) {
  return runtimeConstraints?.tracks?.[assetPath] || null;
}

export function applyRuntimeLoopConstraints(payload) {
  if (!payload?.tracks || typeof payload.tracks !== "object") return;
  runtimeConstraints = {
    version: payload?.version ?? runtimeConstraints.version ?? 1,
    tracks: {
      ...(runtimeConstraints?.tracks || {}),
      ...payload.tracks,
    },
  };
  persistRuntimeConstraints();
  for (const assetPath of Object.keys(payload.tracks)) {
    const url = urlFromAssetPath(assetPath);
    if (url) computedLoopPoints.delete(url);
  }
  refreshActiveStreamLoop();
}

export function getActiveStreamPlaybackState() {
  if (!sourceNode || !bgmCtx || !currentLoopPoints || !currentBufferDurationSec) return null;
  const elapsed = Math.max(0, bgmCtx.currentTime - sourceStartCtxSec);
  let raw = sourceOffsetSec + elapsed;
  const loopLen = Math.max(0.001, currentLoopPoints.end - currentLoopPoints.start);
  if (raw >= currentLoopPoints.end) {
    raw = currentLoopPoints.start + ((raw - currentLoopPoints.start) % loopLen);
  }
  const currentSec = Math.max(0, Math.min(currentBufferDurationSec, raw));
  return {
    assetPath: assetPathFromUrl(loadedUrl),
    durationSec: currentBufferDurationSec,
    currentSec,
    currentPct: currentSec / currentBufferDurationSec,
    loopStartSec: currentLoopPoints.start,
    loopEndSec: currentLoopPoints.end,
    loopStartPct: currentLoopPoints.start / currentBufferDurationSec,
    loopEndPct: currentLoopPoints.end / currentBufferDurationSec,
  };
}

export function seekActiveStreamTo(sec) {
  if (!activeStreamTrack || !loadedUrl || !decodedBuffer || decodedUrl !== loadedUrl || !currentLoopPoints) return;
  const requested = Math.max(0, Math.min(decodedBuffer.duration, Number(sec) || 0));
  const wasRunning = bgmCtx?.state === "running";
  stopSource();
  startLoopingSource(decodedBuffer, currentLoopPoints, requested);
  if (!wasRunning) bgmCtx?.suspend().catch(() => {});
}

export function isStreamTrack(track) {
  return Object.prototype.hasOwnProperty.call(STREAM_SRC, track);
}

export function getActiveStreamTrack() {
  return activeStreamTrack;
}

export function isStreamPlaying(track) {
  return !!(activeStreamTrack === track && sourceNode && bgmCtx?.state === "running");
}

export function stopStream() {
  playSeq++;
  stopSource();
  activeStreamTrack = null;
  loadedUrl = null;
  currentLoopPoints = null;
  currentBufferDurationSec = 0;
  sourceStartCtxSec = 0;
  sourceOffsetSec = 0;
}

export function resumeBgmContext() {
  const ctx = bgmCtx;
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

export function playStreamTrack(track, musicEnabled) {
  const url = STREAM_SRC[track];
  if (!url) return false;
  const ctx = getBgmCtx();

  if (loadedUrl === url && sourceNode && ctx.state !== "closed") {
    activeStreamTrack = track;
    loadedUrl = url;
    if (!musicEnabled) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
    return true;
  }

  const seq = ++playSeq;
  activeStreamTrack = track;
  loadedUrl = url;
  stopSource();

  void (async () => {
    try {
      const buffer = await loadBuffer(url);
      if (seq !== playSeq || activeStreamTrack !== track) return;
      const c = getBgmCtx();
      let loopPoints = computedLoopPoints.get(url);
      let firstPlayOffsetSec = 0;
      if (!loopPoints) {
        const assetPath = assetPathFromUrl(url);
        const constraints = assetPath ? runtimeConstraints?.tracks?.[assetPath] : null;
        const manual = assetPath ? manualForAsset(assetPath) : { ...DEFAULT_MANUAL_TUNING };
        const baseStartPct = constraints?.loopStartPct ?? 0;
        const baseEndPct = constraints?.loopEndPct ?? 1;
        const baseStart = Math.max(0, Math.min(buffer.duration - 0.05, baseStartPct * buffer.duration));
        const baseEnd = Math.max(baseStart + 0.05, Math.min(buffer.duration, baseEndPct * buffer.duration));
        const baseGridStep =
          (constraints?.gridStepPct != null ? constraints.gridStepPct : 0) * buffer.duration ||
          Math.max(0.001, (baseEnd - baseStart) / Math.max(1, constraints?.gridDivisions || 384));
        const adjustedStart = Math.max(
          0,
          Math.min(baseEnd - 0.05, baseStart + manual.startGridOffset * baseGridStep + manual.startFineAdjustSec),
        );
        const adjustedEnd = Math.max(
          adjustedStart + 0.05,
          Math.min(buffer.duration, baseEnd + manual.endGridOffset * baseGridStep + manual.endFineAdjustSec),
        );
        loopPoints = { start: adjustedStart, end: adjustedEnd };
        const firstPassFromFileStart = constraints?.firstPassFromFileStart ?? manual.firstPassFromFileStart;
        firstPlayOffsetSec = firstPassFromFileStart ? 0 : loopPoints.start;
        if (assetPath) {
          loopDiagnostics.set(assetPath, {
            mode: constraints ? "constraint-pct" : "default-full-file",
            bufferDurationSec: buffer.duration,
            baseStartSec: baseStart,
            baseEndSec: baseEnd,
            baseStartPct: baseStart / buffer.duration,
            baseEndPct: baseEnd / buffer.duration,
            gridStepSec: baseGridStep,
            gridStepPct: baseGridStep / buffer.duration,
            gridDivisions: constraints?.gridDivisions ?? 384,
            targetPauseSec: constraints?.targetPauseSec ?? 0.5,
            manual,
            firstPassFromFileStart,
            finalStartSec: loopPoints.start,
            finalEndSec: loopPoints.end,
            finalStartPct: loopPoints.start / buffer.duration,
            finalEndPct: loopPoints.end / buffer.duration,
          });
        }
        computedLoopPoints.set(url, loopPoints);
        if (import.meta.env.DEV && assetPath) {
          console.info("[BGM Loop]", assetPath, loopDiagnostics.get(assetPath));
        }
      }
      startLoopingSource(buffer, loopPoints, firstPlayOffsetSec);
      if (!musicEnabled) await c.suspend().catch(() => {});
      else await c.resume().catch(() => {});
    } catch (e) {}
  })();

  return true;
}

export function pauseStream() {
  if (bgmCtx && bgmCtx.state === "running") bgmCtx.suspend().catch(() => {});
}

export function resumeStreamIfPossible(musicEnabled) {
  if (!musicEnabled || !activeStreamTrack) return;
  resumeBgmContext();
}

export async function autoConstrainAsset(assetPath) {
  const url = urlFromAssetPath(assetPath);
  if (!url) return null;
  const buffer = await loadBuffer(url);
  const analyzed = analyzeLoopPoints(buffer, STREAM_LOOP_OPTIONS[url] || {});
  manualTuning.set(assetPath, { ...DEFAULT_MANUAL_TUNING });
  computedLoopPoints.delete(url);
  loopDiagnostics.set(assetPath, {
    mode: "auto-constrain-preview",
    bufferDurationSec: buffer.duration,
    ...analyzed,
  });
  if (getCurrentStreamAssetPath() === assetPath) {
    refreshActiveStreamLoop();
  }
  return {
    bufferDurationSec: Number(buffer.duration.toFixed(6)),
    loopStartPct: Number((analyzed.start / buffer.duration).toFixed(12)),
    loopEndPct: Number((analyzed.end / buffer.duration).toFixed(12)),
    gridStepPct: Number(((analyzed.diagnostics?.gridStep || 0) / buffer.duration).toFixed(12)),
    gridDivisions: 384,
    targetPauseSec: 0.5,
    firstPassFromFileStart: true,
    analysisSource: "transient-grid-v1",
  };
}
