const express = require("express");
const pool = require("../db/pool");
const authenticate = require("../middleware/authenticate");
const requireGroupMember = require("../middleware/requireGroupMember");

const router = express.Router();

router.use(authenticate);

// GET /api/analytics/groups/:slug
// Returns games data for a group's analytics dashboard.
// For the legacy 'sammartino-group': reads from the `games` table.
// For new groups: reads from `game_sessions` + `session_players`.
router.get("/groups/:slug", requireGroupMember, async (req, res) => {
  try {
    const isLegacy = req.group.slug === "sammartino-group";

    if (isLegacy) {
      // Return legacy games in the existing format + group members
      const [gamesResult, membersResult] = await Promise.all([
        pool.query(
          `SELECT id, date, TO_CHAR(time, 'HH24:MI') as time,
                  matt AS "Matt", seth AS "Seth", mack AS "Mack",
                  arnav AS "Arnav", henry AS "Henry"
           FROM games ORDER BY id`
        ),
        pool.query(
          `SELECT u.id, u.display_name, u.avatar_url, u.legacy_name
           FROM group_members gm
           JOIN users u ON u.id = gm.user_id
           WHERE gm.group_id = $1`,
          [req.group.id]
        ),
      ]);

      return res.json({
        isLegacy: true,
        games: gamesResult.rows,
        members: membersResult.rows,
      });
    }

    // New groups: read from game_sessions + session_players
    const [sessionsResult, membersResult] = await Promise.all([
      pool.query(
        `SELECT gs.id, gs.started_at::date AS date,
                gs.team_a_score, gs.team_b_score, gs.variant
         FROM game_sessions gs
         WHERE gs.group_id = $1 AND gs.status = 'completed'
         ORDER BY gs.started_at`,
        [req.group.id]
      ),
      pool.query(
        `SELECT u.id, u.display_name, u.avatar_url, u.legacy_name
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = $1`,
        [req.group.id]
      ),
    ]);

    // For each session, get per-player scores
    const sessionIds = sessionsResult.rows.map((s) => s.id);
    let scoresResult = { rows: [] };
    if (sessionIds.length > 0) {
      scoresResult = await pool.query(
        `SELECT session_id, user_id, final_score
         FROM session_players
         WHERE session_id = ANY($1::uuid[])`,
        [sessionIds]
      );
    }

    // Build scores map: sessionId → { userId: score }
    const scoresMap = {};
    for (const row of scoresResult.rows) {
      if (!scoresMap[row.session_id]) scoresMap[row.session_id] = {};
      scoresMap[row.session_id][row.user_id] = row.final_score;
    }

    const games = sessionsResult.rows.map((s) => ({
      id: s.id,
      date: s.date,
      scores: scoresMap[s.id] || {},
    }));

    res.json({ isLegacy: false, games, members: membersResult.rows });
  } catch (err) {
    console.error("GET /analytics/groups/:slug error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
