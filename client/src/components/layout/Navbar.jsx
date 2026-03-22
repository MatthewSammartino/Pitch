import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const S = {
  nav: {
    background: "rgba(7,26,7,0.95)",
    borderBottom: "1px solid #1e4a1e",
    padding: "0 24px",
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(8px)",
  },
  logo: {
    fontFamily: "'Playfair Display',serif",
    fontSize: 22,
    color: "#f0c040",
    textDecoration: "none",
    letterSpacing: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  right: { display: "flex", alignItems: "center", gap: 16 },
  link: {
    color: "#8aab8a",
    textDecoration: "none",
    fontSize: 14,
    fontFamily: "Georgia,serif",
    padding: "6px 12px",
    borderRadius: 8,
    transition: "color .15s",
  },
  avatar: {
    width: 32, height: 32, borderRadius: "50%",
    border: "2px solid #2a5c2a", cursor: "pointer",
    objectFit: "cover",
  },
  avatarInitial: {
    width: 32, height: 32, borderRadius: "50%",
    border: "2px solid #2a5c2a", cursor: "pointer",
    background: "#1e4a1e", color: "#f0c040",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 700, fontFamily: "Georgia,serif",
  },
  dropdown: {
    position: "absolute",
    top: 48, right: 16,
    background: "#0d2b0d",
    border: "1px solid #2a5c2a",
    borderRadius: 10,
    padding: "8px 0",
    minWidth: 180,
    zIndex: 200,
    boxShadow: "0 8px 24px rgba(0,0,0,.5)",
  },
  dropItem: {
    display: "block",
    padding: "10px 18px",
    color: "#e8dfc8",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "Georgia,serif",
    textDecoration: "none",
    background: "none",
    border: "none",
    width: "100%",
    textAlign: "left",
  },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const initial = user?.display_name?.[0]?.toUpperCase() || "?";

  return (
    <nav style={S.nav}>
      {/* Logo */}
      <Link to="/dashboard" style={S.logo}>
        🃏 Pitch
      </Link>

      {/* Right side */}
      <div style={S.right}>
        <Link to="/dashboard" style={S.link}>Dashboard</Link>

        {/* User avatar / dropdown */}
        <div style={{ position: "relative" }}>
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name}
              style={S.avatar}
              onClick={() => setOpen((o) => !o)}
            />
          ) : (
            <div style={S.avatarInitial} onClick={() => setOpen((o) => !o)}>
              {initial}
            </div>
          )}

          {open && (
            <>
              {/* click-away overlay */}
              <div
                style={{ position: "fixed", inset: 0, zIndex: 150 }}
                onClick={() => setOpen(false)}
              />
              <div style={S.dropdown}>
                <div style={{ padding: "10px 18px 8px", borderBottom: "1px solid #1e4a1e", marginBottom: 4 }}>
                  <div style={{ color: "#f0e8d0", fontWeight: 700, fontSize: 14 }}>{user?.display_name}</div>
                  <div style={{ color: "#5a7a5a", fontSize: 12 }}>{user?.email}</div>
                </div>
                <Link
                  to="/profile"
                  style={S.dropItem}
                  onClick={() => setOpen(false)}
                >
                  Profile & Stats
                </Link>
                <button
                  style={{ ...S.dropItem, color: "#e05c5c" }}
                  onClick={() => { setOpen(false); logout(); }}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
