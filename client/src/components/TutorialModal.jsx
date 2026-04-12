import { useState } from "react";

const KEY = "pitch_tutorial_done";

// ── Suit helpers ──────────────────────────────────────────────────────────────
const SUIT_SYMBOL = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_COLOR  = { s: "#d8d8d8", h: "#e05c5c", d: "#5b9cf6", c: "#5eca7a" };
const SUIT_NAME   = { s: "Spades", h: "Hearts", d: "Diamonds", c: "Clubs" };

// ── Scripted hand steps ───────────────────────────────────────────────────────
// Your hand: A♠ K♠ 2♠ J♣(off-jack) 7♥ Q♦   Trump: ♠
const STEPS = [
  {
    title: "Welcome to Pitch",
    desc: "Pitch is a trick-taking card game for 4 players on 2 teams. Each hand, players bid to name the trump suit — then race to earn 5 points before reaching 15 first. You're about to watch a real hand play out step by step.",
    board: {
      seats: {
        north: { name: "Partner", cards: 6, bid: null, active: false, highlight: false, team: "teal" },
        west:  { name: "West",    cards: 6, bid: null, active: false, highlight: false, team: "red"  },
        east:  { name: "East",    cards: 6, bid: null, active: false, highlight: false, team: "red"  },
      },
      trick: [],
      hand: [
        { rank: "A", suit: "s" },
        { rank: "K", suit: "s" },
        { rank: "2", suit: "s" },
        { rank: "J", suit: "c", label: "Off-Jack" },
        { rank: "7", suit: "h" },
        { rank: "Q", suit: "d" },
      ],
      trump: null,
      scoreA: 0, scoreB: 0,
      caption: "Teams: You + Partner (teal) vs West + East (red)",
    },
  },
  {
    title: "Bidding for Trump",
    desc: "Before playing, everyone bids how many of the 5 points they think they can win. The highest bidder leads first and names the trump suit by their opening card. The dealer must bid at least 2 if everyone else passes.",
    board: {
      seats: {
        north: { name: "Partner", cards: 6, bid: "2",    active: false, highlight: false, team: "teal" },
        west:  { name: "West",    cards: 6, bid: "Pass", active: false, highlight: false, team: "red"  },
        east:  { name: "East",    cards: 6, bid: "Pass", active: false, highlight: false, team: "red"  },
      },
      trick: [],
      hand: [
        { rank: "A", suit: "s" },
        { rank: "K", suit: "s" },
        { rank: "2", suit: "s" },
        { rank: "J", suit: "c", label: "Off-Jack" },
        { rank: "7", suit: "h" },
        { rank: "Q", suit: "d" },
      ],
      trump: null,
      youBid: "3",
      scoreA: 0, scoreB: 0,
      caption: "You bid 3 — the highest bid. You lead first.",
    },
  },
  {
    title: "You Lead — Name Trump",
    desc: "You won the bid with 3. The first card you play becomes trump for the entire hand. Lead wisely — you're revealing your strength. You have the Ace and King of Spades, so Spades is a strong choice.",
    board: {
      seats: {
        north: { name: "Partner", cards: 6, bid: null, active: false, highlight: false, team: "teal" },
        west:  { name: "West",    cards: 6, bid: null, active: false, highlight: false, team: "red"  },
        east:  { name: "East",    cards: 6, bid: null, active: false, highlight: false, team: "red"  },
      },
      trick: [],
      hand: [
        { rank: "A", suit: "s", highlight: true },
        { rank: "K", suit: "s", highlight: true },
        { rank: "2", suit: "s", highlight: true },
        { rank: "J", suit: "c", highlight: true, label: "Off-Jack" },
        { rank: "7", suit: "h", highlight: true },
        { rank: "Q", suit: "d", highlight: true },
      ],
      trump: null,
      scoreA: 0, scoreB: 0,
      caption: "Any card is valid — your lead sets trump.",
    },
  },
  {
    title: "Trump is Set — High Point Secured",
    desc: "You play the A♠. Spades is now trump for the entire hand! Since the Ace is the highest trump card, your team is guaranteed the High point regardless of what happens next.",
    board: {
      seats: {
        north: { name: "Partner", cards: 5, bid: null, active: false, highlight: false, team: "teal" },
        west:  { name: "West",    cards: 6, bid: null, active: true,  highlight: false, team: "red"  },
        east:  { name: "East",    cards: 6, bid: null, active: false, highlight: false, team: "red"  },
      },
      trick: [
        { rank: "A", suit: "s", from: "south", winner: false, label: "HIGH ★" },
      ],
      hand: [
        { rank: "K", suit: "s" },
        { rank: "2", suit: "s" },
        { rank: "J", suit: "c", label: "Off-Jack" },
        { rank: "7", suit: "h" },
        { rank: "Q", suit: "d" },
      ],
      trump: "s",
      scoreA: 0, scoreB: 0,
      caption: "A♠ leads. West must play next.",
    },
  },
  {
    title: "The Trick Plays Out",
    desc: "Each player must follow the led suit if they have it, OR play trump at any time — even if they have spades. Off-suit cards that can't follow and aren't trump cannot win. Trump always beats non-trump.",
    board: {
      seats: {
        north: { name: "Partner", cards: 5, bid: null, active: false, highlight: true, team: "teal" },
        west:  { name: "West",    cards: 5, bid: null, active: false, highlight: false, team: "red"  },
        east:  { name: "East",    cards: 5, bid: null, active: false, highlight: false, team: "red"  },
      },
      trick: [
        { rank: "A", suit: "s", from: "south", winner: true,  label: "Winner!" },
        { rank: "7", suit: "d", from: "west",  winner: false },
        { rank: "K", suit: "s", from: "north", winner: false },
        { rank: "5", suit: "h", from: "east",  winner: false },
      ],
      hand: [
        { rank: "K", suit: "s" },
        { rank: "2", suit: "s" },
        { rank: "J", suit: "c", label: "Off-Jack" },
        { rank: "7", suit: "h" },
        { rank: "Q", suit: "d" },
      ],
      trump: "s",
      scoreA: 0, scoreB: 0,
      caption: "A♠ beats everything. You win the trick!",
    },
  },
  {
    title: "High & Low Points",
    desc: "Two points are purely about which trumps get PLAYED — not who wins tricks. High goes to whoever played the highest trump (your A♠). Low goes to whoever plays the lowest trump in the hand — your 2♠ is the lowest, so play it in any trick to lock in that point.",
    board: {
      seats: {
        north: { name: "Partner", cards: 5, bid: null, active: false, highlight: false, team: "teal" },
        west:  { name: "West",    cards: 5, bid: null, active: false, highlight: false, team: "red"  },
        east:  { name: "East",    cards: 5, bid: null, active: false, highlight: false, team: "red"  },
      },
      trick: [],
      hand: [
        { rank: "K", suit: "s" },
        { rank: "2", suit: "s", highlight: true, label: "LOW ★" },
        { rank: "J", suit: "c", label: "Off-Jack" },
        { rank: "7", suit: "h" },
        { rank: "Q", suit: "d" },
      ],
      trump: "s",
      pointsEarned: ["HIGH"],
      scoreA: 0, scoreB: 0,
      caption: "Play the 2♠ at any point to guarantee Low.",
    },
  },
  {
    title: "Jack & Off-Jack",
    desc: "The Jack of trump and the Jack of the same COLOR as trump (the Off-Jack — here J♣ since Clubs is the other black suit) each score 1 point. Unlike High & Low, these go to whoever WINS the trick containing them. Your opponent can steal them.",
    board: {
      seats: {
        north: { name: "Partner", cards: 4, bid: null, active: false, highlight: false, team: "teal" },
        west:  { name: "West",    cards: 4, bid: null, active: false, highlight: false, team: "red"  },
        east:  { name: "East",    cards: 4, bid: null, active: false, highlight: true,  team: "red"  },
      },
      trick: [
        { rank: "J", suit: "s", from: "west",  winner: false, label: "JACK ★" },
        { rank: "A", suit: "h", from: "north", winner: false },
        { rank: "Q", suit: "s", from: "east",  winner: true,  label: "Captured it!" },
        { rank: "2", suit: "s", from: "south", winner: false },
      ],
      hand: [
        { rank: "K", suit: "s" },
        { rank: "J", suit: "c", label: "Off-Jack" },
        { rank: "7", suit: "h" },
        { rank: "Q", suit: "d" },
      ],
      trump: "s",
      pointsEarned: ["HIGH", "LOW"],
      scoreA: 0, scoreB: 0,
      caption: "East wins the trick — East's team gets the Jack point.",
    },
  },
  {
    title: "Scoring — Did You Make Your Bid?",
    desc: "Your team bid 3 and earned High + Low + Game = 3 points. Bid made! Your score rises by 3. If you had only earned 2 points, your score would have dropped by 3 (the bid amount). Opponents always keep what they earned regardless.",
    board: {
      seats: {
        north: { name: "Partner", cards: 0, bid: null, active: false, highlight: false, team: "teal" },
        west:  { name: "West",    cards: 0, bid: null, active: false, highlight: false, team: "red"  },
        east:  { name: "East",    cards: 0, bid: null, active: false, highlight: false, team: "red"  },
      },
      trick: [],
      hand: [],
      trump: "s",
      pointsEarned: ["HIGH", "LOW", "GAME"],
      scoreA: 3, scoreB: 1,
      finalScore: true,
      scoreA: 3, scoreB: 1,
      caption: "First team to 15 wins the match!",
    },
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function TrickCard({ rank, suit, from, winner, label }) {
  const color  = SUIT_COLOR[suit] || "#d8d8d8";
  const symbol = SUIT_SYMBOL[suit] || "?";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      {label && (
        <div style={{
          fontSize: 10, fontWeight: 700, color: winner ? "#f0c040" : "#4fc3a1",
          letterSpacing: 0.5, textTransform: "uppercase",
        }}>
          {label}
        </div>
      )}
      <div style={{
        width: 44, height: 62, borderRadius: 6,
        background: "#1a2a1a",
        border: `2px solid ${winner ? "#f0c040" : color}`,
        boxShadow: winner ? "0 0 10px rgba(240,192,64,.5)" : "none",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 2,
        transition: "all .3s",
      }}>
        <div style={{ color, fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{rank}</div>
        <div style={{ color, fontSize: 16, lineHeight: 1 }}>{symbol}</div>
      </div>
      <div style={{ fontSize: 10, color: "#5a7a5a", textAlign: "center" }}>
        {from === "south" ? "You" : from?.charAt(0).toUpperCase() + from?.slice(1)}
      </div>
    </div>
  );
}

function HandCard({ rank, suit, highlight, label }) {
  const color  = SUIT_COLOR[suit] || "#d8d8d8";
  const symbol = SUIT_SYMBOL[suit] || "?";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{
        width: 48, height: 68, borderRadius: 7,
        background: "#0f1f0f",
        border: `2px solid ${highlight ? "#f0c040" : color + "80"}`,
        boxShadow: highlight ? "0 0 12px rgba(240,192,64,.6)" : "none",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 2,
        transition: "border .3s, box-shadow .3s",
      }}>
        <div style={{ color, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{rank}</div>
        <div style={{ color, fontSize: 18, lineHeight: 1 }}>{symbol}</div>
      </div>
      {label && (
        <div style={{ fontSize: 9, color: "#f0c040", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {label}
        </div>
      )}
    </div>
  );
}

function CardBack({ small }) {
  const w = small ? 16 : 22;
  const h = small ? 22 : 30;
  return (
    <div style={{
      width: w, height: h, borderRadius: 3,
      background: "linear-gradient(135deg, #1a3a1a 0%, #0d2b0d 100%)",
      border: "1px solid #2a4a2a",
      flexShrink: 0,
    }} />
  );
}

function Seat({ name, cards, bid, active, highlight, team, position }) {
  const initial = name?.[0]?.toUpperCase() || "?";
  const teamColor = team === "teal" ? "#4fc3a1" : "#e05c5c";

  const isHorizontal = position === "west" || position === "east";
  const cardBacks = Array.from({ length: Math.max(0, cards) });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      opacity: cards === 0 ? 0.4 : 1,
      transition: "opacity .3s",
    }}>
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: "#1a2a1a",
        border: `2px solid ${highlight ? "#f0c040" : active ? "#4fc3a1" : teamColor + "60"}`,
        boxShadow: active ? "0 0 12px rgba(79,195,161,.4)" : highlight ? "0 0 12px rgba(240,192,64,.4)" : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: teamColor, fontSize: 16, fontWeight: 700,
        transition: "all .3s",
      }}>
        {initial}
      </div>

      {/* Name + bid */}
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#e8dfc8", fontSize: 11, fontWeight: 600 }}>{name}</div>
        {bid && (
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: bid === "Pass" ? "#3a5a3a" : "#f0c040",
            marginTop: 1,
          }}>
            {bid === "Pass" ? "Pass" : `Bid ${bid}`}
          </div>
        )}
      </div>

      {/* Card backs */}
      {cards > 0 && (
        <div style={{
          display: "flex",
          flexDirection: isHorizontal ? "column" : "row",
          gap: 2,
          flexWrap: isHorizontal ? "nowrap" : "wrap",
          justifyContent: "center",
          maxWidth: isHorizontal ? 20 : 80,
        }}>
          {cardBacks.map((_, i) => <CardBack key={i} small />)}
        </div>
      )}
    </div>
  );
}

function BoardView({ board, step }) {
  const { seats = {}, trick = [], hand = [], trump, pointsEarned, finalScore, scoreA, scoreB, youBid, caption } = board;
  const trickGrid = { 0: [], 1: [2], 2: [2, 3], 3: [1, 3], 4: [2, 2] };

  const POINT_COLORS = { HIGH: "#f0c040", LOW: "#4fc3a1", JACK: "#7090c0", "OFF-JACK": "#c090a0", GAME: "#c87a3a" };

  return (
    <div style={{
      background: "radial-gradient(ellipse 80% 70% at 50% 50%, #0d2b0d 0%, #071a07 100%)",
      border: "2px solid #1e4a1e",
      borderRadius: 16,
      padding: "16px 12px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 10,
      minHeight: 340,
      position: "relative",
    }}>

      {/* Trump badge */}
      {trump && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "rgba(240,192,64,.15)", border: "1px solid #f0c040",
          borderRadius: 8, padding: "3px 10px",
          color: "#f0c040", fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ color: SUIT_COLOR[trump] }}>{SUIT_SYMBOL[trump]}</span>
          <span>TRUMP</span>
        </div>
      )}

      {/* You bid badge */}
      {youBid && (
        <div style={{
          position: "absolute", top: 12, left: 12,
          background: "rgba(240,192,64,.12)", border: "1px solid #f0c040",
          borderRadius: 8, padding: "3px 10px",
          color: "#f0c040", fontSize: 12, fontWeight: 700,
        }}>
          You bid {youBid} ★
        </div>
      )}

      {/* Score */}
      {(scoreA > 0 || scoreB > 0 || finalScore) && (
        <div style={{
          display: "flex", gap: 20,
          position: "absolute", top: 12, left: 12,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#4fc3a1", fontSize: 18, fontWeight: 700 }}>{scoreA}</div>
            <div style={{ color: "#3a5a3a", fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>Your Team</div>
          </div>
          <div style={{ color: "#2a4a2a", fontSize: 14, alignSelf: "center" }}>vs</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#e05c5c", fontSize: 18, fontWeight: 700 }}>{scoreB}</div>
            <div style={{ color: "#3a5a3a", fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>Opponents</div>
          </div>
        </div>
      )}

      {/* Points earned */}
      {pointsEarned && pointsEarned.length > 0 && (
        <div style={{
          position: "absolute", top: 12, left: finalScore ? 120 : 12,
          display: "flex", gap: 4,
        }}>
          {pointsEarned.map((p) => (
            <div key={p} style={{
              background: POINT_COLORS[p] + "20",
              border: `1px solid ${POINT_COLORS[p]}`,
              borderRadius: 6, padding: "2px 7px",
              color: POINT_COLORS[p], fontSize: 10, fontWeight: 700,
            }}>
              {p}
            </div>
          ))}
        </div>
      )}

      {/* North seat */}
      <Seat {...(seats.north || {})} position="north" />

      {/* Middle row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", justifyContent: "center" }}>
        {/* West */}
        <Seat {...(seats.west || {})} position="west" />

        {/* Center trick area */}
        <div style={{
          flex: 1, maxWidth: 200,
          minHeight: 80,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 8,
          alignItems: "center",
          justifyItems: "center",
          background: "rgba(0,0,0,.15)",
          borderRadius: 10,
          padding: "10px 8px",
          border: trick.length > 0 ? "1px solid #2a4a2a" : "1px dashed #1e3a1e",
        }}>
          {trick.length === 0 && (
            <div style={{
              gridColumn: "1 / -1", gridRow: "1 / -1",
              color: "#2a4a2a", fontSize: 12, textAlign: "center",
            }}>
              {step <= 2 ? "Trick area" : ""}
            </div>
          )}
          {trick.map((c, i) => {
            // Position: north=top-center, south=bottom-center, west=middle-left, east=middle-right
            const positions = {
              north: { gridColumn: "1 / -1", gridRow: 1, justifySelf: "center" },
              south: { gridColumn: "1 / -1", gridRow: 2, justifySelf: "center" },
              west:  { gridColumn: 1, gridRow: "1 / -1", alignSelf: "center" },
              east:  { gridColumn: 2, gridRow: "1 / -1", alignSelf: "center" },
            };
            if (trick.length === 4) {
              // Use 2x2 grid
              const pos2x2 = { north: [1,1], south: [2,2], west: [2,1], east: [1,2] };
              const [row, col] = pos2x2[c.from] || [i+1, 1];
              return (
                <div key={i} style={{ gridRow: row, gridColumn: col }}>
                  <TrickCard {...c} />
                </div>
              );
            }
            return (
              <div key={i} style={positions[c.from] || {}}>
                <TrickCard {...c} />
              </div>
            );
          })}
        </div>

        {/* East */}
        <Seat {...(seats.east || {})} position="east" />
      </div>

      {/* Your seat label */}
      <div style={{ color: "#f0c040", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
        You
      </div>

      {/* Your hand */}
      {hand.length > 0 ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {hand.map((c, i) => <HandCard key={i} {...c} />)}
        </div>
      ) : (
        <div style={{ color: "#2a4a2a", fontSize: 12 }}>Hand complete</div>
      )}

      {/* Caption */}
      {caption && (
        <div style={{
          color: "#5a7a5a", fontSize: 12, textAlign: "center",
          borderTop: "1px solid #1e3a1e", paddingTop: 8, width: "100%",
        }}>
          {caption}
        </div>
      )}
    </div>
  );
}

// ── Main TutorialModal ────────────────────────────────────────────────────────
export default function TutorialModal({ onDismiss }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
      overflowY: "auto",
    }}>
      <div style={{
        width: "100%", maxWidth: 620,
        background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 50%,#091a09 100%)",
        border: "1px solid #2a4a2a",
        borderRadius: 18,
        padding: "24px",
        display: "flex", flexDirection: "column", gap: 16,
        fontFamily: "Georgia,serif",
        boxShadow: "0 24px 80px rgba(0,0,0,.7)",
        color: "#e8dfc8",
      }}>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <div style={{ color: "#5a7a5a", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
              Step {step + 1} of {STEPS.length}
            </div>
            <div style={{
              height: 4, borderRadius: 2, background: "#1e3a1e", width: "100%", maxWidth: 300,
            }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: "#f0c040",
                width: `${progress}%`,
                transition: "width .3s",
              }} />
            </div>
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: "transparent", border: "1px solid #2a4a2a",
              borderRadius: 8, padding: "6px 14px",
              color: "#5a7a5a", fontSize: 13, cursor: "pointer",
              fontFamily: "Georgia,serif",
            }}
          >
            Skip ×
          </button>
        </div>

        {/* Board */}
        <BoardView board={s.board} step={step} />

        {/* Step title + description */}
        <div>
          <div style={{
            fontFamily: "'Playfair Display',serif",
            color: "#f0c040", fontSize: 18, marginBottom: 8,
          }}>
            {s.title}
          </div>
          <p style={{ color: "#e8dfc8", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            {s.desc}
          </p>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{
              padding: "9px 20px", borderRadius: 12,
              border: "1px solid #2a4a2a", background: "transparent",
              color: step === 0 ? "#2a4a2a" : "#8aab8a",
              fontSize: 14, cursor: step === 0 ? "not-allowed" : "pointer",
              fontFamily: "Georgia,serif",
            }}
          >
            ← Back
          </button>

          {isLast ? (
            <button
              onClick={onDismiss}
              style={{
                padding: "9px 24px", borderRadius: 12,
                border: "1px solid #f0c040",
                background: "rgba(240,192,64,.15)",
                color: "#f0c040", fontSize: 14, cursor: "pointer",
                fontFamily: "Georgia,serif", fontWeight: 700,
              }}
            >
              Start Playing →
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              style={{
                padding: "9px 24px", borderRadius: 12,
                border: "1px solid #f0c040",
                background: "rgba(240,192,64,.12)",
                color: "#f0c040", fontSize: 14, cursor: "pointer",
                fontFamily: "Georgia,serif",
              }}
            >
              Next Step →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
