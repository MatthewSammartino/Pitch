const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const POINT_LABELS = {
  high:     "High",
  low:      "Low",
  jack:     "Jack",
  off_jack: "Off-Jack",
  game:     "Game",
};

function CardLabel({ card }) {
  if (!card) return null;
  const rank = card.length === 3 ? card.slice(0, 2) : card[0];
  const suit = card.length === 3 ? card[2] : card[1];
  const isRed = suit === "h" || suit === "d";
  return (
    <span style={{ color: isRed ? "#e05c5c" : "#f0e8d0", fontWeight: 600 }}>
      {rank}{SUIT_SYMBOLS[suit]}
    </span>
  );
}

export default function RoundSummaryModal({ summary, seats, onClose }) {
  if (!summary) return null;

  const seatName = {};
  for (const s of (seats || [])) seatName[s.seatIndex] = s.displayName;

  const { breakdown, bidderSeat, bid, bidMade, teamPointsEarned, teamScores } = summary;
  const bidder = seatName[bidderSeat] || "?";

  const pointRows = [
    breakdown?.high     && { type: "high",     team: breakdown.high.team,     card: breakdown.high.card },
    breakdown?.low      && { type: "low",       team: breakdown.low.team,      card: breakdown.low.card },
    breakdown?.jack     && { type: "jack",      team: breakdown.jack.team,     card: breakdown.jack.card },
    breakdown?.offJack  && { type: "off_jack",  team: breakdown.offJack.team,  card: breakdown.offJack.card },
    breakdown?.game     && { type: "game",      team: breakdown.game.team,     card: null },
  ].filter(Boolean);

  const teamColor = (t) => (t === 0 ? "#4fc3a1" : "#f0c040");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#0d2b0d", border: "1px solid #2a5c2a",
        borderRadius: 14, padding: "28px 32px",
        maxWidth: 400, width: "100%",
        fontFamily: "Georgia,serif", color: "#e8dfc8",
      }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", color: "#f0e8d0", margin: "0 0 4px", fontSize: 20 }}>
          Round {summary.roundNumber} Over
        </h2>
        <p style={{ color: "#5a7a5a", fontSize: 13, margin: "0 0 20px" }}>
          {bidder} bid {bid} — <span style={{ color: bidMade ? "#4fc3a1" : "#e05c5c" }}>
            {bidMade ? "bid made" : "bid set"}
          </span>
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e4a1e" }}>
              <th style={{ textAlign: "left", color: "#5a7a5a", fontSize: 12, paddingBottom: 6 }}>Point</th>
              <th style={{ textAlign: "center", color: "#5a7a5a", fontSize: 12 }}>Card</th>
              <th style={{ textAlign: "right", color: "#5a7a5a", fontSize: 12 }}>Winner</th>
            </tr>
          </thead>
          <tbody>
            {pointRows.map(({ type, team, card }) => (
              <tr key={type} style={{ borderBottom: "1px solid #0d2b0d" }}>
                <td style={{ padding: "7px 0", fontSize: 14 }}>{POINT_LABELS[type]}</td>
                <td style={{ textAlign: "center", fontSize: 14 }}>
                  {card ? <CardLabel card={card} /> : "—"}
                </td>
                <td style={{ textAlign: "right", fontSize: 14, color: teamColor(team) }}>
                  Team {team === 0 ? "A" : "B"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: 14 }}>
          <div>
            <span style={{ color: "#4fc3a1" }}>Team A:</span>
            <span style={{ color: "#f0e8d0", fontWeight: 700, marginLeft: 8, fontSize: 18 }}>
              {teamScores[0]}
            </span>
            <span style={{ color: "#5a7a5a", fontSize: 12, marginLeft: 4 }}>
              ({teamPointsEarned[0] >= 0 ? "+" : ""}{teamPointsEarned[0]})
            </span>
          </div>
          <div>
            <span style={{ color: "#f0c040" }}>Team B:</span>
            <span style={{ color: "#f0e8d0", fontWeight: 700, marginLeft: 8, fontSize: 18 }}>
              {teamScores[1]}
            </span>
            <span style={{ color: "#5a7a5a", fontSize: 12, marginLeft: 4 }}>
              ({teamPointsEarned[1] >= 0 ? "+" : ""}{teamPointsEarned[1]})
            </span>
          </div>
        </div>

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
