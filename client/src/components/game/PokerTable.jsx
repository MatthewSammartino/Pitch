import { useEffect, useRef, useState, useCallback } from "react";
import PlayerSeat from "./PlayerSeat";
import TrickArea from "./TrickArea";
import useIsMobile from "../../hooks/useIsMobile";

const TEAM_COLORS = ["#4fc3a1", "#f0c040", "#e07a5f"];
const ALLOWED_EMOJIS = ["👍", "👎", "😂", "😮", "😤", "🔥", "💀", "🎉"];

const TABLE_W = 540;
const TABLE_H = 420;

// Seat positions (left, top) relative to 540×420 wrapper
// All seats use transform: translate(-50%, -50%) for centering
const SEAT_POS_4 = {
  south: { left: 270, top: 390 },
  north: { left: 270, top: 30  },
  west:  { left: 18,  top: 210 },
  east:  { left: 522, top: 210 },
};
const SEAT_POS_6 = {
  south: { left: 270, top: 390 },
  north: { left: 270, top: 30  },
  west:  { left: 18,  top: 285 },
  east:  { left: 522, top: 285 },
  nw:    { left: 68,  top: 95  },
  ne:    { left: 472, top: 95  },
};

function isActive(seat, game) {
  if (!seat || !game) return false;
  if (game.status === "BIDDING")           return game.currentBidderSeat === seat.seatIndex;
  if (game.status === "TRUMP_DECLARATION") return game.highBidderSeat    === seat.seatIndex;
  if (game.status === "TRICK_PLAYING")     return game.nextLeaderSeat    === seat.seatIndex;
  return false;
}

// Map compass directions to seat objects based on my seat index
function getPositionedSeats(game, mySeat) {
  if (!game || !mySeat) return {};
  const idx = mySeat.seatIndex;
  const v   = game.variant;
  const find = (offset) => game.seats.find((s) => s.seatIndex === (idx + offset) % v);

  if (v === 6) {
    return {
      west:  find(1),
      nw:    find(2),
      north: find(3),
      ne:    find(4),
      east:  find(5),
    };
  }
  return {
    west:  find(1),
    north: find(2),
    east:  find(3),
  };
}

export default function PokerTable({ game, mySeat, myHand, reactions, onReact }) {
  const isMobile = useIsMobile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Measure container width and compute scale on mobile
  const updateScale = useCallback(() => {
    if (!isMobile || !containerRef.current) { setScale(1); return; }
    const w = containerRef.current.offsetWidth;
    setScale(Math.min(1, (w - 8) / TABLE_W));
  }, [isMobile]);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function onDown(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  if (!game || !mySeat) return null;

  const positioned = getPositionedSeats(game, mySeat);
  const posMap = game.variant === 6 ? SEAT_POS_6 : SEAT_POS_4;
  const cardCount = myHand?.length ?? 0;

  function renderSeat(direction, seat) {
    if (!seat) return null;
    const pos = posMap[direction];
    if (!pos) return null;
    const tc = TEAM_COLORS[seat.team] ?? "#8aab8a";
    return (
      <div
        key={direction}
        style={{
          position: "absolute",
          left: pos.left,
          top:  pos.top,
          transform: "translate(-50%, -50%)",
          zIndex: 5,
        }}
      >
        <PlayerSeat
          seat={seat}
          isMe={false}
          isActive={isActive(seat, game)}
          isDealer={game.dealerSeat === seat.seatIndex}
          cardCount={cardCount}
          game={game}
          reaction={reactions.get(seat.seatIndex) ?? null}
          teamColor={tc}
        />
      </div>
    );
  }

  const myTeamColor = TEAM_COLORS[mySeat.team] ?? "#8aab8a";
  const myPos = posMap.south;

  const scaledHeight = TABLE_H * scale;

  return (
    // Outer scaling container
    <div
      ref={containerRef}
      style={{
        width: isMobile ? "100%" : TABLE_W,
        height: isMobile ? scaledHeight : TABLE_H,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Inner: fixed 540×420 layout, scaled down on mobile */}
      <div style={{
        position: "relative",
        width: TABLE_W,
        height: TABLE_H,
        transformOrigin: "top left",
        transform: scale < 1 ? `scale(${scale})` : undefined,
      }}>

        {/* ── Felt oval ─────────────────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          left: 0, top: 70,
          width: 540, height: 280,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 40% 35%, #2d7a2d 0%, #1a5c1a 45%, #0e3d0e 75%, #071a07 100%)",
          boxShadow: [
            "0 0 0 8px #5c3d1a",
            "0 0 0 14px #3d2510",
            "0 0 0 15px #2a1a08",
            "0 8px 40px rgba(0,0,0,.75)",
            "inset 0 2px 8px rgba(255,255,255,.05)",
          ].join(", "),
        }}>
          {/* Felt texture overlay */}
          <div style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            backgroundImage: [
              "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.025) 2px, rgba(0,0,0,.025) 4px)",
              "repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255,255,255,.01) 2px, rgba(255,255,255,.01) 4px)",
            ].join(", "),
            pointerEvents: "none",
            zIndex: 1,
          }} />

          {/* TrickArea — centered inside oval */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: game.variant === 6 ? 290 : 230,
            zIndex: 2,
          }}>
            <TrickArea
              currentTrick={game.currentTrick}
              completedTrick={game.completedTrick}
              seats={game.seats}
              trumpSuit={game.trumpSuit}
              mySeatIndex={mySeat.seatIndex}
            />
          </div>
        </div>

        {/* ── Opponent seats ────────────────────────────────────────────────── */}
        {Object.entries(positioned).map(([dir, seat]) => renderSeat(dir, seat))}

        {/* ── My seat (south) ───────────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          left: myPos.left,
          top:  myPos.top,
          transform: "translate(-50%, -50%)",
          zIndex: 5,
        }}>
          <PlayerSeat
            seat={mySeat}
            isMe
            isActive={isActive(mySeat, game)}
            isDealer={game.dealerSeat === mySeat.seatIndex}
            cardCount={cardCount}
            game={game}
            reaction={reactions.get(mySeat.seatIndex) ?? null}
            teamColor={myTeamColor}
          />
        </div>

        {/* ── Emoji reaction picker ─────────────────────────────────────────── */}
        <div
          ref={pickerRef}
          style={{
            position: "absolute",
            left: myPos.left + 50,
            top:  myPos.top - 18,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setPickerOpen((p) => !p)}
            title="React"
            style={{
              width: 26, height: 26, borderRadius: "50%",
              border: "1px solid #2a5c2a",
              background: "rgba(0,0,0,.5)",
              color: "#8aab8a", fontSize: 13,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0,
            }}
          >
            😀
          </button>

          {pickerOpen && (
            <div style={{
              position: "absolute",
              bottom: 32,
              left: 0,
              background: "rgba(7,26,7,.97)",
              border: "1px solid #1e4a1e",
              borderRadius: 12,
              padding: 8,
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              width: 152,
              zIndex: 20,
              boxShadow: "0 4px 16px rgba(0,0,0,.6)",
            }}>
              {ALLOWED_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => { onReact(e); setPickerOpen(false); }}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: "1px solid #1e4a1e",
                    background: "transparent",
                    cursor: "pointer", fontSize: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background .1s",
                  }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,.08)"; }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = "transparent"; }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
