const express = require("express");
const pool = require("../db/pool");
const authenticate = require("../middleware/authenticate");
const requireGroupMember = require("../middleware/requireGroupMember");

const router = express.Router();

router.use(authenticate);

// GET /api/analytics/groups/:slug
//
// Returns analytics for a group, scoped to lobby sessions where every seat was
// filled by a human AND every human is a member of this group. Bots, guests,
// or non-members disqualify a session from group attribution.
//
// Response shape:
//   {
//     members:      [{ id, display_name, avatar_url, legacy_name, mmr }, ...],
//     memberStats:  { <userId>: { ...all metrics } },
//     sessions:     [{ id, completed_at, date, variant, team_a_score, team_b_score,
//                      wager_base, wager_per_set,
//                      players: [{ user_id, team, final_score, chip_delta, sets_taken }] }],
//     legacyGames:  [...]  // only for the sammartino-group slug
//   }
router.get("/groups/:slug", requireGroupMember, async (req, res) => {
  try {
    const groupId = req.group.id;
    const isLegacyGroup = req.group.slug === "sammartino-group";

    // ── 1. Members ────────────────────────────────────────────────────────
    const { rows: members } = await pool.query(
      `SELECT u.id, u.display_name, u.avatar_url, u.legacy_name, u.mmr
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    // ── 2. Qualifying sessions ────────────────────────────────────────────
    // A session qualifies if:
    //   (a) status = 'completed'
    //   (b) every session_players row's user is a group member
    //   (c) the count of session_players equals session.variant (no bots —
    //       bots are not recorded in session_players)
    const { rows: sessions } = await pool.query(
      `SELECT s.id, s.variant, s.team_a_score, s.team_b_score, s.completed_at,
              s.wager_base, s.wager_per_set
       FROM game_sessions s
       WHERE s.status = 'completed'
         AND NOT EXISTS (
           SELECT 1 FROM session_players sp
           WHERE sp.session_id = s.id
             AND sp.user_id NOT IN (
               SELECT user_id FROM group_members WHERE group_id = $1
             )
         )
         AND (SELECT COUNT(*) FROM session_players WHERE session_id = s.id) = s.variant
       ORDER BY s.completed_at DESC`,
      [groupId]
    );
    const sessionIds = sessions.map((s) => s.id);

    // ── 3. session_players + rounds for those sessions ────────────────────
    const [playersResult, roundsResult] = await Promise.all([
      sessionIds.length
        ? pool.query(
            `SELECT session_id, user_id, team, final_score
             FROM session_players
             WHERE session_id = ANY($1::uuid[])`,
            [sessionIds]
          )
        : Promise.resolve({ rows: [] }),
      sessionIds.length
        ? pool.query(
            `SELECT session_id, bidder_id, bid_made
             FROM rounds
             WHERE session_id = ANY($1::uuid[])`,
            [sessionIds]
          )
        : Promise.resolve({ rows: [] }),
    ]);
    const sessionPlayers = playersResult.rows;
    const rounds = roundsResult.rows;

    // ── 4. Legacy games (sammartino-group only) ───────────────────────────
    let legacyGames = [];
    if (isLegacyGroup) {
      const { rows } = await pool.query(
        `SELECT id, date, TO_CHAR(time, 'HH24:MI') as time,
                matt, seth, mack, arnav, henry
         FROM games ORDER BY date, id`
      );
      legacyGames = rows;
    }

    // ── 5. Compute aggregates in JS ───────────────────────────────────────

    // Index players by session for chip math + sets attribution
    const playersBySession = {};
    for (const sp of sessionPlayers) {
      if (!playersBySession[sp.session_id]) playersBySession[sp.session_id] = [];
      playersBySession[sp.session_id].push(sp);
    }

    // Sets per session per team — set = round where bid_made = false
    // (set is attributed to the bidder's team)
    const setsBySession = {};
    for (const r of rounds) {
      if (r.bid_made !== false) continue;
      if (!r.bidder_id) continue;
      const players = playersBySession[r.session_id];
      if (!players) continue;
      const bidder = players.find((p) => p.user_id === r.bidder_id);
      if (!bidder) continue;
      if (!setsBySession[r.session_id]) setsBySession[r.session_id] = {};
      setsBySession[r.session_id][bidder.team] =
        (setsBySession[r.session_id][bidder.team] || 0) + 1;
    }

    // Chip delta per session per player — mirrors finalizeSession() math in
    // server/game/persistence.js so analytics agree with what the DB recorded.
    const chipDeltas = {};
    for (const s of sessions) {
      const wagerBase = s.wager_base || 0;
      const wagerPerSet = s.wager_per_set || 0;
      if (!wagerBase && !wagerPerSet) continue;

      const players = playersBySession[s.id] || [];
      if (!players.length) continue;

      // winningTeam logic must match persistence.js:89-92 — ties go to team 0.
      const teamScores = [s.team_a_score, s.team_b_score];
      const winningTeam = teamScores[1] > teamScores[0] ? 1 : 0;

      const winners = players.filter((p) => p.team === winningTeam);
      const losers = players.filter((p) => p.team !== winningTeam);
      if (!winners.length || !losers.length) continue;

      const sets = setsBySession[s.id] || {};
      const loserDeltas = losers.map(
        (l) => wagerBase + wagerPerSet * (sets[l.team] || 0)
      );
      const totalLoserPool = loserDeltas.reduce((a, b) => a + b, 0);
      const winnerShare = Math.floor(totalLoserPool / winners.length);

      chipDeltas[s.id] = {};
      for (let i = 0; i < losers.length; i++) {
        chipDeltas[s.id][losers[i].user_id] = -loserDeltas[i];
      }
      for (const w of winners) {
        chipDeltas[s.id][w.user_id] = wagerBase + winnerShare;
      }
    }

    // Initialize accumulator per member
    const acc = {};
    for (const m of members) {
      acc[m.id] = {
        games_played: 0,
        wins: 0,
        losses: 0,
        bid_attempts: 0,
        bid_successes: 0,
        score_sum: 0,
        win_margin_sum: 0,
        loss_margin_sum: 0,
        results: [], // [{ completed_at, won }] for recent_form
        close_games: 0,
        close_game_wins: 0,
        net_chips: 0,
        chip_win_total: 0,
        chip_win_count: 0,
        chip_loss_total: 0,
        chip_loss_count: 0,
        big_games: 0,
        big_game_wins: 0,
        sets_paid: 0,
        sets_received: 0,
        mmr: m.mmr ?? 1000,
      };
    }

    // Walk sessions and update accumulators
    for (const s of sessions) {
      const teamScores = [s.team_a_score, s.team_b_score];
      const players = playersBySession[s.id] || [];
      const sets = setsBySession[s.id] || {};
      // Big-game threshold: 2× wager_base, but 0 if wager_base is 0 (so no
      // games count as "big" in unwagered sessions — matches user intuition).
      const bigThreshold = (s.wager_base || 0) * 2;

      for (const p of players) {
        const a = acc[p.user_id];
        if (!a) continue;
        a.games_played++;
        a.score_sum += p.final_score || 0;

        const my = teamScores[p.team];
        const opp = teamScores[1 - p.team] ?? 0;
        const won = my > opp;
        const margin = Math.abs(my - opp);

        if (won) {
          a.wins++;
          a.win_margin_sum += margin;
        } else {
          a.losses++;
          a.loss_margin_sum += margin;
        }
        if (margin <= 3) {
          a.close_games++;
          if (won) a.close_game_wins++;
        }
        a.results.push({ completed_at: s.completed_at, won });

        // Sets — own team's bid_made=false rounds are sets paid; opp team's are received
        a.sets_paid += sets[p.team] || 0;
        a.sets_received += sets[1 - p.team] || 0;

        // Chip delta
        const delta = chipDeltas[s.id]?.[p.user_id] ?? 0;
        a.net_chips += delta;
        if (delta > 0) {
          a.chip_win_total += delta;
          a.chip_win_count++;
        } else if (delta < 0) {
          a.chip_loss_total += Math.abs(delta);
          a.chip_loss_count++;
        }
        if (bigThreshold > 0 && Math.abs(delta) >= bigThreshold) {
          a.big_games++;
          if (won) a.big_game_wins++;
        }
      }
    }

    // Bid stats from rounds
    for (const r of rounds) {
      if (!r.bidder_id) continue;
      const a = acc[r.bidder_id];
      if (!a) continue;
      a.bid_attempts++;
      if (r.bid_made === true) a.bid_successes++;
    }

    // Format response
    const memberStats = {};
    for (const uid in acc) {
      const a = acc[uid];
      const sortedResults = a.results
        .slice()
        .sort(
          (x, y) =>
            new Date(y.completed_at).getTime() -
            new Date(x.completed_at).getTime()
        );
      const last10 = sortedResults.slice(0, 10);
      const recentForm =
        last10.length > 0
          ? last10.filter((r) => r.won).length / last10.length
          : null;

      memberStats[uid] = {
        games_played: a.games_played,
        wins: a.wins,
        losses: a.losses,
        win_pct:
          a.games_played > 0 ? +(a.wins / a.games_played).toFixed(3) : null,
        avg_score:
          a.games_played > 0 ? +(a.score_sum / a.games_played).toFixed(1) : null,
        bid_attempts: a.bid_attempts,
        bid_successes: a.bid_successes,
        bid_rate:
          a.bid_attempts > 0
            ? +(a.bid_successes / a.bid_attempts).toFixed(3)
            : null,
        avg_win_margin:
          a.wins > 0 ? +(a.win_margin_sum / a.wins).toFixed(1) : null,
        avg_loss_margin:
          a.losses > 0 ? +(a.loss_margin_sum / a.losses).toFixed(1) : null,
        recent_form: recentForm != null ? +recentForm.toFixed(3) : null,
        clutch_rate:
          a.close_games > 0
            ? +(a.close_game_wins / a.close_games).toFixed(3)
            : null,
        net_chips: a.net_chips,
        cpg:
          a.games_played > 0 ? +(a.net_chips / a.games_played).toFixed(2) : 0,
        avg_chip_win:
          a.chip_win_count > 0
            ? +(a.chip_win_total / a.chip_win_count).toFixed(2)
            : 0,
        avg_chip_loss:
          a.chip_loss_count > 0
            ? +(a.chip_loss_total / a.chip_loss_count).toFixed(2)
            : 0,
        big_game_rate:
          a.games_played > 0 ? +(a.big_games / a.games_played).toFixed(3) : null,
        chip_clutch_rate:
          a.big_games > 0 ? +(a.big_game_wins / a.big_games).toFixed(3) : null,
        sets_paid: a.sets_paid,
        sets_received: a.sets_received,
        sets_ratio:
          a.sets_paid > 0 ? +(a.sets_received / a.sets_paid).toFixed(2) : null,
        mmr: a.mmr,
      };
    }

    const sessionsResponse = sessions.map((s) => {
      const sets = setsBySession[s.id] || {};
      const players = (playersBySession[s.id] || []).map((p) => ({
        user_id: p.user_id,
        team: p.team,
        final_score: p.final_score,
        chip_delta: chipDeltas[s.id]?.[p.user_id] ?? 0,
        sets_taken: sets[p.team] || 0,
      }));
      return {
        id: s.id,
        completed_at: s.completed_at,
        date: s.completed_at
          ? new Date(s.completed_at).toISOString().slice(0, 10)
          : null,
        variant: s.variant,
        team_a_score: s.team_a_score,
        team_b_score: s.team_b_score,
        wager_base: s.wager_base,
        wager_per_set: s.wager_per_set,
        players,
      };
    });

    res.json({
      members,
      memberStats,
      sessions: sessionsResponse,
      legacyGames,
    });
  } catch (err) {
    console.error("GET /analytics/groups/:slug error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
