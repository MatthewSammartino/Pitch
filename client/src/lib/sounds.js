// Procedurally synthesized sound effects via Web Audio API. No external
// audio files needed — keeps the bundle small and works offline.
//
// `playCardSound()` produces a short, sharp "snap" suggesting a card hitting
// the table: a white-noise burst (the snap) layered with a low sine pulse
// (the thud).

let ctx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

function ensureRunning(ac) {
  // Browsers create AudioContexts in 'suspended' state until a user gesture.
  // resume() is a no-op if already running. Returns a Promise but we don't
  // need to await it — the next start() will queue once it resolves.
  if (ac.state === "suspended") {
    try { ac.resume(); } catch { /* noop */ }
  }
}

export function playCardSound(volume = 0.35) {
  const ac = getCtx();
  if (!ac) return;
  ensureRunning(ac);

  try {
    const now = ac.currentTime;

    // ── Snap: short high-passed noise burst ────────────────────────────
    const noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      // Exponential decay envelope so the snap fades fast
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 12);
    }
    const noiseSrc = ac.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const noiseFilter = ac.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 2200;

    const noiseGain = ac.createGain();
    noiseGain.gain.value = volume * 0.7;

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ac.destination);
    noiseSrc.start(now);

    // ── Thud: low-frequency click for the "contact" feel ───────────────
    const thudOsc = ac.createOscillator();
    thudOsc.type = "sine";
    thudOsc.frequency.setValueAtTime(160, now);
    thudOsc.frequency.exponentialRampToValueAtTime(60, now + 0.04);

    const thudGain = ac.createGain();
    thudGain.gain.setValueAtTime(volume * 0.6, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    thudOsc.connect(thudGain);
    thudGain.connect(ac.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.07);
  } catch {
    // If audio fails for any reason, silently no-op. Sound is non-critical.
  }
}

// Two-note attention chime (C5 → E5) for "it's your turn".
export function playYourTurnSound(volume = 0.3) {
  const ac = getCtx();
  if (!ac) return;
  ensureRunning(ac);
  try {
    const now = ac.currentTime;
    const notes = [523.25, 659.25]; // C5, E5
    notes.forEach((freq, i) => {
      const t = now + i * 0.12;
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  } catch {
    /* noop */
  }
}

// Light two-note "ding-ding" (G5 → C6) for "you won the trick". Shorter
// and softer than the bid-won arpeggio since it fires once per trick.
export function playWinTrickSound(volume = 0.28) {
  const ac = getCtx();
  if (!ac) return;
  ensureRunning(ac);
  try {
    const now = ac.currentTime;
    const notes = [783.99, 1046.5]; // G5, C6
    notes.forEach((freq, i) => {
      const t = now + i * 0.07;
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.27);
    });
  } catch {
    /* noop */
  }
}

// ── Celebration sounds (variant-selectable) ──────────────────────────
//
// Each event below has multiple variants. The Profile page lets users pick
// a variant per event (or "off"). The dispatcher functions at the bottom
// look up the chosen variant.

// MADE BID — your team's bidder made the bid.
function _madeBid_bell(volume = 0.32) {
  const ac = getCtx();
  if (!ac) return;
  ensureRunning(ac);
  try {
    const now = ac.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const t = now + i * 0.09;
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.52);
    });
  } catch { /* noop */ }
}

function _madeBid_fanfare(volume = 0.3) {
  const ac = getCtx();
  if (!ac) return;
  ensureRunning(ac);
  try {
    const now = ac.currentTime;
    [392, 523.25, 659.25].forEach((freq, i) => {
      const t = now + i * 0.12;
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const filter = ac.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1500;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.6, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  } catch { /* noop */ }
}

// SET OPPONENT — opponent was bidder and failed.
function _setOpponent_boom(volume = 0.45) {
  const ac = getCtx();
  if (!ac) return;
  ensureRunning(ac);
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.32);

    // Click for attack
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.02), ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const ng = ac.createGain();
    ng.gain.value = volume * 0.4;
    src.connect(ng);
    ng.connect(ac.destination);
    src.start(now);
  } catch { /* noop */ }
}

function _setOpponent_horn(volume = 0.28) {
  const ac = getCtx();
  if (!ac) return;
  ensureRunning(ac);
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.5);
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.05);
    gain.gain.setValueAtTime(volume, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  } catch { /* noop */ }
}

// WIN GAME — your team won the whole game.
function _winGame_fanfare(volume = 0.32) {
  const ac = getCtx();
  if (!ac) return;
  ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // Rising arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const t = now + i * 0.12;
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.6, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.47);
    });
    // Sustained final C major chord
    const chordStart = now + 0.6;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq) => {
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0, chordStart);
      gain.gain.linearRampToValueAtTime(volume * 0.45, chordStart + 0.03);
      gain.gain.setValueAtTime(volume * 0.45, chordStart + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 1.2);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(chordStart);
      osc.stop(chordStart + 1.25);
    });
  } catch { /* noop */ }
}

function _winGame_victory(volume = 0.3) {
  const ac = getCtx();
  if (!ac) return;
  ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // I — IV — V — I chord progression (C, F, G, C)
    const chords = [
      [523.25, 659.25, 783.99],
      [698.46, 880,    1046.5],
      [783.99, 987.77, 1174.66],
      [1046.5, 1318.5, 1567.98],
    ];
    chords.forEach((notes, i) => {
      const t = now + i * 0.28;
      const isLast = i === chords.length - 1;
      const dur = isLast ? 1.1 : 0.25;
      notes.forEach((freq) => {
        const osc = ac.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume * 0.5, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      });
    });
  } catch { /* noop */ }
}

// Variant registries — keys are the values stored in localStorage. "off"
// is handled by the dispatcher and means "play nothing for this event".
export const MADE_BID_VARIANTS = {
  bell:    { label: "Bell",     play: _madeBid_bell    },
  fanfare: { label: "Fanfare",  play: _madeBid_fanfare },
};
export const SET_OPPONENT_VARIANTS = {
  boom:    { label: "Boom",     play: _setOpponent_boom },
  horn:    { label: "Air horn", play: _setOpponent_horn },
};
export const WIN_GAME_VARIANTS = {
  fanfare: { label: "Fanfare",  play: _winGame_fanfare  },
  victory: { label: "Victory",  play: _winGame_victory  },
};

export function playMadeBidSound(variant)     { MADE_BID_VARIANTS[variant]?.play?.(); }
export function playSetOpponentSound(variant) { SET_OPPONENT_VARIANTS[variant]?.play?.(); }
export function playWinGameSound(variant)     { WIN_GAME_VARIANTS[variant]?.play?.(); }

// Quick ascending arpeggio (C-E-G-C) for "you won the bid".
export function playWinBidSound(volume = 0.32) {
  const ac = getCtx();
  if (!ac) return;
  ensureRunning(ac);
  try {
    const now = ac.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const t = now + i * 0.08;
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    });
  } catch {
    /* noop */
  }
}
