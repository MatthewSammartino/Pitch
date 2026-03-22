const express    = require("express");
const pool       = require("../db/pool");
const GameStore  = require("../game/GameStore");
const authenticate       = require("../middleware/authenticate");
const requireGroupMember = require("../middleware/requireGroupMember");

const router = express.Router();
router.use(authenticate);

// POST /api/sessions — create a new game session (lobby)
// Body: { groupSlug, variant }
router.post("/", async (req, res) => {
  const { groupSlug, variant } = req.body;
  const v = Number(variant);
  if (!groupSlug) return res.status(400).json({ error: "groupSlug is required" });
  if (v !== 4 && v !== 6) return res.status(400).json({ error: "variant must be 4 or 6" });

  try {
    // Resolve group + verify membership
    const { rows: groups } = await pool.query(
      "SELECT * FROM friend_groups WHERE slug = $1",
      [groupSlug]
    );
    if (!groups.length) return res.status(404).json({ error: "Group not found" });
    const group = groups[0];

    // Allow sammartino-group without membership check so any user can start a game there
    if (group.slug !== "sammartino-group") {
      const { rows: membership } = await pool.query(
        "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
        [group.id, req.user.id]
      );
      if (!membership.length) return res.status(403).json({ error: "Not a group member" });
    }

    // Create game_sessions row
    const { rows } = await pool.query(
      `INSERT INTO game_sessions (group_id, variant, status, created_by)
       VALUES ($1, $2, 'waiting', $3)
       RETURNING *`,
      [group.id, v, req.user.id]
    );
    const session = rows[0];

    // Init in-memory lobby
    GameStore.create(session.id, group.id, v, req.user.id);

    res.status(201).json({ ...session, groupSlug: group.slug });
  } catch (err) {
    console.error("POST /sessions error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/sessions/:id — get session info
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT gs.*, fg.slug AS group_slug, fg.name AS group_name
       FROM game_sessions gs
       JOIN friend_groups fg ON fg.id = gs.group_id
       WHERE gs.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Session not found" });

    const lobby = GameStore.get(req.params.id);
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

module.exports = router;
