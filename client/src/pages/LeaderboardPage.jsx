import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";

const MEMBER_COLORS = ["#4fc3a1", "#e05c5c", "#8aab8a", "#c090a0", "#7090c0", "#c87a3a"];
const MAX_COMPARED = 5;

function fmt(val, pct = false) {
  if (val == null) return "—";
  if (pct) return `${Math.round(val * 100)}%`;
  return val;
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.03)", border: "1px solid #1e4a1e",
      borderRadius: 10, padding: "14px 18px", textAlign: "center",
    }}>
      <div style={{ color: "#f0e8d0", fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif" }}>
        {value}
      </div>
      <div style={{ color: "#5a7a5a", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 }}>
        {label}
      </div>
      {sub && (
        <div style={{ color: "#3a5a3a", fontSize: 11, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 22px", borderRadius: 20,
        border: active ? "1px solid #f0c040" : "1px solid #2a4a2a",
        background: active ? "rgba(240,192,64,.12)" : "transparent",
        color: active ? "#f0c040" : "#5a7a5a",
        fontSize: 13, cursor: "pointer", fontFamily: "Georgia,serif",
        transition: "all .15s",
      }}
    >
      {children}
    </button>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState("rankings");

  // Search-to-add state
  const [comparedPlayers, setComparedPlayers] = useState([]);
  const [searchTerm, setSearchTerm]           = useState("");
  const [searchOpen, setSearchOpen]           = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    api.get("/api/stats/leaderboard")
      .then((data) => setRows(data))
      .catch(() => setError("Failed to load leaderboard."))
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const myRank = rows.findIndex((r) => r.id === user?.id);
  const myRow  = myRank >= 0 ? rows[myRank] : null;

  function colorFor(id) {
    if (id === user?.id) return "#f0c040";
    const idx = comparedPlayers.findIndex((p) => p.id === id);
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  }

  function addPlayer(row) {
    if (comparedPlayers.length >= MAX_COMPARED) return;
    if (comparedPlayers.find((p) => p.id === row.id)) return;
    setComparedPlayers((prev) => [...prev, row]);
    setSearchTerm("");
    setSearchOpen(false);
  }

  function removePlayer(id) {
    setComparedPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  const searchResults = searchTerm.length > 0
    ? rows.filter((r) =>
        r.id !== user?.id &&
        !comparedPlayers.find((p) => p.id === r.id) &&
        r.display_name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 6)
    : [];

  // Build 6-metric radar data keyed by user ID
  const radarPlayers = myRow ? [myRow, ...comparedPlayers] : comparedPlayers;

  function metricVals(fn) {
    return Object.fromEntries(radarPlayers.map((r) => [r.id, fn(r)]));
  }

  const radarData = radarPlayers.length > 0 ? [
    { metric: "Win %",        ...metricVals((r) => r.win_pct      != null ? Math.round(r.win_pct * 100)                        : 0) },
    { metric: "Bid %",        ...metricVals((r) => r.bid_rate     != null ? Math.round(r.bid_rate * 100)                       : 0) },
    { metric: "Avg Score",    ...metricVals((r) => r.avg_score    != null ? Math.round((r.avg_score / 15) * 100)               : 0) },
    { metric: "Recent Form",  ...metricVals((r) => r.recent_form  != null ? Math.round(r.recent_form * 100)                    : 0) },
    { metric: "Loss Control", ...metricVals((r) => r.avg_loss_margin != null ? Math.round((1 - r.avg_loss_margin / 15) * 100)  : 0) },
    { metric: "Clutch",       ...metricVals((r) => r.clutch_rate  != null ? Math.round(r.clutch_rate * 100)                    : 0) },
  ] : [];

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
          fontSize: 30, color: "#f0e8d0", margin: "0 0 20px",
        }}>
          Leaderboard
        </h1>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          <TabBtn active={activeTab === "rankings"} onClick={() => setActiveTab("rankings")}>
            Rankings
          </TabBtn>
          {user && !user.is_guest && (
            <TabBtn active={activeTab === "mystats"} onClick={() => setActiveTab("mystats")}>
              My Stats
            </TabBtn>
          )}
        </div>

        {/* ── Rankings tab ─────────────────────────────────────────────────── */}
        {activeTab === "rankings" && (
          <>
            <p style={{ color: "#3a5a3a", fontSize: 13, margin: "0 0 20px" }}>
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
                    background: "rgba(255,255,255,.03)", border: "1px solid #1a3a1a",
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
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr 64px 64px 64px 72px",
                  gap: "0 12px",
                  padding: "0 16px 8px",
                  color: "#3a5a3a",
                  fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
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
                        <div style={{
                          fontSize: 14, fontWeight: 700,
                          color: i === 0 ? "#f0c040" : i === 1 ? "#d8d8d8" : i === 2 ? "#c87a3a" : "#3a5a3a",
                        }}>
                          {i + 1}
                        </div>

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
          </>
        )}

        {/* ── My Stats tab ─────────────────────────────────────────────────── */}
        {activeTab === "mystats" && (
          <>
            {loading && (
              <div style={{ color: "#3a5a3a", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
                Loading…
              </div>
            )}

            {!loading && !myRow && (
              <div style={{ color: "#3a5a3a", fontSize: 14, textAlign: "center", padding: "40px 0" }}>
                No ranked games yet. Play a full human game to see your stats here.
              </div>
            )}

            {!loading && myRow && (
              <>
                {/* Ranking callout */}
                <div style={{
                  background: "rgba(240,192,64,.06)", border: "1px solid #3a3010",
                  borderRadius: 10, padding: "12px 18px", marginBottom: 28,
                  color: "#f0c040", fontSize: 14, textAlign: "center",
                }}>
                  You rank <strong>#{myRank + 1}</strong> of {rows.length} player{rows.length !== 1 ? "s" : ""} by win rate
                </div>

                {/* Radar chart */}
                <div style={{
                  background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e",
                  borderRadius: 12, padding: "24px", marginBottom: 24,
                }}>
                  <div style={{
                    fontFamily: "'Playfair Display',serif", color: "#f0c040",
                    fontSize: 15, marginBottom: 16,
                  }}>
                    Performance Comparison
                  </div>

                  {/* You chip (always present) */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "4px 12px", borderRadius: 16,
                      border: "1px solid #f0c040",
                      background: "rgba(240,192,64,.12)",
                      color: "#f0c040", fontSize: 12,
                      fontFamily: "Georgia,serif",
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f0c040" }} />
                      You
                    </div>

                    {comparedPlayers.map((p) => {
                      const color = colorFor(p.id);
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "4px 12px", borderRadius: 16,
                            border: `1px solid ${color}`,
                            background: `${color}18`,
                            color, fontSize: 12,
                            fontFamily: "Georgia,serif",
                          }}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                          {p.display_name}
                          <button
                            onClick={() => removePlayer(p.id)}
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color, fontSize: 14, lineHeight: 1, padding: "0 0 0 2px",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}

                    {/* Search-to-add */}
                    {comparedPlayers.length < MAX_COMPARED && (
                      <div ref={searchRef} style={{ position: "relative" }}>
                        <input
                          value={searchTerm}
                          onChange={(e) => { setSearchTerm(e.target.value); setSearchOpen(true); }}
                          onFocus={() => setSearchOpen(true)}
                          placeholder="+ Compare player…"
                          style={{
                            padding: "4px 12px", borderRadius: 16,
                            border: "1px solid #2a4a2a",
                            background: "transparent",
                            color: "#8aab8a", fontSize: 12,
                            fontFamily: "Georgia,serif",
                            outline: "none", width: 150,
                          }}
                        />
                        {searchOpen && searchResults.length > 0 && (
                          <div style={{
                            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
                            background: "#0d2b0d", border: "1px solid #2a5c2a",
                            borderRadius: 8, overflow: "hidden", minWidth: 180,
                          }}>
                            {searchResults.map((r) => (
                              <div
                                key={r.id}
                                onMouseDown={() => addPlayer(r)}
                                style={{
                                  padding: "8px 14px", cursor: "pointer",
                                  color: "#f0e8d0", fontSize: 13,
                                  borderBottom: "1px solid #1e3a1e",
                                  fontFamily: "Georgia,serif",
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.05)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                              >
                                {r.display_name}
                                <span style={{ color: "#3a5a3a", fontSize: 11, marginLeft: 8 }}>
                                  {fmt(r.win_pct, true)} WR
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {searchOpen && searchTerm.length > 0 && searchResults.length === 0 && (
                          <div style={{
                            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
                            background: "#0d2b0d", border: "1px solid #2a5c2a",
                            borderRadius: 8, padding: "8px 14px",
                            color: "#3a5a3a", fontSize: 12,
                            fontFamily: "Georgia,serif",
                          }}>
                            No players found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                      <PolarGrid stroke="#1e4a1e" />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fill: "#8aab8a", fontSize: 12, fontFamily: "Georgia,serif" }}
                      />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      {radarPlayers.map((r) => {
                        const isMe = r.id === user?.id;
                        const color = colorFor(r.id);
                        return (
                          <Radar
                            key={r.id}
                            dataKey={r.id}
                            name={isMe ? "You" : r.display_name}
                            stroke={color}
                            fill={color}
                            fillOpacity={isMe ? 0.15 : 0.05}
                            strokeWidth={isMe ? 2 : 1.5}
                          />
                        );
                      })}
                      <Tooltip
                        formatter={(val, name) => [`${val}%`, name]}
                        contentStyle={{
                          background: "#0d2b0d", border: "1px solid #2a5c2a",
                          borderRadius: 8, fontFamily: "Georgia,serif", fontSize: 12,
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div style={{ color: "#3a5a3a", fontSize: 11, textAlign: "center", marginTop: 8 }}>
                    All metrics normalized 0–100. Avg Score scaled to 15-pt max. Loss Control = inverse avg loss margin.
                  </div>
                </div>

                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                  <StatCard label="Games" value={myRow.games_played} />
                  <StatCard label="Wins" value={myRow.wins} />
                  <StatCard label="Losses" value={myRow.games_played - myRow.wins} />
                  <StatCard label="Win Rate" value={fmt(myRow.win_pct, true)} />
                  <StatCard
                    label="Bid Rate"
                    value={fmt(myRow.bid_rate, true)}
                    sub={myRow.bid_attempts > 0 ? `${myRow.bid_successes}/${myRow.bid_attempts} bids` : null}
                  />
                  <StatCard
                    label="Avg Score"
                    value={myRow.avg_score != null ? myRow.avg_score : "—"}
                    sub="points per game"
                  />
                  <StatCard
                    label="Recent Form"
                    value={fmt(myRow.recent_form, true)}
                    sub="last 10 games"
                  />
                  <StatCard
                    label="Clutch Rate"
                    value={fmt(myRow.clutch_rate, true)}
                    sub="≤3 pt games"
                  />
                  <StatCard
                    label="Avg Win Margin"
                    value={myRow.avg_win_margin != null ? myRow.avg_win_margin : "—"}
                    sub="points"
                  />
                  <StatCard
                    label="Avg Loss Margin"
                    value={myRow.avg_loss_margin != null ? myRow.avg_loss_margin : "—"}
                    sub="points"
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
