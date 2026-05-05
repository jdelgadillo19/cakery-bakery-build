#!/usr/bin/env python3
"""
Analyze an MP3/WAV and suggest loop points from transients + normalized grid.

Usage:
  python3 scripts/analyze-bgm-loop.py public/audio/bgm/paris_piano.mp3 --pause 0.5 --grid 384
"""

from __future__ import annotations

import argparse
import array
import json
import math
import os
import pathlib
import subprocess
import tempfile
import wave


def quantile(sorted_vals, q):
    if not sorted_vals:
        return 0.0
    idx = max(0, min(len(sorted_vals) - 1, int(q * (len(sorted_vals) - 1))))
    return float(sorted_vals[idx])


def moving_average(values, radius):
    if radius <= 0:
        return values[:]
    out = []
    for i in range(len(values)):
        lo = max(0, i - radius)
        hi = min(len(values), i + radius + 1)
        out.append(sum(values[lo:hi]) / (hi - lo))
    return out


def load_wav_envelope(wav_path, hop=256, smooth_radius=2):
    with wave.open(wav_path, "rb") as w:
        ch = w.getnchannels()
        sr = w.getframerate()
        n = w.getnframes()
        raw = w.readframes(n)

    arr = array.array("h")
    arr.frombytes(raw)
    env = []
    step = hop * ch
    for i in range(0, len(arr), step):
        chunk = arr[i : i + step]
        if not chunk:
            break
        s = 0.0
        c = 0
        for j in range(0, len(chunk), ch):
            mono = 0.0
            for k in range(ch):
                mono += abs(chunk[j + k])
            s += mono / ch
            c += 1
        env.append(s / max(1, c))
    env = moving_average(env, smooth_radius)
    return env, sr, n / sr


def find_first_run(values, start_idx, threshold, min_bins):
    i = max(0, start_idx)
    while i < len(values):
        if values[i] >= threshold:
            i += 1
            continue
        j = i + 1
        while j < len(values) and values[j] < threshold:
            j += 1
        if (j - i) >= min_bins:
            return i, j
        i = j
    return None


def analyze(env, sr, duration, target_pause, grid_divisions, hop=256):
    s = sorted(env)
    floor = quantile(s, 0.10)
    peak = quantile(s, 0.995)
    transient_th = max(floor * 3.5, peak * 0.012)
    silence_th = max(floor * 1.8, peak * 0.004)

    first = next((i for i, v in enumerate(env) if v >= transient_th), 0)
    last = next((i for i in range(len(env) - 1, -1, -1) if env[i] >= transient_th), len(env) - 1)

    start = first * hop / sr
    audible_end = min(duration, (last + 1) * hop / sr)
    musical_span = max(0.05, audible_end - start)
    grid_step = musical_span / max(1, grid_divisions)

    min_tail_sec = 0.2
    min_bins = max(1, math.ceil(min_tail_sec * sr / hop))
    tail_run = find_first_run(env, int(audible_end * sr / hop), silence_th, min_bins)
    tail_start = (tail_run[0] * hop / sr) if tail_run else audible_end

    desired_end = tail_start + target_pause
    raw_idx = (desired_end - start) / grid_step
    candidate_indices = sorted(set([max(1, math.floor(raw_idx)), max(1, round(raw_idx)), max(1, math.ceil(raw_idx))]))
    best = None
    for grid_idx in candidate_indices:
        candidate_end = start + grid_idx * grid_step
        candidate_end = max(audible_end, min(duration, candidate_end))
        pause = max(0.0, candidate_end - tail_start)
        err = abs(pause - target_pause)
        if best is None or err < best["err"]:
            best = {"grid_idx": grid_idx, "loop_end": candidate_end, "pause": pause, "err": err}
    grid_idx = best["grid_idx"] if best else 1
    loop_end = best["loop_end"] if best else max(audible_end, min(duration, desired_end))

    return {
        "loop_start_sec": round(start, 6),
        "loop_end_sec": round(loop_end, 6),
        "target_pause_sec": target_pause,
        "diagnostics": {
            "duration_sec": round(duration, 6),
            "audible_end_sec": round(audible_end, 6),
            "tail_start_sec": round(tail_start, 6),
            "implied_pause_sec": round(best["pause"] if best else max(0.0, loop_end - tail_start), 6),
            "grid_step_sec": round(grid_step, 6),
            "grid_index": int(grid_idx),
            "floor": round(floor, 3),
            "peak": round(peak, 3),
            "transient_threshold": round(transient_th, 3),
            "silence_threshold": round(silence_th, 3),
        },
    }


def convert_to_wav(input_path):
    if input_path.lower().endswith(".wav"):
        return input_path, None
    fd, tmp_wav = tempfile.mkstemp(prefix="bgm-loop-", suffix=".wav")
    os.close(fd)
    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", "LEI16@44100", input_path, tmp_wav],
        check=True,
        capture_output=True,
        text=True,
    )
    return tmp_wav, tmp_wav


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_path", help="Input audio file (.mp3 or .wav)")
    parser.add_argument("--pause", type=float, default=0.5, help="Target loop pause in seconds")
    parser.add_argument("--grid", type=int, default=384, help="Normalized grid divisions across musical span")
    parser.add_argument("--write", type=str, default=None, help="Write/update loop constraints JSON file")
    args = parser.parse_args()

    wav_path = None
    cleanup = None
    try:
        wav_path, cleanup = convert_to_wav(args.audio_path)
        env, sr, duration = load_wav_envelope(wav_path)
        result = analyze(env, sr, duration, args.pause, args.grid)
        print(json.dumps(result, indent=2))
        if args.write:
            audio_path = pathlib.Path(args.audio_path).as_posix()
            normalized_asset_path = audio_path
            if "/public/" in audio_path:
                normalized_asset_path = audio_path.split("/public/", 1)[1]
            elif audio_path.startswith("public/"):
                normalized_asset_path = audio_path.split("public/", 1)[1]

            start_pct = result["loop_start_sec"] / result["diagnostics"]["duration_sec"]
            end_pct = result["loop_end_sec"] / result["diagnostics"]["duration_sec"]
            grid_step_pct = result["diagnostics"]["grid_step_sec"] / result["diagnostics"]["duration_sec"]

            write_path = pathlib.Path(args.write)
            if write_path.exists():
                with write_path.open("r", encoding="utf-8") as f:
                    payload = json.load(f)
            else:
                payload = {"version": 1, "tracks": {}}
            payload.setdefault("version", 1)
            payload.setdefault("tracks", {})
            payload["tracks"][normalized_asset_path] = {
                "bufferDurationSec": round(result["diagnostics"]["duration_sec"], 6),
                "loopStartPct": round(start_pct, 12),
                "loopEndPct": round(end_pct, 12),
                "gridStepPct": round(grid_step_pct, 12),
                "gridDivisions": int(args.grid),
                "targetPauseSec": float(args.pause),
                "analysisSource": "transient-grid-v1",
            }
            write_path.parent.mkdir(parents=True, exist_ok=True)
            with write_path.open("w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
                f.write("\n")
            print(f"Updated loop constraints: {write_path}")
    finally:
        if cleanup and os.path.exists(cleanup):
            os.remove(cleanup)


if __name__ == "__main__":
    main()
