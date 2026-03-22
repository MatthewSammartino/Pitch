import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";
import LegacyDashboard from "../LegacyDashboard";

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

  useEffect(() => {
    api.get(`/api/groups/${slug}`)
      .then(setGroup)
      .catch((err) => {
        if (err.status === 403 || err.status === 404) navigate("/dashboard");
        else setError("Failed to load group.");
      })
      .finally(() => setLoading(false));
  }, [slug, navigate]);

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

  // Sammartino Group: render the full existing analytics dashboard
  if (slug === "sammartino-group") {
    return (
      <div>
        <Navbar />
        <LegacyDashboard />
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
