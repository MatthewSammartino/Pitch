import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from "recharts";

// ── Member visual mapping ─────────────────────────────────────────────────────
const FALLBACK_COLORS = ["#f0c040", "#4fc3a1", "#e05c5c", "#7b9ef0", "#d17be8", "#8aab8a"];
const FALLBACK_SUITS  = ["♠", "♣", "♦", "♥", "★", "♠"];

// Preserve the original Sammartino suit assignments
const LEGACY_SUITS  = { matt: "♠", seth: "♣", mack: "♦", arnav: "♥", henry: "★" };
const LEGACY_COLORS = { matt: "#f0c040", seth: "#4fc3a1", mack: "#e05c5c", arnav: "#7b9ef0", henry: "#d17be8" };

const suitFor  = (m, i) => (m.legacy_name && LEGACY_SUITS[m.legacy_name])  || FALLBACK_SUITS[i % FALLBACK_SUITS.length];
const colorFor = (m, i) => (m.legacy_name && LEGACY_COLORS[m.legacy_name]) || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
const nameFor  = (m, currentUserId) => (m.id === currentUserId ? "You" : m.display_name);

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
    color: "#e8dfc8",
    fontFamily: "'Georgia',serif",
    paddingBottom: 60,
  },
  header: {
    textAlign: "center", padding: "32px 20px 16px",
    borderBottom: "1px solid #1e4a1e",
    background: "linear-gradient(180deg,rgba(0,0,0,.4) 0%,transparent 100%)",
    position: "relative",
  },
  title: {
    fontFamily: "'Playfair Display',serif",
    fontSize: "clamp(28px,5vw,46px)", color: "#f0c040",
    margin: "0 0 6px", textShadow: "0 2px 20px rgba(240,192,64,.3)", letterSpacing: 2,
  },
  subtitle: { color: "#8aab8a", fontSize: 13, margin: 0, fontFamily: "monospace" },
  legacyLink: {
    display: "inline-block", marginTop: 10, color: "#5a7a5a",
    fontSize: 12, fontFamily: "monospace", textDecoration: "none",
    border: "1px solid #2a4a2a", padding: "4px 12px", borderRadius: 12,
  },
  cardGrid:  { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, padding: "24px 20px 0" },
  tabs:      { display: "flex", justifyContent: "center", gap: 6, padding: "20px 20px 0", flexWrap: "wrap" },
  content:   { padding: "20px 20px 0", maxWidth: 920, margin: "0 auto" },
  chartCard: { background: "rgba(255,255,255,.03)", border: "1px solid #1e4a1e", borderRadius: 14, padding: "22px 20px", marginBottom: 20 },
  chartTitle:{ fontFamily: "'Playfair Display',serif", color: "#f0e8d0", margin: "0 0 4px", fontSize: 17 },
  chartSub:  { color: "#5a7a5a", fontSize: 12, margin: "0 0 18px", fontFamily: "monospace" },
  emptyBox:  { textAlign: "center", padding: "48px 24px", border: "1px dashed #1e4a1e", borderRadius: 14, marginTop: 24 },
};

const tabStyle = (active) => ({
  padding: "8px 18px", borderRadius: 20,
  border: active ? "1px solid #f0c040" : "1px solid #2a4a2a",
  background: active ? "rgba(240,192,64,.15)" : "rgba(255,255,255,.03)",
  color: active ? "#f0c040" : "#8aab8a", cursor: "pointer", fontSize: 13,
  fontFamily: "Georgia,serif", letterSpacing: .5, transition: "all .2s",
});

// ── Tooltip ──────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d1f0d", border: "1px solid #2a5c2a", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: "#f0c040", fontFamily: "'Playfair Display',serif", margin: "0 0 6px", fontWeight: 700 }}>{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color || "#ccc", margin: "2px 0", fontSize: 13 }}>
          {e.name}: {e.value}
        </p>
      ))}
    </div>
  );
};

// ── Avatar (used in PlayerCard, GameLog, etc.) ──────────────────────────────
function Avatar({ member, size = 32, color }) {
  if (member.avatar_url) {
    return (
      <img src={member.avatar_url} alt={member.display_name}
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

// ── Player Card (legacy-style headline card) ─────────────────────────────────
function PlayerCard({ member, idx, stats, isMe }) {
  const color = colorFor(member, idx);
  const suit  = suitFor(member, idx);
  const net   = stats?.net_chips ?? 0;
  const games = stats?.games_played ?? 0;
  const wins  = stats?.wins ?? 0;
  const winPct = games > 0 ? Math.round((wins / games) * 100) : 0;
  const isPos = net >= 0;
  return (
    <div style={{
      background: "linear-gradient(145deg,rgba(255,255,255,.05) 0%,rgba(0,0,0,.3) 100%)",
      border: `1px solid ${color}44`, borderTop: `3px solid ${color}`,
      borderRadius: 12, padding: "16px 18px", width: 150, textAlign: "center",
      boxShadow: `0 4px 20px ${color}18`,
      outline: isMe ? `1px solid ${color}` : "none",
    }}>
      <div style={{ fontSize: 26, color, marginBottom: 4 }}>{suit}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: "#f0e8d0", marginBottom: 8 }}>
        {member.display_name}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: isPos ? "#4fc3a1" : "#e05c5c", fontFamily: "monospace" }}>
        {isPos ? "+" : ""}{net}
      </div>
      <div style={{ fontSize: 11, color: "#8aab8a", marginBottom: 6 }}>net chips</div>
      <div style={{ fontSize: 13, color: "#c8bfa0" }}>{winPct}% wins</div>
      <div style={{ fontSize: 11, color: "#7a9a7a" }}>{games} games</div>
    </div>
  );
}

// ── Chart helpers ────────────────────────────────────────────────────────────
function ChartCard({ title, sub, children }) {
  return (
    <div style={S.chartCard}>
      <h3 style={S.chartTitle}>{title}</h3>
      {sub && <p style={S.chartSub}>{sub}</p>}
      {children}
    </div>
  );
}

// ── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab({ members, memberStats, currentUserId }) {
  const data = members.map((m, i) => ({
    name: nameFor(m, currentUserId),
    "Win Rate": memberStats[m.id]?.win_pct != null ? Math.round(memberStats[m.id].win_pct * 100) : 0,
    Wins: memberStats[m.id]?.wins ?? 0,
    Losses: memberStats[m.id]?.losses ?? 0,
    color: colorFor(m, i),
  }));
  return (
    <>
      <ChartCard title="Win Rate by Player (%)" sub="Percentage of games won">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
            <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
            <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} domain={[0, 100]} unit="%" />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="Win Rate" radius={[6, 6, 0, 0]}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Wins vs Losses" sub="Head-to-head game record">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
            <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
            <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ color: "#8aab8a" }} />
            <Bar dataKey="Wins"   fill="#4fc3a1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Losses" fill="#e05c5c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Stats table */}
      <ChartCard title="Member Stats" sub="Lifetime in this group, lobby games only">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr style={{ color: "#3a5a3a", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
                <th style={{ textAlign: "left", padding: "0 10px 8px" }}>Player</th>
                <th style={{ textAlign: "right", padding: "0 10px 8px" }}>Games</th>
                <th style={{ textAlign: "right", padding: "0 10px 8px" }}>W</th>
                <th style={{ textAlign: "right", padding: "0 10px 8px" }}>L</th>
                <th style={{ textAlign: "right", padding: "0 10px 8px" }}>Win %</th>
                <th style={{ textAlign: "right", padding: "0 10px 8px" }}>Bid %</th>
                <th style={{ textAlign: "right", padding: "0 10px 8px" }}>Avg</th>
                <th style={{ textAlign: "right", padding: "0 10px 8px" }}>Form</th>
                <th style={{ textAlign: "right", padding: "0 10px 8px" }}>Clutch</th>
                <th style={{ textAlign: "right", padding: "0 10px 8px" }}>MMR</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const s = memberStats[m.id] || {};
                const c = colorFor(m, i);
                const fmtPct = (v) => v != null ? `${Math.round(v * 100)}%` : "—";
                const isMe = m.id === currentUserId;
                return (
                  <tr key={m.id} style={{ borderTop: "1px solid #1a3a1a" }}>
                    <td style={{ padding: "10px", display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar member={m} size={26} color={c} />
                      <span style={{ color: isMe ? "#f0c040" : "#f0e8d0", fontWeight: isMe ? 700 : 400 }}>
                        {nameFor(m, currentUserId)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", color: "#8aab8a" }}>{s.games_played ?? 0}</td>
                    <td style={{ textAlign: "right", padding: "10px", color: "#4fc3a1" }}>{s.wins ?? 0}</td>
                    <td style={{ textAlign: "right", padding: "10px", color: "#8aab8a" }}>{s.losses ?? 0}</td>
                    <td style={{ textAlign: "right", padding: "10px", color: "#4fc3a1" }}>{fmtPct(s.win_pct)}</td>
                    <td style={{ textAlign: "right", padding: "10px", color: "#8aab8a" }}>{fmtPct(s.bid_rate)}</td>
                    <td style={{ textAlign: "right", padding: "10px", color: "#8aab8a" }}>{s.avg_score ?? "—"}</td>
                    <td style={{ textAlign: "right", padding: "10px", color: "#c8bfa0" }}>{fmtPct(s.recent_form)}</td>
                    <td style={{ textAlign: "right", padding: "10px", color: "#c8bfa0" }}>{fmtPct(s.clutch_rate)}</td>
                    <td style={{ textAlign: "right", padding: "10px", color: "#8aab8a", fontFamily: "monospace" }}>{s.mmr ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </>
  );
}

// ── Tab: Chips ───────────────────────────────────────────────────────────────
function ChipsTab({ members, memberStats, currentUserId }) {
  const data = members.map((m, i) => {
    const s = memberStats[m.id] || {};
    return {
      name: nameFor(m, currentUserId),
      "Net Chips": s.net_chips ?? 0,
      "CPG": s.cpg ?? 0,
      "Avg Win": s.avg_chip_win ?? 0,
      "Avg Loss": s.avg_chip_loss ?? 0,
      color: colorFor(m, i),
    };
  });
  return (
    <>
      <ChartCard title="Net Chips" sub="Total chips won or lost in this group">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
            <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
            <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="Net Chips" radius={[6, 6, 0, 0]}>
              {data.map((d) => <Cell key={d.name} fill={d["Net Chips"] >= 0 ? "#4fc3a1" : "#e05c5c"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Chips Per Game (CPG)" sub="Average chip swing per game played">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
            <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
            <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="CPG" radius={[6, 6, 0, 0]}>
              {data.map((d) => <Cell key={d.name} fill={d.CPG >= 0 ? "#4fc3a1" : "#e05c5c"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Avg Win vs Avg Loss" sub="How big are wins, how steep are losses">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
            <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
            <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ color: "#8aab8a" }} />
            <Bar dataKey="Avg Win"  fill="#4fc3a1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Avg Loss" fill="#e05c5c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}

// ── Tab: Sets ────────────────────────────────────────────────────────────────
function SetsTab({ members, memberStats, currentUserId }) {
  const data = members.map((m, i) => {
    const s = memberStats[m.id] || {};
    return {
      name: nameFor(m, currentUserId),
      "Sets Received": s.sets_received ?? 0,
      "Sets Paid": s.sets_paid ?? 0,
      "Balance": (s.sets_received ?? 0) - (s.sets_paid ?? 0),
      color: colorFor(m, i),
    };
  });
  return (
    <>
      <ChartCard title="Sets Received vs Paid" sub="Sets your team got off opponents vs sets your team paid out (bidder failed)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
            <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
            <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ color: "#8aab8a" }} />
            <Bar dataKey="Sets Received" fill="#f0c040" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Sets Paid"     fill="#7b9ef0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Sets Balance (Received − Paid)" sub="Positive = net set collector">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
            <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
            <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="Balance" radius={[6, 6, 0, 0]}>
              {data.map((d) => <Cell key={d.name} fill={d.Balance >= 0 ? "#4fc3a1" : "#e05c5c"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}

// ── Tab: Radar ───────────────────────────────────────────────────────────────
const RADAR_METRICS = [
  { key: "win_pct",       label: "Win Rate",     scale: (s) => (s.win_pct ?? 0) * 100,           fmt: (s) => `${Math.round((s.win_pct ?? 0) * 100)}%` },
  { key: "bid_rate",      label: "Bid %",        scale: (s) => (s.bid_rate ?? 0) * 100,          fmt: (s) => `${Math.round((s.bid_rate ?? 0) * 100)}%` },
  { key: "avg_score",     label: "Avg Score",    scale: (s) => Math.min(100, ((s.avg_score ?? 0) / 21) * 100),   fmt: (s) => `${s.avg_score ?? 0} pts` },
  { key: "cpg",           label: "CPG",          scale: (s) => Math.max(0, Math.min(100, (((s.cpg ?? 0) + 5) / 10) * 100)), fmt: (s) => `${(s.cpg ?? 0) >= 0 ? "+" : ""}${s.cpg ?? 0}/game` },
  { key: "sets_ratio",    label: "Sets Ratio",   scale: (s) => Math.min(100, ((s.sets_ratio ?? 0) / 2) * 100),   fmt: (s) => `${s.sets_ratio ?? 0}x` },
  { key: "recent_form",   label: "Recent Form",  scale: (s) => (s.recent_form ?? 0) * 100,        fmt: (s) => `${Math.round((s.recent_form ?? 0) * 100)}%` },
  { key: "clutch_rate",   label: "Clutch",       scale: (s) => (s.clutch_rate ?? 0) * 100,        fmt: (s) => `${Math.round((s.clutch_rate ?? 0) * 100)}%` },
  { key: "big_game_rate", label: "Big Game %",   scale: (s) => (s.big_game_rate ?? 0) * 100,      fmt: (s) => `${Math.round((s.big_game_rate ?? 0) * 100)}%` },
];

const DEFAULT_RADAR_KEYS = ["win_pct", "bid_rate", "avg_score", "recent_form", "clutch_rate"];

function RadarTab({ members, memberStats, currentUserId, hiddenMembers, toggleMember }) {
  const [active, setActive] = useState(DEFAULT_RADAR_KEYS);
  const toggle = (key) => setActive((prev) => {
    if (prev.includes(key)) return prev.length > 3 ? prev.filter((k) => k !== key) : prev;
    return prev.length < 7 ? [...prev, key] : prev;
  });
  const cfgs = RADAR_METRICS.filter((m) => active.includes(m.key));
  const data = cfgs.map((cfg) => {
    const row = { metric: cfg.label, _cfg: cfg };
    for (const m of members) {
      const s = memberStats[m.id] || {};
      row[m.id] = cfg.scale(s);
    }
    return row;
  });

  const RadarTooltip = ({ active: a, payload }) => {
    if (!a || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d?._cfg) return null;
    return (
      <div style={{ background: "#0d1f0d", border: "1px solid #2a5c2a", borderRadius: 8, padding: "10px 14px", maxWidth: 240 }}>
        <p style={{ color: "#f0c040", margin: "0 0 6px", fontWeight: 700 }}>{d.metric}</p>
        {members.map((m, i) => {
          if (hiddenMembers.has(m.id)) return null;
          const s = memberStats[m.id] || {};
          return (
            <p key={m.id} style={{ color: colorFor(m, i), margin: "2px 0", fontSize: 13 }}>
              {nameFor(m, currentUserId)}: {d._cfg.fmt(s)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <ChartCard title="Player Skill Radar" sub="Toggle metrics below · min 3, max 7 · hover for real values">
      {/* Member toggles */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {members.map((m, i) => {
          const c = colorFor(m, i);
          const hidden = hiddenMembers.has(m.id);
          return (
            <button key={m.id} onClick={() => toggleMember(m.id)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 16,
              border: `1px solid ${hidden ? "#2a4a2a" : c}`,
              background: hidden ? "transparent" : `${c}18`,
              color: hidden ? "#3a5a3a" : c,
              fontSize: 12, cursor: "pointer", fontFamily: "Georgia,serif",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: hidden ? "#2a4a2a" : c }} />
              {nameFor(m, currentUserId)}
            </button>
          );
        })}
      </div>
      {/* Metric toggles */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {RADAR_METRICS.map((m) => {
          const on = active.includes(m.key);
          return (
            <button key={m.key} onClick={() => toggle(m.key)} style={{
              padding: "5px 14px", borderRadius: 16, fontSize: 12, cursor: "pointer",
              fontFamily: "monospace", letterSpacing: 0.3,
              border: on ? "1px solid #f0c040" : "1px solid #2a4a2a",
              background: on ? "rgba(240,192,64,.15)" : "rgba(255,255,255,.03)",
              color: on ? "#f0c040" : "#5a7a5a",
            }}>
              {on ? "✓ " : ""}{m.label}
            </button>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <RadarChart data={data}>
          <PolarGrid stroke="#1e4a1e" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "#8aab8a", fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          {members.map((m, i) => {
            if (hiddenMembers.has(m.id)) return null;
            const c = colorFor(m, i);
            return (
              <Radar key={m.id} name={nameFor(m, currentUserId)} dataKey={m.id}
                stroke={c} fill={c} fillOpacity={0.10} strokeWidth={2}
              />
            );
          })}
          <Legend wrapperStyle={{ color: "#8aab8a" }} />
          <Tooltip content={<RadarTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Tab: Game Log ────────────────────────────────────────────────────────────
function GameLogTab({ members, sessions, legacyGames, currentUserId }) {
  // Build a unified, sorted log: each entry has { kind, date, ... }
  const entries = useMemo(() => {
    const out = [];
    for (const s of sessions) {
      out.push({
        kind: "session", id: `s-${s.id}`,
        date: s.date || (s.completed_at ? s.completed_at.slice(0, 10) : ""),
        timestamp: s.completed_at,
        session: s,
      });
    }
    for (const g of legacyGames) {
      out.push({
        kind: "legacy", id: `l-${g.id}`,
        date: g.date,
        timestamp: g.date ? `${g.date}T${g.time || "00:00"}:00` : "",
        legacy: g,
      });
    }
    return out.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
  }, [sessions, legacyGames]);

  if (entries.length === 0) {
    return (
      <div style={S.emptyBox}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>♠</div>
        <p style={{ color: "#5a7a5a", lineHeight: 1.6 }}>
          No games yet. Play a lobby game with all group members (no bots) and it'll show up here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map((e) => e.kind === "session"
        ? <SessionRow key={e.id} session={e.session} members={members} currentUserId={currentUserId} />
        : <LegacyRow  key={e.id} game={e.legacy} />
      )}
    </div>
  );
}

function SessionRow({ session, members, currentUserId }) {
  const teamScores = [session.team_a_score, session.team_b_score];
  const winningTeam = teamScores[1] > teamScores[0] ? 1 : 0;
  // Group players by team
  const byTeam = { 0: [], 1: [] };
  for (const p of session.players) byTeam[p.team]?.push(p);
  const wager = (session.wager_base > 0 || session.wager_per_set > 0)
    ? `${session.wager_base}+${session.wager_per_set}/set`
    : null;
  return (
    <div style={{
      background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e",
      borderRadius: 10, padding: "12px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        <div style={{ color: "#5a7a5a", fontSize: 12, fontFamily: "monospace" }}>
          {session.date || "—"} · LOBBY · {session.variant}P{wager ? ` · ${wager} chips` : ""}
        </div>
        <div style={{ color: "#f0c040", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>
          {teamScores[0]} <span style={{ color: "#5a7a5a", fontWeight: 400 }}>vs</span> {teamScores[1]}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {[0, 1].map((team) => {
          const playersOnTeam = byTeam[team];
          if (!playersOnTeam.length) return null;
          const isWinner = team === winningTeam;
          return (
            <div key={team} style={{
              flex: "1 1 220px",
              border: `1px solid ${isWinner ? "#4fc3a155" : "#2a4a2a"}`,
              borderRadius: 8, padding: "8px 10px",
              background: isWinner ? "rgba(79,195,161,.05)" : "transparent",
            }}>
              <div style={{ color: isWinner ? "#4fc3a1" : "#5a7a5a", fontSize: 11, fontFamily: "monospace", letterSpacing: 1, marginBottom: 6 }}>
                TEAM {team === 0 ? "A" : "B"} {isWinner ? "· WINNERS" : ""}
              </div>
              {playersOnTeam.map((p) => {
                const m = members.find((x) => x.id === p.user_id);
                if (!m) return null;
                const idx = members.indexOf(m);
                const c = colorFor(m, idx);
                const isMe = p.user_id === currentUserId;
                const delta = p.chip_delta;
                return (
                  <div key={p.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                    <Avatar member={m} size={22} color={c} />
                    <span style={{ color: isMe ? "#f0c040" : "#e8dfc8", fontSize: 13, fontWeight: isMe ? 700 : 400, flex: 1 }}>
                      {nameFor(m, currentUserId)}
                    </span>
                    <span style={{ color: "#8aab8a", fontFamily: "monospace", fontSize: 12 }}>
                      {p.final_score}
                    </span>
                    {delta !== 0 && (
                      <span style={{
                        color: delta > 0 ? "#4fc3a1" : "#e05c5c",
                        fontFamily: "monospace", fontSize: 12, minWidth: 36, textAlign: "right",
                      }}>
                        {delta > 0 ? "+" : ""}{delta}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegacyRow({ game }) {
  const players = ["matt", "seth", "mack", "arnav", "henry"]
    .map((k) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), key: k, val: game[k] }))
    .filter((p) => p.val !== null);
  return (
    <div style={{
      background: "rgba(255,255,255,.02)", border: "1px dashed #1e4a1e",
      borderRadius: 10, padding: "12px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        <div style={{ color: "#5a7a5a", fontSize: 12, fontFamily: "monospace" }}>
          {game.date || "—"} {game.time ? `· ${game.time}` : ""} · LEGACY · cash entry
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {players.map((p) => (
          <div key={p.key} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 8,
            border: `1px solid ${p.val > 0 ? "#4fc3a155" : "#e05c5c44"}`,
            background: p.val > 0 ? "rgba(79,195,161,.06)" : "rgba(224,92,92,.06)",
          }}>
            <span style={{ color: LEGACY_COLORS[p.key] || "#8aab8a", fontWeight: 700, fontSize: 13 }}>
              {LEGACY_SUITS[p.key]} {p.name}
            </span>
            <span style={{
              fontFamily: "monospace", fontSize: 13,
              color: p.val > 0 ? "#4fc3a1" : "#e05c5c",
            }}>
              {p.val > 0 ? `+$${p.val}` : `-$${Math.abs(p.val)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Night ───────────────────────────────────────────────────────────────
function NightTab({ members, sessions, legacyGames, currentUserId }) {
  const today = new Date().toISOString().slice(0, 10);
  const allDates = useMemo(() => {
    const set = new Set();
    for (const s of sessions) if (s.date) set.add(s.date);
    for (const g of legacyGames) if (g.date) set.add(g.date);
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [sessions, legacyGames]);

  const [selected, setSelected] = useState(today);

  const nightSessions = sessions.filter((s) => s.date === selected);
  const nightLegacy = legacyGames.filter((g) => g.date === selected);

  // Per-player chip totals for selected date
  const playerTotals = {};
  for (const s of nightSessions) {
    for (const p of s.players) {
      if (!playerTotals[p.user_id]) playerTotals[p.user_id] = { games: 0, chips: 0 };
      playerTotals[p.user_id].games++;
      playerTotals[p.user_id].chips += p.chip_delta;
    }
  }

  return (
    <div>
      <ChartCard title="🌙 Night Tracker" sub="Select a date to review that session.">
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <label style={{ color: "#8aab8a", fontSize: 12, fontFamily: "monospace", display: "block", marginBottom: 6 }}>DATE</label>
            <input type="date" value={selected} onChange={(e) => setSelected(e.target.value)}
              style={{
                background: "rgba(255,255,255,.06)", border: "1px solid #2a4a2a",
                borderRadius: 8, padding: "8px 12px", color: "#e8dfc8",
                fontSize: 14, fontFamily: "monospace", outline: "none", colorScheme: "dark",
              }}
            />
          </div>
          {allDates.length > 0 && (
            <div>
              <label style={{ color: "#8aab8a", fontSize: 12, fontFamily: "monospace", display: "block", marginBottom: 6 }}>JUMP TO</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {allDates.slice(0, 6).map((d) => (
                  <button key={d} onClick={() => setSelected(d)} style={{
                    padding: "6px 12px", borderRadius: 12, fontSize: 12, cursor: "pointer",
                    fontFamily: "monospace",
                    border: selected === d ? "1px solid #f0c040" : "1px solid #2a4a2a",
                    background: selected === d ? "rgba(240,192,64,.15)" : "rgba(255,255,255,.03)",
                    color: selected === d ? "#f0c040" : "#5a7a5a",
                  }}>{d}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ChartCard>

      {(nightSessions.length === 0 && nightLegacy.length === 0) ? (
        <div style={{ ...S.chartCard, textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "#5a7a5a", fontSize: 14, fontFamily: "monospace" }}>No games on {selected}.</p>
        </div>
      ) : (
        <>
          {Object.keys(playerTotals).length > 0 && (
            <ChartCard title={`Chip Movement — ${selected}`} sub={`${nightSessions.length} lobby game${nightSessions.length !== 1 ? "s" : ""} this night`}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {Object.entries(playerTotals).map(([uid, totals]) => {
                  const m = members.find((x) => x.id === uid);
                  if (!m) return null;
                  const idx = members.indexOf(m);
                  const c = colorFor(m, idx);
                  const isPos = totals.chips >= 0;
                  return (
                    <div key={uid} style={{
                      background: "rgba(255,255,255,.03)",
                      border: `1px solid ${c}44`, borderTop: `3px solid ${c}`,
                      borderRadius: 10, padding: "12px 18px", minWidth: 140, textAlign: "center",
                    }}>
                      <div style={{ color: c, fontSize: 18, marginBottom: 4 }}>{suitFor(m, idx)}</div>
                      <div style={{ color: "#f0e8d0", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        {nameFor(m, currentUserId)}
                      </div>
                      <div style={{ color: isPos ? "#4fc3a1" : "#e05c5c", fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>
                        {isPos ? "+" : ""}{totals.chips}
                      </div>
                      <div style={{ color: "#5a7a5a", fontSize: 11, marginTop: 4 }}>
                        {totals.games} game{totals.games !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p style={{ color: "#3a5a3a", fontSize: 11, fontFamily: "monospace", marginTop: 16, textAlign: "center" }}>
                Chips already moved between accounts when each game ended — no manual settle-up needed.
              </p>
            </ChartCard>
          )}

          {nightSessions.length > 0 && (
            <ChartCard title="Lobby Games" sub={`${nightSessions.length} session${nightSessions.length !== 1 ? "s" : ""}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {nightSessions.map((s) => (
                  <SessionRow key={s.id} session={s} members={members} currentUserId={currentUserId} />
                ))}
              </div>
            </ChartCard>
          )}

          {nightLegacy.length > 0 && (
            <ChartCard title="Legacy Cash Entries" sub="Manually-entered games from the legacy dashboard">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {nightLegacy.map((g) => <LegacyRow key={g.id} game={g} />)}
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
const TABS = ["Overview", "Chips", "Sets", "Radar", "Game Log", "Night"];

export default function GroupPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [hiddenMembers, setHiddenMembers] = useState(new Set());

  useEffect(() => {
    setLoading(true);
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
  }, [slug, navigate]);

  if (loading) {
    return (
      <div style={S.page}>
        <Navbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#5a7a5a" }}>
          Loading…
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={S.page}>
        <Navbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#e05c5c" }}>
          {error}
        </div>
      </div>
    );
  }

  const members = analytics?.members || [];
  const memberStats = analytics?.memberStats || {};
  const sessions = analytics?.sessions || [];
  const legacyGames = analytics?.legacyGames || [];
  const showLegacyLink = legacyGames.length > 0;
  const currentUserId = user?.id;

  function toggleMember(id) {
    setHiddenMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div style={S.page}>
      <Navbar />

      {/* Header */}
      <div style={S.header}>
        <p style={{ color: "#4fc3a1", fontSize: 11, letterSpacing: 6, textTransform: "uppercase", margin: "0 0 8px", fontFamily: "monospace" }}>
          Group Analytics
        </p>
        <h1 style={S.title}>{group?.name}</h1>
        <p style={S.subtitle}>
          {members.length} member{members.length !== 1 ? "s" : ""} · {sessions.length} lobby game{sessions.length !== 1 ? "s" : ""}
          {legacyGames.length > 0 ? ` · ${legacyGames.length} legacy entries` : ""}
        </p>
        {showLegacyLink && (
          <Link to={`/group/${slug}/legacy`} style={S.legacyLink}>
            Open Legacy View →
          </Link>
        )}
      </div>

      {/* Player cards */}
      {members.length > 0 && (
        <div style={S.cardGrid}>
          {members.map((m, i) => (
            <PlayerCard
              key={m.id} member={m} idx={i}
              stats={memberStats[m.id]} isMe={m.id === currentUserId}
            />
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(activeTab === t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={S.content}>
        {sessions.length === 0 && legacyGames.length === 0 ? (
          <div style={S.emptyBox}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>♠</div>
            <p style={{ color: "#5a7a5a", lineHeight: 1.6 }}>
              No games yet. Play a lobby game with all group members (no bots) and it'll show up here.
            </p>
          </div>
        ) : (
          <>
            {activeTab === "Overview" && <OverviewTab members={members} memberStats={memberStats} currentUserId={currentUserId} />}
            {activeTab === "Chips"    && <ChipsTab    members={members} memberStats={memberStats} currentUserId={currentUserId} />}
            {activeTab === "Sets"     && <SetsTab     members={members} memberStats={memberStats} currentUserId={currentUserId} />}
            {activeTab === "Radar"    && (
              <RadarTab
                members={members} memberStats={memberStats} currentUserId={currentUserId}
                hiddenMembers={hiddenMembers} toggleMember={toggleMember}
              />
            )}
            {activeTab === "Game Log" && <GameLogTab members={members} sessions={sessions} legacyGames={legacyGames} currentUserId={currentUserId} />}
            {activeTab === "Night"    && <NightTab    members={members} sessions={sessions} legacyGames={legacyGames} currentUserId={currentUserId} />}
          </>
        )}
      </div>
    </div>
  );
}
