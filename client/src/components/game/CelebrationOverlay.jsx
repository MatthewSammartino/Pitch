import { useEffect, useRef, useState } from "react";

// Full-screen celebration video overlay. Renders only when `src` is non-null.
// Auto-dismisses on video end OR after MAX_DURATION_MS, whichever comes first.
// Click anywhere on the backdrop dismisses early.
//
// zIndex 500 sits above:
//   - RoundSummaryModal (300)
//   - GameOverModal     (400)
// so the celebration takes precedence while it's playing.
//
// Video is muted by default so its audio doesn't compete with the SFX
// (per user choice: sound + video play together).

const FADE_IN_MS  = 150;
const FADE_OUT_MS = 200;
const MAX_DURATION_MS = 4000;

export default function CelebrationOverlay({ src, onDone }) {
  const [phase, setPhase] = useState("hidden"); // hidden | in | shown | out
  const videoRef = useRef(null);
  const timersRef = useRef({ cap: null, out: null });

  useEffect(() => {
    if (!src) {
      setPhase("hidden");
      return;
    }
    setPhase("in");
    // Tick to "shown" after fade-in completes.
    const tIn = setTimeout(() => setPhase("shown"), FADE_IN_MS);

    // Hard cap on visible duration.
    timersRef.current.cap = setTimeout(() => beginDismiss(), MAX_DURATION_MS);

    return () => {
      clearTimeout(tIn);
      clearTimeout(timersRef.current.cap);
      clearTimeout(timersRef.current.out);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function beginDismiss() {
    clearTimeout(timersRef.current.cap);
    clearTimeout(timersRef.current.out);
    setPhase("out");
    timersRef.current.out = setTimeout(() => {
      setPhase("hidden");
      if (onDone) onDone();
    }, FADE_OUT_MS);
  }

  if (!src || phase === "hidden") return null;

  const opacity = phase === "in" ? 0 : phase === "out" ? 0 : 1;

  return (
    <div
      onClick={beginDismiss}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transition: `opacity ${phase === "in" ? FADE_IN_MS : FADE_OUT_MS}ms ease`,
        cursor: "pointer",
      }}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        playsInline
        onEnded={beginDismiss}
        // If the file 404s or fails to decode, just dismiss so we don't
        // leave a black square stuck on screen.
        onError={beginDismiss}
        style={{
          maxWidth: "80vw",
          maxHeight: "80vh",
          borderRadius: 12,
          boxShadow: "0 8px 40px rgba(0,0,0,.7)",
          background: "#000",
        }}
      />
    </div>
  );
}
