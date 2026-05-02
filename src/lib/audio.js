/**
 * Cakery Bakery — Audio System
 * Uses the Web Audio API to synthesize simple sound effects (no external files needed).
 * Background music is generated procedurally via oscillators.
 */

let ctx = null;
let bgmNode = null;
let bgmGain = null;
let currentTrack = null;
let sfxEnabled = true;
let musicEnabled = true;

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

// ── SFX ──────────────────────────────────────────────────────────────────────

function playTone(frequency, duration, type = "sine", volume = 0.3, delay = 0) {
  const c = getCtx();
  if (!c || !sfxEnabled) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime + delay);
  gain.gain.setValueAtTime(volume, c.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration + 0.05);
}

export function playSFX(name) {
  switch (name) {
    case "click":
      playTone(880, 0.08, "square", 0.15);
      break;
    case "correct":
      playTone(523, 0.12, "sine", 0.25);
      playTone(659, 0.12, "sine", 0.25, 0.12);
      playTone(784, 0.2, "sine", 0.3, 0.24);
      break;
    case "incorrect":
      playTone(220, 0.15, "sawtooth", 0.2);
      playTone(180, 0.2, "sawtooth", 0.2, 0.15);
      break;
    case "end_day":
      playTone(392, 0.15, "sine", 0.25);
      playTone(494, 0.15, "sine", 0.25, 0.15);
      playTone(587, 0.15, "sine", 0.25, 0.30);
      playTone(784, 0.35, "sine", 0.3, 0.45);
      break;
    case "money":
      playTone(1047, 0.08, "sine", 0.2);
      playTone(1319, 0.08, "sine", 0.2, 0.09);
      playTone(1568, 0.15, "sine", 0.25, 0.18);
      break;
    case "type":
      // Very soft tick
      playTone(600 + Math.random() * 200, 0.04, "square", 0.06);
      break;
    default:
      break;
  }
}

// ── Background Music ──────────────────────────────────────────────────────────

// Each locale has two variants: slow (menus/dialogue) and fast (active gameplay).
const TRACKS = {
  menu: {
    notes: [261, 329, 392, 329, 261, 329, 392, 523],
    tempo: 0.38,
    type: "sine",
    volume: 0.08,
  },
  // ── Paris ──
  paris: {
    notes: [349, 440, 523, 440, 349, 392, 440, 523],
    tempo: 0.36,
    type: "sine",
    volume: 0.07,
  },
  paris_fast: {
    notes: [349, 523, 440, 659, 523, 440, 392, 523],
    tempo: 0.18,
    type: "sine",
    volume: 0.07,
  },
  // ── Frontier US ──
  frontier_us: {
    notes: [294, 370, 440, 370, 294, 330, 370, 440],
    tempo: 0.38,
    type: "triangle",
    volume: 0.08,
  },
  frontier_us_fast: {
    notes: [294, 440, 370, 494, 440, 370, 330, 440],
    tempo: 0.19,
    type: "triangle",
    volume: 0.08,
  },
  // ── Ming China ──
  ming_china: {
    notes: [330, 370, 415, 494, 415, 370, 330, 294],
    tempo: 0.34,
    type: "sine",
    volume: 0.07,
  },
  ming_china_fast: {
    notes: [330, 415, 494, 415, 370, 494, 415, 330],
    tempo: 0.17,
    type: "sine",
    volume: 0.07,
  },
  // ── London ──
  london: {
    notes: [261, 311, 392, 466, 392, 311, 261, 233],
    tempo: 0.37,
    type: "triangle",
    volume: 0.08,
  },
  london_fast: {
    notes: [261, 392, 466, 392, 311, 466, 392, 261],
    tempo: 0.19,
    type: "triangle",
    volume: 0.08,
  },
};

let arpeggioTimeout = null;
let arpeggioNoteIndex = 0;
let currentArpeggioTrack = null;

function stopArpeggio() {
  if (arpeggioTimeout) {
    clearTimeout(arpeggioTimeout);
    arpeggioTimeout = null;
  }
  if (bgmGain) {
    try {
      bgmGain.gain.setValueAtTime(bgmGain.gain.value, getCtx()?.currentTime || 0);
      bgmGain.gain.linearRampToValueAtTime(0, (getCtx()?.currentTime || 0) + 0.5);
    } catch (e) {}
    bgmGain = null;
  }
  currentArpeggioTrack = null;
  arpeggioNoteIndex = 0;
}

function tickArpeggio(track) {
  const c = getCtx();
  if (!c || !musicEnabled || currentArpeggioTrack !== track) return;

  const cfg = TRACKS[track];
  if (!cfg) return;

  const freq = cfg.notes[arpeggioNoteIndex % cfg.notes.length];
  arpeggioNoteIndex++;

  const osc = c.createOscillator();
  const noteGain = c.createGain();
  osc.connect(noteGain);
  noteGain.connect(c.destination);
  osc.type = cfg.type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  noteGain.gain.setValueAtTime(cfg.volume, c.currentTime);
  noteGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + cfg.tempo * 0.9);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + cfg.tempo);

  arpeggioTimeout = setTimeout(() => tickArpeggio(track), cfg.tempo * 1000);
}

export function playBGM(track) {
  if (!TRACKS[track]) return;
  currentTrack = track; // always remember the last requested track
  if (currentArpeggioTrack === track) return; // already playing
  stopArpeggio();
  if (!musicEnabled) return;
  currentArpeggioTrack = track;
  arpeggioNoteIndex = 0;
  tickArpeggio(track);
}

export function stopBGM() {
  stopArpeggio();
}

/**
 * Switch to the fast (active gameplay) variant of the current locale track.
 * @param {string} localeKey – e.g. "paris", "frontier_us"
 */
export function playFastBGM(localeKey) {
  const fastTrack = `${localeKey}_fast`;
  playBGM(TRACKS[fastTrack] ? fastTrack : localeKey);
}

/**
 * Switch to the slow (menu/dialogue) variant of the current locale track.
 * @param {string} localeKey – e.g. "paris", "frontier_us"
 */
export function playSlowBGM(localeKey) {
  playBGM(localeKey); // base track is always the slow variant
}

export function setMusicEnabled(val) {
  musicEnabled = val;
  if (!val) {
    stopBGM();
  } else {
    // Resume the last known track if one was playing before mute
    if (currentTrack) {
      playBGM(currentTrack);
    }
  }
}

export function setSFXEnabled(val) {
  sfxEnabled = val;
}

export function isMusicEnabled() {
  return musicEnabled;
}

export function isSFXEnabled() {
  return sfxEnabled;
}

// Resume AudioContext on first user interaction (required by browsers)
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") {
    c.resume().catch(() => {});
  }
}