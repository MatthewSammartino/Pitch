// Renders "<player> bid <amount> <trump>" between the ScoreBoard and the
// table, visible whenever bidding has ended (TRUMP_DECLARATION + TRICK_PLAYING).
//
// During TRUMP_DECLARATION the trump suit isn't set yet, so the trump glyph
// is omitted. The banner clears naturally on round end since `highBidderSeat`
// resets in GameStateMachine when the next round deals.

const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const SUIT_COLORS  = { h: "#e05c5c", d: "#e05c5c", c: "#e8dfc8", s: "#e8dfc8" };

export default function WinningBidBanner({ game }) {
  if (!game) return null;
  const status = game.status;
  if (status !== "TRUMP_DECLARATION" && status !== "TRICK_PLAYING") return null;
  if (game.highBidderSeat == null || game.highBidderSeat < 0) return null;

  const bidder = game.seats?.find((s) => s.seatIndex === game.highBidderSeat);
  if (!bidder) return null;

  const trump = game.trumpSuit;
  const trumpColor = trump ? SUIT_COLORS[trump] : null;

  return (
    <div style={{
      maxWidth: 880, margin: "8px auto 0",
      background: "rgba(240,192,64,.06)",
      border: "1px solid #4a3010",
      borderRadius: 10,
      padding: "8px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      flexWrap: "wrap",
      fontFamily: "Georgia,serif",
      fontSize: 14,
    }}>
      <span style={{ color: "#5a7a5a", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>
        Winning Bid
      </span>
      <span style={{ color: "#f0e8d0", fontWeight: 700 }}>
        {bidder.displayName}
      </span>
      <span style={{ color: "#5a7a5a" }}>bid</span>
      <span style={{
        color: "#f0c040",
        fontSize: 18,
        fontWeight: 700,
        fontFamily: "Georgia,serif",
      }}>
        {game.currentBid}
      </span>
      {trump && (
        <span style={{
          color: trumpColor,
          fontSize: 22,
          lineHeight: 1,
        }}>
          {SUIT_SYMBOLS[trump]}
        </span>
      )}
      {!trump && status === "TRUMP_DECLARATION" && (
        <span style={{ color: "#5a7a5a", fontStyle: "italic", fontSize: 12 }}>
          choosing trump…
        </span>
      )}
    </div>
  );
}
