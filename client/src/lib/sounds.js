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

// ── More MADE BID variants ───────────────────────────────────────────
function _madeBid_kaching(volume = 0.32) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // High bell
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 1568; // G6
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now); osc.stop(now + 0.6);
    // Cash-register click via short noise
    const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.03), ac.sampleRate);
    const data = nb.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 18);
    }
    const ns = ac.createBufferSource(); ns.buffer = nb;
    const nf = ac.createBiquadFilter(); nf.type = "highpass"; nf.frequency.value = 4000;
    const ng = ac.createGain(); ng.gain.value = volume * 0.5;
    ns.connect(nf); nf.connect(ng); ng.connect(ac.destination);
    ns.start(now);
  } catch { /* noop */ }
}

function _madeBid_whistle(volume = 0.28) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.28);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.04);
    g.gain.setValueAtTime(volume, now + 0.22);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now); osc.stop(now + 0.34);
  } catch { /* noop */ }
}

function _madeBid_power(volume = 0.32) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // Three-note triad stab (sawtooth + lowpass)
    const notes = [196, 261.63, 329.63]; // G3, C4, E4
    notes.forEach((freq) => {
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const filter = ac.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1100;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(volume * 0.45, now + 0.015);
      g.gain.setValueAtTime(volume * 0.45, now + 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(filter); filter.connect(g); g.connect(ac.destination);
      osc.start(now); osc.stop(now + 0.38);
    });
  } catch { /* noop */ }
}

function _madeBid_twinkle(volume = 0.28) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // Fast 8-bit-style ascending arp (square waves)
    const notes = [659.25, 783.99, 987.77, 1318.5, 1567.98]; // E5 G5 B5 E6 G6
    notes.forEach((freq, i) => {
      const t = now + i * 0.05;
      const osc = ac.createOscillator();
      osc.type = "square";
      osc.frequency.value = freq;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(volume * 0.4, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g); g.connect(ac.destination);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch { /* noop */ }
}

// ── More SET OPPONENT variants ───────────────────────────────────────
function _setOpponent_sadtrombone(volume = 0.3) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // 4 descending notes, each pitch-bending down at the end
    const notes = [
      { f: 311.13, t: 0 },     // Eb4
      { f: 277.18, t: 0.18 },  // Db4
      { f: 246.94, t: 0.36 },  // B3
      { f: 207.65, t: 0.56, sustain: true }, // Ab3, longer
    ];
    notes.forEach(({ f, t, sustain }) => {
      const start = now + t;
      const dur = sustain ? 0.7 : 0.18;
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, start);
      // Slight downward bend to give the "wah" character
      osc.frequency.linearRampToValueAtTime(f * 0.92, start + dur);
      const filter = ac.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1000;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(volume * 0.5, start + 0.015);
      g.gain.setValueAtTime(volume * 0.5, start + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(filter); filter.connect(g); g.connect(ac.destination);
      osc.start(start); osc.stop(start + dur + 0.05);
    });
  } catch { /* noop */ }
}

function _setOpponent_hammer(volume = 0.45) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // Heavy low thump
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.18);
    const g = ac.createGain();
    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now); osc.stop(now + 0.24);
    // High click on the impact
    const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.012), ac.sampleRate);
    const data = nb.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const ns = ac.createBufferSource(); ns.buffer = nb;
    const nf = ac.createBiquadFilter(); nf.type = "highpass"; nf.frequency.value = 3500;
    const ng = ac.createGain(); ng.gain.value = volume * 0.6;
    ns.connect(nf); nf.connect(ng); ng.connect(ac.destination);
    ns.start(now);
  } catch { /* noop */ }
}

function _setOpponent_buzzer(volume = 0.3) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // 200 Hz square wave for ~0.4s (game-show wrong-answer)
    const osc = ac.createOscillator();
    osc.type = "square";
    osc.frequency.value = 200;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.01);
    g.gain.setValueAtTime(volume, now + 0.36);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(filter); filter.connect(g); g.connect(ac.destination);
    osc.start(now); osc.stop(now + 0.44);
  } catch { /* noop */ }
}

function _setOpponent_scratch(volume = 0.3) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // White noise + filter-frequency sweep for vinyl scratch feel
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.35), ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.linearRampToValueAtTime(600, now + 0.12);
    filter.frequency.linearRampToValueAtTime(2200, now + 0.22);
    filter.frequency.linearRampToValueAtTime(400, now + 0.32);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    src.connect(filter); filter.connect(g); g.connect(ac.destination);
    src.start(now);
  } catch { /* noop */ }
}

// ── More WIN GAME variants ───────────────────────────────────────────
function _winGame_anthem(volume = 0.3) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // Simple memorable 8-note phrase (Ode-to-Joy-ish)
    // E E F G G F E D C C D E E D D
    const seq = [
      { f: 659.25, d: 0.22 }, // E5
      { f: 659.25, d: 0.22 },
      { f: 698.46, d: 0.22 }, // F5
      { f: 783.99, d: 0.22 }, // G5
      { f: 783.99, d: 0.22 },
      { f: 698.46, d: 0.22 },
      { f: 659.25, d: 0.22 },
      { f: 587.33, d: 0.45 }, // D5 longer
    ];
    let cursor = 0;
    seq.forEach(({ f, d }) => {
      const t = now + cursor;
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(volume * 0.5, t + 0.02);
      g.gain.setValueAtTime(volume * 0.5, t + d * 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      osc.connect(g); g.connect(ac.destination);
      osc.start(t); osc.stop(t + d + 0.03);
      cursor += d * 0.95;
    });
  } catch { /* noop */ }
}

function _winGame_drumroll(volume = 0.4) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // Rolling noise bursts crescendo (~0.7s)
    const rollDur = 0.7;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * rollDur), ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      // Tremolo (rapid pulsing) + crescendo envelope
      const tremolo = 0.5 + 0.5 * Math.sin(t * Math.PI * 60);
      const env = Math.pow(t, 0.6); // crescendo
      data[i] = (Math.random() * 2 - 1) * tremolo * env;
    }
    const src = ac.createBufferSource(); src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 1.5;
    const g = ac.createGain(); g.gain.value = volume * 0.7;
    src.connect(filter); filter.connect(g); g.connect(ac.destination);
    src.start(now);

    // Cymbal crash (white noise highpass) + held chord at the end
    const crashStart = now + rollDur;
    const cn = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.6), ac.sampleRate);
    const cd = cn.getChannelData(0);
    for (let i = 0; i < cd.length; i++) {
      const t = i / cd.length;
      cd[i] = (Math.random() * 2 - 1) * Math.exp(-t * 3);
    }
    const cs = ac.createBufferSource(); cs.buffer = cn;
    const cf = ac.createBiquadFilter(); cf.type = "highpass"; cf.frequency.value = 5000;
    const cg = ac.createGain(); cg.gain.value = volume * 0.6;
    cs.connect(cf); cf.connect(cg); cg.connect(ac.destination);
    cs.start(crashStart);

    [523.25, 659.25, 783.99].forEach((freq) => {
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const cg2 = ac.createGain();
      cg2.gain.setValueAtTime(0, crashStart);
      cg2.gain.linearRampToValueAtTime(volume * 0.4, crashStart + 0.03);
      cg2.gain.setValueAtTime(volume * 0.4, crashStart + 0.5);
      cg2.gain.exponentialRampToValueAtTime(0.001, crashStart + 1.1);
      osc.connect(cg2); cg2.connect(ac.destination);
      osc.start(crashStart); osc.stop(crashStart + 1.15);
    });
  } catch { /* noop */ }
}

function _winGame_belltower(volume = 0.32) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // Four bells in sequence, each sustained, overlapping decay
    const notes = [392, 523.25, 659.25, 783.99]; // G4 C5 E5 G5
    notes.forEach((f, i) => {
      const t = now + i * 0.22;
      // Two oscillators per bell for richer tone (fundamental + 5th)
      [f, f * 1.5].forEach((freq, j) => {
        const osc = ac.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ac.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(volume * (j === 0 ? 0.5 : 0.2), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
        osc.connect(g); g.connect(ac.destination);
        osc.start(t); osc.stop(t + 1.45);
      });
    });
  } catch { /* noop */ }
}

function _winGame_triumph(volume = 0.32) {
  const ac = getCtx(); if (!ac) return; ensureRunning(ac);
  try {
    const now = ac.currentTime;
    // Lower brass quartet stabs ascending I → V → I, with a sustained final
    const chords = [
      { notes: [261.63, 329.63, 392], t: 0,    dur: 0.3 },  // C major (low)
      { notes: [392, 493.88, 587.33], t: 0.32, dur: 0.3 },  // G major
      { notes: [523.25, 659.25, 783.99, 1046.5], t: 0.65, dur: 1.2 }, // C major (high, sustained)
    ];
    chords.forEach(({ notes, t, dur }) => {
      const start = now + t;
      notes.forEach((freq) => {
        const osc = ac.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = freq;
        const filter = ac.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1500;
        const g = ac.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(volume * 0.35, start + 0.025);
        g.gain.setValueAtTime(volume * 0.35, start + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(filter); filter.connect(g); g.connect(ac.destination);
        osc.start(start); osc.stop(start + dur + 0.05);
      });
    });
  } catch { /* noop */ }
}

// ── File-backed sound playback ───────────────────────────────────────
// File-based variants point at MP3s under client/public/sounds/. Vite
// serves /sounds/<event>/<key>.mp3 at runtime. Drop in CC0 clips from
// Pixabay/Mixkit/Freesound following the names below; if a file is
// missing the play() silently no-ops (no JS error).
function playFileSound(path, volume = 0.55) {
  if (typeof window === "undefined") return;
  try {
    const a = new Audio(path);
    a.volume = volume;
    // Browsers reject autoplay before user gesture; ignore that and any
    // 404 errors so the rest of the UI keeps working.
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch { /* noop */ }
}

// Variant registries — keys are the values stored in localStorage. "off"
// is handled by the dispatcher and means "play nothing for this event".
// A variant has either a `play` (synth) or `file` (mp3). Dispatcher routes.
export const MADE_BID_VARIANTS = {
  bell:     { label: "Bell",        play: _madeBid_bell    },
  fanfare:  { label: "Fanfare",     play: _madeBid_fanfare },
  kaching:  { label: "Ka-ching",    play: _madeBid_kaching },
  whistle:  { label: "Whistle",     play: _madeBid_whistle },
  power:    { label: "Power chord", play: _madeBid_power   },
  twinkle:  { label: "Twinkle",     play: _madeBid_twinkle },
  applause: { label: "Applause (file)", file: "/sounds/made-bid/applause.mp3" },
  cheer:    { label: "Cheer (file)",    file: "/sounds/made-bid/cheer.mp3"    },
  coin:     { label: "Coin (file)",     file: "/sounds/made-bid/coin.mp3"     },
};
export const SET_OPPONENT_VARIANTS = {
  boom:        { label: "Boom",         play: _setOpponent_boom },
  horn:        { label: "Air horn",     play: _setOpponent_horn },
  sadtrombone: { label: "Sad trombone", play: _setOpponent_sadtrombone },
  hammer:      { label: "Hammer",       play: _setOpponent_hammer },
  buzzer:      { label: "Buzzer",       play: _setOpponent_buzzer },
  scratch:     { label: "Scratch",      play: _setOpponent_scratch },
  airhornReal: { label: "Air horn (file)",     file: "/sounds/set-opponent/airhorn-real.mp3" },
  trombone:    { label: "Sad trombone (file)", file: "/sounds/set-opponent/sad-trombone.mp3" },
  aww:         { label: "Crowd aww (file)",    file: "/sounds/set-opponent/crowd-aww.mp3"    },
};
export const WIN_GAME_VARIANTS = {
  fanfare:        { label: "Fanfare",     play: _winGame_fanfare   },
  victory:        { label: "Victory",     play: _winGame_victory   },
  anthem:         { label: "Anthem",      play: _winGame_anthem    },
  drumroll:       { label: "Drum roll",   play: _winGame_drumroll  },
  belltower:      { label: "Bell tower",  play: _winGame_belltower },
  triumph:        { label: "Triumph",     play: _winGame_triumph   },
  crowdCheer:     { label: "Crowd cheer (file)",      file: "/sounds/won-game/crowd-cheer.mp3"     },
  victoryFanfare: { label: "Victory fanfare (file)",  file: "/sounds/won-game/victory-fanfare.mp3" },
  champion:       { label: "Champion (file)",         file: "/sounds/won-game/champion.mp3"        },
};

function dispatch(variants, key) {
  const v = variants[key];
  if (!v) return;
  if (v.file) return playFileSound(v.file);
  if (v.play) return v.play();
}

export function playMadeBidSound(variant)     { dispatch(MADE_BID_VARIANTS,     variant); }
export function playSetOpponentSound(variant) { dispatch(SET_OPPONENT_VARIANTS, variant); }
export function playWinGameSound(variant)     { dispatch(WIN_GAME_VARIANTS,     variant); }

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
