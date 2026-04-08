import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";
import LegacyDashboard from "../LegacyDashboard";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from "recharts";

const MEMBER_COLORS = ["#f0c040", "#4fc3a1", "#e05c5c", "#8aab8a", "#c090a0", "#7090c0"];

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
    color: "#e8dfc8",
    fontFamily: "'Georgia',serif",
  },
  body: { maxWidth: 860, margin: "0 auto", padding: "36px 20px" },
  center: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "60vh", color: "#5a7a5a", fontSize: 16,
  },
  title: {
    fontFamily: "'Playfair Display',serif",
    fontSize: 28, color: "#f0e8d0", margin: "0 0 4px",
  },
  sub: { color: "#5a7a5a", fontSize: 13, margin: "0 0 24px" },
  card: {
    background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e",
    borderRadius: 12, padding: "22px 24px", marginBottom: 16,
  },
  cardTitle: {
    fontFamily: "'Playfair Display',serif", color: "#f0c040",
    fontSize: 15, marginBottom: 16,
  },
  tabBtn: (active) => ({
    padding: "8px 22px", borderRadius: 20,
    border: active ? "1px solid #f0c040" : "1px solid #2a4a2a",
    background: active ? "rgba(240,192,64,.12)" : "transparent",
    color: active ? "#f0c040" : "#5a7a5a",
    fontSize: 13, cursor: "pointer", fontFamily: "Georgia,serif",
    transition: "all .15s",
  }),
};

// Derive wins per player from games array
function computeWins(games, memberId) {
  let wins = 0, played = 0;
  for (const g of games) {
    const myScore = g.scores[memberId];
    if (myScore == null) continue;
    played++;
    const maxScore = Math.max(...Object.values(g.scores));
    if (myScore === maxScore) wins++;
  }
  return { wins, played };
}

function Avatar({ member, size = 32, color }) {
  if (member.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={member.display_name}
        style={{
          width: size, height: size, borderRadius: "50%", objectFit: "cover",
          border: `2px solid ${color}`, flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "#1e4a1e", border: `2px solid ${color}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color, fontSize: size * 0.4, fontWeight: 700,
    }}>
      {member.display_name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function GroupPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup]         = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [hiddenMembers, setHiddenMembers] = useState(new Set());
  const isLegacy = slug === "sammartino-group";

  useEffect(() => {
    if (isLegacy) { setLoading(false); return; }
    Promise.all([
      api.get(`/api/groups/${slug}`),
      api.get(`/api/analytics/groups/${slug}`),
    ])
      .then(([g, a]) => { setGroup(g); setAnalytics(a); })
      .catch((err) => {
        if (err.status === 403 || err.status === 404) navigate("/groups");
        else setError("Failed to load group.");
      })
      .finally(() => setLoading(false));
  }, [slug, navigate, isLegacy]);

  // Legacy group
  if (isLegacy) {
    return (
      <div>
        <Navbar />
        <LegacyDashboard />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={S.page}>
        <Navbar />
        <div style={S.center}>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.page}>
        <Navbar />
        <div style={S.center}>{error}</div>
      </div>
    );
  }

  const members  = analytics?.members || [];
  const games    = analytics?.games   || [];
  const memberStats = analytics?.memberStats || {};
  const hasGames = games.length > 0;

  // Build radar data: [{ metric, memberId1: val, memberId2: val, ... }]
  const radarData = hasGames ? [
    {
      metric: "Win %",
      ...Object.fromEntries(members.map((m) => {
        const { wins, played } = computeWins(games, m.id);
        return [m.id, played > 0 ? Math.round((wins / played) * 100) : 0];
      })),
    },
    {
      metric: "Bid %",
      ...Object.fromEntries(members.map((m) => {
        const ms = memberStats[m.id];
        const rate = ms && ms.bid_attempts > 0 ? ms.bid_successes / ms.bid_attempts : null;
        return [m.id, rate != null ? Math.round(rate * 100) : 0];
      })),
    },
    {
      metric: "Avg Score",
      ...Object.fromEntries(members.map((m) => {
        const ms = memberStats[m.id];
        return [m.id, ms?.avg_score != null ? Math.round((ms.avg_score / 15) * 100) : 0];
      })),
    },
  ] : [];

  function toggleMember(id) {
    setHiddenMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <h1 style={S.title}>{group?.name}</h1>
        <p style={S.sub}>{members.length} member{members.length !== 1 ? "s" : ""} · {games.length} game{games.length !== 1 ? "s" : ""}</p>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button style={S.tabBtn(activeTab === "overview")} onClick={() => setActiveTab("overview")}>Overview</button>
          <button style={S.tabBtn(activeTab === "gamelog")}  onClick={() => setActiveTab("gamelog")}>Game Log</button>
        </div>

        {/* ── Overview tab ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            {!hasGames ? (
              <div style={{
                textAlign: "center", padding: "48px 24px",
                border: "1px dashed #1e4a1e", borderRadius: 14,
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>♠</div>
                <p style={{ color: "#5a7a5a", lineHeight: 1.6 }}>
                  No games played yet. Start a game from the lobby with this group to see analytics here.
                </p>
              </div>
            ) : (
              <>
                {/* Radar chart */}
                <div style={S.card}>
                  <div style={S.cardTitle}>Performance Comparison</div>

                  {/* Member toggles */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    {members.map((m, i) => {
                      const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
                      const hidden = hiddenMembers.has(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleMember(m.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "4px 12px", borderRadius: 16,
                            border: `1px solid ${hidden ? "#2a4a2a" : color}`,
                            background: hidden ? "transparent" : `${color}18`,
                            color: hidden ? "#3a5a3a" : color,
                            fontSize: 12, cursor: "pointer", fontFamily: "Georgia,serif",
                          }}
                        >
                          <div style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: hidden ? "#2a4a2a" : color,
                          }} />
                          {m.id === user?.id ? "You" : m.display_name}
                        </button>
                      );
                    })}
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                      <PolarGrid stroke="#1e4a1e" />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fill: "#8aab8a", fontSize: 13, fontFamily: "Georgia,serif" }}
                      />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      {members.map((m, i) => {
                        if (hiddenMembers.has(m.id)) return null;
                        const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
                        return (
                          <Radar
                            key={m.id}
                            dataKey={m.id}
                            name={m.id === user?.id ? "You" : m.display_name}
                            stroke={color}
                            fill={color}
                            fillOpacity={0.08}
                            strokeWidth={2}
                          />
                        );
                      })}
                      <Tooltip
                        formatter={(val) => [`${val}%`]}
                        contentStyle={{
                          background: "#0d2b0d", border: "1px solid #2a5c2a",
                          borderRadius: 8, fontFamily: "Georgia,serif", fontSize: 12,
                        }}
                      />
                      <Legend
                        formatter={(name) => (
                          <span style={{ color: "#8aab8a", fontSize: 12, fontFamily: "Georgia,serif" }}>{name}</span>
                        )}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div style={{ color: "#3a5a3a", fontSize: 11, textAlign: "center", marginTop: 4 }}>
                    Stats scoped to games within this group. Avg Score scaled against 15-point max.
                  </div>
                </div>

                {/* Stats table */}
                <div style={S.card}>
                  <div style={S.cardTitle}>Member Stats</div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 52px 36px 36px 60px 56px 60px",
                    gap: "0 10px",
                    padding: "0 0 8px",
                    color: "#3a5a3a", fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
                  }}>
                    <div>Member</div>
                    <div style={{ textAlign: "right" }}>Games</div>
                    <div style={{ textAlign: "right" }}>W</div>
                    <div style={{ textAlign: "right" }}>L</div>
                    <div style={{ textAlign: "right" }}>Win %</div>
                    <div style={{ textAlign: "right" }}>Bid %</div>
                    <div style={{ textAlign: "right" }}>Avg</div>
                  </div>
                  {members.map((m, i) => {
                    const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
                    const { wins, played } = computeWins(games, m.id);
                    const ms = memberStats[m.id];
                    const bidRate = ms && ms.bid_attempts > 0
                      ? `${Math.round((ms.bid_successes / ms.bid_attempts) * 100)}%`
                      : "—";
                    const winPct = played > 0 ? `${Math.round((wins / played) * 100)}%` : "—";
                    const isMe = m.id === user?.id;
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 52px 36px 36px 60px 56px 60px",
                          gap: "0 10px",
                          alignItems: "center",
                          padding: "10px 0",
                          borderTop: "1px solid #1a3a1a",
                          color: "#e8dfc8",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar member={m} size={28} color={color} />
                          <span style={{ fontSize: 14, color: isMe ? "#f0c040" : "#f0e8d0", fontWeight: isMe ? 700 : 400 }}>
                            {isMe ? "You" : m.display_name}
                          </span>
                        </div>
                        <div style={{ textAlign: "right", fontSize: 13, color: "#8aab8a" }}>{played}</div>
                        <div style={{ textAlign: "right", fontSize: 13, color: "#4fc3a1" }}>{wins}</div>
                        <div style={{ textAlign: "right", fontSize: 13, color: "#8aab8a" }}>{played - wins}</div>
                        <div style={{ textAlign: "right", fontSize: 13, color: "#4fc3a1" }}>{winPct}</div>
                        <div style={{ textAlign: "right", fontSize: 13, color: "#8aab8a" }}>{bidRate}</div>
                        <div style={{ textAlign: "right", fontSize: 13, color: "#8aab8a" }}>
                          {ms?.avg_score != null ? ms.avg_score : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Game Log tab ──────────────────────────────────────────────────── */}
        {activeTab === "gamelog" && (
          <>
            {!hasGames ? (
              <div style={{ color: "#3a5a3a", fontSize: 14, textAlign: "center", padding: "40px 0" }}>
                No games played yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {games.map((g) => {
                  const scoreVals = Object.values(g.scores);
                  const maxScore = scoreVals.length > 0 ? Math.max(...scoreVals) : null;
                  // Group players by team score
                  const teamMap = {};
                  for (const [uid, score] of Object.entries(g.scores)) {
                    if (!teamMap[score]) teamMap[score] = [];
                    teamMap[score].push(uid);
                  }
                  const teamScores = Object.keys(teamMap).map(Number).sort((a, b) => b - a);

                  return (
                    <div
                      key={g.id}
                      style={{
                        background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e",
                        borderRadius: 10, padding: "14px 18px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ color: "#5a7a5a", fontSize: 12 }}>
                          {g.date ? new Date(g.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown date"}
                        </div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                          {teamScores.map((score, ti) => {
                            const isWinner = score === maxScore;
                            const uids = teamMap[score];
                            return (
                              <div key={score} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {uids.map((uid) => {
                                  const member = members.find((m) => m.id === uid);
                                  if (!member) return null;
                                  const mi = members.indexOf(member);
                                  return (
                                    <Avatar
                                      key={uid}
                                      member={member}
                                      size={24}
                                      color={MEMBER_COLORS[mi % MEMBER_COLORS.length]}
                                    />
                                  );
                                })}
                                <span style={{
                                  fontSize: 15, fontWeight: isWinner ? 700 : 400,
                                  color: isWinner ? "#f0c040" : "#5a7a5a",
                                }}>
                                  {score}
                                </span>
                                {ti < teamScores.length - 1 && (
                                  <span style={{ color: "#2a4a2a", margin: "0 4px" }}>vs</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
