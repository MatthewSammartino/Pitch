import { createContext, useContext, useState } from "react";

// Celebration-video preferences. Master `enabled` switch silences all
// overlays. Per-event "variant" preferences let users pick which video
// plays for won-game / set-opponent / took-jack — or "off" to silence
// just that event.
//
// All persisted to localStorage so choices survive reloads. Per-browser,
// not synced across devices. Mirrors SoundContext.

const KEYS = {
  enabled:     "pitch.video.enabled",
  setOpponent: "pitch.video.setOpponent",
  winGame:     "pitch.video.winGame",
  tookJack:    "pitch.video.tookJack",
};

// Defaults. Each event defaults to a registered key so a video plays as
// soon as the matching MP4 is dropped in — user doesn't have to touch
// settings first.
const DEFAULTS = {
  setOpponent: "strike",
  winGame:     "fireworks",
  tookJack:    "jackpot",
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
  try { return localStorage.getItem(key) ?? fallback; }
  catch { return fallback; }
}
function writeStr(key, val)  { try { localStorage.setItem(key, val); }       catch { /* noop */ } }
function writeBool(key, val) { try { localStorage.setItem(key, String(val)); } catch { /* noop */ } }

const VideoContext = createContext(null);

export function VideoProvider({ children }) {
  // Default ON so new users see the celebration out of the box (per the
  // user's choice during planning).
  const [enabled, setEnabledRaw] = useState(() => readBool(KEYS.enabled, true));
  const [setOpponentVariant, setSetOpponentRaw] = useState(() => readStr(KEYS.setOpponent, DEFAULTS.setOpponent));
  const [winGameVariant,     setWinGameRaw]     = useState(() => readStr(KEYS.winGame,     DEFAULTS.winGame));
  const [tookJackVariant,    setTookJackRaw]    = useState(() => readStr(KEYS.tookJack,    DEFAULTS.tookJack));

  const setEnabled            = (v) => { setEnabledRaw(!!v); writeBool(KEYS.enabled, !!v); };
  const setSetOpponentVariant = (v) => { setSetOpponentRaw(v); writeStr(KEYS.setOpponent, v); };
  const setWinGameVariant     = (v) => { setWinGameRaw(v);     writeStr(KEYS.winGame,     v); };
  const setTookJackVariant    = (v) => { setTookJackRaw(v);    writeStr(KEYS.tookJack,    v); };

  return (
    <VideoContext.Provider
      value={{
        enabled, setEnabled,
        setOpponentVariant, setSetOpponentVariant,
        winGameVariant,     setWinGameVariant,
        tookJackVariant,    setTookJackVariant,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const ctx = useContext(VideoContext);
  if (!ctx) {
    return {
      enabled: true, setEnabled: () => {},
      setOpponentVariant: DEFAULTS.setOpponent, setSetOpponentVariant: () => {},
      winGameVariant:     DEFAULTS.winGame,     setWinGameVariant:     () => {},
      tookJackVariant:    DEFAULTS.tookJack,    setTookJackVariant:    () => {},
    };
  }
  return ctx;
}
