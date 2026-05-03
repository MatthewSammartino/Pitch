// Renders a thin banner at the top of every page when VITE_ENV_LABEL is set.
// Production deploys leave the env var unset so the banner doesn't render.
//
// Set in Railway: Service → Variables → VITE_ENV_LABEL=staging
// (Vite inlines VITE_-prefixed vars at build time, so the value is baked
// into the bundle — make sure each environment sets its own value.)

const PALETTE = {
  staging: { bg: "#a86a1a", fg: "#fff8e6", icon: "⚠" },
  dev:     { bg: "#1a5a8a", fg: "#e6f1f8", icon: "⚙" },
  local:   { bg: "#1a5a8a", fg: "#e6f1f8", icon: "⚙" },
  preview: { bg: "#5a3a8a", fg: "#f0e6f8", icon: "👁" },
};

export default function EnvBanner() {
  const label = (import.meta.env.VITE_ENV_LABEL || "").trim();
  if (!label) return null;

  const key = label.toLowerCase();
  const palette = PALETTE[key] || { bg: "#5a5a5a", fg: "#fff", icon: "●" };
  const sha = (import.meta.env.VITE_GIT_SHA || "").slice(0, 7);

  return (
    <div
      role="status"
      aria-label={`Environment: ${label}`}
      style={{
        background: palette.bg,
        color: palette.fg,
        fontFamily: "monospace",
        fontSize: 12,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        padding: "5px 14px",
        textAlign: "center",
        borderBottom: "1px solid rgba(0,0,0,.25)",
        position: "relative",
        zIndex: 1000,
      }}
    >
      <span style={{ marginRight: 8 }}>{palette.icon}</span>
      <strong>{label}</strong>
      {sha && (
        <span style={{ marginLeft: 12, opacity: 0.75 }}>
          @ {sha}
        </span>
      )}
    </div>
  );
}
