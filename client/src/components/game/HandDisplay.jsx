const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const SUIT_COLORS  = { s: "#d8d8d8", h: "#e05c5c", d: "#5b9cf6", c: "#5eca7a" };

const SUIT_ORDER = { s: 0, h: 1, d: 2, c: 3 };
const RANK_ORDER = { A: 0, K: 1, Q: 2, J: 3, "10": 4, "9": 5, "8": 6, "7": 7, "6": 8, "5": 9, "4": 10, "3": 11, "2": 12 };

function parseCard(cardId) {
  if (cardId.length === 3) return { rank: cardId.slice(0, 2), suit: cardId[2] };
  return { rank: cardId[0], suit: cardId[1] };
}

function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const pa = parseCard(a), pb = parseCard(b);
    const sd = SUIT_ORDER[pa.suit] - SUIT_ORDER[pb.suit];
    if (sd !== 0) return sd;
    return RANK_ORDER[pa.rank] - RANK_ORDER[pb.rank];
  });
}

function CardTile({ cardId, valid, onClick }) {
  const { rank, suit } = parseCard(cardId);
  const color   = SUIT_COLORS[suit];
  const canPlay = valid !== undefined;

  return (
    <div
      onClick={canPlay && valid ? onClick : undefined}
      style={{
        width: 52,
        height: 76,
        borderRadius: 8,
        border: `2px solid ${valid ? color : "#1e4a1e"}`,
        background: valid ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.02)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: valid ? "pointer" : "default",
        opacity: canPlay && !valid ? 0.4 : 1,
        transition: "all .1s",
        userSelect: "none",
      }}
      onMouseEnter={(e) => { if (valid) e.currentTarget.style.transform = "translateY(-6px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{rank}</div>
      <div style={{ fontSize: 20, color, lineHeight: 1 }}>{SUIT_SYMBOLS[suit]}</div>
    </div>
  );
}

export default function HandDisplay({ hand, validCards, onPlayCard }) {
  const validSet = new Set(validCards || []);

  if (!hand || hand.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "#3a5a3a", fontSize: 13, padding: 16 }}>
        No cards in hand.
      </div>
    );
  }

  const sorted = sortHand(hand);

  return (
    <div style={{
      display: "flex",
      gap: 8,
      justifyContent: "center",
      flexWrap: "wrap",
      padding: "16px 12px",
    }}>
      {sorted.map((cardId) => (
        <CardTile
          key={cardId}
          cardId={cardId}
          valid={validCards !== undefined ? validSet.has(cardId) : undefined}
          onClick={() => onPlayCard?.(cardId)}
        />
      ))}
    </div>
  );
}
