import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSocketContext } from "../context/SocketContext";
import useIsMobile from "../hooks/useIsMobile";
import Navbar from "../components/layout/Navbar";
import ScoreBoard from "../components/game/ScoreBoard";
import HandDisplay from "../components/game/HandDisplay";
import BidPanel from "../components/game/BidPanel";
import RoundSummaryModal from "../components/game/RoundSummaryModal";
import GameOverModal from "../components/game/GameOverModal";
import RoundHistoryPanel from "../components/game/RoundHistoryPanel";
import LiveRoundPanel from "../components/game/LiveRoundPanel";
import ChatPanel from "../components/game/ChatPanel";
import PokerTable from "../components/game/PokerTable";
import WinningBidBanner from "../components/game/WinningBidBanner";
import { useSound } from "../context/SoundContext";
import { playCardSound, playYourTurnSound, playWinBidSound, playWinTrickSound } from "../lib/sounds";


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
  const [reactions, setReactions] = useState(new Map());

  const isMobile = useIsMobile();
  const socketRef = useRef(null);
  const reactionCounterRef = useRef(0);
  const { enabled: soundEnabled } = useSound();
  // Total cards on the table (currentTrick + completedTrick) — grows with
  // every play, including the trick-completing card. We can't watch
  // currentTrick alone because the server moves the cards into
  // `completedTrick` once the trick is full, so the 4th/6th card would
  // be missed.
  const prevTrickCountRef = useRef(0);
  const prevStatusRef = useRef(null);
  const prevHighBidderRef = useRef(-1);
  // The most recently seen trick number (monotonically increasing across the
  // entire game, stamped server-side on each completedTrick). Lets us detect
  // a fresh trick resolution without false matches and without double-firing
  // on repeat state emits for the same trick.
  const prevTrickNumberRef = useRef(0);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

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
      // ── Card-play sound ────────────────────────────────────────────
      // Total cards visible on the table (currentTrick + completedTrick).
      // Growing means a card was just played; shrinking means a trick
      // completed and the table is being cleared. Including completedTrick
      // catches the trick-completing card the server moves out of
      // currentTrick before broadcasting.
      const cur = state?.currentTrick?.length ?? 0;
      const done = state?.completedTrick?.plays?.length ?? 0;
      const newCount = cur + done;
      if (newCount > prevTrickCountRef.current && soundEnabledRef.current) {
        playCardSound();
      }
      prevTrickCountRef.current = newCount;

      // ── Trick-won sound ────────────────────────────────────────────
      // Fires once per trick when a fresh completedTrick is broadcast and
      // the local user is the winner. Server stamps a monotonic trickNumber
      // on each completedTrick so we can compare against the prior one to
      // know whether this is a new trick or just a re-broadcast of the same.
      const ct = state?.completedTrick;
      const newTrickNumber = ct?.trickNumber ?? 0;
      if (
        newTrickNumber > prevTrickNumberRef.current &&
        ct &&
        soundEnabledRef.current
      ) {
        const winSeat = state.seats?.find((s) => s.seatIndex === ct.winnerSeat);
        if (winSeat?.userId === user?.id) {
          // Tiny delay so the card-play snap from the trick-completing card
          // finishes before the trick-won bell starts.
          setTimeout(() => playWinTrickSound(), 180);
        }
      }
      if (newTrickNumber > prevTrickNumberRef.current) {
        prevTrickNumberRef.current = newTrickNumber;
      }

      // ── Bid-won sound ──────────────────────────────────────────────
      // Plays when bidding ends and the local user is the high bidder.
      const prevStatus = prevStatusRef.current;
      const newStatus = state?.status ?? null;
      const newHigh = state?.highBidderSeat ?? -1;
      if (
        prevStatus === "BIDDING" &&
        newStatus === "TRUMP_DECLARATION" &&
        newHigh >= 0 &&
        soundEnabledRef.current
      ) {
        const winnerSeat = state.seats?.find((s) => s.seatIndex === newHigh);
        if (winnerSeat?.userId === user?.id) {
          playWinBidSound();
        }
      }
      prevStatusRef.current = newStatus;
      prevHighBidderRef.current = newHigh;

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
        if (soundEnabledRef.current) playYourTurnSound();
      } else {
        setMyTurn(null);
        setValidCards([]);
      }
    });

    socket.on("game:round_over", (summary) => {
      setRoundSummary(summary);
      setRoundHistory((prev) => [...prev, summary]);
      // Clear the lingering trick from local state so the table goes empty
      // before the round summary modal appears. The next game:state push will
      // bring fresh data when the new round deals.
      setGame((prev) => prev ? { ...prev, currentTrick: [], completedTrick: null } : prev);
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

    socket.on("game:reaction", ({ seatIndex, emoji }) => {
      const id = ++reactionCounterRef.current;
      setReactions((prev) => { const n = new Map(prev); n.set(seatIndex, { emoji, id }); return n; });
      setTimeout(() => {
        setReactions((prev) => {
          const n = new Map(prev);
          if (n.get(seatIndex)?.id === id) n.delete(seatIndex);
          return n;
        });
      }, 3200);
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
      socket.off("game:reaction");
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

  function emitReact(emoji) {
    socketRef.current?.emit("game:react", { sessionId, emoji });
  }

  // ── Layout helpers ──────────────────────────────────────────────────────

  const mySeat = game?.seats?.find((s) => s.userId === user?.id);
  const isSpectating = !!game && !mySeat;
  const spectatorCount = game?.spectatorCount ?? 0;
  const compactView = !!game?.compactView;

  return (
    <div style={{
      // Lock the page to exactly the viewport height and disable scrolling.
      // The table fills whatever space is left after navbar, scoreboard,
      // banners, and the hand/bid panel claim theirs.
      height: "100vh",
      maxHeight: "100vh",
      overflow: "hidden",
      background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
      color: "#e8dfc8",
      fontFamily: "Georgia,serif",
      display: "flex", flexDirection: "column",
    }}>
      <Navbar />
      <ScoreBoard game={game} myUserId={user?.id} />

      {/* Spectator banner — shown when connected but not seated */}
      {isSpectating && (
        <div style={{
          background: "rgba(122,154,250,.08)", border: "1px solid #2a3a5a",
          padding: "8px 20px", color: "#7b9ef0", fontSize: 13, textAlign: "center",
          fontFamily: "monospace", letterSpacing: 1,
        }}>
          👁 SPECTATING {spectatorCount > 1 ? `· ${spectatorCount} watching` : ""}
        </div>
      )}

      {/* Winning bid banner — shown after bidding ends */}
      {game && <WinningBidBanner game={game} />}

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
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 0,
          width: "100%",
          padding: isMobile ? "4px 0" : "8px 0",
        }}>

          {/* Left: round history + live scoring + chat — hidden on mobile, shown below instead.
              LiveRoundPanel sits in the sidebar so it doesn't crowd the table. */}
          {!isMobile && (
            <div style={{
              display: "flex", flexDirection: "column", gap: 8,
              flexShrink: 0, width: 220, padding: "0 8px",
            }}>
              <RoundHistoryPanel rounds={roundHistory} teamNames={game.teamNames} />
              {!compactView && game.liveRoundScoring && (
                <LiveRoundPanel
                  liveRoundScoring={game.liveRoundScoring}
                  teamNames={game.teamNames}
                  trumpSuit={game.trumpSuit}
                />
              )}
              <ChatPanel
                messages={chatMessages}
                onSend={sendChat}
                myUserId={user?.id}
              />
            </div>
          )}

          {/* Game play area — minimal padding so the table can stretch nearly
              edge-to-edge (left edge bounded by sidebar, right edge by viewport).
              flex column: table grows (flex:1), everything below is fixed-size. */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: isMobile ? "4px 4px" : "8px 4px",
            minWidth: 0,
            minHeight: 0,
          }}>

          {/* Poker table — flex:1 so it takes whatever vertical space is left
              after the bid panel + hand below claim theirs. */}
          <div style={{
            marginBottom: isMobile ? 6 : 10,
            width: "100%",
            flex: 1,
            display: "flex",
            minHeight: 0,
          }}>
            <PokerTable
              game={game}
              mySeat={mySeat}
              myHand={myHand}
              reactions={reactions}
              onReact={emitReact}
              spectatorMode={isSpectating}
            />
          </div>

          {/* Mobile-only: live round scoring inline (sidebar isn't visible on mobile) */}
          {isMobile && !compactView && game.liveRoundScoring && (
            <div style={{ marginBottom: 8, width: "100%", maxWidth: 880 }}>
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
              width: "100%", maxWidth: 880,
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

          {/* Hand — hidden for spectators (they have no hand) */}
          {!isSpectating && (
            <div style={{
              background: "rgba(255,255,255,.02)",
              border: "1px solid #1e4a1e",
              borderRadius: 12,
              width: "100%", maxWidth: 880,
            }}>
              <HandDisplay
                hand={myHand}
                validCards={myTurn?.action === "play_card" ? validCards : undefined}
                onPlayCard={myTurn?.action === "play_card" ? emitPlayCard : undefined}
              />
            </div>
          )}

          {/* Spectator hand placeholder — informational */}
          {isSpectating && (
            <div style={{
              background: "rgba(122,154,250,.04)",
              border: "1px dashed #2a3a5a",
              borderRadius: 12,
              padding: "20px 16px",
              width: "100%", maxWidth: 880,
              textAlign: "center",
              color: "#5a6a8a",
              fontSize: 12,
              fontFamily: "monospace",
              letterSpacing: 1,
            }}>
              👁 SPECTATING — HANDS HIDDEN
            </div>
          )}

          {/* Bid history — hidden in compact mode */}
          {!compactView && game.status === "BIDDING" && Object.keys(game.bids || {}).length > 0 && (
            <div style={{ textAlign: "center", color: "#3a5a3a", fontSize: 12, marginTop: 8, width: "100%", maxWidth: 880 }}>
              {game.seats.filter((s) => game.bids[s.seatIndex] !== undefined).map((s) => (
                <span key={s.seatIndex} style={{ marginRight: 12 }}>
                  {s.displayName}: {game.bids[s.seatIndex] === "pass" ? "pass" : game.bids[s.seatIndex]}
                </span>
              ))}
            </div>
          )}
          </div>{/* end play area */}

          {/* Mobile: round history + chat below game area */}
          {isMobile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 8px" }}>
              <RoundHistoryPanel rounds={roundHistory} teamNames={game.teamNames} isMobile />
              <ChatPanel
                messages={chatMessages}
                onSend={sendChat}
                myUserId={user?.id}
              />
            </div>
          )}
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
