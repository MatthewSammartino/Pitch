import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";

// ── Shared primitives ────────────────────────────────────────────────────────

const RED  = "#e05c5c";
const LIGHT = "#f0e8d0";

function Suit({ s, size = 28 }) {
  const isRed = s === "♥" || s === "♦";
  return <span style={{ color: isRed ? RED : LIGHT, fontSize: size, lineHeight: 1 }}>{s}</span>;
}

function Card({ rank, suit, dim = false, glow = false }) {
  const isRed = suit === "♥" || suit === "♦";
  return (
    <div style={{
      width: 56, height: 80, borderRadius: 8,
      background: dim ? "#0a1f0a" : "#f0e8d0",
      border: `2px solid ${glow ? "#f0c040" : dim ? "#1e3a1e" : "#c8b890"}`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 2,
      boxShadow: glow ? "0 0 12px rgba(240,192,64,.4)" : "none",
      transition: "all .2s",
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: dim ? "#2a4a2a" : (isRed ? RED : "#0d1a0d"), lineHeight: 1 }}>{rank}</div>
      <div style={{ fontSize: 20, lineHeight: 1, color: dim ? "#2a4a2a" : (isRed ? RED : "#0d1a0d") }}>{suit}</div>
    </div>
  );
}

function PointBadge({ label, color, revealed, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px", borderRadius: 10,
        border: `1px solid ${revealed ? color : "#2a4a2a"}`,
        background: revealed ? `${color}18` : "transparent",
        color: revealed ? color : "#3a5a3a",
        fontSize: 13, cursor: "pointer", fontFamily: "Georgia,serif",
        transition: "all .2s",
      }}
    >
      {revealed ? "✓ " : ""}{label}
    </button>
  );
}

// ── Section content ──────────────────────────────────────────────────────────

function S1Overview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ color: "#e8dfc8", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
        <strong style={{ color: "#f0c040" }}>Pitch</strong> is a trick-taking card game where teams compete
        to reach <strong style={{ color: "#f0c040" }}>15 points</strong> before their opponents. Each hand,
        one player <em>bids</em> to name the trump suit — then their team must earn at least that many points,
        or pay a penalty.
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { icon: "👥", title: "4-Player", desc: "2 teams of 2. Classic head-to-head." },
          { icon: "🎭", title: "6-Player", desc: "3 teams of 2. More chaos, more fun." },
          { icon: "🎯", title: "5 Points/Hand", desc: "High, Low, Jack, Off-Jack, Game." },
          { icon: "🏆", title: "Win at 15", desc: "First team to 15 points takes the game." },
        ].map((c) => (
          <div key={c.title} style={{
            flex: "1 1 160px", background: "rgba(255,255,255,.03)",
            border: "1px solid #1e4a1e", borderRadius: 10, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ color: "#f0e8d0", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
            <div style={{ color: "#5a7a5a", fontSize: 12, lineHeight: 1.5 }}>{c.desc}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#5a7a5a", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        Each hand starts with a deal of 9 cards per player. Players bid, trump is named, tricks are played,
        and points are tallied. Then the next hand begins — until someone hits 15.
      </p>
    </div>
  );
}

function S2Bidding() {
  const [bid, setBid] = useState(null);
  const desc = {
    2: "The minimum bid. You think your hand can capture 2 of the 5 available points. Modest, but safer.",
    3: "A confident hand. You expect to win 3 points — usually needing a strong trump holding.",
    4: "An aggressive bid. You're going for 4 points. You'd better have the Jack.",
    5: "Shooting the moon — you're claiming all 5 points. High risk, high reward. One miss and you're set for 5.",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ color: "#e8dfc8", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
        Before each hand, players bid clockwise for the right to <strong style={{ color: "#f0c040" }}>name the trump suit</strong>.
        Bids range from <strong>2 to 5</strong>. The highest bidder wins — they lead the first trick,
        and whichever suit they lead <em>becomes trump</em>.
      </p>
      <div>
        <div style={{ color: "#5a7a5a", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
          Click a bid to see what it means
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[2, 3, 4, 5].map((v) => (
            <button
              key={v}
              onClick={() => setBid(v)}
              style={{
                width: 56, height: 56, borderRadius: 12,
                border: `2px solid ${bid === v ? "#f0c040" : "#2a5c2a"}`,
                background: bid === v ? "rgba(240,192,64,.15)" : "transparent",
                color: bid === v ? "#f0c040" : "#8aab8a",
                fontSize: 22, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Playfair Display',serif",
                transition: "all .15s",
              }}
            >
              {v}
            </button>
          ))}
        </div>
        {bid && (
          <div style={{
            background: "rgba(240,192,64,.06)", border: "1px solid #3a3010",
            borderRadius: 10, padding: "14px 18px",
            color: "#f0e8d0", fontSize: 14, lineHeight: 1.6,
            transition: "all .2s",
          }}>
            <strong style={{ color: "#f0c040" }}>Bid {bid}:</strong> {desc[bid]}
          </div>
        )}
      </div>
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e", borderRadius: 10, padding: "14px 18px" }}>
        <div style={{ color: "#4fc3a1", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Dealer's Rule</div>
        <div style={{ color: "#5a7a5a", fontSize: 13, lineHeight: 1.6 }}>
          The dealer cannot be "shut out." If everyone else passes, the dealer <em>must</em> bid at least 2.
          This keeps every hand in play.
        </div>
      </div>
    </div>
  );
}

const POINT_DEFS = [
  {
    id: "high",
    label: "High",
    color: "#f0c040",
    card: { rank: "A", suit: "♠" },
    desc: "The highest trump card played in the hand. If you hold the Ace of trump, you almost certainly win this point — just play it.",
  },
  {
    id: "low",
    label: "Low",
    color: "#4fc3a1",
    card: { rank: "2", suit: "♠" },
    desc: "The lowest trump card in play — but it goes to whoever CAPTURES it, not whoever holds it. Your opponent can steal Low by winning a trick that contains your low trump.",
  },
  {
    id: "jack",
    label: "Jack",
    color: "#7090c0",
    card: { rank: "J", suit: "♠" },
    desc: "The Jack of trump. Worth a full point on its own — protect it carefully. It's often the deciding card in a close bid.",
  },
  {
    id: "offjack",
    label: "Off-Jack",
    color: "#c090a0",
    card: { rank: "J", suit: "♣" },
    desc: "The Jack of the same COLOR as trump. If Spades (♠) is trump, the Off-Jack is the Jack of Clubs (♣). It ranks just below the Jack of trump and counts as trump — a surprise weapon.",
  },
  {
    id: "game",
    label: "Game",
    color: "#c87a3a",
    card: { rank: "10", suit: "♠" },
    desc: "Awarded to the team that captures the most card-point value: Aces=4, Kings=3, Queens=2, Jacks=1, Tens=10. Ten-point Tens make this volatile — one Ten can swing it.",
  },
];

function S3Points() {
  const [revealed, setRevealed] = useState(new Set());

  function toggle(id) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ color: "#e8dfc8", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
        Every hand has exactly <strong style={{ color: "#f0c040" }}>5 points</strong> up for grabs.
        Click each point type to learn what it means.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {POINT_DEFS.map((p) => (
          <PointBadge
            key={p.id}
            label={p.label}
            color={p.color}
            revealed={revealed.has(p.id)}
            onClick={() => toggle(p.id)}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {POINT_DEFS.filter((p) => revealed.has(p.id)).map((p) => (
          <div key={p.id} style={{
            display: "flex", gap: 16, alignItems: "flex-start",
            background: `${p.color}0d`, border: `1px solid ${p.color}40`,
            borderRadius: 10, padding: "14px 16px",
          }}>
            <Card rank={p.card.rank} suit={p.card.suit} glow />
            <div>
              <div style={{ color: p.color, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{p.label}</div>
              <div style={{ color: "#e8dfc8", fontSize: 13, lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          </div>
        ))}
      </div>
      {revealed.size === 5 && (
        <div style={{
          background: "rgba(79,195,161,.08)", border: "1px solid #2a5c3a",
          borderRadius: 10, padding: "12px 16px",
          color: "#4fc3a1", fontSize: 13, textAlign: "center",
        }}>
          You've revealed all 5 points. That's everything available in a single hand.
        </div>
      )}
    </div>
  );
}

function S4Playing() {
  const [step, setStep] = useState(0);
  const tricks = [
    {
      label: "Step 1 — Lead sets trump",
      desc: "The winning bidder leads the first card. That suit immediately becomes trump for the entire hand. Choose wisely — you're announcing to the table what you're holding.",
      cards: [
        { rank: "A", suit: "♠", label: "You lead", glow: true },
        { rank: "7", suit: "♥", label: "follows", dim: true },
        { rank: "K", suit: "♦", label: "follows", dim: true },
        { rank: "J", suit: "♣", label: "follows", dim: true },
      ],
      note: "Spades (♠) is now trump for this hand.",
    },
    {
      label: "Step 2 — Follow suit or play any card",
      desc: "Players must follow the led suit if they can. If they can't, they may play any card — including trump. Trump always beats non-trump, regardless of rank.",
      cards: [
        { rank: "8", suit: "♠", label: "leads ♠", glow: false },
        { rank: "Q", suit: "♠", label: "follows ♠", glow: true },
        { rank: "9", suit: "♥", label: "can't follow, plays ♥", dim: true },
        { rank: "5", suit: "♠", label: "follows ♠", glow: false },
      ],
      note: "Q♠ wins — highest spade (trump) in the trick.",
    },
    {
      label: "Step 3 — Trump beats all",
      desc: "If a non-trump suit is led and a player can't follow, they can play trump to steal the trick. Even the lowest trump beats the highest card of any other suit.",
      cards: [
        { rank: "A", suit: "♥", label: "leads ♥", glow: false },
        { rank: "K", suit: "♥", label: "follows ♥", glow: false },
        { rank: "2", suit: "♠", label: "out of ♥, plays trump!", glow: true },
        { rank: "J", suit: "♥", label: "follows ♥", glow: false },
      ],
      note: "2♠ wins the trick — trump beats everything.",
    },
  ];
  const t = tricks[step];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ color: "#e8dfc8", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
        After the bid, players take turns playing cards. Each round of 4 cards is called a <strong style={{ color: "#f0c040" }}>trick</strong>.
        The highest card of the led suit wins — unless someone plays trump.
      </p>
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e", borderRadius: 12, padding: "20px 20px 16px" }}>
        <div style={{ color: "#f0c040", fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{t.label}</div>
        <p style={{ color: "#e8dfc8", fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>{t.desc}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          {t.cards.map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <Card rank={c.rank} suit={c.suit} dim={c.dim} glow={c.glow} />
              <div style={{ color: c.glow ? "#f0c040" : "#3a5a3a", fontSize: 11, textAlign: "center", maxWidth: 64 }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>
        {t.note && (
          <div style={{ color: "#4fc3a1", fontSize: 12, borderTop: "1px solid #1e4a1e", paddingTop: 10 }}>
            → {t.note}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{
            padding: "6px 16px", borderRadius: 10,
            border: "1px solid #2a4a2a", background: "transparent",
            color: step === 0 ? "#2a4a2a" : "#8aab8a",
            fontSize: 13, cursor: step === 0 ? "not-allowed" : "pointer",
            fontFamily: "Georgia,serif",
          }}
        >← Prev</button>
        <span style={{ color: "#3a5a3a", fontSize: 12, flex: 1, textAlign: "center" }}>
          {step + 1} / {tricks.length}
        </span>
        <button
          onClick={() => setStep((s) => Math.min(tricks.length - 1, s + 1))}
          disabled={step === tricks.length - 1}
          style={{
            padding: "6px 16px", borderRadius: 10,
            border: "1px solid #2a4a2a", background: "transparent",
            color: step === tricks.length - 1 ? "#2a4a2a" : "#8aab8a",
            fontSize: 13, cursor: step === tricks.length - 1 ? "not-allowed" : "pointer",
            fontFamily: "Georgia,serif",
          }}
        >Next →</button>
      </div>
    </div>
  );
}

function S5Winning() {
  const [score, setScore] = useState({ us: 8, them: 6 });
  const [bid, setBid] = useState(3);
  const [earned, setEarned] = useState(2);
  const made = earned >= bid;
  const newUs   = made ? score.us + earned : score.us - bid;
  const newThem = score.them + (5 - earned);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ color: "#e8dfc8", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
        After each hand, scores update. The first team to <strong style={{ color: "#f0c040" }}>15 points</strong> wins.
        Try adjusting the sliders to see how scoring works.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[{ label: "Our bid", val: bid, min: 2, max: 5, set: setBid },
          { label: "Points we earned", val: earned, min: 0, max: 5, set: setEarned }
        ].map(({ label, val, min, max, set }) => (
          <div key={label} style={{ background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ color: "#5a7a5a", fontSize: 12, marginBottom: 8 }}>{label}</div>
            <div style={{ color: "#f0c040", fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>
              {val}
            </div>
            <input
              type="range" min={min} max={max} value={val}
              onChange={(e) => set(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#f0c040" }}
            />
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e", borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ color: "#5a7a5a", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Result</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
          {[
            { label: "Us", before: score.us, after: newUs, bid: true },
            { label: "Them", before: score.them, after: newThem, bid: false },
          ].map(({ label, before, after }) => (
            <div key={label} style={{ flex: 1, minWidth: 100 }}>
              <div style={{ color: "#8aab8a", fontSize: 13, marginBottom: 4 }}>{label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ color: "#3a5a3a", fontSize: 16 }}>{before}</span>
                <span style={{ color: "#5a7a5a", fontSize: 12 }}>→</span>
                <span style={{
                  fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display',serif",
                  color: after >= 15 ? "#f0c040" : (after < before ? "#e05c5c" : "#4fc3a1"),
                }}>{after}</span>
                {after >= 15 && <span style={{ color: "#f0c040", fontSize: 12 }}>🏆 WIN</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: made ? "rgba(79,195,161,.08)" : "rgba(224,92,92,.08)",
          border: `1px solid ${made ? "#2a5c3a" : "#5c2a2a"}`,
          color: made ? "#4fc3a1" : "#e05c5c", fontSize: 13, lineHeight: 1.5,
        }}>
          {made
            ? `Made the bid! Earned ${earned} of ${bid} needed. Score increases by ${earned}.`
            : `Set! Needed ${bid} but only got ${earned}. Score drops by ${bid} (the bid amount, not points earned).`}
        </div>
        <div style={{ color: "#3a5a3a", fontSize: 12, marginTop: 10 }}>
          Opponents always keep what they earn ({5 - earned} point{5 - earned !== 1 ? "s" : ""} this hand), regardless of who bid.
        </div>
      </div>
    </div>
  );
}

function S6Platform() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "#e8dfc8", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
        Here's how to get a game going and make the most of the platform.
      </p>
      {[
        {
          icon: "🎮", title: "Create or Join a Game",
          lines: [
            "Go to Play → Create Lobby. Pick 4-player or 6-player.",
            "Share the 6-character room code with friends, or make the lobby public.",
            "Use Join Queue to instantly find an open public game.",
            "Fill empty seats with bots if you're short on players.",
          ],
        },
        {
          icon: "🪙", title: "Chips & Wagers",
          lines: [
            "Every account starts with 10 chips and earns 10 free chips per day.",
            "Set a Base Wager when creating a lobby — all players pay it at game start.",
            "Set a Per-Set Wager — the losing team pays extra for each time they were set.",
            "Winners get their base back plus a share of the loser's total forfeiture.",
            "Negative balances are allowed — you can owe chips.",
          ],
        },
        {
          icon: "📊", title: "Stats & Leaderboard",
          lines: [
            "Only fully human games (no bots) count toward the leaderboard.",
            "Track win rate, bid rate, avg score, clutch rate, recent form, and more.",
            "Compare yourself to the site average, top 10%, or top 1% on the My Stats radar.",
            "Group analytics show per-group history in the Groups section.",
          ],
        },
      ].map((s) => (
        <div key={s.title} style={{
          background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e",
          borderRadius: 10, padding: "16px 18px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <span style={{ color: "#f0e8d0", fontWeight: 600, fontSize: 14 }}>{s.title}</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {s.lines.map((l, i) => (
              <li key={i} style={{ color: "#8aab8a", fontSize: 13, lineHeight: 1.5 }}>{l}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── Section definitions ──────────────────────────────────────────────────────

const SECTIONS = [
  { id: "overview", icon: "🃏", title: "What is Pitch?",   body: <S1Overview /> },
  { id: "bidding",  icon: "🗣️", title: "The Bid",          body: <S2Bidding /> },
  { id: "points",   icon: "🎯", title: "The 5 Points",     body: <S3Points /> },
  { id: "playing",  icon: "🃏", title: "Playing a Hand",   body: <S4Playing /> },
  { id: "winning",  icon: "🏆", title: "Winning the Game", body: <S5Winning /> },
  { id: "platform", icon: "⚙️", title: "The Platform",     body: <S6Platform /> },
];

// ── Main page ────────────────────────────────────────────────────────────────

export default function TutorialPage() {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const section  = SECTIONS[idx];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
      color: "#e8dfc8", fontFamily: "Georgia,serif",
    }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 20px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color: "#f0e8d0", margin: "0 0 6px" }}>
            How to Play Pitch
          </h1>
          <p style={{ color: "#3a5a3a", fontSize: 13, margin: 0 }}>
            An interactive guide to 5-point Pitch and this platform.
          </p>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Sidebar */}
          <div style={{ width: 190, flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setIdx(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 10, textAlign: "left",
                    border: `1px solid ${i === idx ? "#f0c040" : "transparent"}`,
                    background: i === idx ? "rgba(240,192,64,.08)" : "transparent",
                    color: i === idx ? "#f0c040" : "#5a7a5a",
                    fontSize: 13, cursor: "pointer", fontFamily: "Georgia,serif",
                    width: "100%", transition: "all .15s",
                  }}
                >
                  <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{s.icon}</span>
                  {s.title}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e", borderRadius: 10 }}>
              <div style={{ color: "#3a5a3a", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                Progress
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "#1e4a1e" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  background: "#f0c040",
                  width: `${((idx + 1) / SECTIONS.length) * 100}%`,
                  transition: "width .3s",
                }} />
              </div>
              <div style={{ color: "#3a5a3a", fontSize: 11, marginTop: 6 }}>
                {idx + 1} of {SECTIONS.length}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e",
              borderRadius: 14, padding: "28px 28px 20px",
            }}>
              <div style={{
                fontFamily: "'Playfair Display',serif", color: "#f0c040",
                fontSize: 20, marginBottom: 20,
              }}>
                {section.icon} {section.title}
              </div>

              {section.body}
            </div>

            {/* Prev / Next */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                style={{
                  padding: "8px 20px", borderRadius: 12,
                  border: "1px solid #2a4a2a", background: "transparent",
                  color: idx === 0 ? "#2a4a2a" : "#8aab8a",
                  fontSize: 13, cursor: idx === 0 ? "not-allowed" : "pointer",
                  fontFamily: "Georgia,serif",
                }}
              >
                ← Previous
              </button>

              {idx < SECTIONS.length - 1 ? (
                <button
                  onClick={() => setIdx((i) => i + 1)}
                  style={{
                    padding: "8px 20px", borderRadius: 12,
                    border: "1px solid #f0c040", background: "rgba(240,192,64,.1)",
                    color: "#f0c040", fontSize: 13, cursor: "pointer",
                    fontFamily: "Georgia,serif",
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => navigate("/dashboard")}
                  style={{
                    padding: "8px 20px", borderRadius: 12,
                    border: "1px solid #4fc3a1", background: "rgba(79,195,161,.1)",
                    color: "#4fc3a1", fontSize: 13, cursor: "pointer",
                    fontFamily: "Georgia,serif",
                  }}
                >
                  Start Playing →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
