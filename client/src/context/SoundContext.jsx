import { createContext, useContext, useState } from "react";

// Sound preferences. The master `enabled` switch silences everything.
// Per-event "variant" preferences let users pick a celebration sound for
// won-game / made-bid / set-opponent — or "off" to silence just that event.
//
// All persisted to localStorage so choices survive reloads. Per-browser,
// not synced across devices.

const KEYS = {
  enabled:        "pitch.soundEnabled",
  madeBid:        "pitch.sound.madeBid",
  setOpponent:    "pitch.sound.setOpponent",
  winGame:        "pitch.sound.winGame",
};

// Defaults. "off" hides the sound for that event without disabling everything.
const DEFAULTS = {
  madeBid:     "bell",
  setOpponent: "boom",
  winGame:     "fanfare",
};

function readBool(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "true";
  } catch {
    return fallback;
  }
}
function readStr(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeStr(key, val) {
  try { localStorage.setItem(key, val); } catch { /* noop */ }
}
function writeBool(key, val) {
  try { localStorage.setItem(key, String(val)); } catch { /* noop */ }
}

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const [enabled, setEnabledRaw] = useState(() => readBool(KEYS.enabled, true));
  const [madeBidVariant, setMadeBidRaw]         = useState(() => readStr(KEYS.madeBid,     DEFAULTS.madeBid));
  const [setOpponentVariant, setSetOpponentRaw] = useState(() => readStr(KEYS.setOpponent, DEFAULTS.setOpponent));
  const [winGameVariant, setWinGameRaw]         = useState(() => readStr(KEYS.winGame,     DEFAULTS.winGame));

  const setEnabled = (v) => { setEnabledRaw(!!v); writeBool(KEYS.enabled, !!v); };
  const setMadeBidVariant     = (v) => { setMadeBidRaw(v);     writeStr(KEYS.madeBid,     v); };
  const setSetOpponentVariant = (v) => { setSetOpponentRaw(v); writeStr(KEYS.setOpponent, v); };
  const setWinGameVariant     = (v) => { setWinGameRaw(v);     writeStr(KEYS.winGame,     v); };

  return (
    <SoundContext.Provider
      value={{
        enabled, setEnabled,
        madeBidVariant,     setMadeBidVariant,
        setOpponentVariant, setSetOpponentVariant,
        winGameVariant,     setWinGameVariant,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    return {
      enabled: true, setEnabled: () => {},
      madeBidVariant:     DEFAULTS.madeBid,     setMadeBidVariant:     () => {},
      setOpponentVariant: DEFAULTS.setOpponent, setSetOpponentVariant: () => {},
      winGameVariant:     DEFAULTS.winGame,     setWinGameVariant:     () => {},
    };
  }
  return ctx;
}
