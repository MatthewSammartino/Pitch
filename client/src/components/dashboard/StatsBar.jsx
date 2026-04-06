import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

function Stat({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
      <div style={{ color: "#f0e8d0", fontSize: 18, fontWeight: 700, fontFamily: "Georgia,serif", lineHeight: 1 }}>
        {value ?? "—"}
      </div>
      <div style={{ color: "#5a7a5a", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

export default function StatsBar() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/stats/me")
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Hide entirely while loading or if no games played
  if (loading || !stats || stats.games_played === 0) return null;

  const winPct   = stats.win_pct   != null ? `${Math.round(stats.win_pct * 100)}%`  : "—";
  const bidRate  = stats.bid_rate  != null ? `${Math.round(stats.bid_rate * 100)}%`  : "—";
  const avgScore = stats.avg_score != null ? stats.avg_score : "—";
  const losses   = stats.games_played - stats.wins;

  return (
    <div style={{
      background: "rgba(255,255,255,.03)",
      borderBottom: "1px solid #1e4a1e",
      padding: "12px 24px",
    }}>
      <div style={{
        maxWidth: 860,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        gap: 32,
        flexWrap: "wrap",
      }}>
        <div style={{ color: "#3a5a3a", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>
          Your Stats
        </div>

        <Stat label="Games" value={stats.games_played} />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#4fc3a1", fontSize: 16, fontWeight: 700, fontFamily: "Georgia,serif" }}>
            {stats.wins}W
          </span>
          <span style={{ color: "#3a5a3a" }}>·</span>
          <span style={{ color: "#e05c5c", fontSize: 16, fontWeight: 700, fontFamily: "Georgia,serif" }}>
            {losses}L
          </span>
        </div>

        <Stat label="Win Rate" value={winPct} />
        <Stat label="Bid %" value={bidRate} />
        <Stat label="Avg Score" value={avgScore} />

        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
          <Link
            to="/leaderboard"
            style={{
              color: "#f0c040",
              fontSize: 13,
              fontFamily: "Georgia,serif",
              textDecoration: "none",
            }}
          >
            View Leaderboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
