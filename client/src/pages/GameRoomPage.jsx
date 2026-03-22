import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSocketContext } from "../context/SocketContext";
import Navbar from "../components/layout/Navbar";
import ScoreBoard from "../components/game/ScoreBoard";
import HandDisplay from "../components/game/HandDisplay";
import BidPanel from "../components/game/BidPanel";
import TrickArea from "../components/game/TrickArea";
import RoundSummaryModal from "../components/game/RoundSummaryModal";
import GameOverModal from "../components/game/GameOverModal";

const SUIT_SYMBOLS = { h: "♥", d: "♦", c: "♣", s: "♠" };

export default function GameRoomPage() {
  const { sessionId } = useParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const { getSocket }  = useSocketContext();

  const [game, setGame]               = useState(null);      // publicState
  const [myHand, setMyHand]           = useState([]);
  const [validCards, setValidCards]   = useState([]);
  const [myTurn, setMyTurn]           = useState(null);      // { action, validBids, canPass, validCards }
  const [roundSummary, setRoundSummary] = useState(null);
  const [gameOver, setGameOver]       = useState(null);      // { winner, teamScores }
  const [error, setError]             = useState("");
  const [connStatus, setConnStatus]   = useState("connecting");

  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket("/game");
    socketRef.current = socket;

    function onConnect() {
      setConnStatus("connected");
      socket.emit("game:join", { sessionId });
    }
    function onConnectError(err) {
      setConnStatus("failed");
      setError(`Connection failed: ${err.message}`);
    }

    if (socket.connected) onConnect();
    else socket.on("connect", onConnect);

    socket.on("connect_error", onConnectError);

    socket.on("game:state", (state) => {
      setGame(state);
      // Clear my-turn if it's no longer my turn
      setMyTurn((prev) => {
        if (!prev) return prev;
        if (prev.userId !== user?.id) return prev;
        // Will be refreshed by game:your_turn if still active
        return null;
      });
    });

    socket.on("game:your_hand", ({ hand, validCards: vc }) => {
      setMyHand(hand || []);
      setValidCards(vc || []);
    });

    socket.on("game:your_turn", (info) => {
      if (info.userId === user?.id) {
        setMyTurn(info);
        if (info.validCards) setValidCards(info.validCards);
      } else {
        setMyTurn(null);
        setValidCards([]);
      }
    });

    socket.on("game:round_over", (summary) => {
      setRoundSummary(summary);
    });

    socket.on("game:game_over", (result) => {
      setGameOver(result);
      setRoundSummary(null);
    });

    socket.on("game:error", ({ message }) => {
      setError(message);
      setTimeout(() => setError(""), 4000);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("game:state");
      socket.off("game:your_hand");
      socket.off("game:your_turn");
      socket.off("game:round_over");
      socket.off("game:game_over");
      socket.off("game:error");
    };
  }, [sessionId, getSocket, user]);

  function emitBid(amount) {
    setMyTurn(null);
    socketRef.current?.emit("game:bid", { sessionId, amount });
  }

  function emitDeclareTrump(suit) {
    setMyTurn(null);
    socketRef.current?.emit("game:declare_trump", { sessionId, suit });
  }

  function emitPlayCard(card) {
    setValidCards([]);
    setMyTurn(null);
    socketRef.current?.emit("game:play_card", { sessionId, card });
  }

  // ── Layout helpers ──────────────────────────────────────────────────────

  const mySeat = game?.seats?.find((s) => s.userId === user?.id);
  const myTeam = mySeat?.team;

  // Arrange other players: partner across, opponents left/right
  function getPositionedSeats() {
    if (!game || !mySeat) return {};
    const others = game.seats.filter((s) => s.seatIndex !== mySeat.seatIndex);
    // For 4-player: seats[0]&[2] are partners, [1]&[3] are partners
    // Relative positions from my seat clockwise: right, top, left
    const positions = ["right", "top", "left"];
    const result = {};
    others.forEach((s, i) => { result[positions[i % 3]] = s; });
    return result;
  }

  const positioned = getPositionedSeats();

  function OpponentBox({ seat }) {
    if (!seat) return null;
    const isTeammate = seat.team === myTeam;
    const isNext = game?.nextLeaderSeat === seat.seatIndex ||
                   (game?.status === "BIDDING" && game?.currentBidderSeat === seat.seatIndex);
    const cardCount = game?.status !== "GAME_OVER"
      ? (6 - (game?.tricksPlayed || 0)) // rough estimate
      : 0;

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 4, minWidth: 80,
      }}>
        <div style={{
          padding: "4px 10px", borderRadius: 10,
          border: `1px solid ${isNext ? "#f0c040" : isTeammate ? "#1e6a4e" : "#2a3a2a"}`,
          background: isNext ? "rgba(240,192,64,.1)" : "transparent",
          color: isTeammate ? "#4fc3a1" : "#e8dfc8",
          fontSize: 13, fontFamily: "Georgia,serif",
        }}>
          {seat.displayName}
          {isTeammate && <span style={{ color: "#3a7a5a", fontSize: 11, marginLeft: 4 }}>●</span>}
        </div>
        {/* Card backs */}
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: Math.max(0, myHand.length) }).map((_, i) => (
            <div key={i} style={{
              width: 14, height: 20, borderRadius: 2,
              background: "linear-gradient(135deg, #1e4a1e, #0d2b0d)",
              border: "1px solid #2a5c2a",
            }} />
          ))}
        </div>
        {game?.status === "BIDDING" && game.bids[seat.seatIndex] !== undefined && (
          <div style={{ fontSize: 11, color: "#5a7a5a" }}>
            {game.bids[seat.seatIndex] === "pass" ? "Pass" : `Bid ${game.bids[seat.seatIndex]}`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
      color: "#e8dfc8",
      fontFamily: "Georgia,serif",
      display: "flex", flexDirection: "column",
    }}>
      <Navbar />
      <ScoreBoard game={game} myUserId={user?.id} />

      {/* Error banner */}
      {error && (
        <div style={{
          background: "rgba(224,92,92,.1)", border: "1px solid #5a2020",
          padding: "8px 20px", color: "#e05c5c", fontSize: 13, textAlign: "center",
        }}>
          {error}
        </div>
      )}

      {/* Connecting state */}
      {connStatus !== "connected" && !game && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#3a5a3a" }}>
          {connStatus === "failed" ? "Connection failed — try refreshing." : "Connecting to game…"}
        </div>
      )}

      {/* Game table */}
      {game && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 700, margin: "0 auto", width: "100%", padding: "16px 12px" }}>

          {/* Opponents row */}
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-start", marginBottom: 8 }}>
            <OpponentBox seat={positioned.left} />
            <OpponentBox seat={positioned.top} />
            <OpponentBox seat={positioned.right} />
          </div>

          {/* Trick area */}
          <div style={{
            background: "rgba(0,40,0,.3)",
            border: "1px solid #1e4a1e",
            borderRadius: 16,
            minHeight: 140,
            marginBottom: 8,
          }}>
            <TrickArea
              currentTrick={game.currentTrick}
              seats={game.seats}
              trumpSuit={game.trumpSuit}
            />
          </div>

          {/* My seat label */}
          {mySeat && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#5a7a5a", marginBottom: 4 }}>
              You (Team {mySeat.team === 0 ? "A" : "B"}) · Seat {mySeat.seatIndex + 1}
              {game.dealerSeat === mySeat.seatIndex && " · Dealer"}
            </div>
          )}

          {/* Action panel (bid / declare trump) */}
          {myTurn && (
            <div style={{
              background: "rgba(240,192,64,.04)",
              border: "1px solid #3a5020",
              borderRadius: 12,
              marginBottom: 8,
            }}>
              <BidPanel
                action={myTurn.action}
                validBids={myTurn.validBids}
                canPass={myTurn.canPass}
                onBid={emitBid}
                onDeclareTrump={emitDeclareTrump}
              />
            </div>
          )}

          {/* Hand */}
          <div style={{
            background: "rgba(255,255,255,.02)",
            border: "1px solid #1e4a1e",
            borderRadius: 12,
          }}>
            <HandDisplay
              hand={myHand}
              validCards={myTurn?.action === "play_card" ? validCards : undefined}
              onPlayCard={myTurn?.action === "play_card" ? emitPlayCard : undefined}
            />
          </div>

          {/* Bid history */}
          {game.status === "BIDDING" && Object.keys(game.bids || {}).length > 0 && (
            <div style={{ textAlign: "center", color: "#3a5a3a", fontSize: 12, marginTop: 8 }}>
              {game.seats.filter((s) => game.bids[s.seatIndex] !== undefined).map((s) => (
                <span key={s.seatIndex} style={{ marginRight: 12 }}>
                  {s.displayName}: {game.bids[s.seatIndex] === "pass" ? "pass" : game.bids[s.seatIndex]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {roundSummary && !gameOver && (
        <RoundSummaryModal
          summary={roundSummary}
          seats={game?.seats}
          onClose={() => setRoundSummary(null)}
        />
      )}

      {gameOver && (
        <GameOverModal
          winner={gameOver.winner}
          teamScores={gameOver.teamScores}
          seats={game?.seats}
        />
      )}
    </div>
  );
}
