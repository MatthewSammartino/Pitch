import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import Navbar from "../components/layout/Navbar";

function formatCountdown(isoString) {
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ChipsPage() {
  const { user } = useAuth();
  const [balance, setBalance]       = useState(null);
  const [nextClaim, setNextClaim]   = useState(null);
  const [claiming, setClaiming]     = useState(false);
  const [message, setMessage]       = useState("");
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    api.get("/api/chips/balance")
      .then((d) => { setBalance(d.balance); setNextClaim(d.next_claim_at); })
      .catch(() => setMessage("Failed to load balance."))
      .finally(() => setLoading(false));
  }, []);

  function claim() {
    setClaiming(true);
    setMessage("");
    api.post("/api/chips/claim")
      .then((d) => {
        setBalance(d.balance);
        setNextClaim(new Date(Date.now() + 24 * 3600 * 1000).toISOString());
        setMessage(`+${d.claimed} chips claimed! New balance: ${d.balance.toLocaleString()}`);
      })
      .catch((err) => {
        const msg = err?.message || "Failed to claim.";
        setMessage(msg);
      })
      .finally(() => setClaiming(false));
  }

  const countdown = nextClaim ? formatCountdown(nextClaim) : null;
  const canClaim  = !nextClaim || !countdown;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
      color: "#e8dfc8",
      fontFamily: "Georgia,serif",
    }}>
      <Navbar />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 20px" }}>
        <h1 style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: 30, color: "#f0e8d0", margin: "0 0 6px",
        }}>
          Chips
        </h1>
        <p style={{ color: "#3a5a3a", fontSize: 13, margin: "0 0 40px" }}>
          Wager chips on games. Winners take the pot.
        </p>

        {/* Balance display */}
        <div style={{
          background: "rgba(240,192,64,.06)", border: "1px solid #3a3010",
          borderRadius: 14, padding: "32px 24px", textAlign: "center", marginBottom: 28,
        }}>
          <div style={{ color: "#5a7a5a", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
            Your Balance
          </div>
          <div style={{ color: "#f0c040", fontSize: 52, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>
            {loading ? "—" : balance != null ? balance.toLocaleString() : "—"}
          </div>
          <div style={{ color: "#5a7a5a", fontSize: 13, marginTop: 6 }}>chips</div>
        </div>

        {/* Daily claim */}
        <div style={{
          background: "rgba(255,255,255,.02)", border: "1px solid #1e4a1e",
          borderRadius: 12, padding: "20px 24px", marginBottom: 24,
        }}>
          <div style={{ color: "#f0e8d0", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
            Daily Free Chips
          </div>
          <div style={{ color: "#3a5a3a", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            Claim 10 free chips every 24 hours to keep playing.
          </div>

          {message && (
            <div style={{
              marginBottom: 12, fontSize: 13, padding: "8px 12px", borderRadius: 8,
              background: message.startsWith("+") ? "rgba(79,195,161,.08)" : "rgba(224,92,92,.08)",
              border: `1px solid ${message.startsWith("+") ? "#2a5c3a" : "#5c2a2a"}`,
              color: message.startsWith("+") ? "#4fc3a1" : "#e05c5c",
            }}>
              {message}
            </div>
          )}

          <button
            onClick={canClaim ? claim : undefined}
            disabled={!canClaim || claiming || loading}
            style={{
              padding: "10px 28px", borderRadius: 20,
              border: `1px solid ${canClaim ? "#f0c040" : "#2a4a2a"}`,
              background: canClaim ? "rgba(240,192,64,.12)" : "transparent",
              color: canClaim ? "#f0c040" : "#3a5a3a",
              fontSize: 14, cursor: canClaim && !claiming ? "pointer" : "not-allowed",
              fontFamily: "Georgia,serif",
            }}
          >
            {claiming ? "Claiming…" : canClaim ? "Claim 10 Chips" : `Next claim in ${countdown}`}
          </button>
        </div>

        {/* How it works */}
        <div style={{
          background: "rgba(255,255,255,.02)", border: "1px solid #1a3a1a",
          borderRadius: 12, padding: "18px 22px",
        }}>
          <div style={{ color: "#8aab8a", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            How Wagers Work
          </div>
          <ul style={{ color: "#5a7a5a", fontSize: 13, lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
            <li>Set a <strong style={{ color: "#e8dfc8" }}>base wager</strong> when creating a lobby — all players pay this at game start.</li>
            <li>Set a <strong style={{ color: "#e8dfc8" }}>per-set wager</strong> — the losing team pays this extra for each time they were set during the game.</li>
            <li>The winning team <strong style={{ color: "#e8dfc8" }}>gets their base wager back</strong> plus an equal share of the losing team's total forfeiture.</li>
            <li>If your team wins, <strong style={{ color: "#e8dfc8" }}>your sets don't count against you</strong>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
