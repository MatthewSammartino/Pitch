const express = require("express");
const pool = require("../db/pool");
const authenticate = require("../middleware/authenticate");

const router = express.Router();
router.use(authenticate);

// CTE that selects only fully-human completed sessions
// (bot user IDs are not in the users table, so sessions with bots
//  have fewer session_players rows than game.variant)
const HUMAN_SESSIONS_CTE = `
  WITH full_human_sessions AS (
    SELECT gs.id AS session_id, gs.variant, gs.team_a_score, gs.team_b_score
    FROM game_sessions gs
    JOIN (
      SELECT session_id, COUNT(*) AS player_count
      FROM session_players GROUP BY session_id
    ) pc ON pc.session_id = gs.id AND pc.player_count = gs.variant
    WHERE gs.status = 'completed'
  )
`;

const STATS_SELECT = `
  SELECT
    u.id, u.display_name, u.avatar_url,
    COUNT(DISTINCT sp.session_id)::int                        AS games_played,
    SUM(CASE
      WHEN sp.team = 0 AND fhs.team_a_score > fhs.team_b_score THEN 1
      WHEN sp.team = 1 AND fhs.team_b_score > fhs.team_a_score THEN 1
      ELSE 0
    END)::int                                                 AS wins,
    ROUND(AVG(sp.final_score)::numeric, 1)                   AS avg_score,
    COUNT(r.id)::int                                          AS bid_attempts,
    SUM(CASE WHEN r.bid_made THEN 1 ELSE 0 END)::int         AS bid_successes
  FROM users u
  JOIN session_players sp ON sp.user_id = u.id
  JOIN full_human_sessions fhs ON fhs.session_id = sp.session_id
  LEFT JOIN rounds r ON r.session_id = sp.session_id AND r.bidder_id = u.id
`;

// GET /api/stats/me
router.get("/me", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${HUMAN_SESSIONS_CTE}
       ${STATS_SELECT}
       WHERE u.id = $1
       GROUP BY u.id, u.display_name, u.avatar_url`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.json({
        games_played: 0, wins: 0, win_pct: null,
        bid_attempts: 0, bid_successes: 0, bid_rate: null,
        avg_score: null,
      });
    }

    const r = rows[0];
    return res.json({
      games_played:  r.games_played,
      wins:          r.wins,
      win_pct:       r.games_played > 0 ? +(r.wins / r.games_played).toFixed(3) : null,
      bid_attempts:  r.bid_attempts,
      bid_successes: r.bid_successes,
      bid_rate:      r.bid_attempts > 0 ? +(r.bid_successes / r.bid_attempts).toFixed(3) : null,
      avg_score:     r.avg_score != null ? +r.avg_score : null,
    });
  } catch (err) {
    console.error("GET /stats/me error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/stats/leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${HUMAN_SESSIONS_CTE}
       ${STATS_SELECT}
       GROUP BY u.id, u.display_name, u.avatar_url
       HAVING COUNT(DISTINCT sp.session_id) > 0
       ORDER BY
         (SUM(CASE
           WHEN sp.team = 0 AND fhs.team_a_score > fhs.team_b_score THEN 1
           WHEN sp.team = 1 AND fhs.team_b_score > fhs.team_a_score THEN 1
           ELSE 0
         END)::float / NULLIF(COUNT(DISTINCT sp.session_id), 0)) DESC,
         COUNT(DISTINCT sp.session_id) DESC`
    );

    const leaderboard = rows.map((r) => ({
      id:            r.id,
      display_name:  r.display_name,
      avatar_url:    r.avatar_url,
      games_played:  r.games_played,
      wins:          r.wins,
      win_pct:       r.games_played > 0 ? +(r.wins / r.games_played).toFixed(3) : null,
      bid_attempts:  r.bid_attempts,
      bid_successes: r.bid_successes,
      bid_rate:      r.bid_attempts > 0 ? +(r.bid_successes / r.bid_attempts).toFixed(3) : null,
      avg_score:     r.avg_score != null ? +r.avg_score : null,
    }));

    res.json(leaderboard);
  } catch (err) {
    console.error("GET /stats/leaderboard error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
