import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ScatterChart, Scatter, Cell, PieChart, Pie, LineChart, Line
} from "recharts";

// Use relative URL in production, localhost in development
const API = import.meta.env.PROD ? "/api" : "http://localhost:3001/api";
const PLAYERS = ["Matt", "Seth", "Mack", "Arnav", "Henry"];
const COLORS = { Matt: "#f0c040", Seth: "#4fc3a1", Mack: "#e05c5c", Arnav: "#7b9ef0", Henry: "#d17be8" };
const SUITS  = { Matt: "♠", Seth: "♣", Mack: "♦", Arnav: "♥", Henry: "★" };

const METRIC_DEFINITIONS = {
  winRate:     "The percentage of games a player won out of all games they participated in. The most direct measure of overall performance — a score above 50 means you win more than you lose.",
  ppg:         "Profit Per Game. The average dollar amount earned (or lost) per game played. Unlike net profit, this accounts for how many games each player actually showed up for, making it the fairest cross-player comparison.",
  setsRatio:   "Sets Received divided by Sets Paid Out. A ratio above 1.0 means you collected more sets than you gave away. Reflects how dominant a player is in the set economy — consistently above 1.0 means opponents are regularly paying you out.",
  avgWinSize:  "The average dollar value of a winning hand. A player who consistently wins big hands scores higher than one who only wins small pots. Measures aggression and skill in high-value situations.",
  lossControl: "How small your average loss is when you do lose. Scaled from $2 (best, scores 100) to $6 (worst, scores 0) — $4 average sits at neutral 50. A high score means you keep losses tight; a low score means you're regularly bleeding out on bad hands.",
  bigGameRate: "The percentage of your games where the result (win or loss) was $4 or more. High = you're regularly involved in high-stakes hands. Neither inherently good nor bad — pairs well with Clutch Rate to see if you win or lose those big games.",
  recentForm:  "Your win rate over your last 15 games only. Ignores historical results entirely — shows who is playing well right now vs. coasting on an early hot streak. The most volatile metric; can shift dramatically after a bad run.",
  clutchRate:  "Your win rate specifically in games where $4 or more was on the line. Separates players who perform under pressure from those who only win the cheap hands. Requires a decent sample of $4+ games to be reliable.",
};

// ── Password helpers ─────────────────────────────────────────────────────────
const getStoredPassword = () => {
  try { return localStorage.getItem("pitchAdminPassword") || ""; } 
  catch { return ""; }
};
const setStoredPassword = (pw) => {
  try { localStorage.setItem("pitchAdminPassword", pw); } 
  catch {}
};

// ── Stat calculations ─────────────────────────────────────────────────────────
function calcStats(games) {
  return Object.fromEntries(PLAYERS.map(p => {
    const played   = games.filter(g => g[p] !== null);
    const wins     = played.filter(g => g[p] > 0);
    const losses   = played.filter(g => g[p] < 0);
    const winnings = wins.reduce((s, g) => s + g[p], 0);
    const lossAmt  = losses.reduce((s, g) => s + g[p], 0);
    const net      = winnings + lossAmt;
    const ppg      = played.length > 0 ? +(net / played.length).toFixed(2) : 0;
    // mirrors original Excel: setsPaid=ABS(lossAmt+(lost*2)), setsReceived=ABS(winnings-(won*2))
    const setsPaid     = Math.abs(lossAmt + (losses.length * 2));
    const setsReceived = Math.abs(winnings - (wins.length * 2));
    // sets ratio: received / paid (higher = better); avoid div/0
    const setsRatio = setsPaid > 0 ? +(setsReceived / setsPaid).toFixed(3) : 0;
    // avg win size: average dollars earned per win
    const avgWinSize = wins.length > 0 ? +(winnings / wins.length).toFixed(2) : 0;
    // loss control: average dollars lost per loss (as positive; smaller = better)
    const avgLossSize = losses.length > 0 ? +(Math.abs(lossAmt) / losses.length).toFixed(2) : 0;
    // big game rate: % of games where abs(result) >= $4
    const bigGames = played.filter(g => Math.abs(g[p]) >= 4);
    const bigGameRate = played.length > 0 ? +((bigGames.length / played.length) * 100).toFixed(1) : 0;
    // recent form: win rate over last 15 games played
    const last15 = played.slice(-15);
    const recentForm = last15.length > 0 ? +((last15.filter(g => g[p] > 0).length / last15.length) * 100).toFixed(1) : 0;
    // clutch rate: win rate in $4+ games specifically
    const bigWins = bigGames.filter(g => g[p] > 0);
    const clutchRate = bigGames.length > 0 ? +((bigWins.length / bigGames.length) * 100).toFixed(1) : 0;
    return [p, {
      games: played.length, won: wins.length, lost: losses.length,
      winnings, losses: lossAmt, net, ppg, setsPaid, setsReceived, setsRatio,
      avgWinSize, avgLossSize, bigGameRate, recentForm, clutchRate,
    }];
  }));
}

// ── Cumulative net over time ──────────────────────────────────────────────────
function calcCumulative(games) {
  const running = Object.fromEntries(PLAYERS.map(p => [p, 0]));
  return games.map((g, i) => {
    PLAYERS.forEach(p => { if (g[p] !== null) running[p] = +(running[p] + g[p]).toFixed(2); });
    return { game: i + 1, ...Object.fromEntries(PLAYERS.map(p => [p, running[p]])) };
  });
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:       { minHeight: "100vh", background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)", color: "#e8dfc8", fontFamily: "'Georgia',serif", paddingBottom: 60 },
  header:     { textAlign: "center", padding: "40px 20px 20px", borderBottom: "1px solid #1e4a1e", background: "linear-gradient(180deg,rgba(0,0,0,.4) 0%,transparent 100%)", position: "relative" },
  title:      { fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,5vw,52px)", color: "#f0c040", margin: "0 0 6px", textShadow: "0 2px 20px rgba(240,192,64,.3)", letterSpacing: 2 },
  subtitle:   { color: "#8aab8a", fontSize: 14, margin: 0 },
  cardGrid:   { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, padding: "28px 20px 0" },
  tabs:       { display: "flex", justifyContent: "center", gap: 6, padding: "24px 20px 0", flexWrap: "wrap" },
  content:    { padding: "24px 20px 0", maxWidth: 920, margin: "0 auto" },
  chartCard:  { background: "rgba(255,255,255,.03)", border: "1px solid #1e4a1e", borderRadius: 14, padding: "22px 20px", marginBottom: 20 },
  chartTitle: { fontFamily: "'Playfair Display',serif", color: "#f0e8d0", margin: "0 0 4px", fontSize: 17 },
  chartSub:   { color: "#5a7a5a", fontSize: 12, margin: "0 0 18px", fontFamily: "monospace" },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d1f0d", border: "1px solid #2a5c2a", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: "#f0c040", fontFamily: "'Playfair Display',serif", margin: "0 0 6px", fontWeight: 700 }}>{label || payload[0]?.payload?.name}</p>
      {payload.map((e, i) => <p key={i} style={{ color: e.color || "#ccc", margin: "2px 0", fontSize: 13 }}>{e.name}: {e.value}</p>)}
    </div>
  );
};

// ── Night Tracker ────────────────────────────────────────────────────────────
function NightTracker({ games, onAdd }) {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  // All unique dates that have games, sorted descending
  const gameDates = [...new Set(games.map(g => g.date).filter(Boolean))].sort((a, b) => b.localeCompare(a));

  const nightGames = games.filter(g => g.date === selectedDate);

  // Per-player totals for the night
  const nightTotals = Object.fromEntries(PLAYERS.map(p => {
    const played = nightGames.filter(g => g[p] !== null);
    const net = played.reduce((s, g) => s + g[p], 0);
    return [p, { net, played: played.length }];
  }));

  // Settle-up: who owes who
  // Build list of balances, then greedily match debtors to creditors
  const balances = PLAYERS.map(p => ({ name: p, bal: nightTotals[p].net }))
    .filter(x => x.bal !== 0);
  const creditors = balances.filter(x => x.bal > 0).sort((a, b) => b.bal - a.bal);
  const debtors   = balances.filter(x => x.bal < 0).sort((a, b) => a.bal - b.bal);
  const settlements = [];
  const creds = creditors.map(c => ({ ...c }));
  const debts = debtors.map(d => ({ ...d }));
  let ci = 0, di = 0;
  while (ci < creds.length && di < debts.length) {
    const amount = Math.min(creds[ci].bal, Math.abs(debts[di].bal));
    if (amount > 0.001) settlements.push({ from: debts[di].name, to: creds[ci].name, amount: +amount.toFixed(2) });
    creds[ci].bal -= amount;
    debts[di].bal += amount;
    if (Math.abs(creds[ci].bal) < 0.001) ci++;
    if (Math.abs(debts[di].bal) < 0.001) di++;
  }

  const cellStyle = (val) => ({
    padding: "6px 12px", textAlign: "center", fontFamily: "monospace", fontSize: 13,
    color: val === null ? "#3a5a3a" : val > 0 ? "#4fc3a1" : "#e05c5c",
    background: val === null ? "transparent" : val > 0 ? "rgba(79,195,161,.08)" : "rgba(224,92,92,.08)",
  });

  return (
    <div>
      {/* Date selector */}
      <div style={{ ...S.chartCard, border: "1px solid #2a5c2a" }}>
        <h3 style={S.chartTitle}>🌙 Night Tracker</h3>
        <p style={S.chartSub}>Select a date to review that session and see who owes who.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: gameDates.length > 0 ? 16 : 0 }}>
          <div>
            <label style={{ color: "#8aab8a", fontSize: 12, fontFamily: "monospace", display: "block", marginBottom: 6 }}>DATE</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                background: "rgba(255,255,255,.06)", border: "1px solid #2a4a2a",
                borderRadius: 8, padding: "8px 12px", color: "#e8dfc8",
                fontSize: 14, fontFamily: "monospace", outline: "none", colorScheme: "dark",
              }}
            />
          </div>
          {/* Quick-jump to past nights */}
          {gameDates.length > 0 && (
            <div>
              <label style={{ color: "#8aab8a", fontSize: 12, fontFamily: "monospace", display: "block", marginBottom: 6 }}>JUMP TO</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {gameDates.slice(0, 6).map(d => (
                  <button key={d} onClick={() => setSelectedDate(d)} style={{
                    padding: "6px 12px", borderRadius: 12, fontSize: 12, cursor: "pointer",
                    fontFamily: "monospace", transition: "all .15s",
                    border: selectedDate === d ? "1px solid #f0c040" : "1px solid #2a4a2a",
                    background: selectedDate === d ? "rgba(240,192,64,.15)" : "rgba(255,255,255,.03)",
                    color: selectedDate === d ? "#f0c040" : "#5a7a5a",
                  }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {nightGames.length === 0 ? (
        <div style={{ ...S.chartCard, textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "#5a7a5a", fontSize: 14, fontFamily: "monospace" }}>No games logged for {selectedDate}.</p>
          <p style={{ color: "#3a5a3a", fontSize: 12, marginTop: 8 }}>Use the Overview tab to log games — make sure to set the date above.</p>
        </div>
      ) : (<>

        {/* Night totals per player */}
        <div style={{ ...S.chartCard }}>
          <h3 style={S.chartTitle}>Results for {selectedDate}</h3>
          <p style={S.chartSub}>{nightGames.length} games played this session</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
            {PLAYERS.map(p => {
              const { net, played } = nightTotals[p];
              if (played === 0) return null;
              const isPos = net >= 0;
              return (
                <div key={p} style={{
                  background: "rgba(255,255,255,.03)",
                  border: `1px solid ${COLORS[p]}44`, borderTop: `3px solid ${COLORS[p]}`,
                  borderRadius: 10, padding: "14px 18px", minWidth: 110, textAlign: "center",
                }}>
                  <div style={{ color: COLORS[p], fontSize: 20, marginBottom: 4 }}>{SUITS[p]}</div>
                  <div style={{ color: "#f0e8d0", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p}</div>
                  <div style={{ color: isPos ? "#4fc3a1" : "#e05c5c", fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>
                    {isPos ? "+" : ""}${net}
                  </div>
                  <div style={{ color: "#5a7a5a", fontSize: 11, marginTop: 4 }}>{played} games</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Settle-up */}
        <div style={{ ...S.chartCard, border: "1px solid #2a4a2a" }}>
          <h3 style={S.chartTitle}>💸 Settle Up</h3>
          <p style={S.chartSub}>Minimum transactions to zero everyone out</p>
          {settlements.length === 0 ? (
            <p style={{ color: "#4fc3a1", fontFamily: "monospace", fontSize: 14 }}>✓ Everyone is square!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {settlements.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(255,255,255,.03)", border: "1px solid #1a3a1a",
                  borderRadius: 10, padding: "14px 18px",
                }}>
                  <span style={{ color: COLORS[s.from], fontSize: 18 }}>{SUITS[s.from]}</span>
                  <span style={{ color: "#e05c5c", fontWeight: 700, fontSize: 15 }}>{s.from}</span>
                  <span style={{ color: "#5a7a5a", fontSize: 13, margin: "0 4px" }}>pays</span>
                  <span style={{ color: "#4fc3a1", fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>${s.amount}</span>
                  <span style={{ color: "#5a7a5a", fontSize: 13, margin: "0 4px" }}>to</span>
                  <span style={{ color: COLORS[s.to], fontSize: 18 }}>{SUITS[s.to]}</span>
                  <span style={{ color: "#4fc3a1", fontWeight: 700, fontSize: 15 }}>{s.to}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Game-by-game table for the night */}
        <div style={{ ...S.chartCard, maxHeight: 360, overflow: "auto" }}>
          <h3 style={S.chartTitle}>Game by Game</h3>
          <p style={S.chartSub}>All {nightGames.length} games from this session</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, background: "#0d2b0d" }}>
                <th style={{ padding: "8px 12px", color: "#8aab8a", textAlign: "center" }}>#</th>
                <th style={{ padding: "8px 12px", color: "#8aab8a", textAlign: "center" }}>Time</th>
                {PLAYERS.map(p => (
                  <th key={p} style={{ padding: "8px 12px", color: COLORS[p], textAlign: "center", fontWeight: 600 }}>
                    {SUITS[p]} {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nightGames.map((g, i) => (
                <tr key={g.id} style={{ borderTop: "1px solid #1a3a1a" }}>
                  <td style={{ padding: "6px 12px", color: "#5a7a5a", textAlign: "center", fontFamily: "monospace" }}>{i + 1}</td>
                  <td style={{ padding: "6px 12px", color: "#5a7a5a", textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{g.time || "—"}</td>
                  {PLAYERS.map(p => (
                    <td key={p} style={cellStyle(g[p])}>
                      {g[p] === null ? "—" : g[p] > 0 ? `+$${g[p]}` : `-$${Math.abs(g[p])}`}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ borderTop: "2px solid #2a4a2a", background: "rgba(255,255,255,.03)" }}>
                <td style={{ padding: "8px 12px", color: "#8aab8a", textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>Σ</td>
                <td style={{ padding: "6px 12px" }}></td>
                {PLAYERS.map(p => {
                  const v = nightTotals[p].net;
                  return (
                    <td key={p} style={{ ...cellStyle(v === 0 ? null : v), fontWeight: 700 }}>
                      {nightTotals[p].played === 0 ? "—" : v > 0 ? `+$${v}` : v < 0 ? `-$${Math.abs(v)}` : "$0"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

      </>)}

      {/* Log new game for this date inline */}
      <AddGameForm onAdd={onAdd} defaultDate={selectedDate} />
    </div>
  );
}

// ── Add Game Form ─────────────────────────────────────────────────────────────
function AddGameForm({ onAdd, defaultDate }) {
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);
  const [values, setValues] = useState(Object.fromEntries(PLAYERS.map(p => [p, ""])));
  const [date, setDate]     = useState(defaultDate || today);
  const [time, setTime]     = useState(nowTime);
  const [password, setPassword] = useState(getStoredPassword);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync date when defaultDate prop changes (e.g., user picks a new date in NightTracker)
  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
  }, [defaultDate]);

  const set = (p, v) => setValues(prev => ({ ...prev, [p]: v }));

  const validate = () => {
    const filled = PLAYERS.filter(p => values[p] !== "");
    if (filled.length < 2) return "At least 2 players must have a score.";
    const sum = filled.reduce((s, p) => s + Number(values[p]), 0);
    if (Math.abs(sum) > 0.01) return `Scores must sum to 0 (currently ${sum > 0 ? "+" : ""}${sum}).`;
    if (!password) return "Password required.";
    return "";
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/games`, {
        method: "POST", 
        headers: { 
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ ...values, date, time }),
      });
      if (res.status === 401) {
        setError("Invalid password");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Server error");
      const newGame = await res.json();
      setStoredPassword(password); // Save password on success
      onAdd(newGame);
      setValues(Object.fromEntries(PLAYERS.map(p => [p, ""])));
      setTime(new Date().toTimeString().slice(0, 5)); // Reset to current time
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e) {
      setError("Failed to save — is the server running?");
    }
    setLoading(false);
  };

  const inputStyle = (p) => ({
    width: "100%", background: "rgba(255,255,255,.06)", border: `1px solid ${COLORS[p]}55`,
    borderRadius: 8, padding: "10px 12px", color: "#e8dfc8", fontSize: 15,
    fontFamily: "monospace", textAlign: "center", outline: "none", boxSizing: "border-box",
  });

  return (
    <div style={{ ...S.chartCard, border: "1px solid #2a5c2a" }}>
      <h3 style={S.chartTitle}>🃏 Log New Game</h3>
      <p style={S.chartSub}>Enter each player's result. Scores must sum to zero. Leave blank if a player didn't play.</p>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <label style={{ color: "#8aab8a", fontSize: 12, fontFamily: "monospace", display: "block", marginBottom: 6 }}>DATE</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              background: "rgba(255,255,255,.06)", border: "1px solid #2a4a2a",
              borderRadius: 8, padding: "8px 12px", color: "#e8dfc8",
              fontSize: 14, fontFamily: "monospace", outline: "none",
              colorScheme: "dark",
            }}
          />
        </div>
        <div>
          <label style={{ color: "#8aab8a", fontSize: 12, fontFamily: "monospace", display: "block", marginBottom: 6 }}>TIME</label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{
              background: "rgba(255,255,255,.06)", border: "1px solid #2a4a2a",
              borderRadius: 8, padding: "8px 12px", color: "#e8dfc8",
              fontSize: 14, fontFamily: "monospace", outline: "none",
              colorScheme: "dark",
            }}
          />
        </div>
        <div>
          <label style={{ color: "#8aab8a", fontSize: 12, fontFamily: "monospace", display: "block", marginBottom: 6 }}>PASSWORD 🔒</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••"
            style={{
              background: "rgba(255,255,255,.06)", border: "1px solid #2a4a2a",
              borderRadius: 8, padding: "8px 12px", color: "#e8dfc8",
              fontSize: 14, fontFamily: "monospace", outline: "none",
              width: 100,
            }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
        {PLAYERS.map(p => (
          <div key={p} style={{ textAlign: "center" }}>
            <div style={{ color: COLORS[p], fontWeight: 700, marginBottom: 6, fontSize: 14 }}>{SUITS[p]} {p}</div>
            <input
              type="number"
              placeholder="—"
              value={values[p]}
              onChange={e => set(p, e.target.value)}
              style={inputStyle(p)}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: "10px 28px", borderRadius: 20, border: "1px solid #f0c040",
            background: "rgba(240,192,64,.15)", color: "#f0c040", cursor: "pointer",
            fontSize: 14, fontFamily: "Georgia,serif", letterSpacing: .5,
            opacity: loading ? .6 : 1,
          }}
        >
          {loading ? "Saving..." : "Add Game"}
        </button>
        {error   && <span style={{ color: "#e05c5c", fontSize: 13 }}>⚠ {error}</span>}
        {success && <span style={{ color: "#4fc3a1", fontSize: 13 }}>✓ Game saved!</span>}

        {/* Live sum indicator */}
        <span style={{ marginLeft: "auto", color: "#5a7a5a", fontSize: 12, fontFamily: "monospace" }}>
          Sum: {PLAYERS.filter(p => values[p] !== "").reduce((s, p) => s + Number(values[p]), 0)}
        </span>
      </div>
    </div>
  );
}

// ── Game Log Table ────────────────────────────────────────────────────────────
function GameLog({ games, onDelete, deleteError }) {
  const [confirmId, setConfirmId] = useState(null);

  const cellStyle = (val) => ({
    padding: "6px 12px", textAlign: "center", fontFamily: "monospace", fontSize: 13,
    color: val === null ? "#3a5a3a" : val > 0 ? "#4fc3a1" : "#e05c5c",
    background: val === null ? "transparent" : val > 0 ? "rgba(79,195,161,.08)" : "rgba(224,92,92,.08)",
  });

  return (
    <div style={{ ...S.chartCard, maxHeight: 400, overflow: "auto" }}>
      <h3 style={S.chartTitle}>📋 Game Log</h3>
      <p style={S.chartSub}>Full history · {games.length} games total</p>
      {deleteError && <p style={{ color: "#e05c5c", fontSize: 13, marginBottom: 10 }}>⚠ {deleteError}</p>}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ position: "sticky", top: 0, background: "#0d2b0d" }}>
            <th style={{ padding: "8px 12px", color: "#8aab8a", textAlign: "center", fontWeight: 600 }}>#</th>
            <th style={{ padding: "8px 12px", color: "#8aab8a", textAlign: "center", fontWeight: 600 }}>Date</th>
            <th style={{ padding: "8px 12px", color: "#8aab8a", textAlign: "center", fontWeight: 600 }}>Time</th>
            {PLAYERS.map(p => (
              <th key={p} style={{ padding: "8px 12px", color: COLORS[p], textAlign: "center", fontWeight: 600 }}>
                {SUITS[p]} {p}
              </th>
            ))}
            <th style={{ padding: "8px 12px", color: "#5a7a5a", textAlign: "center" }}>Delete</th>
          </tr>
        </thead>
        <tbody>
          {[...games].reverse().map((g) => (
            <tr key={g.id} style={{ borderTop: "1px solid #1a3a1a" }}>
              <td style={{ padding: "6px 12px", color: "#5a7a5a", textAlign: "center", fontFamily: "monospace" }}>{g.id}</td>
              <td style={{ padding: "6px 12px", color: "#5a7a5a", textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{g.date || "—"}</td>
              <td style={{ padding: "6px 12px", color: "#5a7a5a", textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{g.time || "—"}</td>
              {PLAYERS.map(p => (
                <td key={p} style={cellStyle(g[p])}>
                  {g[p] === null ? "—" : g[p] > 0 ? `+$${g[p]}` : `-$${Math.abs(g[p])}`}
                </td>
              ))}
              <td style={{ textAlign: "center" }}>
                {confirmId === g.id ? (
                  <span>
                    <button onClick={() => { onDelete(g.id); setConfirmId(null); }}
                      style={{ background: "none", border: "none", color: "#e05c5c", cursor: "pointer", fontSize: 12 }}>
                      Confirm
                    </button>
                    <button onClick={() => setConfirmId(null)}
                      style={{ background: "none", border: "none", color: "#5a7a5a", cursor: "pointer", fontSize: 12, marginLeft: 4 }}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmId(g.id)}
                    style={{ background: "none", border: "none", color: "#3a5a3a", cursor: "pointer", fontSize: 14 }}>
                    ✕
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({ name, stats }) {
  const isPos = stats.net >= 0;
  return (
    <div style={{
      background: "linear-gradient(145deg,rgba(255,255,255,.05) 0%,rgba(0,0,0,.3) 100%)",
      border: `1px solid ${COLORS[name]}44`, borderTop: `3px solid ${COLORS[name]}`,
      borderRadius: 12, padding: "18px 20px", width: 150, textAlign: "center",
      boxShadow: `0 4px 20px ${COLORS[name]}18`, transition: "transform .2s,box-shadow .2s", cursor: "default",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 8px 30px ${COLORS[name]}35`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";   e.currentTarget.style.boxShadow = `0 4px 20px ${COLORS[name]}18`; }}
    >
      <div style={{ fontSize: 28, color: COLORS[name], marginBottom: 4 }}>{SUITS[name]}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#f0e8d0", marginBottom: 10 }}>{name}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: isPos ? "#4fc3a1" : "#e05c5c", fontFamily: "monospace" }}>
        {isPos ? "+" : ""}${stats.net}
      </div>
      <div style={{ fontSize: 11, color: "#8aab8a", marginBottom: 8 }}>net profit</div>
      <div style={{ fontSize: 13, color: "#c8bfa0" }}>{stats.games > 0 ? ((stats.won / stats.games) * 100).toFixed(0) : 0}% wins</div>
      <div style={{ fontSize: 12, color: "#7a9a7a" }}>{stats.games} games</div>
      {name === "Seth" && (
        <div style={{ marginTop: 8, fontSize: 10, color: "#e05c5c", background: "rgba(224,92,92,.1)", borderRadius: 4, padding: "2px 6px" }}>
          🎭 rage quitter
        </div>
      )}
    </div>
  );
}

// ── Chart helpers ─────────────────────────────────────────────────────────────
function ChartCard({ title, sub, children }) {
  return (
    <div style={S.chartCard}>
      <h3 style={S.chartTitle}>{title}</h3>
      <p  style={S.chartSub}>{sub}</p>
      {children}
    </div>
  );
}

function tabStyle(active) {
  return {
    padding: "8px 20px", borderRadius: 20,
    border: active ? "1px solid #f0c040" : "1px solid #2a4a2a",
    background: active ? "rgba(240,192,64,.15)" : "rgba(255,255,255,.03)",
    color: active ? "#f0c040" : "#8aab8a", cursor: "pointer", fontSize: 13,
    fontFamily: "Georgia,serif", letterSpacing: .5, transition: "all .2s",
  };
}

// ── App ───────────────────────────────────────────────────────────────────────
const TABS = ["Overview", "Financials", "Sets", "Radar", "Trend", "Night", "Log"];

export default function PitchDashboard() {
  const [games,  setGames]  = useState([]);
  const [tab,    setTab]    = useState("Overview");
  const [loading,setLoading] = useState(true);
  const [error,  setError]  = useState("");
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/games`);
      if (!res.ok) throw new Error();
      setGames(await res.json());
    } catch {
      setError("Cannot reach server. Make sure `npm start` is running in the /server folder.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd    = (g)  => setGames(prev => [...prev, g]);
  const handleDelete = async (id) => {
    const password = getStoredPassword();
    if (!password) {
      setDeleteError("Enter password in the Add Game form first");
      setTimeout(() => setDeleteError(""), 3000);
      return;
    }
    const res = await fetch(`${API}/games/${id}`, { 
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    if (res.status === 401) {
      setDeleteError("Invalid password");
      setTimeout(() => setDeleteError(""), 3000);
      return;
    }
    setGames(prev => prev.filter(g => g.id !== id));
  };

  const stats = calcStats(games);
  const cumulative = calcCumulative(games);

  const winRateData  = PLAYERS.map(p => ({ name: p, "Win Rate %": stats[p].games > 0 ? +((stats[p].won / stats[p].games) * 100).toFixed(1) : 0 }));
  const financialData= PLAYERS.map(p => ({ name: p, Winnings: stats[p].winnings, Losses: stats[p].losses, Net: stats[p].net }));
  const setsData     = PLAYERS.map(p => ({ name: p, "Sets Received": stats[p].setsReceived, "Sets Paid": stats[p].setsPaid, "Balance": stats[p].setsReceived - stats[p].setsPaid }));
  const scatterData  = PLAYERS.map(p => ({ name: p, x: stats[p].games > 0 ? +((stats[p].won / stats[p].games) * 100).toFixed(1) : 0, y: stats[p].ppg, z: stats[p].games }));
  // All available radar metrics with fixed-anchor scaling
  // 50 always = break-even/neutral. Tooltips show real values.
  const ALL_RADAR_METRICS = [
    {
      key: "winRate",
      metric: "Win Rate",
      desc: "50% = break-even  |  0–100%",
      real: p => stats[p].games > 0 ? +((stats[p].won / stats[p].games) * 100).toFixed(1) : 0,
      scale: v => Math.min(100, Math.max(0, v)),
      fmt: v => `${v.toFixed(1)}%`,
    },
    {
      key: "ppg",
      metric: "PPG",
      desc: "$0/game = 50  |  range ±$2",
      real: p => stats[p].ppg,
      scale: v => Math.min(100, Math.max(0, ((v + 2) / 4) * 100)),
      fmt: v => `${v >= 0 ? "+" : ""}$${v.toFixed(2)}/game`,
    },
    {
      key: "setsRatio",
      metric: "Sets Ratio",
      desc: "1.0x = balanced (50)  |  range 0–2x",
      real: p => stats[p].setsRatio,
      scale: v => Math.min(100, Math.max(0, (v / 2) * 100)),
      fmt: v => `${v.toFixed(2)}x (rcvd ÷ paid)`,
    },
    {
      key: "avgWinSize",
      metric: "Avg Win Size",
      desc: "$0 = 0  |  $4+ = 100  |  bigger wins = higher",
      real: p => stats[p].avgWinSize,
      scale: v => Math.min(100, Math.max(0, (v / 4) * 100)),
      fmt: v => `$${v.toFixed(2)} avg per win`,
    },
    {
      key: "lossControl",
      metric: "Loss Control",
      desc: "$2 avg loss = 100  |  $6 avg loss = 0  |  lower losses = higher",
      real: p => stats[p].avgLossSize,
      scale: v => Math.min(100, Math.max(0, ((6 - v) / 4) * 100)), // $2 → 100, $4 → 50, $6 → 0
      fmt: v => `$${v.toFixed(2)} avg per loss`,
    },
    {
      key: "bigGameRate",
      metric: "Big Game Rate",
      desc: "% of games with $4+ result  |  0–100%",
      real: p => stats[p].bigGameRate,
      scale: v => Math.min(100, Math.max(0, v)),
      fmt: v => `${v.toFixed(1)}% of games are $4+`,
    },
    {
      key: "recentForm",
      metric: "Recent Form",
      desc: "Win rate last 15 games  |  50% = break-even",
      real: p => stats[p].recentForm,
      scale: v => Math.min(100, Math.max(0, v)),
      fmt: v => `${v.toFixed(1)}% (last 15 games)`,
    },
    {
      key: "clutchRate",
      metric: "Clutch Rate",
      desc: "Win rate in $4+ games  |  50% = break-even",
      real: p => stats[p].clutchRate,
      scale: v => Math.min(100, Math.max(0, v)),
      fmt: v => `${v.toFixed(1)}% win rate in big games`,
    },
  ];

  const DEFAULT_ACTIVE = ["winRate", "ppg", "setsRatio", "recentForm", "clutchRate"];
  const [activeMetrics, setActiveMetrics] = useState(DEFAULT_ACTIVE);
  const toggleMetric = key => setActiveMetrics(prev =>
    prev.includes(key)
      ? prev.length > 3 ? prev.filter(k => k !== key) : prev  // min 3
      : prev.length < 7 ? [...prev, key] : prev               // max 7
  );

  const activeCfgs  = ALL_RADAR_METRICS.filter(m => activeMetrics.includes(m.key));
  const radarMetrics = activeCfgs.map(cfg => ({
    metric: cfg.metric,
    ...Object.fromEntries(PLAYERS.map(p => [p, cfg.scale(cfg.real(p))])),
    ...Object.fromEntries(PLAYERS.map(p => [`${p}_real`, cfg.real(p)])),
    _cfg: cfg,
  }));

  const RadarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div style={{ background: "#0d1f0d", border: "1px solid #2a5c2a", borderRadius: 8, padding: "10px 14px", maxWidth: 240 }}>
        <p style={{ color: "#f0c040", fontFamily: "'Playfair Display',serif", margin: "0 0 4px", fontWeight: 700 }}>{d.metric}</p>
        <p style={{ color: "#5a7a5a", fontSize: 11, margin: "0 0 8px", fontFamily: "monospace" }}>{d._cfg?.desc}</p>
        {PLAYERS.map(p => (
          <p key={p} style={{ color: COLORS[p], margin: "2px 0", fontSize: 13 }}>
            {SUITS[p]} {p}: {d._cfg?.fmt(d[`${p}_real`])}
          </p>
        ))}
      </div>
    );
  };

  if (loading) return <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#4fc3a1" }}>Loading games...</div>;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ position: "absolute", top: 20, left: 40, fontSize: 48, opacity: .07, color: "#f0c040" }}>♠♣♥♦</div>
        <div style={{ position: "absolute", top: 20, right: 40, fontSize: 48, opacity: .07, color: "#f0c040" }}>♦♥♣♠</div>
        <p style={{ color: "#4fc3a1", fontSize: 12, letterSpacing: 6, textTransform: "uppercase", margin: "0 0 8px", fontFamily: "monospace" }}>Live Season Analytics</p>
        <h1 style={S.title}>PITCH ANALYTICS</h1>
        <p style={S.subtitle}>{PLAYERS.length} Players · {games.length} Games Played</p>
        {error && <p style={{ color: "#e05c5c", fontSize: 13, marginTop: 8 }}>⚠ {error}</p>}
      </div>

      {/* Player cards */}
      <div style={S.cardGrid}>
        {PLAYERS.map(p => <PlayerCard key={p} name={p} stats={stats[p]} />)}
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>{t}</button>)}
      </div>

      {/* Content */}
      <div style={S.content}>

        {tab === "Overview" && <>
          <AddGameForm onAdd={handleAdd} />
          <ChartCard title="Win Rate by Player (%)" sub="Percentage of games won out of total played">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={winRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
                <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
                <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} domain={[0, 100]} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Win Rate %" radius={[6, 6, 0, 0]}>
                  {winRateData.map(d => <Cell key={d.name} fill={COLORS[d.name]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Wins vs Losses" sub="Head-to-head game record">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={PLAYERS.map(p => ({ name: p, Wins: stats[p].won, Losses: stats[p].lost }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
                <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
                <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#8aab8a" }} />
                <Bar dataKey="Wins"   fill="#4fc3a1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Losses" fill="#e05c5c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>}

        {tab === "Financials" && <>
          <ChartCard title="Net Profit / Loss ($)" sub="Total season earnings after losses">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={PLAYERS.map(p => ({ name: p, Net: stats[p].net }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
                <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
                <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Net" radius={[6, 6, 0, 0]}>
                  {PLAYERS.map(p => <Cell key={p} fill={stats[p].net >= 0 ? "#4fc3a1" : "#e05c5c"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Gross Winnings vs Losses" sub="Raw money won and lost before netting">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
                <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
                <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#8aab8a" }} />
                <Bar dataKey="Winnings" fill="#4fc3a1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Losses"   fill="#e05c5c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Profit Per Game (PPG)" sub="Average dollars earned or lost per game played">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={PLAYERS.map(p => ({ name: p, PPG: stats[p].ppg }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
                <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
                <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="PPG" radius={[6, 6, 0, 0]}>
                  {PLAYERS.map(p => <Cell key={p} fill={stats[p].ppg >= 0 ? "#4fc3a1" : "#e05c5c"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>}

        {tab === "Sets" && <>
          <ChartCard title="Sets Received vs Paid" sub="Who collects vs who pays out sets">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={setsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
                <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
                <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#8aab8a" }} />
                <Bar dataKey="Sets Received" fill="#f0c040" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Sets Paid"     fill="#7b9ef0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Sets Balance (Received − Paid)" sub="Positive = net set collector">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={setsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
                <XAxis dataKey="name" tick={{ fill: "#8aab8a", fontSize: 13 }} axisLine={{ stroke: "#2a4a2a" }} />
                <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Balance" radius={[6, 6, 0, 0]}>
                  {setsData.map(d => <Cell key={d.name} fill={d.Balance >= 0 ? "#4fc3a1" : "#e05c5c"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>}

        {tab === "Radar" && (
          <ChartCard title="Player Skill Radar" sub="Toggle metrics below · 50 = break-even/neutral · hover spokes for real values">
            {/* Metric toggles */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {ALL_RADAR_METRICS.map(m => {
                const on = activeMetrics.includes(m.key);
                return (
                  <button key={m.key} onClick={() => toggleMetric(m.key)} style={{
                    padding: "5px 14px", borderRadius: 16, fontSize: 12, cursor: "pointer",
                    fontFamily: "monospace", letterSpacing: 0.3, transition: "all .15s",
                    border: on ? "1px solid #f0c040" : "1px solid #2a4a2a",
                    background: on ? "rgba(240,192,64,.15)" : "rgba(255,255,255,.03)",
                    color: on ? "#f0c040" : "#5a7a5a",
                  }}>
                    {on ? "✓ " : ""}{m.metric}
                  </button>
                );
              })}
              <span style={{ color: "#3a5a3a", fontSize: 11, alignSelf: "center", marginLeft: 4, fontFamily: "monospace" }}>
                (min 3, max 7)
              </span>
            </div>
            <ResponsiveContainer width="100%" height={460}>
              <RadarChart data={radarMetrics}>
                <PolarGrid stroke="#1e4a1e" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#8aab8a", fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={5}
                  tick={{ fill: "#5a7a5a", fontSize: 10 }}
                  tickFormatter={v => v === 50 ? "50" : v}
                />
                {PLAYERS.map(p => (
                  <Radar key={p} name={p} dataKey={p} stroke={COLORS[p]} fill={COLORS[p]} fillOpacity={0.12} strokeWidth={2} />
                ))}
                <Legend wrapperStyle={{ color: "#8aab8a" }} />
                <Tooltip content={<RadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>

            {/* Metric definitions — only show active ones */}
            <div style={{ marginTop: 24, borderTop: "1px solid #1e4a1e", paddingTop: 20 }}>
              <p style={{ color: "#5a7a5a", fontSize: 11, fontFamily: "monospace", marginBottom: 14, letterSpacing: 1, textTransform: "uppercase" }}>
                Metric Definitions
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {ALL_RADAR_METRICS.filter(m => activeMetrics.includes(m.key)).map(m => (
                  <div key={m.key} style={{
                    background: "rgba(255,255,255,.02)", border: "1px solid #1a3a1a",
                    borderLeft: "3px solid #f0c04055", borderRadius: 8, padding: "12px 14px",
                  }}>
                    <p style={{ color: "#f0e8d0", fontWeight: 700, fontSize: 13, margin: "0 0 6px", fontFamily: "'Playfair Display', serif" }}>
                      {m.metric}
                    </p>
                    <p style={{ color: "#7a9a7a", fontSize: 12, margin: "0 0 6px", lineHeight: 1.5 }}>
                      {METRIC_DEFINITIONS[m.key]}
                    </p>
                    <p style={{ color: "#4a6a4a", fontSize: 11, fontFamily: "monospace", margin: 0 }}>
                      Scale: {m.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        )}

        {tab === "Trend" && (
          <ChartCard title="Cumulative Net Profit Over Time" sub="Running total per player across all games">
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={cumulative}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
                <XAxis dataKey="game" tick={{ fill: "#8aab8a", fontSize: 11 }} axisLine={{ stroke: "#2a4a2a" }} label={{ value: "Game #", position: "insideBottom", offset: -4, fill: "#5a7a5a", fontSize: 12 }} />
                <YAxis tick={{ fill: "#8aab8a" }} axisLine={{ stroke: "#2a4a2a" }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#8aab8a" }} />
                {PLAYERS.map(p => (
                  <Line key={p} type="monotone" dataKey={p} stroke={COLORS[p]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {tab === "Night" && (
          <NightTracker games={games} onAdd={handleAdd} />
        )}

        {tab === "Log" && (
          <GameLog games={games} onDelete={handleDelete} deleteError={deleteError} />
        )}
      </div>

      <div style={{ textAlign: "center", padding: "40px 20px 0", color: "#3a5a3a", fontSize: 12, fontFamily: "monospace" }}>
        ♠ ♣ ♥ ♦ &nbsp; Pitch Night Analytics &nbsp; ♦ ♥ ♣ ♠
      </div>
    </div>
  );
}