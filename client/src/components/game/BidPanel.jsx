const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
// Standard playing-card colors for the trump picker. Spades/clubs use a
// near-white that reads against the dark felt rather than pure black.
const SUIT_COLORS = { s: "#e8dfc8", h: "#e05c5c", d: "#e05c5c", c: "#e8dfc8" };
const SUITS = ["s", "h", "d", "c"];

// Big bid buttons — meaningfully larger than nav buttons so they're hard to miss.
const bidBtn = {
  padding: "14px 26px",
  borderRadius: 14,
  border: "2px solid #4a6a3a",
  background: "rgba(240,192,64,.08)",
  color: "#f0e8d0",
  cursor: "pointer",
  fontSize: 22,
  fontFamily: "Georgia,serif",
  fontWeight: 700,
  minWidth: 64,
  transition: "all .12s",
  boxShadow: "0 2px 6px rgba(0,0,0,.3)",
};

const passBtn = {
  ...bidBtn,
  background: "rgba(0,0,0,.25)",
  border: "2px solid #5a2020",
  color: "#c89a9a",
  fontSize: 16,
  fontWeight: 500,
  minWidth: 84,
};

const trumpBtn = (color) => ({
  padding: "16px 22px",
  borderRadius: 14,
  border: `2px solid ${color}`,
  background: "rgba(255,255,255,.04)",
  color,
  cursor: "pointer",
  fontSize: 36,
  lineHeight: 1,
  fontFamily: "Georgia,serif",
  fontWeight: 700,
  minWidth: 64,
  boxShadow: "0 2px 6px rgba(0,0,0,.3)",
  transition: "all .12s",
});

export default function BidPanel({ action, validBids, canPass, onBid, onDeclareTrump }) {
  if (action === "bid") {
    return (
      <div style={{
        textAlign: "center",
        padding: "14px 12px",
        // Subtle gold glow so the panel pops on the page when it's your turn.
        boxShadow: "0 0 20px rgba(240,192,64,.18) inset, 0 0 0 1px rgba(240,192,64,.18)",
        borderRadius: 12,
      }}>
        <div style={{
          color: "#f0c040",
          fontSize: 15,
          fontWeight: 700,
          marginBottom: 14,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          fontFamily: "Georgia,serif",
        }}>
          Your turn to bid
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          {validBids?.map((b) => (
            <button
              key={b}
              style={bidBtn}
              onClick={() => onBid(b)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(240,192,64,.22)";
                e.currentTarget.style.borderColor = "#f0c040";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(240,192,64,.08)";
                e.currentTarget.style.borderColor = "#4a6a3a";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {b}
            </button>
          ))}
          {canPass && (
            <>
              <div style={{ width: 1, height: 32, background: "#2a4a2a", margin: "0 4px" }} />
              <button
                style={passBtn}
                onClick={() => onBid("pass")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(90,32,32,.4)";
                  e.currentTarget.style.color = "#e0a0a0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0,0,0,.25)";
                  e.currentTarget.style.color = "#c89a9a";
                }}
              >
                Pass
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (action === "declare_trump") {
    return (
      <div style={{
        textAlign: "center",
        padding: "14px 12px",
        boxShadow: "0 0 20px rgba(240,192,64,.18) inset, 0 0 0 1px rgba(240,192,64,.18)",
        borderRadius: 12,
      }}>
        <div style={{
          color: "#f0c040",
          fontSize: 15,
          fontWeight: 700,
          marginBottom: 14,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          fontFamily: "Georgia,serif",
        }}>
          Choose trump suit
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {SUITS.map((s) => (
            <button
              key={s}
              style={trumpBtn(SUIT_COLORS[s])}
              onClick={() => onDeclareTrump(s)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,.08)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,.04)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {SUIT_SYMBOLS[s]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
