const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const RED_SUITS    = new Set(["h", "d"]);

function parseCard(cardId) {
  if (!cardId) return { rank: "", suit: "s" };
  if (cardId.length === 3) return { rank: cardId.slice(0, 2), suit: cardId[2] };
  return { rank: cardId[0], suit: cardId[1] };
}

function MiniCard({ cardId }) {
  const { rank, suit } = parseCard(cardId);
  const isRed = RED_SUITS.has(suit);
  return (
    <div style={{
      width: 44, height: 62, borderRadius: 6,
      border: "1px solid #2a5c2a",
      background: "rgba(255,255,255,.06)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: isRed ? "#e05c5c" : "#f0e8d0", lineHeight: 1 }}>
        {rank}
      </div>
      <div style={{ fontSize: 16, color: isRed ? "#e05c5c" : "#f0e8d0", lineHeight: 1 }}>
        {SUIT_SYMBOLS[suit]}
      </div>
    </div>
  );
}

export default function TrickArea({ currentTrick, seats, trumpSuit }) {
  const seatName = {};
  for (const s of (seats || [])) seatName[s.seatIndex] = s.displayName;

  const trumpLabel = trumpSuit
    ? `Trump: ${SUIT_SYMBOLS[trumpSuit]}`
    : null;

  return (
    <div style={{
      minHeight: 120,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "12px 0",
    }}>
      {trumpLabel && (
        <div style={{ fontSize: 13, color: "#5a7a5a", marginBottom: 4 }}>{trumpLabel}</div>
      )}
      {currentTrick && currentTrick.length > 0 ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {currentTrick.map(({ seatIndex, card }) => (
            <div key={seatIndex} style={{ textAlign: "center" }}>
              <MiniCard cardId={card} />
              <div style={{ fontSize: 11, color: "#5a7a5a", marginTop: 4 }}>
                {seatName[seatIndex] || `Seat ${seatIndex}`}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "#2a4a2a", fontSize: 13 }}>
          {trumpSuit ? "Waiting for lead…" : ""}
        </div>
      )}
    </div>
  );
}
