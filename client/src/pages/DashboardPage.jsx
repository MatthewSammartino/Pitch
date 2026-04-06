import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";
import CreateGroupModal from "../components/groups/CreateGroupModal";
import InviteLinkBox from "../components/groups/InviteLinkBox";

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
  groupCard: {
    background: "rgba(255,255,255,.03)",
    border: "1px solid #1e4a1e",
    borderRadius: 12,
    padding: "18px 22px",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  groupName: { color: "#f0e8d0", fontWeight: 700, fontSize: 16 },
  groupMeta: { color: "#5a7a5a", fontSize: 13, marginTop: 4 },
  viewBtn: {
    padding: "7px 20px", borderRadius: 16,
    border: "1px solid #f0c040",
    background: "rgba(240,192,64,.1)", color: "#f0c040",
    fontSize: 13, cursor: "pointer", textDecoration: "none",
    fontFamily: "Georgia,serif",
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

  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create Lobby state
  const [createOpen, setCreateOpen] = useState(false);
  const [variant, setVariant]       = useState(4);
  const [creating, setCreating]     = useState(false);

  // Join Lobby state
  const [joinOpen, setJoinOpen]   = useState(false);
  const [roomCode, setRoomCode]   = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining]     = useState(false);

  // Solo state
  const [soloBusy, setSoloBusy] = useState(false);

  // Join via invite state
  const [showJoinInvite, setShowJoinInvite] = useState(false);
  const [inviteUrl, setInviteUrl]           = useState("");

  useEffect(() => {
    api.get("/api/groups")
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleGroupCreated(group) {
    setGroups((prev) => [...prev, group]);
  }

  function createLobby() {
    setCreating(true);
    api.post("/api/sessions", { variant })
      .then((s) => navigate(`/lobby/${s.id}`))
      .catch(() => setCreating(false));
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

  function handleJoinInvite() {
    try {
      const url  = new URL(inviteUrl.trim());
      const token = url.pathname.split("/join/")[1];
      if (token) navigate(`/join/${token}`);
    } catch {
      // not a URL — treat as bare token
      const token = inviteUrl.trim();
      if (token) navigate(`/join/${token}`);
    }
  }

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <h1 style={S.greeting}>Welcome back, {user?.display_name || "Player"}.</h1>
        <p style={S.sub}>Play a game or browse your groups below.</p>

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
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn gold onClick={createLobby} disabled={creating}>
                      {creating ? "Creating…" : "Create →"}
                    </Btn>
                    <Btn onClick={() => setCreateOpen(false)}>Cancel</Btn>
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

        {/* ── Friend Groups ──────────────────────────────────────────────────── */}
        <div style={{ ...S.sectionTitle, marginBottom: 12 }}>
          <span>Your Groups</span>
          {!user?.is_guest && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{
                  padding: "6px 14px", borderRadius: 12,
                  border: "1px solid #2a5c2a", background: "transparent",
                  color: "#8aab8a", fontSize: 12, cursor: "pointer", fontFamily: "Georgia,serif",
                }}
                onClick={() => setShowJoinInvite((v) => !v)}
              >
                Join via Invite
              </button>
              <button
                style={{
                  padding: "6px 14px", borderRadius: 12,
                  border: "1px solid #2a5c2a", background: "transparent",
                  color: "#8aab8a", fontSize: 12, cursor: "pointer", fontFamily: "Georgia,serif",
                }}
                onClick={() => setShowCreate(true)}
              >
                + New Group
              </button>
            </div>
          )}
        </div>

        {showJoinInvite && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              placeholder="Paste invite link or token"
              value={inviteUrl}
              onChange={(e) => setInviteUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoinInvite()}
              style={{
                flex: 1, background: "transparent",
                border: "1px solid #2a5c2a", borderRadius: 8,
                color: "#e8dfc8", fontFamily: "Georgia,serif",
                fontSize: 13, padding: "8px 12px", outline: "none",
              }}
            />
            <Btn gold onClick={handleJoinInvite}>Join</Btn>
          </div>
        )}

        {/* Groups — hidden for guests */}
        {user?.is_guest && (
          <div style={{ color: "#2a4a2a", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            Sign in to view and join friend groups.
          </div>
        )}

        {/* Sammartino Group + dynamic groups — hidden for guests */}
        {!user?.is_guest && (
          <>
            <div style={{ ...S.groupCard, borderColor: "#2a5c2a" }}>
              <div>
                <div style={S.groupName}>Sammartino Group</div>
                <div style={S.groupMeta}>Matt · Seth · Mack · Arnav · Henry · 71 games</div>
              </div>
              <Link to="/group/sammartino-group" style={S.viewBtn}>
                View Analytics →
              </Link>
            </div>

            {loading ? (
              <p style={{ color: "#5a7a5a", fontSize: 14, marginTop: 12 }}>Loading groups…</p>
            ) : (
              groups.filter((g) => g.slug !== "sammartino-group").map((g) => (
                <div key={g.id} style={S.groupCard}>
                  <div>
                    <div style={S.groupName}>{g.name}</div>
                    <div style={S.groupMeta}>
                      {g.member_count} member{g.member_count !== 1 ? "s" : ""}
                      {g.game_count != null ? ` · ${g.game_count} games` : ""}
                      {g.role ? ` · ${g.role}` : ""}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <InviteLinkBox token={g.invite_token} />
                    </div>
                  </div>
                  <Link to={`/group/${g.slug}`} style={S.viewBtn}>
                    View Analytics →
                  </Link>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreate={handleGroupCreated}
        />
      )}
    </div>
  );
}
