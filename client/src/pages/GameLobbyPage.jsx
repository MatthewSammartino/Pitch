import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useSocketContext } from "../context/SocketContext";
import Navbar from "../components/layout/Navbar";

const TEAM_COLORS = ["#4fc3a1", "#f0c040"]; // team A = teal, team B = gold

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

function teamLabel(seatIndex, variant) {
  if (variant === 4) return seatIndex % 2 === 0 ? "Team A" : "Team B";
  return seatIndex % 2 === 0 ? "Team A" : "Team B";
}

function teamColor(seatIndex) {
  return seatIndex % 2 === 0 ? TEAM_COLORS[0] : TEAM_COLORS[1];
}

export default function GameLobbyPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getSocket, disconnect } = useSocketContext();

  const [lobby, setLobby] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const socketRef = useRef(null);

  const lobbyUrl = `${window.location.origin}/lobby/${sessionId}`;

  useEffect(() => {
    const socket = getSocket("/lobby");
    socketRef.current = socket;

    socket.emit("lobby:join", { sessionId });

    socket.on("lobby:state", setLobby);

    socket.on("lobby:started", ({ sessionId: sid }) => {
      // Phase 4 will navigate to the game room
      navigate(`/game/${sid}`);
    });

    socket.on("lobby:error", ({ message }) => {
      setError(message);
      setTimeout(() => setError(""), 4000);
    });

    return () => {
      socket.off("lobby:state", setLobby);
      socket.off("lobby:started");
      socket.off("lobby:error");
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

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <h1 style={S.heading}>
          {lobby?.variant}-Player Lobby
        </h1>
        <p style={S.sub}>
          {lobby ? `${lobby.filledCount} / ${lobby.variant} seats filled` : "Connecting…"}
        </p>

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

        {/* Seats */}
        {lobby && (
          <div style={S.tableArea}>
            <div style={S.seatRow}>
              {lobby.seats.map((seat, i) => {
                const occupied = seat !== null;
                const isMe     = seat?.userId === user?.id;
                const tc       = teamColor(i);

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
                        <div style={S.seatTeam(tc)}>{teamLabel(i, lobby.variant)}</div>
                        {isMe && (
                          <button style={S.leaveBtn} onClick={(e) => { e.stopPropagation(); leaveSeat(); }}>
                            Leave
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 28, marginBottom: 4, color: "#2a4a2a" }}>♠</div>
                        <div style={{ fontSize: 13, color: "#3a5a3a" }}>Empty</div>
                        <div style={S.seatTeam(tc)}>{teamLabel(i, lobby.variant)}</div>
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

        {/* Start button (host only) */}
        {isHost && (
          <button
            style={S.startBtn(isFull)}
            onClick={isFull ? startGame : undefined}
          >
            Start Game
          </button>
        )}

        <p style={S.status}>
          {isHost
            ? isFull
              ? "All seats filled — you can start the game."
              : `Waiting for ${lobby ? lobby.variant - lobby.filledCount : "…"} more player(s)…`
            : "Waiting for the host to start the game…"}
        </p>
      </div>
    </div>
  );
}
