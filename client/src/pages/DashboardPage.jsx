import { useState, useEffect } from "react";
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
    transition: "background .15s",
  },
  newGroupBtn: {
    padding: "7px 18px", borderRadius: 16,
    border: "1px solid #2a5c2a",
    background: "transparent", color: "#8aab8a",
    fontSize: 13, cursor: "pointer",
    fontFamily: "Georgia,serif",
  },
  emptyState: {
    textAlign: "center", padding: "48px 20px",
    border: "1px dashed #1e4a1e", borderRadius: 12,
    color: "#3a5a3a", fontSize: 14,
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);

  function startGame(variant) {
    setCreatingGame(true);
    api.post("/api/sessions", { variant })
      .then((s) => navigate(`/lobby/${s.id}`))
      .catch(() => setCreatingGame(false));
  }

  useEffect(() => {
    api.get("/api/groups")
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleGroupCreated(group) {
    setGroups((prev) => [...prev, group]);
  }

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <h1 style={S.greeting}>Welcome back, {user?.display_name || "Player"}.</h1>
        <p style={S.sub}>Play a game or browse your groups below.</p>

        {/* New game */}
        <div style={{ marginBottom: 36 }}>
          <div style={S.sectionTitle}><span>Play Now</span></div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              disabled={creatingGame}
              onClick={() => startGame(4)}
              style={{
                padding: "14px 28px", borderRadius: 20,
                border: "1px solid #f0c040", background: "rgba(240,192,64,.1)",
                color: "#f0c040", fontSize: 15, cursor: "pointer",
                fontFamily: "Georgia,serif", letterSpacing: 0.5,
              }}
            >
              🃏 New 4-Player Game
            </button>
            <button
              disabled={creatingGame}
              onClick={() => startGame(6)}
              style={{
                padding: "14px 28px", borderRadius: 20,
                border: "1px solid #2a5c2a", background: "transparent",
                color: "#8aab8a", fontSize: 15, cursor: "pointer",
                fontFamily: "Georgia,serif",
              }}
            >
              🃏 New 6-Player Game
            </button>
          </div>
          <p style={{ color: "#3a5a3a", fontSize: 12, marginTop: 8 }}>
            Create a lobby, share the link with friends — anyone with a Google account can join.
          </p>
        </div>

        {/* Groups section */}
        <div style={S.sectionTitle}>
          <span>Your Groups</span>
          <button style={S.newGroupBtn} onClick={() => setShowCreate(true)}>
            + New Group
          </button>
        </div>

        {/* Sammartino Group is always visible to all authenticated users */}
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
        ) : groups.filter((g) => g.slug !== "sammartino-group").length > 0 && (
          groups.filter((g) => g.slug !== "sammartino-group").map((g) => (
            <div key={g.id} style={S.groupCard}>
              <div>
                <div style={S.groupName}>{g.name}</div>
                <div style={S.groupMeta}>{g.member_count} member{g.member_count !== 1 ? "s" : ""} · {g.role}</div>
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
