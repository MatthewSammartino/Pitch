import { useNavigate } from "react-router-dom";

export default function GameOverModal({ winner, teamScores, seats }) {
  const navigate = useNavigate();

  const teamA = seats?.filter((s) => s.team === 0).map((s) => s.displayName).join(" & ");
  const teamB = seats?.filter((s) => s.team === 1).map((s) => s.displayName).join(" & ");
  const winnerName = winner === 0 ? teamA : teamB;
  const winnerColor = winner === 0 ? "#4fc3a1" : "#f0c040";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(0,0,0,.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#0d2b0d", border: `2px solid ${winnerColor}`,
        borderRadius: 16, padding: "36px 40px", maxWidth: 380, width: "100%",
        textAlign: "center", fontFamily: "Georgia,serif", color: "#e8dfc8",
      }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
        <h2 style={{
          fontFamily: "'Playfair Display',serif", color: winnerColor,
          fontSize: 24, margin: "0 0 8px",
        }}>
          {winnerName} wins!
        </h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, margin: "20px 0" }}>
          <div>
            <div style={{ color: "#4fc3a1", fontSize: 13 }}>Team A</div>
            <div style={{ color: "#f0e8d0", fontWeight: 700, fontSize: 28 }}>{teamScores?.[0]}</div>
            <div style={{ color: "#5a7a5a", fontSize: 12 }}>{teamA}</div>
          </div>
          <div>
            <div style={{ color: "#f0c040", fontSize: 13 }}>Team B</div>
            <div style={{ color: "#f0e8d0", fontWeight: 700, fontSize: 28 }}>{teamScores?.[1]}</div>
            <div style={{ color: "#5a7a5a", fontSize: 12 }}>{teamB}</div>
          </div>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            display: "block", width: "100%", padding: "12px",
            borderRadius: 20, border: `1px solid ${winnerColor}`,
            background: "transparent", color: winnerColor,
            cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 15,
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
