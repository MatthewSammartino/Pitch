import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";
import StatsBar from "../components/dashboard/StatsBar";

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
    color: "#e8dfc8",
    fontFamily: "'Georgia',serif",
  },
  body: { maxWidth: 860, margin: "0 auto", padding: "36px 20px" },
  greeting: {
    fontFamily: "'Playfair Display',serif",
    fontSize: "clamp(22px,4vw,34px)",
    color: "#f0e8d0",
    margin: "0 0 4px",
  },
  sub: { color: "#5a7a5a", fontSize: 14, margin: "0 0 36px" },
  sectionTitle: {
    fontFamily: "'Playfair Display',serif",
    color: "#f0c040",
    fontSize: 18,
    margin: "0 0 16px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  ctaCard: {
    background: "rgba(255,255,255,.03)",
    border: "1px solid #1e4a1e",
    borderRadius: 14,
    padding: "20px 24px",
    flex: "1 1 220px",
    minWidth: 200,
  },
  ctaTitle: {
    color: "#f0e8d0", fontWeight: 700, fontSize: 15,
    marginBottom: 6, fontFamily: "'Playfair Display',serif",
  },
  ctaDesc: { color: "#3a5a3a", fontSize: 12, marginBottom: 14, lineHeight: 1.5 },
  inputStyle: {
    background: "transparent",
    border: "1px solid #2a5c2a",
    borderRadius: 8,
    color: "#e8dfc8",
    fontFamily: "Georgia,serif",
    fontSize: 14,
    padding: "8px 12px",
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  errorText: { color: "#e05c5c", fontSize: 12, marginTop: 6 },
};

function Btn({ children, onClick, disabled, gold }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 20px", borderRadius: 16,
        border: `1px solid ${gold ? "#f0c040" : "#2a5c2a"}`,
        background: gold ? "rgba(240,192,64,.12)" : "transparent",
        color: gold ? "#f0c040" : "#8aab8a",
        fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "Georgia,serif", opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  // Create Lobby state
  const [createOpen, setCreateOpen] = useState(false);
  const [variant, setVariant]       = useState(4);
  const [isPublic, setIsPublic]     = useState(false);
  const [creating, setCreating]     = useState(false);

  // Join Lobby state
  const [joinOpen, setJoinOpen]   = useState(false);
  const [roomCode, setRoomCode]   = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining]     = useState(false);

  // Solo state
  const [soloBusy, setSoloBusy] = useState(false);

  // Public lobbies
  const [publicLobbies, setPublicLobbies]     = useState([]);
  const [lobbiesLoading, setLobbiesLoading]   = useState(true);
  const [queueBusy, setQueueBusy]             = useState(false);

  useEffect(() => {
    function fetchPublicLobbies() {
      api.get("/api/sessions/public")
        .then(setPublicLobbies)
        .catch(() => {})
        .finally(() => setLobbiesLoading(false));
    }
    fetchPublicLobbies();
    const interval = setInterval(fetchPublicLobbies, 15000);
    return () => clearInterval(interval);
  }, []);

  function createLobby() {
    setCreating(true);
    api.post("/api/sessions", { variant, is_public: isPublic })
      .then((s) => navigate(`/lobby/${s.id}`))
      .catch(() => setCreating(false));
  }

  function joinQueue() {
    setQueueBusy(true);
    api.post("/api/sessions/queue")
      .then((s) => navigate(`/lobby/${s.id}`))
      .catch(() => setQueueBusy(false));
  }

  function joinLobby() {
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) { setJoinError("Enter a 6-character room code."); return; }
    setJoining(true);
    setJoinError("");
    api.get(`/api/sessions/code/${code}`)
      .then((s) => {
        if (s.status !== "waiting") {
          setJoinError("Game already started.");
          setJoining(false);
          return;
        }
        navigate(`/lobby/${s.id}`);
      })
      .catch(() => {
        setJoinError("Room not found.");
        setJoining(false);
      });
  }

  function soloWithBots() {
    setSoloBusy(true);
    api.post("/api/sessions", { variant: 4 })
      .then((s) => navigate(`/lobby/${s.id}?solo=true`))
      .catch(() => setSoloBusy(false));
  }

  return (
    <div style={S.page}>
      <Navbar />
      {!user?.is_guest && <StatsBar />}
      <div style={S.body}>
        <h1 style={S.greeting}>Welcome back, {user?.display_name || "Player"}.</h1>
        <p style={S.sub}>Play a game or browse your groups below.</p>

        {/* ── Open Lobbies ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ ...S.sectionTitle, marginBottom: 12 }}>
            <span>Open Lobbies</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={joinQueue} disabled={queueBusy} gold>
                {queueBusy ? "Finding game…" : "Join Queue"}
              </Btn>
            </div>
          </div>

          {lobbiesLoading ? (
            <div style={{
              background: "rgba(255,255,255,.02)", border: "1px solid #1e3a1e",
              borderRadius: 10, padding: "14px 16px", color: "#2a4a2a", fontSize: 13,
            }}>
              Loading open games…
            </div>
          ) : publicLobbies.length === 0 ? (
            <div style={{
              background: "rgba(255,255,255,.02)", border: "1px solid #1e3a1e",
              borderRadius: 10, padding: "14px 16px", color: "#3a5a3a", fontSize: 13,
            }}>
              No open games right now — create a public lobby or join the queue to start one.
            </div>
          ) : (
            publicLobbies.map((lobby) => (
              <div key={lobby.id} style={{
                background: "rgba(255,255,255,.03)", border: "1px solid #1e4a1e",
                borderRadius: 10, padding: "12px 16px", marginBottom: 8,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {lobby.host_avatar
                    ? <img src={lobby.host_avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #2a5c2a" }} />
                    : <div style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #2a5c2a", background: "#1e4a1e", display: "flex", alignItems: "center", justifyContent: "center", color: "#f0c040", fontSize: 14, fontWeight: 700 }}>
                        {lobby.host_name?.[0]?.toUpperCase() || "?"}
                      </div>
                  }
                  <div>
                    <div style={{ color: "#f0e8d0", fontSize: 14, fontWeight: 600 }}>
                      {lobby.host_name}'s {lobby.seats_total}-Player Game
                    </div>
                    <div style={{ color: "#5a7a5a", fontSize: 12, marginTop: 2 }}>
                      {lobby.seats_filled} / {lobby.seats_total} seats filled
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/lobby/${lobby.id}`)}
                  style={{
                    padding: "7px 18px", borderRadius: 14,
                    border: "1px solid #f0c040", background: "rgba(240,192,64,.1)",
                    color: "#f0c040", fontSize: 13, cursor: "pointer",
                    fontFamily: "Georgia,serif", whiteSpace: "nowrap",
                  }}
                >
                  Join →
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── Play Now ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <div style={S.sectionTitle}><span>Play Now</span></div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

            {/* Create Lobby */}
            <div style={S.ctaCard}>
              <div style={S.ctaTitle}>🃏 Create Lobby</div>
              <div style={S.ctaDesc}>Start a new game and invite friends with a room code.</div>
              {!createOpen ? (
                <Btn gold onClick={() => { setCreateOpen(true); setJoinOpen(false); }}>
                  Create Lobby
                </Btn>
              ) : (
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {[4, 6].map((v) => (
                      <button
                        key={v}
                        onClick={() => setVariant(v)}
                        style={{
                          padding: "6px 16px", borderRadius: 12,
                          border: `1px solid ${variant === v ? "#f0c040" : "#2a5c2a"}`,
                          background: variant === v ? "rgba(240,192,64,.12)" : "transparent",
                          color: variant === v ? "#f0c040" : "#5a7a5a",
                          fontSize: 13, cursor: "pointer", fontFamily: "Georgia,serif",
                        }}
                      >
                        {v}-Player
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setIsPublic((v) => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "transparent", border: "none", cursor: "pointer",
                      padding: 0, marginBottom: 12,
                    }}
                  >
                    <div style={{
                      width: 32, height: 18, borderRadius: 9,
                      background: isPublic ? "rgba(240,192,64,.3)" : "rgba(255,255,255,.08)",
                      border: `1px solid ${isPublic ? "#f0c040" : "#2a5c2a"}`,
                      position: "relative", transition: "all .15s",
                    }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: isPublic ? "#f0c040" : "#3a5a3a",
                        position: "absolute", top: 2,
                        left: isPublic ? 16 : 2, transition: "left .15s",
                      }} />
                    </div>
                    <span style={{ color: isPublic ? "#f0c040" : "#5a7a5a", fontSize: 12, fontFamily: "Georgia,serif" }}>
                      {isPublic ? "Public — visible in Open Lobbies" : "Private — invite only"}
                    </span>
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn gold onClick={createLobby} disabled={creating}>
                      {creating ? "Creating…" : "Create →"}
                    </Btn>
                    <Btn onClick={() => { setCreateOpen(false); setIsPublic(false); }}>Cancel</Btn>
                  </div>
                </div>
              )}
            </div>

            {/* Join Lobby */}
            <div style={S.ctaCard}>
              <div style={S.ctaTitle}>🔑 Join Lobby</div>
              <div style={S.ctaDesc}>Enter a 6-character room code to join a friend's game.</div>
              {!joinOpen ? (
                <Btn onClick={() => { setJoinOpen(true); setCreateOpen(false); }}>
                  Join Lobby
                </Btn>
              ) : (
                <div>
                  <input
                    style={S.inputStyle}
                    placeholder="ABC123"
                    maxLength={6}
                    value={roomCode}
                    onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setJoinError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && joinLobby()}
                    autoFocus
                  />
                  {joinError && <div style={S.errorText}>{joinError}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Btn gold onClick={joinLobby} disabled={joining}>
                      {joining ? "Joining…" : "Join →"}
                    </Btn>
                    <Btn onClick={() => { setJoinOpen(false); setRoomCode(""); setJoinError(""); }}>
                      Cancel
                    </Btn>
                  </div>
                </div>
              )}
            </div>

            {/* Solo with Bots */}
            <div style={S.ctaCard}>
              <div style={S.ctaTitle}>🤖 Solo with Bots</div>
              <div style={S.ctaDesc}>Play a 4-player game immediately — 3 bots fill the other seats.</div>
              <Btn onClick={soloWithBots} disabled={soloBusy}>
                {soloBusy ? "Starting…" : "Play Solo"}
              </Btn>
            </div>

          </div>
        </div>

        {/* ── Guest sign-in prompt ───────────────────────────────────────────── */}
        {user?.is_guest && (
          <div style={{
            background: "rgba(240,192,64,.05)", border: "1px solid #3a3010",
            borderRadius: 12, padding: "16px 20px", marginBottom: 24,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12,
          }}>
            <div>
              <div style={{ color: "#f0c040", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                You're playing as a guest
              </div>
              <div style={{ color: "#5a7a5a", fontSize: 13 }}>
                Sign in with Google to save stats, join groups, and keep your history.
              </div>
            </div>
            <a
              href="/api/auth/google"
              style={{
                padding: "8px 20px", borderRadius: 12,
                border: "1px solid #f0c040", background: "rgba(240,192,64,.1)",
                color: "#f0c040", fontSize: 13, textDecoration: "none",
                fontFamily: "Georgia,serif", whiteSpace: "nowrap",
              }}
            >
              Sign in with Google →
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
