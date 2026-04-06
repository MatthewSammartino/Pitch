const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("../db/pool");

const router = express.Router();

// ── Passport strategy ──────────────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL ||
        "https://pitchtracker.up.railway.app/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || null;
        const displayName = profile.displayName || email || "Player";
        const avatarUrl = profile.photos?.[0]?.value || null;

        // Check if this google_id is already linked to a user
        let { rows } = await pool.query(
          "SELECT * FROM users WHERE google_id = $1",
          [googleId]
        );

        if (rows.length > 0) {
          // Update last seen + avatar
          await pool.query(
            "UPDATE users SET last_seen_at = NOW(), avatar_url = $1 WHERE google_id = $2",
            [avatarUrl, googleId]
          );
          return done(null, rows[0]);
        }

        // Check if there's an unclaimed stub matching this email
        if (email) {
          const { rows: byEmail } = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
          );
          if (byEmail.length > 0 && !byEmail[0].google_id) {
            const updated = await pool.query(
              `UPDATE users
               SET google_id = $1, email = $2, display_name = $3,
                   avatar_url = $4, last_seen_at = NOW()
               WHERE id = $5
               RETURNING *`,
              [googleId, email, displayName, avatarUrl, byEmail[0].id]
            );
            return done(null, updated.rows[0]);
          }
        }

        // Create a new user
        const { rows: created } = await pool.query(
          `INSERT INTO users (google_id, display_name, email, avatar_url, last_seen_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING *`,
          [googleId, displayName, email, avatarUrl]
        );
        return done(null, created[0]);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, rows[0] || null);
  } catch (err) {
    done(err);
  }
});

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /api/auth/me — return current user (or 401)
router.get("/me", (req, res) => {
  if (req.isAuthenticated()) {
    const { id, display_name, email, avatar_url, legacy_name } = req.user;
    return res.json({ id, display_name, email, avatar_url, legacy_name, is_guest: false });
  }
  if (req.session?.guestUser) {
    return res.json(req.session.guestUser);
  }
  res.status(401).json({ error: "Not authenticated" });
});

// POST /api/auth/guest — create a temporary guest session (no DB record)
router.post("/guest", (req, res) => {
  const { randomUUID } = require("crypto");
  const raw = (req.body?.displayName || "").trim().slice(0, 30);
  if (!raw) return res.status(400).json({ error: "Display name is required." });

  const guestUser = {
    id:           `guest-${randomUUID()}`,
    display_name: raw,
    avatar_url:   null,
    is_guest:     true,
  };
  req.session.guestUser = guestUser;
  res.json(guestUser);
});

// GET /api/auth/google — redirect to Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// GET /api/auth/google/callback — Google redirects here after auth
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/?auth=failed" }),
  (req, res) => {
    // Redirect to dashboard on success
    res.redirect("/dashboard");
  }
);

// POST /api/auth/logout
router.post("/logout", (req, res, next) => {
  // Clear guest session if present
  if (req.session?.guestUser) {
    delete req.session.guestUser;
    return req.session.save(() => res.json({ ok: true }));
  }
  req.logout((err) => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});

module.exports = router;
