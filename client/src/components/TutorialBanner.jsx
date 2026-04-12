import { useState } from "react";
import { useNavigate } from "react-router-dom";

const KEY = "pitch_tutorial_done";

export default function TutorialBanner() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(() => !localStorage.getItem(KEY));

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(KEY, "1");
    setVisible(false);
  }

  function goToTutorial() {
    localStorage.setItem(KEY, "1");
    setVisible(false);
    navigate("/tutorial");
  }

  return (
    <div style={{
      background: "rgba(240,192,64,.07)",
      border: "1px solid #3a3010",
      borderRadius: 12,
      padding: "14px 20px",
      marginBottom: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>🃏</span>
        <div>
          <div style={{ color: "#f0c040", fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
            New to Pitch?
          </div>
          <div style={{ color: "#5a7a5a", fontSize: 13 }}>
            Learn the rules, bidding, scoring, and how the site works.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={goToTutorial}
          style={{
            padding: "7px 18px", borderRadius: 12,
            border: "1px solid #f0c040", background: "rgba(240,192,64,.1)",
            color: "#f0c040", fontSize: 13, cursor: "pointer",
            fontFamily: "Georgia,serif", whiteSpace: "nowrap",
          }}
        >
          Show me the guide →
        </button>
        <button
          onClick={dismiss}
          style={{
            padding: "7px 14px", borderRadius: 12,
            border: "1px solid #2a4a2a", background: "transparent",
            color: "#5a7a5a", fontSize: 13, cursor: "pointer",
            fontFamily: "Georgia,serif",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
