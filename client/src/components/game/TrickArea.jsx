const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const SUIT_COLORS  = { s: "#d8d8d8", h: "#e05c5c", d: "#5b9cf6", c: "#5eca7a" };

function parseCard(cardId) {
  if (!cardId) return { rank: "", suit: "s" };
  if (cardId.length === 3) return { rank: cardId.slice(0, 2), suit: cardId[2] };
  return { rank: cardId[0], suit: cardId[1] };
}

function TrickCard({ cardId, label }) {
  if (!cardId) {
    return <div style={{ width: 44, height: 62 }} />;
  }
  const { rank, suit } = parseCard(cardId);
  const color = SUIT_COLORS[suit];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 44, height: 62, borderRadius: 6,
        border: `1px solid ${color}`,
        background: "rgba(255,255,255,.07)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        margin: "0 auto",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color, lineHeight: 1 }}>{rank}</div>
        <div style={{ fontSize: 16, color, lineHeight: 1 }}>{SUIT_SYMBOLS[suit]}</div>
      </div>
      <div style={{ fontSize: 10, color: "#5a7a5a", marginTop: 3 }}>{label}</div>
    </div>
  );
}

export default function TrickArea({ currentTrick, seats, trumpSuit, mySeatIndex }) {
  const seatMap = {};
  for (const s of (seats || [])) seatMap[s.seatIndex] = s;

  const plays = {};
  for (const play of (currentTrick || [])) plays[play.seatIndex] = play.card;

  const v       = seats?.length || 4;
  const myIdx   = mySeatIndex ?? 0;
  const northIdx = (myIdx + 2) % v;
  const westIdx  = (myIdx + 1) % v;
  const eastIdx  = (myIdx + 3) % v;

  const trumpColor = trumpSuit ? SUIT_COLORS[trumpSuit] : "#3a5a3a";

  return (
    <div style={{
      display: "grid",
      gridTemplateAreas: `". north ." "west center east" ". south ."`,
      gridTemplateColumns: "1fr auto 1fr",
      gridTemplateRows: "auto auto auto",
      gap: "8px 16px",
      justifyItems: "center",
      alignItems: "center",
      padding: "16px 12px",
      minHeight: 200,
    }}>
      <div style={{ gridArea: "north" }}>
        <TrickCard cardId={plays[northIdx]} label={seatMap[northIdx]?.displayName} />
      </div>
      <div style={{ gridArea: "west" }}>
        <TrickCard cardId={plays[westIdx]} label={seatMap[westIdx]?.displayName} />
      </div>
      <div style={{ gridArea: "center", textAlign: "center" }}>
        {trumpSuit && (
          <>
            <div style={{ fontSize: 26, color: trumpColor, lineHeight: 1 }}>
              {SUIT_SYMBOLS[trumpSuit]}
            </div>
            <div style={{ fontSize: 10, color: "#3a5a3a", marginTop: 2, letterSpacing: 1 }}>
              TRUMP
            </div>
          </>
        )}
        {!trumpSuit && (
          <div style={{ width: 20, height: 20 }} />
        )}
      </div>
      <div style={{ gridArea: "east" }}>
        <TrickCard cardId={plays[eastIdx]} label={seatMap[eastIdx]?.displayName} />
      </div>
      <div style={{ gridArea: "south" }}>
        <TrickCard cardId={plays[myIdx]} label="You" />
      </div>
    </div>
  );
}
