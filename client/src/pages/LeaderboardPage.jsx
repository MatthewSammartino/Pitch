import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";

function fmt(val, pct = false) {
  if (val == null) return "—";
  if (pct) return `${Math.round(val * 100)}%`;
  return val;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.get("/api/stats/leaderboard")
      .then(setRows)
      .catch(() => setError("Failed to load leaderboard."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
      color: "#e8dfc8",
      fontFamily: "Georgia,serif",
    }}>
      <Navbar />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 20px" }}>
        <h1 style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: 30, color: "#f0e8d0", margin: "0 0 6px",
        }}>
          Leaderboard
        </h1>
        <p style={{ color: "#3a5a3a", fontSize: 13, margin: "0 0 28px" }}>
          All-time rankings across fully human games (no bots).
        </p>

        {error && (
          <div style={{ color: "#e05c5c", fontSize: 14, padding: "12px 0" }}>{error}</div>
        )}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                height: 52, borderRadius: 10,
                background: "rgba(255,255,255,.03)",
                border: "1px solid #1a3a1a",
              }} />
            ))}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div style={{ color: "#3a5a3a", fontSize: 14, textAlign: "center", padding: "40px 0" }}>
            No ranked games yet. Play a full game with 4 or 6 human players to appear here.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "36px 1fr 64px 64px 64px 72px",
              gap: "0 12px",
              padding: "0 16px 8px",
              color: "#3a5a3a",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}>
              <div>#</div>
              <div>Player</div>
              <div style={{ textAlign: "right" }}>Games</div>
              <div style={{ textAlign: "right" }}>Win%</div>
              <div style={{ textAlign: "right" }}>Bid%</div>
              <div style={{ textAlign: "right" }}>Avg Score</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.map((row, i) => {
                const isMe = row.id === user?.id;
                const initial = row.display_name?.[0]?.toUpperCase() ?? "?";
                return (
                  <div
                    key={row.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px 1fr 64px 64px 64px 72px",
                      gap: "0 12px",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: isMe ? "1px solid #f0c040" : "1px solid #1e4a1e",
                      background: isMe ? "rgba(240,192,64,.04)" : "rgba(255,255,255,.02)",
                    }}
                  >
                    {/* Rank */}
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: i === 0 ? "#f0c040" : i === 1 ? "#d8d8d8" : i === 2 ? "#c87a3a" : "#3a5a3a",
                    }}>
                      {i + 1}
                    </div>

                    {/* Name + avatar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      {row.avatar_url ? (
                        <img
                          src={row.avatar_url}
                          alt={row.display_name}
                          style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: "#1e4a1e", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#f0c040", fontSize: 13, fontWeight: 700,
                        }}>
                          {initial}
                        </div>
                      )}
                      <div style={{
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        color: isMe ? "#f0c040" : "#f0e8d0",
                        fontSize: 14, fontWeight: isMe ? 700 : 400,
                      }}>
                        {isMe ? "You" : row.display_name}
                        {isMe && (
                          <span style={{ color: "#3a5a3a", fontSize: 11, fontWeight: 400, marginLeft: 8 }}>
                            ({row.display_name})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ textAlign: "right", fontSize: 14, color: "#e8dfc8" }}>{row.games_played}</div>
                    <div style={{ textAlign: "right", fontSize: 14, color: "#4fc3a1" }}>{fmt(row.win_pct, true)}</div>
                    <div style={{ textAlign: "right", fontSize: 14, color: "#8aab8a" }}>{fmt(row.bid_rate, true)}</div>
                    <div style={{ textAlign: "right", fontSize: 14, color: "#8aab8a" }}>{fmt(row.avg_score)}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
