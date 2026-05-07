import { useEffect, useRef, useState } from "react";
import PlayerSeat from "./PlayerSeat";
import TrickArea from "./TrickArea";
import useIsMobile from "../../hooks/useIsMobile";

const TEAM_COLORS = ["#4fc3a1", "#f0c040", "#e07a5f"];
const ALLOWED_EMOJIS = ["👍", "👎", "😂", "😮", "😤", "🔥", "💀", "🎉"];

// Seat positions are PERCENTAGES of the table area, not absolute pixels.
// This means the table layout stretches to fill any available rectangle —
// avatars and cards stay at their natural sizes, but their positions spread
// proportionally with the play area. Each seat uses translate(-50%, -50%)
// so the percentage refers to the seat's center.
const SEAT_POS_4 = {
  south: { left: "50%", top: "92%" },
  north: { left: "50%", top: "8%"  },
  west:  { left: "5%",  top: "50%" },
  east:  { left: "95%", top: "50%" },
};
const SEAT_POS_6 = {
  south: { left: "50%", top: "92%" },
  north: { left: "50%", top: "8%"  },
  west:  { left: "5%",  top: "65%" },
  east:  { left: "95%", top: "65%" },
  nw:    { left: "13%", top: "22%" },
  ne:    { left: "87%", top: "22%" },
};

function isActive(seat, game) {
  if (!seat || !game) return false;
  if (game.status === "BIDDING")           return game.currentBidderSeat === seat.seatIndex;
  if (game.status === "TRUMP_DECLARATION") return game.highBidderSeat    === seat.seatIndex;
  if (game.status === "TRICK_PLAYING")     return game.nextLeaderSeat    === seat.seatIndex;
  return false;
}

// Map compass directions to seat objects based on my seat index.
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

// Spectator layout — no "me", all seats positioned by seatIndex.
function getSpectatorPositionedSeats(game) {
  if (!game) return {};
  const find = (i) => game.seats.find((s) => s.seatIndex === i);
  if (game.variant === 6) {
    return {
      south: find(0), west: find(1), nw: find(2),
      north: find(3), ne: find(4), east: find(5),
    };
  }
  return {
    south: find(0), west: find(1), north: find(2), east: find(3),
  };
}

// Soft minimums so the table doesn't collapse on tiny windows.
const MIN_HEIGHT = 240;
const MIN_WIDTH  = 320;

export default function PokerTable({ game, mySeat, myHand, reactions, onReact, spectatorMode = false }) {
  const isMobile = useIsMobile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);
  // Height is determined by the parent flex container (PokerTable's wrapper
  // is `height: 100%` and takes whatever space the play area gives it after
  // siblings — bid panel, hand, etc. — claim theirs). No more manual math.

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

  if (!game) return null;
  if (!spectatorMode && !mySeat) return null;

  const positioned = spectatorMode
    ? getSpectatorPositionedSeats(game)
    : getPositionedSeats(game, mySeat);
  const posMap = game.variant === 6 ? SEAT_POS_6 : SEAT_POS_4;

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
          cardCount={0}
          game={game}
          reaction={reactions.get(seat.seatIndex) ?? null}
          teamColor={tc}
        />
      </div>
    );
  }

  const myTeamColor = mySeat ? (TEAM_COLORS[mySeat.team] ?? "#8aab8a") : "#8aab8a";
  const myPos = posMap.south;

  return (
    // Wrapper fills both axes of whatever the parent gives it (the play
    // area's flex column with this as the flex:1 child). Seats positioned
    // by percentage, so as the wrapper grows the seats spread out — but
    // avatars/cards keep their natural sizes.
    <div
      style={{
        width: "100%",
        height: "100%",
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        position: "relative",
        overflow: "visible",
        flexShrink: 1,
      }}
    >
      {/* Trick area — centered in the table */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 2,
      }}>
        <TrickArea
          currentTrick={game.currentTrick}
          completedTrick={game.completedTrick}
          seats={game.seats}
          trumpSuit={game.trumpSuit}
          mySeatIndex={mySeat?.seatIndex ?? 0}
        />
      </div>

      {/* Opponent seats */}
      {Object.entries(positioned).map(([dir, seat]) => renderSeat(dir, seat))}

      {/* My seat (south) — only in non-spectator mode. In spectator mode
          the south position is already included in `positioned` above. */}
      {!spectatorMode && mySeat && (
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
            cardCount={0}
            game={game}
            reaction={reactions.get(mySeat.seatIndex) ?? null}
            teamColor={myTeamColor}
          />
        </div>
      )}

      {/* Emoji reaction picker — players only, anchored near the south seat. */}
      {!spectatorMode && mySeat && (
        <div
          ref={pickerRef}
          style={{
            position: "absolute",
            left: `calc(${myPos.left} + 50px)`,
            top:  `calc(${myPos.top} - 28px)`,
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
      )}
    </div>
  );
}
