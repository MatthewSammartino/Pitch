// Celebration video registries — parallel to lib/sounds.js. Videos are
// always file-backed (no procedural variants); each variant maps to a path
// under client/public/videos/ which Vite serves at /videos/<event>/<key>.mp3.
//
// If a registered file is missing the <video> element fails to load and
// the overlay silently dismisses — no JS error.

export const SET_OPPONENT_VIDEOS = {
  strike:    { label: "Strike",     file: "/videos/set-opponent/strike.mp4"    },
  explosion: { label: "Explosion",  file: "/videos/set-opponent/explosion.mp4" },
  doh:       { label: "D'oh",       file: "/videos/set-opponent/doh.mp4"       },
};

export const WIN_GAME_VIDEOS = {
  fireworks: { label: "Fireworks",  file: "/videos/won-game/fireworks.mp4" },
  trophy:    { label: "Trophy",     file: "/videos/won-game/trophy.mp4"    },
  confetti:  { label: "Confetti",   file: "/videos/won-game/confetti.mp4"  },
};

// Jack and off-jack share one registry (both events trigger the same video
// pool). One variant choice covers both.
export const TOOK_JACK_VIDEOS = {
  jackpot:  { label: "Jackpot",    file: "/videos/took-jack/jackpot.mp4"  },
  coinrain: { label: "Coin rain",  file: "/videos/took-jack/coinrain.mp4" },
  dance:    { label: "Dance",      file: "/videos/took-jack/dance.mp4"    },
};

export function getVideoSrc(event, key) {
  if (!key || key === "off") return null;
  let registry;
  switch (event) {
    case "setOpponent": registry = SET_OPPONENT_VIDEOS; break;
    case "winGame":     registry = WIN_GAME_VIDEOS;     break;
    case "tookJack":    registry = TOOK_JACK_VIDEOS;    break;
    default: return null;
  }
  return registry[key]?.file ?? null;
}
