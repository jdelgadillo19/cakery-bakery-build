function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const idx = clamp(Math.floor(q * (sorted.length - 1)), 0, sorted.length - 1);
  return sorted[idx];
}

function movingAverage(values, radius) {
  if (!values.length || radius <= 0) return values.slice();
  const out = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    const from = Math.max(0, i - radius);
    const to = Math.min(values.length - 1, i + radius);
    for (let j = from; j <= to; j++) {
      sum += values[j];
      count++;
    }
    out[i] = sum / count;
  }
  return out;
}

function buildEnvelopeFromBuffer(buffer, hop) {
  const channelCount = buffer.numberOfChannels;
  const length = buffer.length;
  const channels = [];
  for (let c = 0; c < channelCount; c++) channels.push(buffer.getChannelData(c));

  const env = [];
  for (let i = 0; i < length; i += hop) {
    const end = Math.min(i + hop, length);
    let sum = 0;
    let count = 0;
    for (let s = i; s < end; s++) {
      let mono = 0;
      for (let c = 0; c < channelCount; c++) mono += Math.abs(channels[c][s]);
      sum += mono / channelCount;
      count++;
    }
    env.push(count > 0 ? sum / count : 0);
  }
  return env;
}

function findFirstRun(values, startIdx, predicate, minRunBins) {
  let i = clamp(startIdx, 0, values.length - 1);
  while (i < values.length) {
    if (!predicate(values[i])) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < values.length && predicate(values[j])) j++;
    if (j - i >= minRunBins) return { start: i, end: j };
    i = j;
  }
  return null;
}

export function analyzeLoopPoints(buffer, opts = {}) {
  const sampleRate = buffer.sampleRate;
  const duration = buffer.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    return { start: 0, end: 0, duration };
  }

  const targetPauseSec = opts.targetPauseSec ?? 0.5;
  const gridDivisions = opts.gridDivisions ?? 384;
  const hop = opts.hopSamples ?? 256;
  const smoothRadius = opts.smoothRadius ?? 2;
  const minTailSilenceSec = opts.minTailSilenceSec ?? 0.2;

  const rawEnv = buildEnvelopeFromBuffer(buffer, hop);
  const env = movingAverage(rawEnv, smoothRadius);
  const sorted = env.slice().sort((a, b) => a - b);
  const floor = quantile(sorted, 0.1);
  const peak = quantile(sorted, 0.995);

  const transientThreshold = Math.max(floor * 3.5, peak * 0.012);
  const silenceThreshold = Math.max(floor * 1.8, peak * 0.004);

  const firstAudible = env.findIndex((v) => v >= transientThreshold);
  const lastAudible = (() => {
    for (let i = env.length - 1; i >= 0; i--) {
      if (env[i] >= transientThreshold) return i;
    }
    return -1;
  })();

  if (firstAudible < 0 || lastAudible < 0 || lastAudible <= firstAudible) {
    return { start: 0, end: duration, duration };
  }

  const startSec = (firstAudible * hop) / sampleRate;
  const audibleEndSec = ((lastAudible + 1) * hop) / sampleRate;
  const musicalSpan = Math.max(0.05, audibleEndSec - startSec);
  const gridStep = musicalSpan / Math.max(1, gridDivisions);
  const minRunBins = Math.max(1, Math.ceil((minTailSilenceSec * sampleRate) / hop));

  const tailRun = findFirstRun(
    env,
    Math.max(0, Math.floor((audibleEndSec * sampleRate) / hop)),
    (v) => v < silenceThreshold,
    minRunBins,
  );

  const tailStartSec = tailRun ? (tailRun.start * hop) / sampleRate : audibleEndSec;
  const desiredEndSec = tailStartSec + targetPauseSec;

  // Snap loop end to a normalized grid anchored at the transient start.
  // Try neighboring grid cells and pick the one with pause closest to target.
  const rawIndex = (desiredEndSec - startSec) / gridStep;
  const candidateIndices = [Math.floor(rawIndex), Math.round(rawIndex), Math.ceil(rawIndex)]
    .map((k) => Math.max(1, k));
  let best = null;
  for (const gridIndex of candidateIndices) {
    let candidateEnd = startSec + gridIndex * gridStep;
    candidateEnd = Math.max(audibleEndSec, candidateEnd);
    candidateEnd = Math.min(duration, candidateEnd);
    const pause = Math.max(0, candidateEnd - tailStartSec);
    const err = Math.abs(pause - targetPauseSec);
    if (!best || err < best.err) {
      best = { gridIndex, candidateEnd, err, pause };
    }
  }
  const gridIndex = best?.gridIndex ?? 1;
  const loopEndSec = best?.candidateEnd ?? Math.min(duration, Math.max(audibleEndSec, desiredEndSec));

  return {
    start: startSec,
    end: loopEndSec,
    duration,
    diagnostics: {
      floor,
      peak,
      transientThreshold,
      silenceThreshold,
      audibleEndSec,
      tailStartSec,
      desiredEndSec,
      gridStep,
      gridIndex,
      impliedPauseSec: best?.pause ?? Math.max(0, loopEndSec - tailStartSec),
    },
  };
}
