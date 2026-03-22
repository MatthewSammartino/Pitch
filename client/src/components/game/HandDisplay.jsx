const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const RED_SUITS    = new Set(["h", "d"]);

function parseCard(cardId) {
  if (cardId.length === 3) return { rank: cardId.slice(0, 2), suit: cardId[2] };
  return { rank: cardId[0], suit: cardId[1] };
}

function CardTile({ cardId, valid, selected, onClick }) {
  const { rank, suit } = parseCard(cardId);
  const isRed = RED_SUITS.has(suit);
  const canPlay = valid !== undefined; // undefined means not in play phase

  return (
    <div
      onClick={canPlay && valid ? onClick : undefined}
      style={{
        width: 52,
        height: 76,
        borderRadius: 8,
        border: `2px solid ${valid ? (isRed ? "#e05c5c" : "#f0e8d0") : "#1e4a1e"}`,
        background: valid ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.02)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: valid ? "pointer" : "default",
        opacity: canPlay && !valid ? 0.4 : 1,
        transform: valid ? "translateY(0)" : "none",
        transition: "all .1s",
        userSelect: "none",
      }}
      onMouseEnter={(e) => { if (valid) e.currentTarget.style.transform = "translateY(-6px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: isRed ? "#e05c5c" : "#f0e8d0", lineHeight: 1 }}>
        {rank}
      </div>
      <div style={{ fontSize: 20, color: isRed ? "#e05c5c" : "#f0e8d0", lineHeight: 1 }}>
        {SUIT_SYMBOLS[suit]}
      </div>
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

  return (
    <div style={{
      display: "flex",
      gap: 8,
      justifyContent: "center",
      flexWrap: "wrap",
      padding: "16px 12px",
    }}>
      {hand.map((cardId) => (
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
