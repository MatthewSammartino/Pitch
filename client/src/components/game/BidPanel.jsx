const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const SUIT_COLORS  = { s: "#d8d8d8", h: "#e05c5c", d: "#5b9cf6", c: "#5eca7a" };
const SUITS = ["s", "h", "d", "c"];

const btn = (active) => ({
  padding: "10px 20px",
  borderRadius: 16,
  border: `1px solid ${active ? "#f0c040" : "#2a5c2a"}`,
  background: active ? "rgba(240,192,64,.15)" : "transparent",
  color: active ? "#f0c040" : "#8aab8a",
  cursor: "pointer",
  fontSize: 15,
  fontFamily: "Georgia,serif",
  minWidth: 48,
  transition: "all .1s",
});

export default function BidPanel({ action, validBids, canPass, onBid, onDeclareTrump }) {
  if (action === "bid") {
    return (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div style={{ color: "#f0c040", fontSize: 13, marginBottom: 10 }}>Your turn to bid</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {validBids?.map((b) => (
            <button key={b} style={btn(false)} onClick={() => onBid(b)}>{b}</button>
          ))}
          {canPass && (
            <button style={{ ...btn(false), color: "#5a7a5a", borderColor: "#1e4a1e" }}
              onClick={() => onBid("pass")}>
              Pass
            </button>
          )}
        </div>
      </div>
    );
  }

  if (action === "declare_trump") {
    return (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div style={{ color: "#f0c040", fontSize: 13, marginBottom: 10 }}>Choose trump suit</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {SUITS.map((s) => (
            <button
              key={s}
              style={{
                ...btn(false),
                fontSize: 22,
                padding: "10px 16px",
                color: SUIT_COLORS[s],
                borderColor: SUIT_COLORS[s] + "55",
              }}
              onClick={() => onDeclareTrump(s)}
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
