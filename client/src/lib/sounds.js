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
