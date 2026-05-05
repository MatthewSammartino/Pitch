import { useEffect, useRef, useState } from "react";
import PlayerSeat from "./PlayerSeat";
import TrickArea from "./TrickArea";
import useIsMobile from "../../hooks/useIsMobile";

const TEAM_COLORS = ["#4fc3a1", "#f0c040", "#e07a5f"];
const ALLOWED_EMOJIS = ["👍", "👎", "😂", "😮", "😤", "🔥", "💀", "🎉"];

// Active flag for the seat highlight ring.
function isActive(seat, game) {
  if (!seat || !game) return false;
  if (game.status === "BIDDING")           return game.currentBidderSeat === seat.seatIndex;
  if (game.status === "TRUMP_DECLARATION") return game.highBidderSeat    === seat.seatIndex;
  if (game.status === "TRICK_PLAYING")     return game.nextLeaderSeat    === seat.seatIndex;
  return false;
}

// Map compass directions to seat objects based on my seat index.
// Returns south/north/east/west (4p) or south/north/east/west/nw/ne (6p).
// For spectator mode (no `mySeat`) we anchor seat 0 at south and walk clockwise.
function getPositionedSeats(game, mySeat) {
  if (!game) return {};
  const v = game.variant;
  const idx = mySeat ? mySeat.seatIndex : 0;
  const find = (offset) => game.seats.find((s) => s.seatIndex === (idx + offset) % v);

  if (v === 6) {
    return {
      south: mySeat ? null : find(0),
      west:  find(1),
      nw:    find(2),
      north: find(3),
      ne:    find(4),
      east:  find(5),
    };
  }
  return {
    south: mySeat ? null : find(0),
    west:  find(1),
    north: find(2),
    east:  find(3),
  };
}

export default function PokerTable({ game, mySeat, myHand, reactions, onReact, spectatorMode = false }) {
  const isMobile = useIsMobile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

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

  const positioned = getPositionedSeats(game, spectatorMode ? null : mySeat);
  const myTeamColor = mySeat ? (TEAM_COLORS[mySeat.team] ?? "#8aab8a") : "#8aab8a";

  function SeatTile({ seat }) {
    if (!seat) return null;
    const tc = TEAM_COLORS[seat.team] ?? "#8aab8a";
    const me = !spectatorMode && mySeat && seat.seatIndex === mySeat.seatIndex;
    return (
      <PlayerSeat
        seat={seat}
        isMe={me}
        isActive={isActive(seat, game)}
        isDealer={game.dealerSeat === seat.seatIndex}
        cardCount={0}
        game={game}
        reaction={reactions.get(seat.seatIndex) ?? null}
        teamColor={tc}
      />
    );
  }

  // Grid layout: 3 rows × N columns. Center cell holds TrickArea.
  // 4-player:        6-player:
  //  .  N  .          NW  N  NE
  //  W  C  E          W   C   E
  //  .  S  .          .   S   .
  const isSix = game.variant === 6;
  const gridTemplateAreas = isSix
    ? `"nw north ne"
       "west center east"
       ".  south  ."`
    : `".  north  ."
       "west center east"
       ".  south  ."`;

  return (
    <div style={{
      width: "100%",
      maxWidth: isMobile ? "100%" : 880,
      margin: "0 auto",
      position: "relative",
    }}>
      <div style={{
        display: "grid",
        gridTemplateAreas,
        gridTemplateColumns: isMobile ? "auto 1fr auto" : "1fr 2fr 1fr",
        gridTemplateRows: "auto auto auto",
        gap: isMobile ? "12px 8px" : "20px 16px",
        justifyItems: "center",
        alignItems: "center",
        padding: isMobile ? "8px 4px" : "16px 12px",
      }}>
        {/* Perimeter seats */}
        {Object.entries(positioned).map(([dir, seat]) => (
          seat ? (
            <div key={dir} style={{ gridArea: dir }}>
              <SeatTile seat={seat} />
            </div>
          ) : null
        ))}

        {/* Center: trick cards */}
        <div style={{ gridArea: "center", width: "100%" }}>
          <TrickArea
            currentTrick={game.currentTrick}
            completedTrick={game.completedTrick}
            seats={game.seats}
            trumpSuit={game.trumpSuit}
            mySeatIndex={mySeat?.seatIndex ?? 0}
          />
        </div>

        {/* My seat (south) — only in non-spectator mode */}
        {!spectatorMode && mySeat && (
          <div style={{ gridArea: "south", position: "relative" }}>
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

            {/* Emoji reaction picker — anchored to my seat */}
            <div
              ref={pickerRef}
              style={{
                position: "absolute",
                top: 0,
                right: -34,
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
                  right: 0,
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
        )}
      </div>
    </div>
  );
}
