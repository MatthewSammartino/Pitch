import useIsMobile from "../../hooks/useIsMobile";
import Card from "./Card";

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

export default function HandDisplay({ hand, validCards, onPlayCard }) {
  const isMobile = useIsMobile();
  const validSet = new Set(validCards || []);
  // When validCards is provided, gameplay is in progress — only valid cards
  // should be clickable, others render dimmed. Outside gameplay, all cards
  // render normally and none are clickable.
  const playMode = validCards !== undefined;

  if (!hand || hand.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "#3a5a3a", fontSize: 13, padding: 16 }}>
        No cards in hand.
      </div>
    );
  }

  const sorted = sortHand(hand);
  const size = isMobile ? "lg" : "xl";

  return (
    <div style={{
      display: "flex",
      gap: isMobile ? 6 : 10,
      justifyContent: "center",
      flexWrap: "wrap",
      padding: isMobile ? "10px 8px" : "20px 14px",
    }}>
      {sorted.map((cardId) => {
        const isValid = !playMode || validSet.has(cardId);
        return (
          <Card
            key={cardId}
            cardId={cardId}
            size={size}
            dim={playMode && !isValid}
            onClick={playMode && isValid ? () => onPlayCard?.(cardId) : undefined}
          />
        );
      })}
    </div>
  );
}
