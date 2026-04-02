import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useSocketContext } from "../context/SocketContext";
import Navbar from "../components/layout/Navbar";

const TEAM_COLORS = ["#4fc3a1", "#f0c040", "#e07a5f"]; // team A = teal, B = gold, C = coral

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
    color: "#e8dfc8",
    fontFamily: "'Georgia',serif",
  },
  body: { maxWidth: 720, margin: "0 auto", padding: "32px 20px" },
  heading: {
    fontFamily: "'Playfair Display',serif",
    fontSize: "clamp(20px,4vw,30px)",
    color: "#f0e8d0",
    margin: "0 0 4px",
  },
  sub: { color: "#5a7a5a", fontSize: 13, margin: "0 0 32px" },
  tableArea: {
    display: "grid",
    gap: 16,
    marginBottom: 32,
  },
  seatRow: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  seat: (occupied, isMe, teamColor) => ({
    width: 150,
    background: occupied
      ? `rgba(${isMe ? "79,195,161" : "30,74,30"},.18)`
      : "rgba(255,255,255,.03)",
    border: `1px solid ${occupied ? teamColor : "#1e4a1e"}`,
    borderRadius: 12,
    padding: "16px 12px",
    textAlign: "center",
    cursor: occupied ? (isMe ? "default" : "not-allowed") : "pointer",
    transition: "border-color .15s, background .15s",
  }),
  seatLabel: { fontSize: 11, color: "#3a5a3a", marginBottom: 6, letterSpacing: 1 },
  seatName: { fontSize: 14, color: "#f0e8d0", fontWeight: 600, marginBottom: 4 },
  seatTeam: (color) => ({ fontSize: 11, color, marginTop: 4 }),
  sitBtn: {
    marginTop: 8,
    padding: "5px 14px",
    borderRadius: 12,
    border: "1px solid #2a5c2a",
    background: "transparent",
    color: "#8aab8a",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "Georgia,serif",
  },
  leaveBtn: {
    marginTop: 8,
    padding: "5px 14px",
    borderRadius: 12,
    border: "1px solid #4fc3a1",
    background: "transparent",
    color: "#4fc3a1",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "Georgia,serif",
  },
  startBtn: (ready) => ({
    display: "block",
    margin: "0 auto",
    padding: "13px 40px",
    borderRadius: 24,
    border: `1px solid ${ready ? "#f0c040" : "#2a4a2a"}`,
    background: ready ? "rgba(240,192,64,.15)" : "transparent",
    color: ready ? "#f0c040" : "#3a5a3a",
    fontSize: 16,
    cursor: ready ? "pointer" : "not-allowed",
    fontFamily: "Georgia,serif",
    letterSpacing: 1,
    transition: "all .2s",
  }),
  status: { textAlign: "center", color: "#5a7a5a", fontSize: 13, marginTop: 16 },
  errorBox: {
    background: "rgba(224,92,92,.1)",
    border: "1px solid #5a2020",
    borderRadius: 8,
    padding: "10px 16px",
    color: "#e05c5c",
    fontSize: 13,
    marginBottom: 20,
    textAlign: "center",
  },
  copyBox: {
    background: "rgba(255,255,255,.03)",
    border: "1px solid #1e4a1e",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 12,
    color: "#5a7a5a",
    marginBottom: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    wordBreak: "break-all",
  },
};

function teamLabel(seatIndex, teamNames, numTeams) {
  const t = seatIndex % (numTeams ?? 2);
  return teamNames?.[t] ?? String.fromCharCode(65 + t);
}

function teamColor(seatIndex, numTeams) {
  const t = seatIndex % (numTeams ?? 2);
  return TEAM_COLORS[t] ?? "#8aab8a";
}

export default function GameLobbyPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getSocket, disconnect } = useSocketContext();
  const [searchParams] = useSearchParams();
  const isSolo = searchParams.get("solo") === "true";

  const [lobby, setLobby] = useState(null);
  const [error, setError] = useState("");
  const [connStatus, setConnStatus] = useState("connecting"); // connecting | connected | failed
  const [copied, setCopied] = useState(false);
  const socketRef = useRef(null);
  const soloStartedRef = useRef(false);

  const lobbyUrl = `${window.location.origin}/lobby/${sessionId}`;

  useEffect(() => {
    const socket = getSocket("/lobby");
    socketRef.current = socket;

    function onConnect() {
      setConnStatus("connected");
      socket.emit("lobby:join", { sessionId });
    }

    function onConnectError(err) {
      setConnStatus("failed");
      setError(`Connection failed: ${err.message}. Try refreshing the page.`);
    }

    // If already connected, join immediately
    if (socket.connected) {
      onConnect();
    } else {
      socket.on("connect", onConnect);
    }

    socket.on("connect_error", onConnectError);
    socket.on("lobby:state", setLobby);

    const goToGame = ({ sessionId: sid }) => navigate(`/game/${sid}`);
    socket.on("lobby:started",        goToGame);
    socket.on("lobby:already_started", goToGame);

    socket.on("lobby:error", ({ message }) => {
      setError(message);
      setTimeout(() => setError(""), 4000);
    });

    socket.on("lobby:player_kicked", ({ userId: kickedId, displayName }) => {
      if (kickedId === user?.id) {
        setError("You were removed from the lobby by the host.");
      } else {
        setError(`${displayName} was removed by the host.`);
        setTimeout(() => setError(""), 3000);
      }
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("lobby:state", setLobby);
      socket.off("lobby:started",         goToGame);
      socket.off("lobby:already_started", goToGame);
      socket.off("lobby:error");
      socket.off("lobby:player_kicked");
    };
  }, [sessionId, getSocket, navigate]);

  function takeSeat(seatIndex) {
    setError("");
    socketRef.current?.emit("lobby:take_seat", { sessionId, seatIndex });
  }

  function leaveSeat() {
    socketRef.current?.emit("lobby:leave_seat", { sessionId });
  }

  function startGame() {
    socketRef.current?.emit("lobby:start_game", { sessionId });
  }

  function fillBots() {
    socketRef.current?.emit("lobby:fill_bots", { sessionId });
  }

  function kickSeat(seatIndex) {
    socketRef.current?.emit("lobby:kick_seat", { sessionId, seatIndex });
  }

  function setTeamName(index, value) {
    const next = [...(lobby?.teamNames || ["Team A", "Team B"])];
    next[index] = value;
    socketRef.current?.emit("lobby:set_team_names", { sessionId, teamNames: next });
  }

  function copyLink() {
    navigator.clipboard.writeText(lobbyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const isHost    = lobby?.createdBy === user?.id;
  const isFull    = lobby?.filledCount === lobby?.variant;
  const mySeatIdx = lobby?.seats?.findIndex((s) => s?.userId === user?.id);
  const iSeated   = mySeatIdx >= 0;

  // Solo mode: once seated, auto-fill bots and start
  useEffect(() => {
    if (!isSolo || !iSeated || soloStartedRef.current || !socketRef.current) return;
    soloStartedRef.current = true;
    socketRef.current.emit("lobby:fill_bots", { sessionId });
    setTimeout(() => socketRef.current?.emit("lobby:start_game", { sessionId }), 400);
  }, [isSolo, iSeated, sessionId]);

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <h1 style={S.heading}>
          {lobby?.variant}-Player Lobby
        </h1>
        <p style={S.sub}>
          {lobby
            ? `${lobby.filledCount} / ${lobby.variant} seats filled`
            : connStatus === "failed" ? "Connection failed — try refreshing."
            : "Connecting to lobby…"}
        </p>

        {/* Room code */}
        {lobby?.shortCode && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#3a5a3a", letterSpacing: 2, marginBottom: 6 }}>ROOM CODE</div>
            <div style={{
              fontSize: 36, fontWeight: 700, letterSpacing: 8,
              color: "#f0c040", fontFamily: "Georgia,serif",
            }}>
              {lobby.shortCode}
            </div>
            <div style={{ fontSize: 12, color: "#3a5a3a", marginTop: 4 }}>
              Share this code so friends can join from the dashboard
            </div>
          </div>
        )}

        {/* Invite link */}
        <div style={S.copyBox}>
          <span>{lobbyUrl}</span>
          <button
            onClick={copyLink}
            style={{
              padding: "4px 12px", borderRadius: 10, border: "1px solid #2a5c2a",
              background: "transparent", color: copied ? "#4fc3a1" : "#8aab8a",
              cursor: "pointer", fontSize: 12, fontFamily: "Georgia,serif",
              whiteSpace: "nowrap",
            }}
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>

        {error && <div style={S.errorBox}>{error}</div>}

        {/* Team names (host editable) */}
        {lobby && (() => {
          const numTeams = lobby.variant === 6 ? 3 : 2;
          const seatGroups = {
            2: ["1&3", "2&4"],
            3: ["1&4", "2&5", "3&6"],
          };
          return (
            <div style={{ display: "flex", gap: 12, marginBottom: 24, justifyContent: "center", flexWrap: "wrap" }}>
              {Array.from({ length: numTeams }, (_, t) => {
                const color = TEAM_COLORS[t];
                const name  = lobby.teamNames?.[t] ?? String.fromCharCode(65 + t);
                return (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color, fontSize: 12, whiteSpace: "nowrap" }}>
                      Seats {seatGroups[numTeams]?.[t]}
                    </span>
                    {isHost ? (
                      <input
                        value={name}
                        onChange={(e) => setTeamName(t, e.target.value)}
                        maxLength={20}
                        style={{
                          background: "transparent",
                          border: `1px solid ${color}55`,
                          borderRadius: 8,
                          color,
                          fontFamily: "Georgia,serif",
                          fontSize: 13,
                          padding: "4px 10px",
                          width: 100,
                          outline: "none",
                        }}
                      />
                    ) : (
                      <span style={{ color, fontWeight: 600, fontSize: 14 }}>{name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Seats */}
        {lobby && (
          <div style={S.tableArea}>
            <div style={S.seatRow}>
              {lobby.seats.map((seat, i) => {
                const occupied = seat !== null;
                const isMe     = seat?.userId === user?.id;
                const numTeams = lobby.variant === 6 ? 3 : 2;
                const tc       = teamColor(i, numTeams);

                return (
                  <div
                    key={i}
                    style={S.seat(occupied, isMe, tc)}
                    onClick={() => !occupied && !iSeated && takeSeat(i)}
                    title={!occupied && !iSeated ? "Click to sit here" : ""}
                  >
                    <div style={S.seatLabel}>SEAT {i + 1}</div>
                    {occupied ? (
                      <>
                        <div style={{ fontSize: 28, marginBottom: 4 }}>
                          {seat.avatarUrl
                            ? <img src={seat.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                            : "🎴"}
                        </div>
                        <div style={S.seatName}>{isMe ? "You" : seat.displayName}</div>
                        <div style={S.seatTeam(tc)}>{teamLabel(i, lobby.teamNames, numTeams)}</div>
                        {isMe && (
                          <button style={S.leaveBtn} onClick={(e) => { e.stopPropagation(); leaveSeat(); }}>
                            Leave
                          </button>
                        )}
                        {isHost && !isMe && (
                          <button
                            style={{
                              marginTop: 8, padding: "5px 14px", borderRadius: 12,
                              border: "1px solid #5a2020", background: "transparent",
                              color: "#e05c5c", fontSize: 12, cursor: "pointer",
                              fontFamily: "Georgia,serif",
                            }}
                            onClick={(e) => { e.stopPropagation(); kickSeat(i); }}
                          >
                            Kick
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 28, marginBottom: 4, color: "#2a4a2a" }}>♠</div>
                        <div style={{ fontSize: 13, color: "#3a5a3a" }}>Empty</div>
                        <div style={S.seatTeam(tc)}>{teamLabel(i, lobby.teamNames, numTeams)}</div>
                        {!iSeated && (
                          <button style={S.sitBtn} onClick={(e) => { e.stopPropagation(); takeSeat(i); }}>
                            Sit Here
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Host controls */}
        {lobby && isHost && (
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 8 }}>
            {!isFull && (
              <button style={S.sitBtn} onClick={fillBots}>
                Fill with Bots
              </button>
            )}
            <button
              style={S.startBtn(isFull)}
              onClick={isFull ? startGame : undefined}
            >
              Start Game
            </button>
          </div>
        )}

        <p style={S.status}>
          {!lobby
            ? connStatus === "failed" ? "Connection failed — try refreshing." : "Connecting…"
            : isHost
              ? isFull
                ? "All seats filled — you can start the game."
                : `Waiting for ${lobby.variant - lobby.filledCount} more player(s)…`
              : "Waiting for the host to start the game…"}
        </p>
      </div>
    </div>
  );
}
