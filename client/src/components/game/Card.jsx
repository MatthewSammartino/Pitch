// Shared playing-card component used wherever a face-up card is rendered.
// Renders a white card face with rank pips in the top-left + bottom-right
// (rotated 180°) and a large center suit symbol. Sized via the `size` prop.
//
// Card IDs follow the existing format: `<rank><suit>` where rank is one of
// "A","K","Q","J","10","9","8","7","6","5","4","3","2" and suit is "h","d","c","s".
// "10" is two characters, all other ranks are one — same as parseCard in TrickArea.

import { useSuitColors } from "../../context/SuitColorContext";

const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };

const SIZES = {
  xl: { w: 84, h: 118, corner: 10, pipFont: 18, suitFont: 17, centerFont: 48 },
  lg: { w: 64, h: 90,  corner: 8,  pipFont: 14, suitFont: 13, centerFont: 36 },
  md: { w: 52, h: 72,  corner: 6,  pipFont: 12, suitFont: 11, centerFont: 28 },
  sm: { w: 36, h: 50,  corner: 4,  pipFont: 9,  suitFont: 8,  centerFont: 18 },
};

function parseCard(cardId) {
  if (!cardId) return { rank: "?", suit: "s" };
  // Two-char rank ("10") + 1-char suit, or 1-char rank + 1-char suit.
  if (cardId.length === 3) return { rank: cardId.slice(0, 2), suit: cardId[2] };
  return { rank: cardId[0], suit: cardId[1] };
}

export default function Card({ cardId, size = "md", dim = false, onClick }) {
  const { colors } = useSuitColors();
  if (!cardId) {
    // Render an empty placeholder slot (used by TrickArea for missing players)
    const s = SIZES[size];
    return <div style={{ width: s.w, height: s.h, flexShrink: 0 }} />;
  }

  const { rank, suit } = parseCard(cardId);
  const color = colors[suit] || "#1a1a1a";
  const symbol = SUIT_SYMBOLS[suit] || "♠";
  const s = SIZES[size];
  const clickable = typeof onClick === "function";

  const cornerStyle = {
    display: "flex", flexDirection: "column", alignItems: "center",
    color, lineHeight: 1, fontFamily: "Georgia, serif",
  };

  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{
        width: s.w, height: s.h,
        borderRadius: s.corner,
        background: dim ? "#d4cfbe" : "#fdfbf3",
        boxShadow: dim
          ? "0 1px 2px rgba(0,0,0,.25)"
          : "0 2px 6px rgba(0,0,0,.4), 0 0 0 1px rgba(0,0,0,.15)",
        position: "relative",
        cursor: clickable ? "pointer" : "default",
        opacity: dim ? 0.55 : 1,
        userSelect: "none",
        flexShrink: 0,
        transition: "transform .12s, box-shadow .12s",
      }}
      onMouseEnter={(e) => {
        if (clickable) e.currentTarget.style.transform = "translateY(-6px)";
      }}
      onMouseLeave={(e) => {
        if (clickable) e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Top-left pip */}
      <div style={{
        ...cornerStyle,
        position: "absolute",
        top: s.corner * 0.5, left: s.corner * 0.7,
      }}>
        <span style={{ fontSize: s.pipFont, fontWeight: 700 }}>{rank}</span>
        <span style={{ fontSize: s.suitFont }}>{symbol}</span>
      </div>

      {/* Bottom-right pip (rotated 180°) */}
      <div style={{
        ...cornerStyle,
        position: "absolute",
        bottom: s.corner * 0.5, right: s.corner * 0.7,
        transform: "rotate(180deg)",
      }}>
        <span style={{ fontSize: s.pipFont, fontWeight: 700 }}>{rank}</span>
        <span style={{ fontSize: s.suitFont }}>{symbol}</span>
      </div>

      {/* Center suit (or center rank for face cards) */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        color,
        fontSize: s.centerFont,
        lineHeight: 1,
        fontFamily: "Georgia, serif",
        fontWeight: 700,
      }}>
        {symbol}
      </div>
    </div>
  );
}
