const http = require("http");
const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const pgSession = require("connect-pg-simple")(session);

const pool = require("./db/pool");
const runMigrations = require("./db/migrate");
const authRouter      = require("./routes/auth");
const groupsRouter    = require("./routes/groups");
const usersRouter     = require("./routes/users");
const analyticsRouter = require("./routes/analytics");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ── Trust Railway's reverse proxy so secure cookies work over HTTPS ────────
app.set("trust proxy", 1);

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "auth_sessions",
      createTableIfMissing: false, // migration 007 creates it
    }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Serve static React build files in production
app.use(express.static(path.join(__dirname, "dist")));

// ── Password check middleware (legacy — kept for /api/games write routes) ──
const checkPassword = (req, res, next) => {
  const password = req.headers["x-admin-password"];
  const correctPassword = process.env.ADMIN_PASSWORD || "pitch123";
  if (password !== correctPassword) {
    return res.status(401).json({ error: "Invalid password" });
  }
  next();
};

// ── Auth routes ────────────────────────────────────────────────────────────
app.use("/api/auth",      authRouter);
app.use("/api/groups",    groupsRouter);
app.use("/api/users",     usersRouter);
app.use("/api/analytics", analyticsRouter);

// ── Legacy games routes (UNCHANGED) ───────────────────────────────────────
app.get("/api/games", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, date, TO_CHAR(time, 'HH24:MI') as time,
              matt AS "Matt", seth AS "Seth", mack AS "Mack",
              arnav AS "Arnav", henry AS "Henry"
       FROM games ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/games", checkPassword, async (req, res) => {
  const { Matt, Seth, Mack, Arnav, Henry, date, time } = req.body;

  const gameDate = date || new Date().toISOString().slice(0, 10);
  const gameTime = time || new Date().toTimeString().slice(0, 5);

  const matt  = Matt  !== "" && Matt  !== undefined ? Number(Matt)  : null;
  const seth  = Seth  !== "" && Seth  !== undefined ? Number(Seth)  : null;
  const mack  = Mack  !== "" && Mack  !== undefined ? Number(Mack)  : null;
  const arnav = Arnav !== "" && Arnav !== undefined ? Number(Arnav) : null;
  const henry = Henry !== "" && Henry !== undefined ? Number(Henry) : null;

  try {
    const result = await pool.query(
      `INSERT INTO games (date, time, matt, seth, mack, arnav, henry)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, date, TO_CHAR(time, 'HH24:MI') as time,
                 matt AS "Matt", seth AS "Seth", mack AS "Mack",
                 arnav AS "Arnav", henry AS "Henry"`,
      [gameDate, gameTime, matt, seth, mack, arnav, henry]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/games/:id", checkPassword, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await pool.query(
      `DELETE FROM games WHERE id = $1
       RETURNING id, date, TO_CHAR(time, 'HH24:MI') as time,
                 matt AS "Matt", seth AS "Seth", mack AS "Mack",
                 arnav AS "Arnav", henry AS "Henry"`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("DELETE error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ── Health check ───────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ── SPA fallback — must be last ────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ── Start ──────────────────────────────────────────────────────────────────
async function start() {
  try {
    await runMigrations();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🃏 Pitch API running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err.message);
    process.exit(1);
  }
}

start();

module.exports = { app, server };
