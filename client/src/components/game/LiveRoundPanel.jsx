const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };
const SUIT_COLORS  = { s: "#d8d8d8", h: "#e05c5c", d: "#5b9cf6", c: "#5eca7a" };
const TEAM_COLORS  = ["#4fc3a1", "#f0c040", "#e07a5f"];

function parseCard(cardId) {
  if (!cardId) return { rank: "", suit: "s" };
  if (cardId.length === 3) return { rank: cardId.slice(0, 2), suit: cardId[2] };
  return { rank: cardId[0], suit: cardId[1] };
}

function CardChip({ card }) {
  if (!card) return <span style={{ color: "#3a5a3a" }}>—</span>;
  const { rank, suit } = parseCard(card);
  return (
    <span style={{ color: SUIT_COLORS[suit], fontWeight: 700 }}>
      {rank}{SUIT_SYMBOLS[suit]}
    </span>
  );
}

function TeamDot({ team }) {
  return (
    <span style={{
      display: "inline-block",
      width: 8, height: 8, borderRadius: "50%",
      background: TEAM_COLORS[team],
      marginLeft: 4,
      verticalAlign: "middle",
    }} />
  );
}

function PointRow({ label, card, team, teamNames }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
      <span style={{ color: "#3a5a3a", fontSize: 11, width: 54, flexShrink: 0 }}>{label}</span>
      <CardChip card={card} />
      {team !== undefined && (
        <span style={{ color: TEAM_COLORS[team], fontSize: 11, marginLeft: 2 }}>
          {teamNames?.[team] ?? (team === 0 ? "A" : "B")}
        </span>
      )}
    </div>
  );
}

export default function LiveRoundPanel({ liveRoundScoring, teamNames, trumpSuit }) {
  if (!liveRoundScoring) return null;

  const { high, low, jack, offJack, gameValues } = liveRoundScoring;
  const tl = (t) => teamNames?.[t] ?? (t === 0 ? "A" : "B");

  return (
    <div style={{
      background: "rgba(0,0,0,.25)",
      border: "1px solid #1e4a1e",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 13,
      fontFamily: "Georgia,serif",
    }}>
      <div style={{
        fontSize: 10, color: "#3a5a3a", letterSpacing: 1,
        marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
      }}>
        THIS ROUND
        {trumpSuit && (
          <span style={{ color: SUIT_COLORS[trumpSuit] }}>
            {SUIT_SYMBOLS[trumpSuit]}
          </span>
        )}
      </div>

      <PointRow label="High"     card={high?.card}    team={high?.team}    teamNames={teamNames} />
      <PointRow label="Low"      card={low?.card}     team={low?.team}     teamNames={teamNames} />
      <PointRow label="Jack"     card={jack?.card}    team={jack?.team}    teamNames={teamNames} />
      <PointRow label="Off-Jack" card={offJack?.card} team={offJack?.team} teamNames={teamNames} />

      {/* Game pts row */}
      <div style={{
        borderTop: "1px solid #1e4a1e",
        marginTop: 6, paddingTop: 6,
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
      }}>
        <span style={{ color: "#3a5a3a", fontSize: 11, width: 54, flexShrink: 0 }}>Game</span>
        {(gameValues ?? []).map((v, t) => (
          <span key={t} style={{ color: TEAM_COLORS[t], fontSize: 11 }}>
            {tl(t)}: {v}
          </span>
        ))}
      </div>
    </div>
  );
}
