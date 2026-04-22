import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import useIsMobile from "../../hooks/useIsMobile";

const NAV_LINKS = [
  { label: "Play",        to: "/dashboard" },
  { label: "Groups",      to: "/groups" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Guide",       to: "/tutorial" },
  { label: "Chips",       to: "/chips" },
  { label: "Help",        to: "/help" },
];

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
    gap: 12,
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
    flexShrink: 0,
  },
  center: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    flex: 1,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  navLink: (active) => ({
    color: active ? "#f0c040" : "#8aab8a",
    textDecoration: "none",
    fontSize: 13,
    fontFamily: "Georgia,serif",
    padding: "4px 10px",
    borderRadius: 6,
    borderBottom: active ? "2px solid #f0c040" : "2px solid transparent",
    transition: "color .15s",
    whiteSpace: "nowrap",
  }),
  right: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  signInBtn: {
    padding: "7px 18px",
    borderRadius: 16,
    border: "1px solid #f0c040",
    background: "rgba(240,192,64,.1)",
    color: "#f0c040",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "Georgia,serif",
    textDecoration: "none",
    whiteSpace: "nowrap",
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
    flexShrink: 0,
  },
  dropdown: {
    position: "absolute",
    top: 44, right: 0,
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
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chipBalance, setChipBalance] = useState(null);

  useEffect(() => {
    if (!user || user.is_guest) { setChipBalance(null); return; }
    api.get("/api/chips/balance")
      .then((d) => setChipBalance(d.balance))
      .catch(() => {});
  }, [user]);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const initial = user?.display_name?.[0]?.toUpperCase() || "?";

  return (
    <>
      <nav style={{ ...S.nav, padding: isMobile ? "0 12px" : "0 24px" }}>
        {/* Logo */}
        <Link to={user ? "/dashboard" : "/"} style={S.logo}>
          🃏{!isMobile && " Pitch"}
        </Link>

        {/* Center nav links — desktop only */}
        {!isMobile && (
          <div style={S.center}>
            {NAV_LINKS.map(({ label, to }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to} style={S.navLink(active)}>
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Right side */}
        <div style={{ ...S.right, gap: isMobile ? 8 : 12 }}>
          {!user ? (
            <a href="/api/auth/google" style={S.signInBtn}>Sign In</a>
          ) : (
            <>
            {chipBalance !== null && !isMobile && (
              <Link
                to="/chips"
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 14,
                  border: "1px solid #3a5c1a",
                  background: "rgba(240,192,64,.06)",
                  color: "#f0c040", fontSize: 13,
                  textDecoration: "none", fontFamily: "Georgia,serif",
                  whiteSpace: "nowrap",
                }}
              >
                🪙 {chipBalance.toLocaleString()}
              </Link>
            )}
            <div style={{ position: "relative" }}>
              {user.avatar_url ? (
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
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 150 }}
                    onClick={() => setOpen(false)}
                  />
                  <div style={S.dropdown}>
                    <div style={{ padding: "10px 18px 8px", borderBottom: "1px solid #1e4a1e", marginBottom: 4 }}>
                      <div style={{ color: "#f0e8d0", fontWeight: 700, fontSize: 14 }}>
                        {user.display_name}
                        {user.is_guest && (
                          <span style={{ color: "#5a7a5a", fontWeight: 400, fontSize: 11, marginLeft: 6 }}>Guest</span>
                        )}
                      </div>
                      {!user.is_guest && (
                        <div style={{ color: "#5a7a5a", fontSize: 12 }}>{user.email}</div>
                      )}
                      {user.is_guest && (
                        <a href="/api/auth/google" style={{ color: "#f0c040", fontSize: 12 }}>
                          Sign in to save progress →
                        </a>
                      )}
                    </div>
                    {!user.is_guest && (
                      <Link to="/profile" style={S.dropItem} onClick={() => setOpen(false)}>
                        Profile &amp; Stats
                      </Link>
                    )}
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
            </>
          )}

          {/* Hamburger — mobile only */}
          {isMobile && (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: "none", border: "1px solid #2a5c2a",
                borderRadius: 6, padding: "4px 7px",
                cursor: "pointer", display: "flex",
                flexDirection: "column", gap: 3,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <span style={{ display: "block", width: 16, height: 2, background: "#8aab8a", borderRadius: 1 }} />
              <span style={{ display: "block", width: 16, height: 2, background: "#8aab8a", borderRadius: 1 }} />
              <span style={{ display: "block", width: 16, height: 2, background: "#8aab8a", borderRadius: 1 }} />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile nav drawer */}
      {isMobile && menuOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.4)" }}
            onClick={() => setMenuOpen(false)}
          />
          <div style={{
            position: "fixed",
            top: 56, left: 0, right: 0,
            zIndex: 95,
            background: "rgba(7,26,7,0.98)",
            borderBottom: "1px solid #1e4a1e",
            padding: "8px 0",
            display: "flex",
            flexDirection: "column",
          }}>
            {NAV_LINKS.map(({ label, to }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    color: active ? "#f0c040" : "#8aab8a",
                    textDecoration: "none",
                    fontSize: 15,
                    fontFamily: "Georgia,serif",
                    padding: "12px 24px",
                    borderLeft: active ? "3px solid #f0c040" : "3px solid transparent",
                  }}
                >
                  {label}
                </Link>
              );
            })}
            {chipBalance !== null && (
              <Link
                to="/chips"
                onClick={() => setMenuOpen(false)}
                style={{
                  color: "#f0c040",
                  textDecoration: "none",
                  fontSize: 15,
                  fontFamily: "Georgia,serif",
                  padding: "12px 24px",
                  borderTop: "1px solid #1e4a1e",
                  borderLeft: "3px solid transparent",
                }}
              >
                🪙 {chipBalance.toLocaleString()} chips
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
}
