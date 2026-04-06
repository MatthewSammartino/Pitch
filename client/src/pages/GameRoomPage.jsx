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
import RoundHistoryPanel from "../components/game/RoundHistoryPanel";
import LiveRoundPanel from "../components/game/LiveRoundPanel";
import ChatPanel from "../components/game/ChatPanel";

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
  const [roundSummary, setRoundSummary]   = useState(null);
  const [roundHistory, setRoundHistory]   = useState([]);
  const [gameOver, setGameOver]       = useState(null);      // { winner, teamScores }
  const [error, setError]             = useState("");
  const [connStatus, setConnStatus]   = useState("connecting");
  const [afkVote, setAfkVote]         = useState(null); // { targetUserId, displayName, totalVoters, approvals, denials }
  const [afkResult, setAfkResult]     = useState(null); // { approved, displayName }
  const [chatMessages, setChatMessages] = useState([]);

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
      setRoundHistory((prev) => [...prev, summary]);
    });

    socket.on("game:game_over", (result) => {
      setGameOver(result);
      setRoundSummary(null);
    });

    socket.on("game:error", ({ message }) => {
      setError(message);
      setTimeout(() => setError(""), 4000);
    });

    socket.on("game:afk_vote", (info) => {
      setAfkVote({ ...info, approvals: 0, denials: 0 });
      setAfkResult(null);
    });

    socket.on("game:afk_vote_update", (info) => {
      setAfkVote((prev) => prev ? { ...prev, approvals: info.approvals, denials: info.denials } : prev);
    });

    socket.on("chat:message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on("game:afk_vote_result", ({ approved, displayName }) => {
      setAfkVote(null);
      setAfkResult({ approved, displayName });
      setTimeout(() => setAfkResult(null), 4000);
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
      socket.off("game:afk_vote");
      socket.off("game:afk_vote_update");
      socket.off("game:afk_vote_result");
      socket.off("chat:message");
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

  function castAfkVote(approve) {
    socketRef.current?.emit("game:afk_vote_cast", { sessionId, approve });
  }

  function sendChat(text) {
    socketRef.current?.emit("chat:send", { sessionId, text });
  }

  // ── Layout helpers ──────────────────────────────────────────────────────

  const mySeat = game?.seats?.find((s) => s.userId === user?.id);
  const myTeam = mySeat?.team;

  // Compass positions: clockwise from me
  function getPositionedSeats() {
    if (!game || !mySeat) return {};
    const idx = mySeat.seatIndex;
    const v   = game.variant;
    if (v === 6) {
      return {
        west:  game.seats.find((s) => s.seatIndex === (idx + 1) % v),
        nw:    game.seats.find((s) => s.seatIndex === (idx + 2) % v),
        north: game.seats.find((s) => s.seatIndex === (idx + 3) % v), // partner
        ne:    game.seats.find((s) => s.seatIndex === (idx + 4) % v),
        east:  game.seats.find((s) => s.seatIndex === (idx + 5) % v),
      };
    }
    return {
      north: game.seats.find((s) => s.seatIndex === (idx + 2) % v),
      west:  game.seats.find((s) => s.seatIndex === (idx + 1) % v),
      east:  game.seats.find((s) => s.seatIndex === (idx + 3) % v),
    };
  }

  const positioned = getPositionedSeats();

  function OpponentBox({ seat, compact }) {
    if (!seat) return null;
    const isTeammate = seat.team === myTeam;
    const isNext = game?.status === "TRICK_PLAYING"
      ? game?.nextLeaderSeat === seat.seatIndex
      : game?.status === "BIDDING" && game?.currentBidderSeat === seat.seatIndex;

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        minWidth: compact ? 60 : 90,
      }}>
        <div style={{
          padding: "4px 10px", borderRadius: 10, whiteSpace: "nowrap",
          border: `1px solid ${isNext ? "#f0c040" : isTeammate ? "#1e6a4e" : "#2a3a2a"}`,
          background: isNext ? "rgba(240,192,64,.1)" : "transparent",
          color: isTeammate ? "#4fc3a1" : "#e8dfc8",
          fontSize: compact ? 11 : 13, fontFamily: "Georgia,serif",
        }}>
          {seat.displayName}
          {isTeammate && <span style={{ color: "#3a7a5a", fontSize: 10, marginLeft: 4 }}>●</span>}
        </div>
        {/* Card backs */}
        {!compact && (
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: Math.max(0, myHand.length) }).map((_, i) => (
              <div key={i} style={{
                width: 10, height: 16, borderRadius: 2,
                background: "linear-gradient(135deg,#1e4a1e,#0d2b0d)",
                border: "1px solid #2a5c2a",
              }} />
            ))}
          </div>
        )}
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

      {/* AFK vote banner */}
      {afkVote && (
        <div style={{
          background: "rgba(240,192,64,.08)", border: "1px solid #4a3a10",
          padding: "10px 20px", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 16, flexWrap: "wrap",
        }}>
          <span style={{ color: "#f0c040", fontSize: 13 }}>
            {afkVote.targetUserId === user?.id
              ? "⏳ You appear to be AFK — other players are voting to replace you with a bot."
              : `⏳ ${afkVote.displayName} appears AFK. Vote to replace with a bot?`}
          </span>
          {afkVote.approvals + afkVote.denials > 0 && (
            <span style={{ color: "#5a7a5a", fontSize: 12 }}>
              {afkVote.approvals} approve · {afkVote.denials} deny
            </span>
          )}
          {afkVote.targetUserId !== user?.id && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => castAfkVote(true)}
                style={{
                  padding: "5px 14px", borderRadius: 10, border: "1px solid #4fc3a1",
                  background: "transparent", color: "#4fc3a1",
                  fontSize: 12, cursor: "pointer", fontFamily: "Georgia,serif",
                }}
              >
                Replace
              </button>
              <button
                onClick={() => castAfkVote(false)}
                style={{
                  padding: "5px 14px", borderRadius: 10, border: "1px solid #3a5a3a",
                  background: "transparent", color: "#5a7a5a",
                  fontSize: 12, cursor: "pointer", fontFamily: "Georgia,serif",
                }}
              >
                Keep Waiting
              </button>
            </div>
          )}
        </div>
      )}

      {/* AFK result notification */}
      {afkResult && (
        <div style={{
          background: afkResult.approved ? "rgba(79,195,161,.1)" : "rgba(90,90,90,.1)",
          border: `1px solid ${afkResult.approved ? "#2a5c4a" : "#3a3a3a"}`,
          padding: "8px 20px", color: afkResult.approved ? "#4fc3a1" : "#5a7a5a",
          fontSize: 13, textAlign: "center",
        }}>
          {afkResult.approved
            ? `${afkResult.displayName} was replaced by a bot.`
            : `Vote to replace ${afkResult.displayName} was cancelled.`}
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
        <div style={{ flex: 1, display: "flex", gap: 0, maxWidth: 940, margin: "0 auto", width: "100%", padding: "8px 0" }}>

          {/* Left: round history + chat */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <RoundHistoryPanel rounds={roundHistory} teamNames={game.teamNames} />
            <div style={{ width: 200 }}>
              <ChatPanel
                messages={chatMessages}
                onSend={sendChat}
                myUserId={user?.id}
              />
            </div>
          </div>

          {/* Right: game play area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 12px", minWidth: 0 }}>

          {/* Compass table layout */}
          <div style={{
            display: "grid",
            gridTemplateAreas: game.variant === 6
              ? `"nw north ne" "west table east" ". south ."`
              : `". north ." "west table east" ". south ."`,
            gridTemplateColumns: "110px 1fr 110px",
            gridTemplateRows: "auto auto auto",
            gap: 10,
            alignItems: "center",
            justifyItems: "center",
            marginBottom: 10,
          }}>
            {game.variant === 6 && (
              <>
                <div style={{ gridArea: "nw" }}>
                  <OpponentBox seat={positioned.nw} compact />
                </div>
                <div style={{ gridArea: "ne" }}>
                  <OpponentBox seat={positioned.ne} compact />
                </div>
              </>
            )}
            <div style={{ gridArea: "north" }}>
              <OpponentBox seat={positioned.north} />
            </div>
            <div style={{ gridArea: "west" }}>
              <OpponentBox seat={positioned.west} compact />
            </div>
            <div style={{
              gridArea: "table", width: "100%",
              background: "rgba(0,40,0,.3)",
              border: "1px solid #1e4a1e",
              borderRadius: 16,
            }}>
              <TrickArea
                currentTrick={game.currentTrick}
                completedTrick={game.completedTrick}
                seats={game.seats}
                trumpSuit={game.trumpSuit}
                mySeatIndex={mySeat?.seatIndex ?? 0}
              />
            </div>
            <div style={{ gridArea: "east" }}>
              <OpponentBox seat={positioned.east} compact />
            </div>
            <div style={{ gridArea: "south", textAlign: "center", fontSize: 12, color: "#5a7a5a" }}>
              {mySeat && <>
                You · {game.teamNames?.[mySeat.team] ?? `Team ${mySeat.team}`}
                {game.dealerSeat === mySeat.seatIndex && " · Dealer"}
              </>}
            </div>
          </div>

          {/* Live round scoring */}
          {game.liveRoundScoring && (
            <div style={{ marginBottom: 8 }}>
              <LiveRoundPanel
                liveRoundScoring={game.liveRoundScoring}
                teamNames={game.teamNames}
                trumpSuit={game.trumpSuit}
              />
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
          </div>{/* end play area */}
        </div>
      )}

      {/* Modals */}
      {roundSummary && !gameOver && (
        <RoundSummaryModal
          summary={roundSummary}
          seats={game?.seats}
          teamNames={game?.teamNames}
          onClose={() => setRoundSummary(null)}
        />
      )}

      {gameOver && (
        <GameOverModal
          winner={gameOver.winner}
          teamScores={gameOver.teamScores}
          seats={game?.seats}
          teamNames={gameOver.teamNames ?? game?.teamNames}
        />
      )}
    </div>
  );
}
