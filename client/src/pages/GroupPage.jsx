import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";
import LegacyDashboard from "../LegacyDashboard";

// ── Lobby bar shown at the top of every group page ──────────────────────────
function LobbyBar({ groupSlug }) {
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get(`/api/sessions/group/${groupSlug}`)
      .then(setLobbies)
      .catch(() => {});
  }, [groupSlug]);

  function createGame(variant) {
    setCreating(true);
    api.post("/api/sessions", { groupSlug, variant })
      .then((s) => navigate(`/lobby/${s.id}`))
      .catch(() => setCreating(false));
  }

  return (
    <div style={{
      background: "rgba(7,26,7,0.8)",
      borderBottom: "1px solid #1e4a1e",
      padding: "12px 24px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    }}>
      <span style={{ color: "#5a7a5a", fontSize: 13, marginRight: 4 }}>Play online:</span>
      <button
        disabled={creating}
        onClick={() => createGame(4)}
        style={{
          padding: "6px 16px", borderRadius: 14,
          border: "1px solid #2a5c2a", background: "transparent",
          color: "#8aab8a", cursor: "pointer", fontSize: 13,
          fontFamily: "Georgia,serif",
        }}
      >
        + 4-Player Game
      </button>
      <button
        disabled={creating}
        onClick={() => createGame(6)}
        style={{
          padding: "6px 16px", borderRadius: 14,
          border: "1px solid #2a5c2a", background: "transparent",
          color: "#8aab8a", cursor: "pointer", fontSize: 13,
          fontFamily: "Georgia,serif",
        }}
      >
        + 6-Player Game
      </button>
      {lobbies.map((lb) => (
        <Link
          key={lb.id}
          to={`/lobby/${lb.id}`}
          style={{
            padding: "6px 16px", borderRadius: 14,
            border: "1px solid #f0c040", background: "rgba(240,192,64,.08)",
            color: "#f0c040", fontSize: 13, textDecoration: "none",
            fontFamily: "Georgia,serif",
          }}
        >
          Join {lb.host_name}'s {lb.variant}p lobby →
        </Link>
      ))}
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
    color: "#e8dfc8",
    fontFamily: "'Georgia',serif",
  },
  center: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "60vh", color: "#5a7a5a", fontSize: 16,
  },
  emptyState: {
    maxWidth: 480, margin: "80px auto", textAlign: "center",
    padding: "48px 24px", border: "1px dashed #1e4a1e", borderRadius: 14,
  },
};

export default function GroupPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isLegacy = slug === "sammartino-group";

  useEffect(() => {
    if (isLegacy) { setLoading(false); return; }
    api.get(`/api/groups/${slug}`)
      .then(setGroup)
      .catch((err) => {
        if (err.status === 403 || err.status === 404) navigate("/dashboard");
        else setError("Failed to load group.");
      })
      .finally(() => setLoading(false));
  }, [slug, navigate, isLegacy]);

  // Sammartino Group is public to all authenticated users
  if (isLegacy) {
    return (
      <div>
        <Navbar />
        <LobbyBar groupSlug="sammartino-group" />
        <LegacyDashboard />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={S.page}>
        <Navbar />
        <div style={S.center}>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.page}>
        <Navbar />
        <div style={S.center}>{error}</div>
      </div>
    );
  }

  // New groups: show empty state (full analytics added in Phase 5)
  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.emptyState}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>♠</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", color: "#f0e8d0", marginBottom: 8 }}>
          {group?.name}
        </h2>
        <p style={{ color: "#5a7a5a", marginBottom: 24, lineHeight: 1.6 }}>
          No games have been played in this group yet. Start a game from the lobby and your analytics will appear here.
        </p>
        <p style={{ color: "#3a5a3a", fontSize: 13 }}>
          {group?.members?.length || 0} member{group?.members?.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
