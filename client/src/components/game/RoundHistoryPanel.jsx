import { useState } from "react";

const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const SUIT_COLORS  = { s: "#d8d8d8", h: "#e05c5c", d: "#5b9cf6", c: "#5eca7a" };

function parseCard(cardId) {
  if (!cardId) return { rank: "", suit: "s" };
  if (cardId.length === 3) return { rank: cardId.slice(0, 2), suit: cardId[2] };
  return { rank: cardId[0], suit: cardId[1] };
}

function CardChip({ card }) {
  if (!card) return null;
  const { rank, suit } = parseCard(card);
  return (
    <span style={{ color: SUIT_COLORS[suit], fontWeight: 700, fontSize: 12 }}>
      {rank}{SUIT_SYMBOLS[suit]}
    </span>
  );
}

const CARD_PTS = { A: 4, K: 3, Q: 2, J: 1, "10": 10 };
function trickGamePts(plays) {
  return plays.reduce((sum, { card }) => sum + (CARD_PTS[parseCard(card).rank] || 0), 0);
}

function RoundEntry({ round, teamNames, index }) {
  const [open, setOpen] = useState(false);
  const [showTricks, setShowTricks] = useState(false);
  const { breakdown, bid, bidMade, bidderSeat, teamPointsEarned, teamScores, trumpSuit, tricks } = round;
  const TEAM_COLORS = ["#4fc3a1", "#f0c040", "#e07a5f"];
  const tc = (t) => TEAM_COLORS[t] ?? "#8aab8a";
  const tn = (t) => teamNames?.[t] ?? String.fromCharCode(65 + t);
  const numTeams = teamScores?.length ?? 2;

  const scoringPts = [
    breakdown?.high    && { label: "High",     card: breakdown.high.card,    team: breakdown.high.team },
    breakdown?.low     && { label: "Low",      card: breakdown.low.card,     team: breakdown.low.team },
    breakdown?.jack    && { label: "Jack",     card: breakdown.jack.card,    team: breakdown.jack.team },
    breakdown?.offJack && { label: "Off-Jack", card: breakdown.offJack.card, team: breakdown.offJack.team },
    breakdown?.game    && { label: "Game",     card: null,                   team: breakdown.game.team },
  ].filter(Boolean);

  return (
    <div style={{
      borderBottom: "1px solid #1a3a1a",
      paddingBottom: open ? 10 : 0,
      marginBottom: 2,
    }}>
      {/* Summary row */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
          padding: "7px 4px", fontFamily: "Georgia,serif",
          color: "#e8dfc8",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#5a7a5a" }}>Rnd {round.roundNumber}</span>
          <span style={{ fontSize: 13, color: SUIT_COLORS[trumpSuit] }}>{SUIT_SYMBOLS[trumpSuit]}</span>
          <span style={{ fontSize: 11, color: bidMade ? "#4fc3a1" : "#e05c5c" }}>
            {bidMade ? `✓${bid}` : `✗${bid}`}
          </span>
          <span style={{ fontSize: 10, color: "#3a5a3a" }}>{open ? "▾" : "▸"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, flexWrap: "wrap", gap: 4 }}>
          {Array.from({ length: numTeams }, (_, t) => (
            <span key={t} style={{ fontSize: 11, color: tc(t) }}>
              {teamPointsEarned[t] >= 0 ? "+" : ""}{teamPointsEarned[t]} → {teamScores[t]}
            </span>
          ))}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding: "0 4px 4px", fontSize: 12 }}>
          {/* Scoring points */}
          {scoringPts.map(({ label, card, team }) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "2px 0", borderBottom: "1px solid #0d2010",
            }}>
              <span style={{ color: "#8aab8a" }}>{label}</span>
              <span>{card ? <CardChip card={card} /> : (
                label === "Game"
                  ? <span style={{ color: "#5a7a5a", fontSize: 11 }}>
                      {(breakdown.gameValues ?? []).map((v, i) => `${tn(i)}:${v}`).join(" / ")} gpts
                    </span>
                  : null
              )}</span>
              <span style={{ color: tc(team), fontWeight: 600 }}>{tn(team)}</span>
            </div>
          ))}

          {/* Tricks toggle */}
          {tricks && tricks.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => setShowTricks((v) => !v)}
                style={{
                  background: "none", border: "none", color: "#3a5a3a",
                  cursor: "pointer", fontSize: 11, fontFamily: "Georgia,serif",
                  padding: 0,
                }}
              >
                {showTricks ? "▾" : "▸"} Tricks
              </button>
              {showTricks && tricks.map((trick, i) => {
                const pts = trickGamePts(trick.plays);
                return (
                  <div key={i} style={{
                    marginTop: 4, padding: "4px 6px",
                    background: "rgba(255,255,255,.02)",
                    borderRadius: 4, fontSize: 11,
                  }}>
                    <div style={{ color: "#3a5a3a", marginBottom: 2 }}>
                      T{i + 1}{pts > 0 ? ` · ${pts}gp` : ""}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {trick.plays.map(({ card }, pi) => (
                        <CardChip key={pi} card={card} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RoundHistoryPanel({ rounds, teamNames, isMobile }) {
  if (!rounds || rounds.length === 0) {
    return (
      <div style={{
        width: isMobile ? "100%" : 200, flexShrink: 0,
        fontFamily: "Georgia,serif",
        padding: "12px 8px",
      }}>
        <div style={{ fontSize: 10, color: "#2a4a2a", letterSpacing: 1, marginBottom: 8 }}>
          ROUND HISTORY
        </div>
        <div style={{ fontSize: 12, color: "#2a4a2a" }}>No rounds yet.</div>
      </div>
    );
  }

  return (
    <div style={{
      width: isMobile ? "100%" : 200, flexShrink: 0,
      fontFamily: "Georgia,serif",
      padding: "12px 8px",
      maxHeight: isMobile ? 200 : "calc(100vh - 140px)",
      overflowY: "auto",
    }}>
      <div style={{ fontSize: 10, color: "#3a5a3a", letterSpacing: 1, marginBottom: 8 }}>
        ROUND HISTORY
      </div>
      {rounds.map((r, i) => (
        <RoundEntry key={i} round={r} teamNames={teamNames} index={i} />
      ))}
    </div>
  );
}
