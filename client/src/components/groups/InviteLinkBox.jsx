import { useState } from "react";

export default function InviteLinkBox({ token }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/join/${token}`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{
      background: "rgba(255,255,255,.03)", border: "1px solid #2a4a2a",
      borderRadius: 10, padding: "14px 16px", display: "flex",
      alignItems: "center", gap: 10, flexWrap: "wrap",
    }}>
      <span style={{ color: "#5a7a5a", fontSize: 12, fontFamily: "monospace", flexShrink: 0 }}>
        Invite link:
      </span>
      <span style={{
        color: "#8aab8a", fontSize: 12, fontFamily: "monospace",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
        minWidth: 0,
      }}>
        {url}
      </span>
      <button onClick={copy} style={{
        padding: "6px 14px", borderRadius: 16, fontSize: 12, cursor: "pointer",
        border: "1px solid #2a4a2a", background: copied ? "rgba(79,195,161,.15)" : "transparent",
        color: copied ? "#4fc3a1" : "#8aab8a", fontFamily: "monospace", flexShrink: 0,
        transition: "all .15s",
      }}>
        {copied ? "✓ Copied!" : "Copy"}
      </button>
    </div>
  );
}
