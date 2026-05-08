import { createContext, useContext, useState } from "react";

// User-configurable suit color schemes. Stored in localStorage so the choice
// persists per-browser without requiring a DB column. Guests get the same
// experience as logged-in users.
//
// Modes:
//   classic    — traditional black for ♠/♣, red for ♥/♦
//   fourcolor  — distinct color per suit (helps tell ♠ from ♣ and ♥ from ♦
//                in a fanned hand). Common in poker rooms / accessibility.

const STORAGE_KEY = "pitch.suitColorMode";

export const SUIT_COLOR_MODES = {
  classic: {
    label: "Classic",
    description: "Black ♠♣, red ♥♦",
    colors: { h: "#c11414", d: "#c11414", c: "#1a1a1a", s: "#1a1a1a" },
  },
  fourcolor: {
    label: "Four-color",
    description: "Black ♠, red ♥, blue ♦, green ♣",
    colors: { h: "#c11414", d: "#1a5cb8", c: "#1a7a3a", s: "#1a1a1a" },
  },
};

const DEFAULT_MODE = "classic";

const SuitColorContext = createContext(null);

export function SuitColorProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return SUIT_COLOR_MODES[stored] ? stored : DEFAULT_MODE;
    } catch {
      return DEFAULT_MODE;
    }
  });

  function updateMode(next) {
    if (!SUIT_COLOR_MODES[next]) return;
    setMode(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* noop */ }
  }

  const colors = SUIT_COLOR_MODES[mode]?.colors ?? SUIT_COLOR_MODES[DEFAULT_MODE].colors;

  return (
    <SuitColorContext.Provider value={{ mode, setMode: updateMode, colors }}>
      {children}
    </SuitColorContext.Provider>
  );
}

export function useSuitColors() {
  const ctx = useContext(SuitColorContext);
  if (!ctx) {
    // Fallback: components rendered outside the provider get classic colors.
    // Avoids hard crashes during testing or partial-tree rendering.
    return { mode: DEFAULT_MODE, setMode: () => {}, colors: SUIT_COLOR_MODES[DEFAULT_MODE].colors };
  }
  return ctx;
}
