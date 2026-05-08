import { useSuitColors } from "../../context/SuitColorContext";

const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const SUITS = ["s", "h", "d", "c"];

// Trump picker buttons sit on the dark felt, so pure-black/dark-blue/dark-green
// would be invisible. Map the user's card color preference to a brightened
// version that's legible against the dark background.
function pickerColor(c) {
  // c is the user's card color (e.g. "#1a1a1a" for ♠ in classic mode). Return
  // a lighter / more saturated version for use on dark backgrounds.
  switch (c) {
    case "#1a1a1a":  return "#e8dfc8"; // black → cream
    case "#c11414":  return "#e05c5c"; // dark red → bright red
    case "#1a5cb8":  return "#5b9cf6"; // dark blue → bright blue
    case "#1a7a3a":  return "#5eca7a"; // dark green → bright green
    default:         return c;
  }
}

// Bid buttons — visible but not oversized.
const bidBtn = {
  padding: "8px 18px",
  borderRadius: 12,
  border: "2px solid #4a6a3a",
  background: "rgba(240,192,64,.08)",
  color: "#f0e8d0",
  cursor: "pointer",
  fontSize: 16,
  fontFamily: "Georgia,serif",
  fontWeight: 700,
  minWidth: 48,
  transition: "all .12s",
  boxShadow: "0 2px 4px rgba(0,0,0,.25)",
};

const passBtn = {
  ...bidBtn,
  background: "rgba(0,0,0,.25)",
  border: "2px solid #5a2020",
  color: "#c89a9a",
  fontSize: 13,
  fontWeight: 500,
  minWidth: 64,
};

const trumpBtn = (color) => ({
  padding: "10px 16px",
  borderRadius: 12,
  border: `2px solid ${color}`,
  background: "rgba(255,255,255,.04)",
  color,
  cursor: "pointer",
  fontSize: 26,
  lineHeight: 1,
  fontFamily: "Georgia,serif",
  fontWeight: 700,
  minWidth: 52,
  boxShadow: "0 2px 4px rgba(0,0,0,.25)",
  transition: "all .12s",
});

export default function BidPanel({ action, validBids, canPass, onBid, onDeclareTrump }) {
  const { colors: cardColors } = useSuitColors();

  if (action === "bid") {
    return (
      <div style={{
        textAlign: "center",
        padding: "10px 10px",
        boxShadow: "0 0 16px rgba(240,192,64,.16) inset, 0 0 0 1px rgba(240,192,64,.16)",
        borderRadius: 10,
      }}>
        <div style={{
          color: "#f0c040",
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: 1.2,
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
              style={trumpBtn(pickerColor(cardColors[s]))}
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
