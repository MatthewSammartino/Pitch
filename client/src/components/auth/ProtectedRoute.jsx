import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#8aab8a", fontFamily: "'Georgia',serif", fontSize: 16,
      }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
