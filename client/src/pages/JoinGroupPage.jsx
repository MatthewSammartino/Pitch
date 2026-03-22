import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Georgia',serif", color: "#e8dfc8", padding: 20,
  },
  card: {
    background: "rgba(13,43,13,0.95)", border: "1px solid #2a5c2a",
    borderRadius: 14, padding: "36px 40px", textAlign: "center",
    maxWidth: 400, width: "100%",
    boxShadow: "0 16px 48px rgba(0,0,0,.5)",
  },
  title: {
    fontFamily: "'Playfair Display',serif", color: "#f0e8d0",
    fontSize: 22, margin: "0 0 10px",
  },
};

export default function JoinGroupPage() {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | error | needsAuth
  const [groupName, setGroupName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;

    // Not signed in — redirect to Google OAuth, come back after
    if (!user) {
      // Store the token so we can rejoin after auth
      sessionStorage.setItem("pendingJoinToken", token);
      window.location.href = "/api/auth/google";
      return;
    }

    // Signed in — attempt to join
    api.post(`/api/groups/join/${token}`)
      .then((data) => {
        setGroupName(data.group?.name || "the group");
        setStatus("success");
        setTimeout(() => navigate(`/group/${data.group.slug}`), 2000);
      })
      .catch((err) => {
        setMessage(err.message || "Invalid invite link.");
        setStatus("error");
      });
  }, [token, user, authLoading, navigate]);

  // After auth redirect, try to re-join with stored token
  useEffect(() => {
    if (!authLoading && user) {
      const pending = sessionStorage.getItem("pendingJoinToken");
      if (pending && pending === token) {
        sessionStorage.removeItem("pendingJoinToken");
        // Already in the useEffect above — no double-join needed
      }
    }
  }, [user, authLoading, token]);

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🃏</div>
        {status === "loading" && (
          <>
            <h2 style={S.title}>Joining group…</h2>
            <p style={{ color: "#5a7a5a", fontSize: 14 }}>Please wait.</p>
          </>
        )}
        {status === "success" && (
          <>
            <h2 style={S.title}>You're in!</h2>
            <p style={{ color: "#4fc3a1", fontSize: 15 }}>
              Welcome to <strong>{groupName}</strong>. Redirecting…
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h2 style={S.title}>Oops</h2>
            <p style={{ color: "#e05c5c", fontSize: 14, marginBottom: 20 }}>{message}</p>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "9px 22px", borderRadius: 20, border: "1px solid #2a4a2a",
                background: "transparent", color: "#8aab8a", cursor: "pointer",
                fontFamily: "Georgia,serif", fontSize: 14,
              }}
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
