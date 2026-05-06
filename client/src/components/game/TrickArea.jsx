import Card from "./Card";

const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
// Trump suit indicator at center of the trick area. Red for ♥/♦, light grey
// for ♠/♣ (pure black would disappear into the dark felt).
const TRUMP_INDICATOR_COLOR = { h: "#e05c5c", d: "#e05c5c", c: "#e8dfc8", s: "#e8dfc8" };

function TrickCard({ cardId, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Card cardId={cardId} size="md" />
      </div>
      <div style={{ fontSize: 10, color: "#5a7a5a", marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function TrickArea({ currentTrick, completedTrick, seats, trumpSuit, mySeatIndex }) {
  const seatMap = {};
  for (const s of (seats || [])) seatMap[s.seatIndex] = s;

  const displayTrick = (currentTrick && currentTrick.length > 0) ? currentTrick : completedTrick?.plays;
  const isCompleted  = (!currentTrick || currentTrick.length === 0) && completedTrick != null;

  const plays = {};
  for (const play of (displayTrick || [])) plays[play.seatIndex] = play.card;

  const v     = seats?.length || 4;
  const myIdx = mySeatIndex ?? 0;

  const winnerName = isCompleted && completedTrick
    ? (seatMap[completedTrick.winnerSeat]?.displayName || "?")
    : null;
  const trumpColor = trumpSuit ? TRUMP_INDICATOR_COLOR[trumpSuit] : "#3a5a3a";

  // ── 6-player layout ───────────────────────────────────────────────────────
  if (v === 6) {
    const westIdx  = (myIdx + 1) % 6;
    const nwIdx    = (myIdx + 2) % 6;
    const northIdx = (myIdx + 3) % 6; // partner
    const neIdx    = (myIdx + 4) % 6;
    const eastIdx  = (myIdx + 5) % 6;

    return (
      <div style={{
        display: "grid",
        gridTemplateAreas: `"nw north ne" "west center east" ". south ."`,
        gridTemplateColumns: "1fr auto 1fr",
        gridTemplateRows: "auto auto auto",
        gap: "8px 10px",
        justifyItems: "center",
        alignItems: "center",
        padding: "12px 10px",
        minHeight: 220,
        opacity: isCompleted ? 0.7 : 1,
        transition: "opacity .3s",
      }}>
        <div style={{ gridArea: "nw" }}>
          <TrickCard cardId={plays[nwIdx]} label={seatMap[nwIdx]?.displayName} />
        </div>
        <div style={{ gridArea: "north" }}>
          <TrickCard cardId={plays[northIdx]} label={seatMap[northIdx]?.displayName} />
        </div>
        <div style={{ gridArea: "ne" }}>
          <TrickCard cardId={plays[neIdx]} label={seatMap[neIdx]?.displayName} />
        </div>
        <div style={{ gridArea: "west" }}>
          <TrickCard cardId={plays[westIdx]} label={seatMap[westIdx]?.displayName} />
        </div>
        <div style={{ gridArea: "center", textAlign: "center" }}>
          {winnerName && (
            <div style={{ fontSize: 11, color: "#f0c040", marginBottom: 6, whiteSpace: "nowrap" }}>
              {winnerName} wins
            </div>
          )}
          {trumpSuit && (
            <>
              <div style={{ fontSize: 22, color: trumpColor, lineHeight: 1 }}>{SUIT_SYMBOLS[trumpSuit]}</div>
              <div style={{ fontSize: 10, color: "#3a5a3a", marginTop: 2, letterSpacing: 1 }}>TRUMP</div>
            </>
          )}
          {!trumpSuit && <div style={{ width: 20, height: 20 }} />}
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

  // ── 4-player layout ───────────────────────────────────────────────────────
  const northIdx = (myIdx + 2) % v;
  const westIdx  = (myIdx + 1) % v;
  const eastIdx  = (myIdx + 3) % v;

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
      opacity: isCompleted ? 0.7 : 1,
      transition: "opacity .3s",
    }}>
      <div style={{ gridArea: "north" }}>
        <TrickCard cardId={plays[northIdx]} label={seatMap[northIdx]?.displayName} />
      </div>
      <div style={{ gridArea: "west" }}>
        <TrickCard cardId={plays[westIdx]} label={seatMap[westIdx]?.displayName} />
      </div>
      <div style={{ gridArea: "center", textAlign: "center" }}>
        {winnerName && (
          <div style={{ fontSize: 11, color: "#f0c040", marginBottom: 6, whiteSpace: "nowrap" }}>
            {winnerName} wins
          </div>
        )}
        {trumpSuit && (
          <>
            <div style={{ fontSize: 26, color: trumpColor, lineHeight: 1 }}>{SUIT_SYMBOLS[trumpSuit]}</div>
            <div style={{ fontSize: 10, color: "#3a5a3a", marginTop: 2, letterSpacing: 1 }}>TRUMP</div>
          </>
        )}
        {!trumpSuit && <div style={{ width: 20, height: 20 }} />}
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
