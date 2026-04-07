const express    = require("express");
const { randomUUID } = require("crypto");
const pool       = require("../db/pool");
const GameStore  = require("../game/GameStore");
const authenticate = require("../middleware/authenticate");

const router = express.Router();
router.use(authenticate);

// ── Room code helpers ─────────────────────────────────────────────────────
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous O/0/I/1
function randomCode() {
  let c = "";
  for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}
async function generateUniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = randomCode();
    const { rows } = await pool.query("SELECT 1 FROM game_sessions WHERE short_code = $1", [code]);
    if (!rows.length) return code;
  }
  throw new Error("Could not generate unique room code");
}

// POST /api/sessions — create a new game session (lobby)
// Body: { variant, groupSlug?, is_public? }
// Any authenticated user can create a game; group association is optional.
router.post("/", async (req, res) => {
  const { variant, groupSlug, is_public = false } = req.body;
  const v = Number(variant);
  if (v !== 4 && v !== 6) return res.status(400).json({ error: "variant must be 4 or 6" });

  // Guest users: in-memory only (no DB record — avoids FK constraint on created_by)
  if (req.user.is_guest) {
    const id        = randomUUID();
    const shortCode = randomCode();
    GameStore.createLobby(id, null, v, req.user.id, shortCode, false);
    return res.status(201).json({ id, group_id: null, variant: v, status: "waiting", created_by: req.user.id, short_code: shortCode });
  }

  try {
    let groupId   = null;
    let groupSlugOut = null;

    // Optionally associate with a group
    if (groupSlug) {
      const { rows } = await pool.query(
        "SELECT id, slug FROM friend_groups WHERE slug = $1", [groupSlug]
      );
      if (rows.length) { groupId = rows[0].id; groupSlugOut = rows[0].slug; }
    }

    const shortCode = await generateUniqueCode();
    const { rows } = await pool.query(
      `INSERT INTO game_sessions (group_id, variant, status, created_by, short_code, is_public)
       VALUES ($1, $2, 'waiting', $3, $4, $5) RETURNING *`,
      [groupId, v, req.user.id, shortCode, !!is_public]
    );
    const session = rows[0];

    GameStore.createLobby(session.id, groupId, v, req.user.id, shortCode, !!is_public);

    res.status(201).json({ ...session, groupSlug: groupSlugOut });
  } catch (err) {
    console.error("POST /sessions error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/sessions/public — list public waiting sessions with live seat counts
// No auth required so guests can browse open games
router.get("/public", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT gs.id, gs.variant, gs.short_code, gs.created_at,
             u.display_name AS host_name, u.avatar_url AS host_avatar
      FROM game_sessions gs
      LEFT JOIN users u ON u.id = gs.created_by
      WHERE gs.status = 'waiting' AND gs.is_public = true
      ORDER BY gs.created_at DESC
      LIMIT 20
    `);

    const enriched = rows.map((r) => {
      const lobby = GameStore.getLobby(r.id);
      const filled = lobby ? lobby.filledCount() : 0;
      return { ...r, seats_filled: filled, seats_total: r.variant };
    }).filter((r) => r.seats_filled < r.seats_total);

    res.json(enriched);
  } catch (err) {
    console.error("GET /sessions/public error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/sessions/queue — join best available public lobby, or create one
router.post("/queue", async (req, res) => {
  try {
    // Find public waiting sessions ordered oldest first (most likely to fill soon)
    const { rows } = await pool.query(`
      SELECT id, variant FROM game_sessions
      WHERE status = 'waiting' AND is_public = true
      ORDER BY created_at ASC LIMIT 20
    `);

    // Pick the first with open seats (prioritize oldest/most-filled)
    for (const row of rows) {
      const lobby = GameStore.getLobby(row.id);
      if (lobby && !lobby.isFull()) {
        return res.json({ id: row.id });
      }
    }

    // No open public lobby — create one (guests use in-memory only)
    if (req.user.is_guest) {
      const id        = randomUUID();
      const shortCode = randomCode();
      GameStore.createLobby(id, null, 4, req.user.id, shortCode, false);
      return res.json({ id });
    }

    const shortCode = await generateUniqueCode();
    const { rows: newRows } = await pool.query(
      `INSERT INTO game_sessions (group_id, variant, status, created_by, short_code, is_public)
       VALUES (NULL, 4, 'waiting', $1, $2, true) RETURNING id`,
      [req.user.id, shortCode]
    );
    const id = newRows[0].id;
    GameStore.createLobby(id, null, 4, req.user.id, shortCode, true);
    res.json({ id });
  } catch (err) {
    console.error("POST /sessions/queue error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/sessions/:id — get session info
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT gs.*, fg.slug AS group_slug, fg.name AS group_name
       FROM game_sessions gs
       LEFT JOIN friend_groups fg ON fg.id = gs.group_id
       WHERE gs.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Session not found" });

    const lobby = GameStore.getLobby(req.params.id);
    res.json({ ...rows[0], seats: lobby ? lobby.seats : null });
  } catch (err) {
    console.error("GET /sessions/:id error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/groups/:slug/sessions — list waiting sessions for a group
router.get("/group/:slug", async (req, res) => {
  try {
    const { rows: groups } = await pool.query(
      "SELECT id FROM friend_groups WHERE slug = $1",
      [req.params.slug]
    );
    if (!groups.length) return res.status(404).json({ error: "Group not found" });

    const { rows } = await pool.query(
      `SELECT gs.id, gs.variant, gs.status, gs.created_at, gs.created_by,
              u.display_name AS host_name, u.avatar_url AS host_avatar
       FROM game_sessions gs
       JOIN users u ON u.id = gs.created_by
       WHERE gs.group_id = $1 AND gs.status = 'waiting'
       ORDER BY gs.created_at DESC`,
      [groups[0].id]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /sessions/group/:slug error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/sessions/code/:code — look up session by room code (DB + in-memory fallback)
router.get("/code/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();
  try {
    const { rows } = await pool.query(
      "SELECT id, status, variant FROM game_sessions WHERE short_code = $1",
      [code]
    );
    if (rows.length) return res.json(rows[0]);

    // Fallback: in-memory lobby (guest-created sessions aren't in DB)
    const lobby = GameStore.getLobbyByCode(code);
    if (lobby) return res.json({ id: lobby.sessionId, status: lobby.status, variant: lobby.variant });

    res.status(404).json({ error: "Room not found" });
  } catch (err) {
    console.error("GET /sessions/code/:code error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
