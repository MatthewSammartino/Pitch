import { useState } from "react";
import { api } from "../../lib/api";

const S = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 500,
  },
  modal: {
    background: "#0d2b0d", border: "1px solid #2a5c2a",
    borderRadius: 14, padding: "28px 32px", width: "100%", maxWidth: 400,
    boxShadow: "0 16px 48px rgba(0,0,0,.6)",
  },
  title: {
    fontFamily: "'Playfair Display',serif", color: "#f0e8d0",
    fontSize: 20, margin: "0 0 20px",
  },
  input: {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,.06)", border: "1px solid #2a4a2a",
    borderRadius: 8, padding: "10px 14px", color: "#e8dfc8",
    fontSize: 15, fontFamily: "Georgia,serif", outline: "none", marginBottom: 16,
  },
  actions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 },
  btn: (primary) => ({
    padding: "9px 22px", borderRadius: 20, fontSize: 14, cursor: "pointer",
    fontFamily: "Georgia,serif", letterSpacing: .3, transition: "opacity .15s",
    border: primary ? "1px solid #f0c040" : "1px solid #2a4a2a",
    background: primary ? "rgba(240,192,64,.15)" : "transparent",
    color: primary ? "#f0c040" : "#8aab8a",
  }),
};

export default function CreateGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return setError("Please enter a group name.");
    setLoading(true);
    setError("");
    try {
      const group = await api.post("/api/groups", { name: name.trim() });
      onCreate(group);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create group.");
    }
    setLoading(false);
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>Create a Group</h2>
        <input
          style={S.input}
          type="text"
          placeholder="e.g. Friday Night Pitch"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          autoFocus
        />
        {error && <p style={{ color: "#e05c5c", fontSize: 13, margin: "-8px 0 12px" }}>⚠ {error}</p>}
        <div style={S.actions}>
          <button style={S.btn(false)} onClick={onClose}>Cancel</button>
          <button style={S.btn(true)} onClick={handleCreate} disabled={loading}>
            {loading ? "Creating…" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
