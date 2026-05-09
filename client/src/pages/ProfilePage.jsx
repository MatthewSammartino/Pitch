import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";
import Card from "../components/game/Card";
import { useSuitColors, SUIT_COLOR_MODES } from "../context/SuitColorContext";
import { useSound } from "../context/SoundContext";
import { useVideo } from "../context/VideoContext";
import {
  playCardSound, playYourTurnSound, playWinBidSound, playWinTrickSound,
  playMadeBidSound, playSetOpponentSound, playWinGameSound,
  MADE_BID_VARIANTS, SET_OPPONENT_VARIANTS, WIN_GAME_VARIANTS,
  stopAllPreviewSounds,
} from "../lib/sounds";
import {
  SET_OPPONENT_VIDEOS, WIN_GAME_VIDEOS, TOOK_JACK_VIDEOS,
  getVideoSrc,
} from "../lib/videos";
import CelebrationOverlay from "../components/game/CelebrationOverlay";

// Wrap a play function so it stops any currently playing preview before
// starting the new one. Used for the Profile-page audition buttons.
const preview = (fn) => () => { stopAllPreviewSounds(); fn(); };

const LEGACY_NAMES = ["matt", "seth", "mack", "arnav", "henry"];

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
    color: "#e8dfc8",
    fontFamily: "'Georgia',serif",
  },
  body: { maxWidth: 600, margin: "0 auto", padding: "36px 20px" },
  title: {
    fontFamily: "'Playfair Display',serif",
    color: "#f0e8d0", fontSize: 28, margin: "0 0 32px",
  },
  card: {
    background: "rgba(255,255,255,.03)",
    border: "1px solid #1e4a1e",
    borderRadius: 12, padding: "22px 24px", marginBottom: 20,
  },
  cardTitle: {
    fontFamily: "'Playfair Display',serif",
    color: "#f0c040", fontSize: 16, margin: "0 0 16px",
  },
  label: {
    color: "#5a7a5a", fontSize: 11, fontFamily: "monospace",
    letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6,
  },
  input: {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,.06)", border: "1px solid #2a4a2a",
    borderRadius: 8, padding: "9px 12px", color: "#e8dfc8",
    fontSize: 14, fontFamily: "Georgia,serif", outline: "none", marginBottom: 14,
  },
  select: {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,.06)", border: "1px solid #2a4a2a",
    borderRadius: 8, padding: "9px 12px", color: "#e8dfc8",
    fontSize: 14, fontFamily: "Georgia,serif", outline: "none", marginBottom: 14,
    colorScheme: "dark",
  },
  btn: (variant) => ({
    padding: "9px 22px", borderRadius: 20, fontSize: 14, cursor: "pointer",
    fontFamily: "Georgia,serif", letterSpacing: .3, transition: "opacity .15s",
    border: variant === "primary" ? "1px solid #f0c040" : "1px solid #2a4a2a",
    background: variant === "primary" ? "rgba(240,192,64,.15)" : "transparent",
    color: variant === "primary" ? "#f0c040" : "#8aab8a",
  }),
  avatar: {
    width: 64, height: 64, borderRadius: "50%",
    border: "2px solid #2a5c2a", objectFit: "cover", marginBottom: 12,
  },
  avatarInitial: {
    width: 64, height: 64, borderRadius: "50%",
    border: "2px solid #2a5c2a", background: "#1e4a1e",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#f0c040", fontSize: 28, fontFamily: "Georgia,serif",
    fontWeight: 700, marginBottom: 12,
  },
};

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { mode: suitMode, setMode: setSuitMode } = useSuitColors();
  const {
    enabled: soundEnabled, setEnabled: setSoundEnabled,
    madeBidVariant, setMadeBidVariant,
    setOpponentVariant, setSetOpponentVariant,
    winGameVariant, setWinGameVariant,
  } = useSound();
  const {
    enabled: videoEnabled, setEnabled: setVideoEnabled,
    setOpponentVariant:    videoSetOpponentVariant,    setSetOpponentVariant: setVideoSetOpponent,
    winGameVariant:        videoWinGameVariant,        setWinGameVariant:     setVideoWinGame,
    tookJackVariant:       videoTookJackVariant,       setTookJackVariant:    setVideoTookJack,
  } = useVideo();
  // Local preview state for the video overlay shown in this page only.
  const [previewVideo, setPreviewVideo] = useState(null);

  // Display name edit
  const [name, setName] = useState(user?.display_name || "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  // Legacy claim
  const [claimTarget, setClaimTarget] = useState("");
  const [claimPassword, setClaimPassword] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");

  async function saveName() {
    if (!name.trim() || name.trim() === user.display_name) return;
    setNameSaving(true);
    setNameMsg("");
    try {
      const updated = await api.patch("/api/users/me", { display_name: name.trim() });
      setUser((u) => ({ ...u, ...updated }));
      setNameMsg("Saved!");
      setTimeout(() => setNameMsg(""), 2500);
    } catch {
      setNameMsg("Failed to save.");
    }
    setNameSaving(false);
  }

  async function claimAccount() {
    if (!claimTarget) return;
    setClaimLoading(true);
    setClaimMsg("");
    try {
      const updated = await api.post("/api/users/claim", { legacy_name: claimTarget, password: claimPassword });
      setUser((u) => ({ ...u, ...updated }));
      setClaimMsg(`✓ Claimed as ${updated.display_name}! Your historical game data is now linked.`);
      setClaimPassword("");
    } catch (err) {
      setClaimMsg(err.message || "Failed to claim account.");
      setClaimPassword("");
    }
    setClaimLoading(false);
  }

  const alreadyClaimed = !!user?.legacy_name;

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <h1 style={S.title}>Profile</h1>

        {/* Avatar + basic info */}
        <div style={S.card}>
          <div style={S.cardTitle}>Account</div>
          {user?.avatar_url
            ? <img src={user.avatar_url} alt="" style={S.avatar} />
            : <div style={S.avatarInitial}>{user?.display_name?.[0]?.toUpperCase() || "?"}</div>
          }
          <label style={S.label}>Display Name</label>
          <input
            style={S.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button style={S.btn("primary")} onClick={saveName} disabled={nameSaving}>
              {nameSaving ? "Saving…" : "Save Name"}
            </button>
            {nameMsg && (
              <span style={{ fontSize: 13, color: nameMsg.startsWith("Failed") ? "#e05c5c" : "#4fc3a1" }}>
                {nameMsg}
              </span>
            )}
          </div>
          <div style={{ marginTop: 16, color: "#5a7a5a", fontSize: 13 }}>
            Email: {user?.email || "—"}
          </div>
        </div>

        {/* Suit colors */}
        <div style={S.card}>
          <div style={S.cardTitle}>Card Suit Colors</div>
          <p style={{ color: "#8aab8a", fontSize: 13, lineHeight: 1.5, margin: "0 0 16px" }}>
            How suits are colored on cards across the site. Saved to this browser
            only (not synced across devices).
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {Object.entries(SUIT_COLOR_MODES).map(([key, info]) => {
              const active = suitMode === key;
              return (
                <button
                  key={key}
                  onClick={() => setSuitMode(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 10,
                    border: `1px solid ${active ? "#f0c040" : "#2a4a2a"}`,
                    background: active ? "rgba(240,192,64,.1)" : "rgba(255,255,255,.02)",
                    color: active ? "#f0c040" : "#e8dfc8",
                    cursor: "pointer", textAlign: "left",
                    fontFamily: "Georgia,serif",
                    transition: "all .12s",
                  }}
                >
                  {/* Suit swatches */}
                  <div style={{ display: "flex", gap: 4, fontSize: 22, lineHeight: 1, fontWeight: 700 }}>
                    <span style={{ color: info.colors.s }}>♠</span>
                    <span style={{ color: info.colors.h }}>♥</span>
                    <span style={{ color: info.colors.d }}>♦</span>
                    <span style={{ color: info.colors.c }}>♣</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{info.label}</div>
                    <div style={{ fontSize: 12, color: "#8aab8a", marginTop: 2 }}>
                      {info.description}
                    </div>
                  </div>
                  {active && <span style={{ fontSize: 13 }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Live preview */}
          <div style={{ color: "#5a7a5a", fontSize: 11, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Preview
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-start", flexWrap: "wrap" }}>
            <Card cardId="As" size="md" />
            <Card cardId="Kh" size="md" />
            <Card cardId="Qd" size="md" />
            <Card cardId="Jc" size="md" />
          </div>
        </div>

        {/* Sound */}
        <div style={S.card}>
          <div style={S.cardTitle}>Sound</div>
          <p style={{ color: "#8aab8a", fontSize: 13, lineHeight: 1.5, margin: "0 0 16px" }}>
            Card-play sound effect during games. Saved to this browser only.
          </p>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 10,
              border: `1px solid ${soundEnabled ? "#f0c040" : "#2a4a2a"}`,
              background: soundEnabled ? "rgba(240,192,64,.1)" : "rgba(255,255,255,.02)",
              color: soundEnabled ? "#f0c040" : "#e8dfc8",
              cursor: "pointer", textAlign: "left",
              fontFamily: "Georgia,serif",
              transition: "all .12s",
              width: "100%",
            }}
          >
            <div style={{
              width: 32, height: 18, borderRadius: 9,
              background: soundEnabled ? "rgba(240,192,64,.3)" : "rgba(255,255,255,.08)",
              border: `1px solid ${soundEnabled ? "#f0c040" : "#2a5c2a"}`,
              position: "relative", flexShrink: 0,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                background: soundEnabled ? "#f0c040" : "#3a5a3a",
                position: "absolute", top: 2,
                left: soundEnabled ? 16 : 2, transition: "left .15s",
              }} />
            </div>
            <span style={{ flex: 1, fontSize: 14 }}>
              Card-play sound effect — {soundEnabled ? "on" : "off"}
            </span>
          </button>

          {soundEnabled && (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {[
                  { label: "▶ Card play",  onClick: preview(() => playCardSound()) },
                  { label: "▶ Your turn",  onClick: preview(() => playYourTurnSound()) },
                  { label: "▶ Won trick",  onClick: preview(() => playWinTrickSound()) },
                  { label: "▶ Won bid",    onClick: preview(() => playWinBidSound()) },
                ].map((b) => (
                  <button
                    key={b.label}
                    onClick={b.onClick}
                    style={{
                      padding: "6px 14px", borderRadius: 14,
                      border: "1px solid #2a4a2a",
                      background: "transparent",
                      color: "#8aab8a",
                      cursor: "pointer", fontSize: 12,
                      fontFamily: "Georgia,serif",
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Celebration variants */}
              <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid #1a3a1a" }}>
                <div style={{ color: "#5a7a5a", fontSize: 11, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                  Celebration sounds
                </div>
                {[
                  { label: "Won the game",  variants: WIN_GAME_VARIANTS,    cur: winGameVariant,     set: setWinGameVariant,     play: playWinGameSound },
                  { label: "Made your bid", variants: MADE_BID_VARIANTS,    cur: madeBidVariant,     set: setMadeBidVariant,     play: playMadeBidSound },
                  { label: "Set opponent",  variants: SET_OPPONENT_VARIANTS, cur: setOpponentVariant, set: setSetOpponentVariant, play: playSetOpponentSound },
                ].map((row) => (
                  <div key={row.label} style={{ marginBottom: 14 }}>
                    <div style={{ color: "#e8dfc8", fontSize: 13, marginBottom: 6 }}>{row.label}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {Object.entries(row.variants).map(([key, info]) => {
                        const active = row.cur === key;
                        return (
                          <button
                            key={key}
                            onClick={() => { stopAllPreviewSounds(); row.set(key); row.play(key); }}
                            style={{
                              padding: "5px 12px", borderRadius: 12,
                              border: `1px solid ${active ? "#f0c040" : "#2a4a2a"}`,
                              background: active ? "rgba(240,192,64,.12)" : "transparent",
                              color: active ? "#f0c040" : "#8aab8a",
                              cursor: "pointer", fontSize: 12,
                              fontFamily: "Georgia,serif",
                            }}
                          >
                            {active ? "✓ " : ""}{info.label}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => row.set("off")}
                        style={{
                          padding: "5px 12px", borderRadius: 12,
                          border: `1px solid ${row.cur === "off" ? "#5a2020" : "#2a4a2a"}`,
                          background: row.cur === "off" ? "rgba(90,32,32,.18)" : "transparent",
                          color: row.cur === "off" ? "#c89a9a" : "#5a7a5a",
                          cursor: "pointer", fontSize: 12,
                          fontFamily: "Georgia,serif",
                        }}
                      >
                        {row.cur === "off" ? "✓ " : ""}Off
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Celebration videos */}
        <div style={S.card}>
          <div style={S.cardTitle}>Celebration Videos</div>
          <p style={{ color: "#8aab8a", fontSize: 13, lineHeight: 1.5, margin: "0 0 16px" }}>
            Bowling-alley-style overlay clips that play on big moments.
            Files live in <code>client/public/videos/</code> — see the README
            there for what to drop in. Saved to this browser only.
          </p>

          {/* Master toggle */}
          <button
            onClick={() => setVideoEnabled(!videoEnabled)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 10,
              border: `1px solid ${videoEnabled ? "#f0c040" : "#2a4a2a"}`,
              background: videoEnabled ? "rgba(240,192,64,.1)" : "rgba(255,255,255,.02)",
              color: videoEnabled ? "#f0c040" : "#e8dfc8",
              cursor: "pointer", textAlign: "left",
              fontFamily: "Georgia,serif",
              transition: "all .12s",
              width: "100%",
            }}
          >
            <div style={{
              width: 32, height: 18, borderRadius: 9,
              background: videoEnabled ? "rgba(240,192,64,.3)" : "rgba(255,255,255,.08)",
              border: `1px solid ${videoEnabled ? "#f0c040" : "#2a5c2a"}`,
              position: "relative", flexShrink: 0,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                background: videoEnabled ? "#f0c040" : "#3a5a3a",
                position: "absolute", top: 2,
                left: videoEnabled ? 16 : 2, transition: "left .15s",
              }} />
            </div>
            <span style={{ flex: 1, fontSize: 14 }}>
              Show celebration videos — {videoEnabled ? "on" : "off"}
            </span>
          </button>

          {videoEnabled && (
            <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid #1a3a1a" }}>
              <div style={{ color: "#5a7a5a", fontSize: 11, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                Per-event videos
              </div>
              {[
                { label: "Won the game",  event: "winGame",     variants: WIN_GAME_VIDEOS,     cur: videoWinGameVariant,     set: setVideoWinGame    },
                { label: "Set opponent",  event: "setOpponent", variants: SET_OPPONENT_VIDEOS, cur: videoSetOpponentVariant, set: setVideoSetOpponent },
                { label: "Took jack",     event: "tookJack",    variants: TOOK_JACK_VIDEOS,    cur: videoTookJackVariant,    set: setVideoTookJack   },
              ].map((row) => (
                <div key={row.label} style={{ marginBottom: 14 }}>
                  <div style={{ color: "#e8dfc8", fontSize: 13, marginBottom: 6 }}>{row.label}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {Object.entries(row.variants).map(([key, info]) => {
                      const active = row.cur === key;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            row.set(key);
                            setPreviewVideo(null); // reset to retrigger overlay
                            // Tiny delay so the overlay sees the src change
                            setTimeout(() => setPreviewVideo(getVideoSrc(row.event, key)), 30);
                          }}
                          style={{
                            padding: "5px 12px", borderRadius: 12,
                            border: `1px solid ${active ? "#f0c040" : "#2a4a2a"}`,
                            background: active ? "rgba(240,192,64,.12)" : "transparent",
                            color: active ? "#f0c040" : "#8aab8a",
                            cursor: "pointer", fontSize: 12,
                            fontFamily: "Georgia,serif",
                          }}
                        >
                          {active ? "✓ " : ""}{info.label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => row.set("off")}
                      style={{
                        padding: "5px 12px", borderRadius: 12,
                        border: `1px solid ${row.cur === "off" ? "#5a2020" : "#2a4a2a"}`,
                        background: row.cur === "off" ? "rgba(90,32,32,.18)" : "transparent",
                        color: row.cur === "off" ? "#c89a9a" : "#5a7a5a",
                        cursor: "pointer", fontSize: 12,
                        fontFamily: "Georgia,serif",
                      }}
                    >
                      {row.cur === "off" ? "✓ " : ""}Off
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Local-only overlay so previews on this page don't fight the
            in-game overlay. */}
        <CelebrationOverlay src={previewVideo} onDone={() => setPreviewVideo(null)} />

        {/* Legacy account claim */}
        <div style={S.card}>
          <div style={S.cardTitle}>Link Legacy Stats</div>
          {alreadyClaimed ? (
            <p style={{ color: "#4fc3a1", fontSize: 14 }}>
              ✓ Your account is linked to the historical record for <strong>{user.legacy_name}</strong>.
              All past game data is associated with your profile.
            </p>
          ) : (
            <>
              <p style={{ color: "#8aab8a", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                If you're one of the original 5 players (Matt, Seth, Mack, Arnav, or Henry),
                claim your legacy account to link all past game history to your profile.
              </p>
              <label style={S.label}>I am…</label>
              <select
                style={S.select}
                value={claimTarget}
                onChange={(e) => setClaimTarget(e.target.value)}
              >
                <option value="">— choose your name —</option>
                {LEGACY_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n.charAt(0).toUpperCase() + n.slice(1)}
                  </option>
                ))}
              </select>
              <label style={S.label}>Password</label>
              <input
                type="password"
                style={S.input}
                placeholder="Enter claim password"
                value={claimPassword}
                onChange={(e) => setClaimPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && claimAccount()}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button
                  style={S.btn("primary")}
                  onClick={claimAccount}
                  disabled={claimLoading || !claimTarget || !claimPassword}
                >
                  {claimLoading ? "Claiming…" : "Claim Account"}
                </button>
                {claimMsg && (
                  <span style={{
                    fontSize: 13,
                    color: claimMsg.startsWith("✓") ? "#4fc3a1" : "#e05c5c",
                    maxWidth: 280,
                  }}>
                    {claimMsg}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
