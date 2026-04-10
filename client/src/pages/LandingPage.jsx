import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";
import TutorialBanner from "../components/TutorialBanner";

const S = {
  page: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  title: {
    fontFamily: "'Playfair Display',serif",
    fontSize: "clamp(36px,7vw,72px)",
    color: "#f0c040",
    margin: "0 0 12px",
    textShadow: "0 2px 20px rgba(240,192,64,.3)",
    letterSpacing: 2,
    textAlign: "center",
  },
  subtitle: {
    color: "#8aab8a",
    fontSize: 16,
    margin: "0 0 48px",
    textAlign: "center",
    maxWidth: 480,
    lineHeight: 1.6,
  },
  signInBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    color: "#3c4043",
    border: "none",
    borderRadius: 8,
    padding: "14px 28px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 2px 12px rgba(0,0,0,.4)",
    transition: "box-shadow .15s",
  },
  features: {
    display: "flex",
    gap: 32,
    marginTop: 64,
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: 760,
  },
  featureCard: {
    background: "rgba(255,255,255,.03)",
    border: "1px solid #1e4a1e",
    borderRadius: 12,
    padding: "20px 24px",
    maxWidth: 220,
    textAlign: "center",
  },
  featureIcon: { fontSize: 28, marginBottom: 10 },
  featureTitle: { color: "#f0e8d0", fontWeight: 700, marginBottom: 6, fontSize: 15 },
  featureDesc: { color: "#5a7a5a", fontSize: 13, lineHeight: 1.5 },
};

export default function LandingPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [guestOpen, setGuestOpen]   = useState(false);
  const [guestName, setGuestName]   = useState("");
  const [guestBusy, setGuestBusy]   = useState(false);
  const [guestError, setGuestError] = useState("");

  // If already signed in, go to dashboard
  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  function handleGuestPlay() {
    const name = guestName.trim();
    if (!name) { setGuestError("Enter a display name."); return; }
    setGuestBusy(true);
    setGuestError("");
    api.post("/api/auth/guest", { displayName: name })
      .then((u) => { setUser(u); navigate("/dashboard"); })
      .catch((err) => {
        setGuestError(err.message || "Something went wrong.");
        setGuestBusy(false);
      });
  }

  if (loading) return null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)", color: "#e8dfc8", fontFamily: "'Georgia',serif" }}>
      <Navbar />
      <div style={S.page}>
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 8 }}>
        <TutorialBanner />
      </div>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🃏</div>
      <h1 style={S.title}>Pitch</h1>
      <p style={S.subtitle}>
        Play 5-point Pitch online with your friends. Track every hand,
        follow the stats, and settle up at the end of the night.
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <a href="/api/auth/google" style={S.signInBtn}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
            <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
            <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
            <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
          </svg>
          Sign in with Google
        </a>

        <div style={{ color: "#3a5a3a", fontSize: 13 }}>or</div>

        {!guestOpen ? (
          <button
            onClick={() => setGuestOpen(true)}
            style={{
              background: "transparent", border: "1px solid #2a5c2a",
              borderRadius: 8, padding: "10px 24px",
              color: "#8aab8a", fontSize: 14, cursor: "pointer",
              fontFamily: "Georgia,serif",
            }}
          >
            Play as Guest
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <input
              autoFocus
              placeholder="Your display name"
              value={guestName}
              onChange={(e) => { setGuestName(e.target.value); setGuestError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleGuestPlay()}
              maxLength={30}
              style={{
                background: "rgba(255,255,255,.05)", border: "1px solid #2a5c2a",
                borderRadius: 8, padding: "10px 16px",
                color: "#e8dfc8", fontFamily: "Georgia,serif",
                fontSize: 14, outline: "none", width: 220,
                textAlign: "center",
              }}
            />
            {guestError && (
              <div style={{ color: "#e05c5c", fontSize: 12 }}>{guestError}</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleGuestPlay}
                disabled={guestBusy}
                style={{
                  padding: "8px 20px", borderRadius: 8,
                  border: "1px solid #2a5c2a", background: "transparent",
                  color: "#8aab8a", fontSize: 13, cursor: "pointer",
                  fontFamily: "Georgia,serif", opacity: guestBusy ? 0.5 : 1,
                }}
              >
                {guestBusy ? "Joining…" : "Play →"}
              </button>
              <button
                onClick={() => { setGuestOpen(false); setGuestName(""); setGuestError(""); }}
                style={{
                  padding: "8px 14px", borderRadius: 8,
                  border: "1px solid #1e3a1e", background: "transparent",
                  color: "#3a5a3a", fontSize: 13, cursor: "pointer",
                  fontFamily: "Georgia,serif",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={S.features}>
        {[
          { icon: "🎮", title: "Play Online", desc: "4-player or 6-player games with friends in real time" },
          { icon: "📊", title: "Track Stats", desc: "Win rates, PPG, clutch rate and more for every player" },
          { icon: "👥", title: "Friend Groups", desc: "Create a group and share your game history together" },
        ].map((f) => (
          <div key={f.title} style={S.featureCard}>
            <div style={S.featureIcon}>{f.icon}</div>
            <div style={S.featureTitle}>{f.title}</div>
            <div style={S.featureDesc}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
