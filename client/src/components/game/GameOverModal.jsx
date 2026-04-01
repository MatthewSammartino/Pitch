import { useNavigate } from "react-router-dom";

const TEAM_COLORS = ["#4fc3a1", "#f0c040", "#e07a5f"];

export default function GameOverModal({ winner, teamScores, seats, teamNames }) {
  const navigate = useNavigate();

  const numTeams = teamScores?.length ?? 2;
  const tc = (t) => TEAM_COLORS[t] ?? "#8aab8a";
  const tn = (t) => teamNames?.[t] ?? String.fromCharCode(65 + t);
  const members = (t) => seats?.filter((s) => s.team === t).map((s) => s.displayName).join(" & ") ?? "";

  const winnerColor = tc(winner ?? 0);
  const winnerName  = tn(winner ?? 0);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(0,0,0,.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#0d2b0d", border: `2px solid ${winnerColor}`,
        borderRadius: 16, padding: "36px 40px", maxWidth: 420, width: "100%",
        textAlign: "center", fontFamily: "Georgia,serif", color: "#e8dfc8",
      }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
        <h2 style={{
          fontFamily: "'Playfair Display',serif", color: winnerColor,
          fontSize: 24, margin: "0 0 8px",
        }}>
          {winnerName} wins!
        </h2>

        <div style={{
          display: "flex", justifyContent: "center",
          gap: numTeams === 3 ? 16 : 32,
          margin: "20px 0", flexWrap: "wrap",
        }}>
          {Array.from({ length: numTeams }, (_, t) => (
            <div key={t}>
              <div style={{ color: tc(t), fontSize: 13 }}>{tn(t)}</div>
              <div style={{ color: "#f0e8d0", fontWeight: 700, fontSize: 28 }}>{teamScores?.[t]}</div>
              <div style={{ color: "#5a7a5a", fontSize: 12 }}>{members(t)}</div>
            </div>
          ))}
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
