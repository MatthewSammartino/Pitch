const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const SUIT_NAMES   = { h: "Hearts", d: "Diamonds", c: "Clubs", s: "Spades" };

export default function ScoreBoard({ game, myUserId }) {
  if (!game) return null;

  const teamA = game.seats.filter((s) => s.team === 0).map((s) => s.displayName).join(" & ");
  const teamB = game.seats.filter((s) => s.team === 1).map((s) => s.displayName).join(" & ");

  const statusLabel = () => {
    if (game.status === "BIDDING") {
      const bidder = game.seats.find((s) => s.seatIndex === game.currentBidderSeat);
      return bidder ? `${bidder.displayName}'s turn to bid` : "Bidding…";
    }
    if (game.status === "TRUMP_DECLARATION") {
      const b = game.seats.find((s) => s.seatIndex === game.highBidderSeat);
      return b ? `${b.displayName} won the bid (${game.currentBid}) — declaring trump` : "Declaring trump…";
    }
    if (game.status === "TRICK_PLAYING") {
      const leader = game.seats.find((s) => s.seatIndex === game.nextLeaderSeat);
      const trump = game.trumpSuit ? `Trump: ${SUIT_SYMBOLS[game.trumpSuit]} ${SUIT_NAMES[game.trumpSuit]}` : "";
      return leader ? `${leader.displayName}'s turn to play  ·  ${trump}` : trump;
    }
    if (game.status === "GAME_OVER") return "Game Over!";
    return "";
  };

  return (
    <div style={{
      background: "rgba(7,26,7,0.9)",
      borderBottom: "1px solid #1e4a1e",
      padding: "10px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 10,
      fontSize: 13,
    }}>
      <div style={{ display: "flex", gap: 24 }}>
        <div>
          <span style={{ color: "#4fc3a1" }}>Team A</span>
          <span style={{ color: "#5a7a5a", marginLeft: 6 }}>{teamA}</span>
          <span style={{ color: "#f0e8d0", fontWeight: 700, marginLeft: 8, fontSize: 18 }}>
            {game.teamScores[0]}
          </span>
        </div>
        <div>
          <span style={{ color: "#f0c040" }}>Team B</span>
          <span style={{ color: "#5a7a5a", marginLeft: 6 }}>{teamB}</span>
          <span style={{ color: "#f0e8d0", fontWeight: 700, marginLeft: 8, fontSize: 18 }}>
            {game.teamScores[1]}
          </span>
        </div>
      </div>
      <div style={{ color: "#8aab8a", fontStyle: "italic" }}>
        {statusLabel()}
      </div>
      <div style={{ color: "#3a5a3a", fontSize: 12 }}>
        Round {game.roundNumber}  ·  First to {game.targetScore}
      </div>
    </div>
  );
}
