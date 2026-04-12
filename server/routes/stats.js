const express = require("express");
const pool = require("../db/pool");
const authenticate = require("../middleware/authenticate");

const router = express.Router();
router.use(authenticate);

// ── Shared query builder ────────────────────────────────────────────────────
// Builds the combined modern + legacy stats query.
// Pass whereClause = "AND u.id = $1" for /me, "" for /leaderboard.

function buildStatsQuery(whereClause) {
  return `
    WITH full_human_sessions AS (
      -- Only completed sessions where every seat was a real user (no bots)
      SELECT gs.id AS session_id, gs.variant, gs.team_a_score, gs.team_b_score,
             gs.completed_at
      FROM game_sessions gs
      JOIN (
        SELECT session_id, COUNT(*) AS player_count
        FROM session_players GROUP BY session_id
      ) pc ON pc.session_id = gs.id AND pc.player_count = gs.variant
      WHERE gs.status = 'completed'
    ),
    margin_stats AS (
      -- Average win margin and average loss margin per player
      SELECT
        sp.user_id AS id,
        ROUND(AVG(
          CASE
            WHEN sp.team = 0 AND fhs.team_a_score > fhs.team_b_score THEN fhs.team_a_score - fhs.team_b_score
            WHEN sp.team = 1 AND fhs.team_b_score > fhs.team_a_score THEN fhs.team_b_score - fhs.team_a_score
          END
        )::numeric, 1) AS avg_win_margin,
        ROUND(AVG(
          CASE
            WHEN sp.team = 0 AND fhs.team_a_score < fhs.team_b_score THEN fhs.team_b_score - fhs.team_a_score
            WHEN sp.team = 1 AND fhs.team_b_score < fhs.team_a_score THEN fhs.team_a_score - fhs.team_b_score
          END
        )::numeric, 1) AS avg_loss_margin
      FROM session_players sp
      JOIN full_human_sessions fhs ON fhs.session_id = sp.session_id
      GROUP BY sp.user_id
    ),
    recent_form AS (
      -- Win rate in last 10 games per player
      SELECT user_id,
        ROUND(
          SUM(CASE
            WHEN team = 0 AND team_a_score > team_b_score THEN 1
            WHEN team = 1 AND team_b_score > team_a_score THEN 1
            ELSE 0
          END)::numeric / NULLIF(COUNT(*), 0) * 100, 1
        ) AS recent_form_pct
      FROM (
        SELECT sp.user_id, sp.team,
               fhs.team_a_score, fhs.team_b_score,
               ROW_NUMBER() OVER (PARTITION BY sp.user_id ORDER BY fhs.completed_at DESC) AS rnk
        FROM session_players sp
        JOIN full_human_sessions fhs ON fhs.session_id = sp.session_id
      ) ranked
      WHERE rnk <= 10
      GROUP BY user_id
    ),
    clutch_stats AS (
      -- Win rate in games decided by 3 or fewer points
      SELECT sp.user_id AS id,
        ROUND(
          SUM(CASE
            WHEN sp.team = 0 AND fhs.team_a_score > fhs.team_b_score
                 AND (fhs.team_a_score - fhs.team_b_score) <= 3 THEN 1
            WHEN sp.team = 1 AND fhs.team_b_score > fhs.team_a_score
                 AND (fhs.team_b_score - fhs.team_a_score) <= 3 THEN 1
            ELSE 0
          END)::numeric
          / NULLIF(SUM(
            CASE WHEN ABS(fhs.team_a_score - fhs.team_b_score) <= 3 THEN 1 ELSE 0 END
          ), 0) * 100, 1
        ) AS clutch_rate_pct
      FROM session_players sp
      JOIN full_human_sessions fhs ON fhs.session_id = sp.session_id
      GROUP BY sp.user_id
    ),
    modern_stats AS (
      SELECT
        sp.user_id                                                         AS id,
        COUNT(DISTINCT sp.session_id)::int                                AS games_played,
        SUM(CASE
          WHEN sp.team = 0 AND fhs.team_a_score > fhs.team_b_score THEN 1
          WHEN sp.team = 1 AND fhs.team_b_score > fhs.team_a_score THEN 1
          ELSE 0
        END)::int                                                          AS wins,
        ROUND(AVG(sp.final_score)::numeric, 1)                           AS avg_score,
        COUNT(r.id)::int                                                   AS bid_attempts,
        SUM(CASE WHEN r.bid_made THEN 1 ELSE 0 END)::int                 AS bid_successes
      FROM session_players sp
      JOIN full_human_sessions fhs ON fhs.session_id = sp.session_id
      LEFT JOIN rounds r ON r.session_id = sp.session_id AND r.bidder_id = sp.user_id
      GROUP BY sp.user_id
    ),
    legacy_stats AS (
      -- Unpivot the wide games table into per-player rows, join via legacy_name
      SELECT u.id,
        COUNT(*)::int                                        AS games_played,
        SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END)::int    AS wins
      FROM (
        SELECT 'matt'  AS lname, matt  AS score FROM games WHERE matt  IS NOT NULL
        UNION ALL
        SELECT 'seth',  seth  FROM games WHERE seth  IS NOT NULL
        UNION ALL
        SELECT 'mack',  mack  FROM games WHERE mack  IS NOT NULL
        UNION ALL
        SELECT 'arnav', arnav FROM games WHERE arnav IS NOT NULL
        UNION ALL
        SELECT 'henry', henry FROM games WHERE henry IS NOT NULL
      ) lg
      JOIN users u ON u.legacy_name = lg.lname
      GROUP BY u.id
    )
    SELECT
      u.id, u.display_name, u.avatar_url,
      u.chip_balance, u.mmr,
      (COALESCE(ms.games_played, 0) + COALESCE(ls.games_played, 0)) AS games_played,
      (COALESCE(ms.wins,         0) + COALESCE(ls.wins,         0)) AS wins,
      ms.avg_score,
      COALESCE(ms.bid_attempts,  0) AS bid_attempts,
      COALESCE(ms.bid_successes, 0) AS bid_successes,
      mgn.avg_win_margin,
      mgn.avg_loss_margin,
      rf.recent_form_pct,
      cs.clutch_rate_pct
    FROM users u
    LEFT JOIN modern_stats ms  ON ms.id       = u.id
    LEFT JOIN legacy_stats ls  ON ls.id       = u.id
    LEFT JOIN margin_stats mgn ON mgn.id      = u.id
    LEFT JOIN recent_form  rf  ON rf.user_id  = u.id
    LEFT JOIN clutch_stats cs  ON cs.id       = u.id
    WHERE (ms.id IS NOT NULL OR ls.id IS NOT NULL)
    ${whereClause}
    ORDER BY
      ((COALESCE(ms.wins, 0) + COALESCE(ls.wins, 0))::float
        / NULLIF(COALESCE(ms.games_played, 0) + COALESCE(ls.games_played, 0), 0)) DESC,
      (COALESCE(ms.games_played, 0) + COALESCE(ls.games_played, 0)) DESC
  `;
}

function formatRow(r) {
  const gp = parseInt(r.games_played);
  const w  = parseInt(r.wins);
  const ba = parseInt(r.bid_attempts);
  const bs = parseInt(r.bid_successes);
  return {
    id:            r.id,
    display_name:  r.display_name,
    avatar_url:    r.avatar_url,
    games_played:  gp,
    wins:          w,
    win_pct:       gp > 0 ? +(w / gp).toFixed(3) : null,
    bid_attempts:  ba,
    bid_successes: bs,
    bid_rate:        ba > 0 ? +(bs / ba).toFixed(3) : null,
    avg_score:       r.avg_score       != null ? +r.avg_score                         : null,
    avg_win_margin:  r.avg_win_margin  != null ? +r.avg_win_margin                   : null,
    avg_loss_margin: r.avg_loss_margin != null ? +r.avg_loss_margin                  : null,
    recent_form:     r.recent_form_pct != null ? +(r.recent_form_pct / 100).toFixed(3) : null,
    clutch_rate:     r.clutch_rate_pct != null ? +(r.clutch_rate_pct / 100).toFixed(3) : null,
    chip_balance:    r.chip_balance    != null ? parseInt(r.chip_balance)               : 0,
    mmr:             r.mmr             != null ? parseInt(r.mmr)                        : 1000,
  };
}

// GET /api/stats/me
router.get("/me", async (req, res) => {
  try {
    const { rows } = await pool.query(
      buildStatsQuery("AND u.id = $1"),
      [req.user.id]
    );

    if (!rows.length) {
      return res.json({
        games_played: 0, wins: 0, win_pct: null,
        bid_attempts: 0, bid_successes: 0, bid_rate: null,
        avg_score: null,
      });
    }

    res.json(formatRow(rows[0]));
  } catch (err) {
    console.error("GET /stats/me error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/stats/leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const { rows } = await pool.query(buildStatsQuery(""));
    res.json(rows.map(formatRow));
  } catch (err) {
    console.error("GET /stats/leaderboard error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
