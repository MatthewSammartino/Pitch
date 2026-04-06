import { useEffect, useState } from "react";

export default function PlayerSeat({
  seat,
  isMe,
  isActive,
  isDealer,
  cardCount,
  game,
  reaction,   // { emoji, id } | null
  teamColor,
}) {
  const [bubble, setBubble] = useState({ visible: false, emoji: null });

  // Trigger bubble animation whenever reaction.id changes
  useEffect(() => {
    if (!reaction) return;
    setBubble({ visible: true, emoji: reaction.emoji });
    const t = setTimeout(() => setBubble({ visible: false, emoji: null }), 2800);
    return () => clearTimeout(t);
  }, [reaction?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!seat) return null;

  const isBot = seat.isBot || seat.userId?.startsWith("bot-");
  const label = isMe ? "You" : seat.displayName;

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const ringStyle = isActive
    ? {
        boxShadow: `0 0 0 3px ${teamColor}, 0 0 14px 2px ${teamColor}80`,
        borderRadius: "50%",
      }
    : {
        border: `2px solid ${teamColor}60`,
        borderRadius: "50%",
      };

  let avatarContent;
  if (seat.avatarUrl) {
    avatarContent = (
      <img
        src={seat.avatarUrl}
        alt={seat.displayName}
        style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  } else if (isBot) {
    avatarContent = (
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "#2a3a2a",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24,
      }}>
        🤖
      </div>
    );
  } else {
    avatarContent = (
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: `${teamColor}30`,
        border: `2px solid ${teamColor}80`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#f0e8d0",
        fontSize: 20,
        fontWeight: 700,
        fontFamily: "Georgia,serif",
      }}>
        {seat.displayName?.[0]?.toUpperCase() ?? "?"}
      </div>
    );
  }

  // ── Bid label ────────────────────────────────────────────────────────────────
  const bidVal = game?.bids?.[seat.seatIndex];
  const bidLabel = game?.status === "BIDDING" && bidVal !== undefined
    ? (bidVal === "pass" ? "Pass" : `Bid ${bidVal}`)
    : null;

  // ── Card backs ───────────────────────────────────────────────────────────────
  const backCount = Math.min(cardCount || 0, 9);

  return (
    <div style={{
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      width: 88,
    }}>
      {/* Emoji bubble */}
      <div style={{
        position: "absolute",
        top: -52,
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 20,
        opacity: bubble.visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        fontSize: 30,
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))",
        userSelect: "none",
      }}>
        {bubble.emoji}
      </div>

      {/* Avatar with ring */}
      <div style={{ position: "relative", ...ringStyle }}>
        {avatarContent}

        {/* Dealer chip */}
        {isDealer && (
          <div style={{
            position: "absolute",
            top: -4, right: -4,
            width: 18, height: 18,
            borderRadius: "50%",
            background: "#f0c040",
            color: "#1a2a1a",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "Georgia,serif",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 3,
            boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}>
            D
          </div>
        )}
      </div>

      {/* Name plate */}
      <div style={{
        fontSize: 11,
        color: isActive ? "#f0c040" : "#f0e8d0",
        fontFamily: "Georgia,serif",
        textAlign: "center",
        maxWidth: 80,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontWeight: isActive ? 700 : 400,
      }}>
        {label}
      </div>

      {/* Bid label */}
      {bidLabel && (
        <div style={{
          fontSize: 10,
          color: bidVal === "pass" ? "#3a5a3a" : "#4fc3a1",
          fontFamily: "Georgia,serif",
        }}>
          {bidLabel}
        </div>
      )}

      {/* Card backs (opponent only) */}
      {!isMe && backCount > 0 && (
        <div style={{
          display: "flex",
          gap: 2,
          justifyContent: "center",
          flexWrap: "wrap",
          maxWidth: 72,
          marginTop: 2,
        }}>
          {Array.from({ length: backCount }).map((_, i) => (
            <div key={i} style={{
              width: 6, height: 10,
              borderRadius: 2,
              background: "linear-gradient(135deg,#1e4a1e,#0d2b0d)",
              border: "1px solid #2a5c2a",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
