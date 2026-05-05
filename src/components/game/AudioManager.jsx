import React, { useEffect, useState } from "react";
import { Volume2, VolumeX, Music, Music2, SlidersHorizontal, RotateCcw } from "lucide-react";
import { setMusicEnabled, setSFXEnabled, isMusicEnabled, isSFXEnabled } from "@/lib/audio";
import {
  applyRuntimeLoopConstraints,
  autoConstrainAsset,
  getActiveStreamPlaybackState,
  getCurrentStreamAssetPath,
  getKnownStreamAssets,
  getRuntimeLoopConstraint,
  getStreamLoopDiagnostics,
  getStreamLoopManualTuning,
  resetStreamLoopManualTuning,
  seekActiveStreamTo,
  setStreamLoopManualTuning,
} from "@/lib/bgmStream";

export default function AudioManager() {
  const [music, setMusic] = useState(isMusicEnabled());
  const [sfx, setSFX] = useState(isSFXEnabled());
  const [showTuner, setShowTuner] = useState(false);
  const [activeAsset, setActiveAsset] = useState(getCurrentStreamAssetPath());
  const [playback, setPlayback] = useState(getActiveStreamPlaybackState());
  const [diag, setDiag] = useState(activeAsset ? getStreamLoopDiagnostics(activeAsset) : null);
  const [loopTuning, setLoopTuning] = useState(
    activeAsset
      ? getStreamLoopManualTuning(activeAsset)
      : { startGridOffset: 0, startFineAdjustSec: 0, endGridOffset: 0, endFineAdjustSec: 0, firstPassFromFileStart: true },
  );
  const [commitStatus, setCommitStatus] = useState("");
  const [copyFromAsset, setCopyFromAsset] = useState("audio/bgm/paris_piano.mp3");

  const refreshState = () => {
    const asset = getCurrentStreamAssetPath();
    setActiveAsset(asset);
    const pb = getActiveStreamPlaybackState();
    setPlayback(pb);
    setDiag(asset ? getStreamLoopDiagnostics(asset) : null);
    setLoopTuning(
      asset
        ? getStreamLoopManualTuning(asset)
        : { startGridOffset: 0, startFineAdjustSec: 0, endGridOffset: 0, endFineAdjustSec: 0, firstPassFromFileStart: true },
    );
  };

  useEffect(() => {
    if (!showTuner) return undefined;
    refreshState();
    const id = setInterval(refreshState, 120);
    return () => clearInterval(id);
  }, [showTuner]);

  const toggleMusic = () => {
    const next = !music;
    setMusic(next);
    setMusicEnabled(next);
  };

  const toggleSFX = () => {
    const next = !sfx;
    setSFX(next);
    setSFXEnabled(next);
  };

  const applyTuningPatch = (patch) => {
    if (!activeAsset) {
      setCommitStatus("Start a locale BGM track first.");
      return;
    }
    const next = { ...loopTuning, ...patch };
    setLoopTuning(next);
    setStreamLoopManualTuning(activeAsset, next);
    setTimeout(refreshState, 0);
  };

  const seekPlayback = (sec) => {
    seekActiveStreamTo(sec);
    setTimeout(refreshState, 0);
  };

  const commitPayload = async (payload, successMessage) => {
    applyRuntimeLoopConstraints(payload);
    try {
      const response = await fetch("/__dev/commit-bgm-loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result?.ok) throw new Error(result?.error || "Unknown commit error");
      setCommitStatus(successMessage);
    } catch {
      try {
        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        setCommitStatus("Dev commit unavailable; copied JSON to clipboard.");
      } catch {
        setCommitStatus("Commit/copy failed. Payload logged to console.");
      }
      console.info("[BGM Loop Commit Payload]", payload);
    }
  };

  const commitLoopSettings = async () => {
    const targetAsset = activeAsset || "audio/bgm/paris_piano.mp3";
    const d = getStreamLoopDiagnostics(targetAsset);
    const baseConstraint = getRuntimeLoopConstraint(targetAsset);
    const durationSec = d?.bufferDurationSec ?? baseConstraint?.bufferDurationSec ?? 0;
    const gridStepPct = d?.gridStepPct ?? baseConstraint?.gridStepPct ?? 0;
    const gridStepSec = durationSec > 0 ? gridStepPct * durationSec : 0;
    const baseStartPct = d?.baseStartPct ?? baseConstraint?.loopStartPct ?? d?.finalStartPct ?? 0;
    const baseEndPct = d?.baseEndPct ?? baseConstraint?.loopEndPct ?? d?.finalEndPct ?? 0;
    const finalStartPct =
      d?.finalStartPct ??
      (durationSec > 0
        ? Math.max(
            0,
            Math.min(1, baseStartPct + ((loopTuning.startGridOffset || 0) * gridStepSec + (loopTuning.startFineAdjustSec || 0)) / durationSec),
          )
        : baseStartPct);
    const finalEndPct =
      d?.finalEndPct ??
      (durationSec > 0
        ? Math.max(
            finalStartPct + 0.000001,
            Math.min(1, baseEndPct + ((loopTuning.endGridOffset || 0) * gridStepSec + (loopTuning.endFineAdjustSec || 0)) / durationSec),
          )
        : baseEndPct);
    const trackPayload = {
      bufferDurationSec: Number((durationSec || 0).toFixed(6)),
      loopStartPct: Number((finalStartPct || 0).toFixed(12)),
      loopEndPct: Number((finalEndPct || 0).toFixed(12)),
      gridStepPct: Number((gridStepPct || 0).toFixed(12)),
      gridDivisions: d?.gridDivisions ?? baseConstraint?.gridDivisions ?? 384,
      targetPauseSec: d?.targetPauseSec ?? baseConstraint?.targetPauseSec ?? 0.5,
      firstPassFromFileStart: loopTuning.firstPassFromFileStart !== false,
      analysisSource: "transient-grid-v1",
      manualTune: {
        startGridOffset: loopTuning.startGridOffset,
        startFineAdjustSec: Number(loopTuning.startFineAdjustSec.toFixed(6)),
        endGridOffset: loopTuning.endGridOffset,
        endFineAdjustSec: Number(loopTuning.endFineAdjustSec.toFixed(6)),
      },
    };

    const payload = { version: 1, tracks: { [targetAsset]: trackPayload } };
    await commitPayload(payload, `Committed ${targetAsset}`);
    setTimeout(refreshState, 0);
  };

  const handleAutoConstrain = async () => {
    const targetAsset = activeAsset || "audio/bgm/paris_piano.mp3";
    const generated = await autoConstrainAsset(targetAsset);
    if (!generated) {
      setCommitStatus("Auto-constrain failed for selected asset.");
      return;
    }
    await commitPayload({ version: 1, tracks: { [targetAsset]: generated } }, `Auto-constrained ${targetAsset}`);
    setTimeout(refreshState, 0);
  };

  const handleCopyConstraints = async () => {
    const targetAsset = activeAsset || "audio/bgm/paris_piano.mp3";
    const source = getRuntimeLoopConstraint(copyFromAsset);
    if (!source) {
      setCommitStatus("Source constraints not found.");
      return;
    }
    await commitPayload(
      { version: 1, tracks: { [targetAsset]: { ...source, analysisSource: "copied-constraints" } } },
      `Copied constraints: ${copyFromAsset} → ${targetAsset}`,
    );
    setTimeout(refreshState, 0);
  };

  return (
    <div className="flex items-center gap-1 relative">
      <div className="flex items-center gap-1">
        <button
          onClick={toggleMusic}
          title={music ? "Mute Music" : "Unmute Music"}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors border border-white/20"
        >
          {music ? <Music className="w-3.5 h-3.5 text-white/80" /> : <Music2 className="w-3.5 h-3.5 text-white/40" />}
        </button>
        <button
          onClick={toggleSFX}
          title={sfx ? "Mute SFX" : "Unmute SFX"}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors border border-white/20"
        >
          {sfx ? <Volume2 className="w-3.5 h-3.5 text-white/80" /> : <VolumeX className="w-3.5 h-3.5 text-white/40" />}
        </button>
      </div>

      {import.meta.env.DEV && (
        <>
          <button
            onClick={() => {
              setShowTuner((v) => !v);
              refreshState();
            }}
            title="Loop Tuner"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors border border-white/20"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-white/80" />
          </button>
          {showTuner && (
            <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-white/20 bg-black/85 p-3 shadow-xl text-white">
              <p className="text-xs font-semibold mb-1">BGM Loop Tuner</p>
              <p className="text-[11px] text-white/70 mb-2 truncate">{activeAsset || "No active locale stream"}</p>

              <div className="mb-2">
                <div className="flex items-center justify-between text-[11px] text-white/80">
                  <span>Playback</span>
                  <span className="tabular-nums">{playback?.currentSec != null ? `${playback.currentSec.toFixed(2)}s` : "n/a"}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={playback?.durationSec ?? 1}
                  step="0.01"
                  value={playback?.currentSec ?? 0}
                  onChange={(e) => seekPlayback(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex items-center gap-2 mt-1">
                  <button className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px]" onClick={() => seekPlayback(Math.max(0, (playback?.loopEndSec ?? 0) - 2))}>
                    Loop End -2s
                  </button>
                  <button className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px]" onClick={() => seekPlayback(Math.max(0, (playback?.loopEndSec ?? 0) - 0.8))}>
                    Loop End -0.8s
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-white/80">Start Grid</span>
                <div className="flex items-center gap-2">
                  <button className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20" onClick={() => applyTuningPatch({ startGridOffset: loopTuning.startGridOffset - 1 })}>-1</button>
                  <span className="text-xs tabular-nums w-8 text-center">{loopTuning.startGridOffset}</span>
                  <button className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20" onClick={() => applyTuningPatch({ startGridOffset: loopTuning.startGridOffset + 1 })}>+1</button>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-between text-[11px] text-white/80">
                  <span>Start Fine</span>
                  <span className="tabular-nums">{(loopTuning.startFineAdjustSec || 0).toFixed(3)}s</span>
                </div>
                <input type="range" min="-0.300" max="0.300" step="0.005" value={loopTuning.startFineAdjustSec || 0} onChange={(e) => applyTuningPatch({ startFineAdjustSec: Number(e.target.value) })} className="w-full" />
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-white/80">End Grid</span>
                <div className="flex items-center gap-2">
                  <button className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20" onClick={() => applyTuningPatch({ endGridOffset: loopTuning.endGridOffset - 1 })}>-1</button>
                  <span className="text-xs tabular-nums w-8 text-center">{loopTuning.endGridOffset}</span>
                  <button className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20" onClick={() => applyTuningPatch({ endGridOffset: loopTuning.endGridOffset + 1 })}>+1</button>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-between text-[11px] text-white/80">
                  <span>End Fine</span>
                  <span className="tabular-nums">{(loopTuning.endFineAdjustSec || 0).toFixed(3)}s</span>
                </div>
                <input type="range" min="-0.300" max="0.300" step="0.005" value={loopTuning.endFineAdjustSec || 0} onChange={(e) => applyTuningPatch({ endFineAdjustSec: Number(e.target.value) })} className="w-full" />
              </div>

              <label className="flex items-center gap-2 text-[11px] text-white/80 mb-2">
                <input
                  type="checkbox"
                  checked={loopTuning.firstPassFromFileStart !== false}
                  onChange={(e) => applyTuningPatch({ firstPassFromFileStart: e.target.checked })}
                />
                Play from file start on first pass
              </label>

              <div className="text-[11px] text-white/70 space-y-1 mb-2">
                <div>Buffer: {diag?.bufferDurationSec ? `${diag.bufferDurationSec.toFixed(3)}s` : "n/a"}</div>
                <div>Loop start: {diag?.finalStartPct != null ? `${(diag.finalStartPct * 100).toFixed(4)}%` : "n/a"}</div>
                <div>Loop end: {diag?.finalEndPct != null ? `${(diag.finalEndPct * 100).toFixed(4)}%` : "n/a"}</div>
              </div>

              <button onClick={() => activeAsset && (resetStreamLoopManualTuning(activeAsset), setTimeout(refreshState, 0))} className="w-full inline-flex items-center justify-center gap-1.5 rounded bg-white/10 hover:bg-white/20 py-1 text-xs">
                <RotateCcw className="w-3 h-3" />
                Reset Tuning
              </button>
              <button onClick={handleAutoConstrain} className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded bg-sky-500/30 hover:bg-sky-500/40 py-1 text-xs">
                Auto-Constrain (Transients)
              </button>
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={copyFromAsset}
                  onChange={(e) => setCopyFromAsset(e.target.value)}
                  className="flex-1 h-7 rounded bg-white/10 border border-white/20 text-[11px] px-2"
                >
                  {getKnownStreamAssets().map((asset) => (
                    <option key={asset} value={asset}>
                      {asset}
                    </option>
                  ))}
                </select>
                <button onClick={handleCopyConstraints} className="px-2 h-7 rounded bg-white/10 hover:bg-white/20 text-[11px]">
                  Copy
                </button>
              </div>
              <button onClick={commitLoopSettings} className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded bg-emerald-500/30 hover:bg-emerald-500/40 py-1 text-xs">
                Commit Loop Constraints
              </button>
              {commitStatus && <p className="text-[11px] text-emerald-200/90 mt-2 leading-snug">{commitStatus}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
