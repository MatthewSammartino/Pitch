import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";

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
