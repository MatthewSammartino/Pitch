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
  title: {
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
};

export default function GroupsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [showJoinInvite, setShowJoinInvite] = useState(false);
  const [inviteUrl, setInviteUrl]     = useState("");

  useEffect(() => {
    api.get("/api/groups")
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleGroupCreated(group) {
    setGroups((prev) => [...prev, group]);
  }

  function handleJoinInvite() {
    try {
      const url = new URL(inviteUrl.trim());
      const token = url.pathname.split("/join/")[1];
      if (token) navigate(`/join/${token}`);
    } catch {
      const token = inviteUrl.trim();
      if (token) navigate(`/join/${token}`);
    }
  }

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <h1 style={S.title}>Your Groups</h1>
        <p style={S.sub}>Manage your friend groups and view analytics.</p>

        {user?.is_guest ? (
          <div style={{
            background: "rgba(240,192,64,.05)", border: "1px solid #3a3010",
            borderRadius: 12, padding: "24px", textAlign: "center",
          }}>
            <div style={{ color: "#f0c040", fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
              Sign in to view groups
            </div>
            <div style={{ color: "#5a7a5a", fontSize: 13, marginBottom: 16 }}>
              Create or join friend groups to track stats and organise games.
            </div>
            <a
              href="/api/auth/google"
              style={{
                padding: "8px 20px", borderRadius: 12,
                border: "1px solid #f0c040", background: "rgba(240,192,64,.1)",
                color: "#f0c040", fontSize: 13, textDecoration: "none",
                fontFamily: "Georgia,serif",
              }}
            >
              Sign in with Google →
            </a>
          </div>
        ) : (
          <>
            <div style={{ ...S.sectionTitle, marginBottom: 12 }}>
              <span>Groups</span>
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
                <button
                  onClick={handleJoinInvite}
                  style={{
                    padding: "8px 18px", borderRadius: 14,
                    border: "1px solid #f0c040", background: "rgba(240,192,64,.12)",
                    color: "#f0c040", fontSize: 13, cursor: "pointer",
                    fontFamily: "Georgia,serif",
                  }}
                >
                  Join
                </button>
              </div>
            )}

            {/* Sammartino Group */}
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
