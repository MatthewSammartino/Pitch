import { createContext, useContext, useState } from "react";

// Minimal sound preferences. Currently just an on/off toggle for game SFX.
// Persisted to localStorage so the choice survives reloads.

const STORAGE_KEY = "pitch.soundEnabled";

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Default to true if unset
      if (stored === null) return true;
      return stored === "true";
    } catch {
      return true;
    }
  });

  function update(next) {
    const v = !!next;
    setEnabled(v);
    try { localStorage.setItem(STORAGE_KEY, String(v)); } catch { /* noop */ }
  }

  return (
    <SoundContext.Provider value={{ enabled, setEnabled: update }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    // Fallback so components rendered outside the provider still work.
    return { enabled: true, setEnabled: () => {} };
  }
  return ctx;
}
