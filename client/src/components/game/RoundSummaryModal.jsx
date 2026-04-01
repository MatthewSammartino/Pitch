import { useState } from "react";

const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const SUIT_COLORS  = { s: "#d8d8d8", h: "#e05c5c", d: "#5b9cf6", c: "#5eca7a" };
const TEAM_COLORS  = ["#4fc3a1", "#f0c040", "#e07a5f"];
const CARD_PTS     = { A: 4, K: 3, Q: 2, J: 1, "10": 10 };

function parseCard(cardId) {
  if (!cardId) return { rank: "", suit: "s" };
  if (cardId.length === 3) return { rank: cardId.slice(0, 2), suit: cardId[2] };
  return { rank: cardId[0], suit: cardId[1] };
}

function CardChip({ card }) {
  if (!card) return null;
  const { rank, suit } = parseCard(card);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 1,
      color: SUIT_COLORS[suit], fontWeight: 700, fontSize: 13,
    }}>
      {rank}{SUIT_SYMBOLS[suit]}
    </span>
  );
}

function trickCardPts(plays) {
  return plays.reduce((sum, { card }) => sum + (CARD_PTS[parseCard(card).rank] || 0), 0);
}

export default function RoundSummaryModal({ summary, seats, teamNames, onClose }) {
  const [showTricks, setShowTricks] = useState(false);
  if (!summary) return null;

  const seatName = {};
  const seatTeam = {};
  for (const s of (seats || [])) {
    seatName[s.seatIndex] = s.displayName;
    seatTeam[s.seatIndex] = s.team;
  }

  const { breakdown, bidderSeat, bid, bidMade, teamPointsEarned, teamScores, trumpSuit, tricks } = summary;
  const bidder = seatName[bidderSeat] || "?";
  const numTeams = teamScores?.length ?? 2;
  const tc = (t) => TEAM_COLORS[t] ?? "#8aab8a";
  const tl = (t) => teamNames?.[t] ?? String.fromCharCode(65 + t);

  const scoringRows = [
    breakdown?.high    && { key: "high",    label: "High",     card: breakdown.high.card,    team: breakdown.high.team },
    breakdown?.low     && { key: "low",     label: "Low",      card: breakdown.low.card,     team: breakdown.low.team },
    breakdown?.jack    && { key: "jack",    label: "Jack",     card: breakdown.jack.card,    team: breakdown.jack.team },
    breakdown?.offJack && { key: "offJack", label: "Off-Jack", card: breakdown.offJack.card, team: breakdown.offJack.team },
    breakdown?.game    && { key: "game",    label: "Game",     card: null,                   team: breakdown.game.team },
  ].filter(Boolean);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, overflowY: "auto",
    }}>
      <div style={{
        background: "#0d2b0d", border: "1px solid #2a5c2a",
        borderRadius: 14, padding: "24px 28px",
        maxWidth: 520, width: "100%",
        fontFamily: "Georgia,serif", color: "#e8dfc8",
        maxHeight: "90vh", overflowY: "auto",
      }}>

        {/* Header */}
        <h2 style={{ fontFamily: "'Playfair Display',serif", color: "#f0e8d0", margin: "0 0 2px", fontSize: 20 }}>
          Round {summary.roundNumber} Complete
        </h2>
        <p style={{ color: "#5a7a5a", fontSize: 13, margin: "0 0 20px" }}>
          Trump: <span style={{ color: SUIT_COLORS[trumpSuit] }}>{SUIT_SYMBOLS[trumpSuit]}</span>
          {" · "}{bidder} bid {bid} —{" "}
          <span style={{ color: bidMade ? "#4fc3a1" : "#e05c5c" }}>
            {bidMade ? "bid made ✓" : "bid set ✗"}
          </span>
        </p>

        {/* Team scores side-by-side */}
        <div style={{
          display: "grid", gridTemplateColumns: `repeat(${numTeams}, 1fr)`,
          gap: 10, marginBottom: 20,
        }}>
          {Array.from({ length: numTeams }, (_, t) => (
            <div key={t} style={{
              background: "rgba(255,255,255,.03)",
              border: `1px solid ${tc(t)}33`,
              borderRadius: 10, padding: "12px 14px",
              textAlign: "center",
            }}>
              <div style={{ color: tc(t), fontSize: 12, letterSpacing: 1, marginBottom: 4 }}>
                {tl(t)}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#f0e8d0", lineHeight: 1 }}>
                {teamScores[t]}
              </div>
              <div style={{ fontSize: 12, color: "#5a7a5a", marginTop: 4 }}>
                {teamPointsEarned[t] >= 0 ? "+" : ""}{teamPointsEarned[t]} this round
              </div>
            </div>
          ))}
        </div>

        {/* Scoring points breakdown */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#3a5a3a", letterSpacing: 1, marginBottom: 8 }}>
            SCORING POINTS
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: `80px 1fr ${Array(numTeams).fill("50px").join(" ")}`,
            gap: "2px 0", fontSize: 13,
          }}>
            {/* Header */}
            <div style={{ color: "#3a5a3a", fontSize: 11, paddingBottom: 4 }}>Point</div>
            <div style={{ color: "#3a5a3a", fontSize: 11, paddingBottom: 4 }}>Card</div>
            {Array.from({ length: numTeams }, (_, t) => (
              <div key={t} style={{ color: tc(t), fontSize: 11, textAlign: "center", paddingBottom: 4 }}>
                {tl(t)}
              </div>
            ))}
            {/* Divider */}
            <div style={{ gridColumn: "1/-1", borderTop: "1px solid #1e4a1e", marginBottom: 4 }} />

            {scoringRows.map(({ key, label, card, team }) => (
              <>
                <div key={key + "l"} style={{ color: "#e8dfc8", padding: "4px 0" }}>{label}</div>
                <div key={key + "c"} style={{ padding: "4px 0" }}>
                  {card ? <CardChip card={card} /> : (
                    <span style={{ color: "#5a7a5a", fontSize: 12 }}>
                      {key === "game"
                        ? (breakdown.gameValues ?? []).map((v, i) => `${tl(i)}: ${v}`).join(" / ") + " game pts"
                        : "—"}
                    </span>
                  )}
                </div>
                {Array.from({ length: numTeams }, (_, t) => (
                  <div key={key + t} style={{ textAlign: "center", padding: "4px 0", fontSize: 16 }}>
                    {team === t ? <span style={{ color: tc(t) }}>●</span> : ""}
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>

        {/* Tricks toggle */}
        {tricks && tricks.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setShowTricks((v) => !v)}
              style={{
                background: "none", border: "none", color: "#5a7a5a",
                cursor: "pointer", fontSize: 12, fontFamily: "Georgia,serif",
                letterSpacing: 1, padding: 0, marginBottom: showTricks ? 10 : 0,
              }}
            >
              {showTricks ? "▾" : "▸"} TRICKS ({tricks.length})
            </button>

            {showTricks && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tricks.map((trick, i) => {
                  const pts = trickCardPts(trick.plays);
                  const wTeam = seatTeam[trick.winnerSeat] ?? 0;
                  return (
                    <div key={i} style={{
                      background: "rgba(255,255,255,.02)",
                      border: "1px solid #1a3a1a",
                      borderRadius: 8, padding: "8px 10px",
                    }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        fontSize: 11, color: "#3a5a3a", marginBottom: 5,
                      }}>
                        <span>Trick {i + 1}</span>
                        <span style={{ color: tc(wTeam) }}>
                          {seatName[trick.winnerSeat]} wins{pts > 0 ? ` · ${pts} game pts` : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {trick.plays.map(({ seatIndex, card }) => (
                          <div key={seatIndex} style={{ textAlign: "center" }}>
                            <CardChip card={card} />
                            <div style={{ fontSize: 10, color: "#3a5a3a", marginTop: 1 }}>
                              {seatName[seatIndex]}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            display: "block", width: "100%", padding: "10px",
            borderRadius: 16, border: "1px solid #2a5c2a",
            background: "transparent", color: "#8aab8a",
            cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 14,
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
