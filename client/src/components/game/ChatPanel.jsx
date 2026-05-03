import { useEffect, useRef, useState } from "react";

const MAX_MESSAGES = 80;

export default function ChatPanel({ messages, onSend, myUserId }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      background: "rgba(255,255,255,.02)",
      border: "1px solid #1e4a1e",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid #1a3a1a",
        fontSize: 11,
        color: "#3a5a3a",
        letterSpacing: 1,
        fontFamily: "Georgia,serif",
      }}>
        CHAT
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 0,
        maxHeight: 220,
      }}>
        {messages.length === 0 && (
          <div style={{ color: "#2a4a2a", fontSize: 12, textAlign: "center", marginTop: 8 }}>
            No messages yet.
          </div>
        )}
        {messages.slice(-MAX_MESSAGES).map((msg, i) => {
          const isMe = msg.userId === myUserId;
          const isSystem = msg.userId === "system";
          const isSpec = !!msg.fromSpectator;
          // Spectator name color: blue, italic. Players: gold (or green if me).
          const nameColor = isSpec ? "#7b9ef0" : (isMe ? "#4fc3a1" : "#f0c040");
          return (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.4 }}>
              {isSystem ? (
                <span style={{ color: "#3a5a3a", fontStyle: "italic" }}>{msg.text}</span>
              ) : (
                <>
                  <span style={{
                    color: nameColor,
                    fontWeight: 600,
                    marginRight: 6,
                    fontFamily: "Georgia,serif",
                    fontStyle: isSpec ? "italic" : "normal",
                  }}>
                    {isMe ? "You" : msg.displayName}
                    {isSpec && (
                      <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400, marginLeft: 4 }}>
                        (spectating)
                      </span>
                    )}
                  </span>
                  <span style={{ color: "#c8c0b0" }}>{msg.text}</span>
                </>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: "flex",
        borderTop: "1px solid #1a3a1a",
        padding: "6px 8px",
        gap: 6,
      }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={200}
          placeholder="Say something…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#e8dfc8",
            fontFamily: "Georgia,serif",
            fontSize: 12,
            padding: "2px 4px",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          style={{
            padding: "3px 10px",
            borderRadius: 8,
            border: "1px solid #2a5c2a",
            background: "transparent",
            color: text.trim() ? "#8aab8a" : "#2a4a2a",
            fontSize: 11,
            cursor: text.trim() ? "pointer" : "default",
            fontFamily: "Georgia,serif",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
