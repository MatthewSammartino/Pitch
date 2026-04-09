const pool = require("../db/pool");

/**
 * Save a completed round to the database.
 * Returns the round row id.
 */
async function saveRound(sessionId, roundSummary, seats) {
  const { roundNumber, bidderSeat, bid, bidMade, teamPointsEarned, trumpSuit } = roundSummary;

  // Resolve bidder userId from seatIndex
  const bidderSeatObj = seats.find((s) => s.seatIndex === bidderSeat);
  const bidderId = bidderSeatObj?.userId || null;

  const { rows } = await pool.query(
    `INSERT INTO rounds
       (session_id, round_number, trump_suit, bid_amount, bidder_id, bid_made,
        team_a_points, team_b_points, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (session_id, round_number) DO NOTHING
     RETURNING id`,
    [
      sessionId, roundNumber, trumpSuit, bid, bidderId, bidMade,
      teamPointsEarned[0], teamPointsEarned[1],
    ]
  );

  return rows[0]?.id || null;
}

/**
 * Save the 5 round-point breakdown rows.
 */
async function saveRoundPoints(roundId, breakdown, seats) {
  if (!roundId) return;

  const seatUser = {};
  for (const s of seats) seatUser[s.seatIndex] = s.userId;

  const entries = [
    breakdown.high    && ["high",     seatUser[breakdown.high.seatIndex],    breakdown.high.team],
    breakdown.low     && ["low",      seatUser[breakdown.low.seatIndex],     breakdown.low.team],
    breakdown.jack    && ["jack",     null,                                   breakdown.jack.team],
    breakdown.offJack && ["off_jack", null,                                   breakdown.offJack.team],
    breakdown.game    && ["game",     null,                                   breakdown.game.team],
  ].filter(Boolean);

  for (const [type, capturedBy, team] of entries) {
    await pool.query(
      `INSERT INTO round_points (round_id, point_type, captured_by, team)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [roundId, type, capturedBy, team]
    );
  }
}

/**
 * Finalize a session: update status, final scores, timestamps.
 * Also writes each human player's final_score to session_players.
 * Distributes chip payouts if the session had a wager.
 */
async function finalizeSession(sessionId, teamScores, seats = []) {
  await pool.query(
    `UPDATE game_sessions
     SET status = 'completed', completed_at = NOW(),
         team_a_score = $1, team_b_score = $2
     WHERE id = $3`,
    [teamScores[0], teamScores[1], sessionId]
  );

  const humanSeats = seats.filter((s) => !s.isBot && s.userId);
  for (const s of humanSeats) {
    await pool.query(
      `UPDATE session_players SET final_score = $1
       WHERE session_id = $2 AND user_id = $3`,
      [teamScores[s.team], sessionId, s.userId]
    );
  }

  // ── Chip payouts ──────────────────────────────────────────────────────────
  try {
    const { rows: sessionRows } = await pool.query(
      "SELECT wager_base, wager_per_set FROM game_sessions WHERE id = $1",
      [sessionId]
    );
    const { wager_base: wagerBase, wager_per_set: wagerPerSet } = sessionRows[0] || {};
    if (!wagerBase && !wagerPerSet) return; // no wager — skip

    // Determine winning team (highest score)
    const winningTeam = teamScores.reduce(
      (best, score, team) => (score > teamScores[best] ? team : best),
      0
    );

    // Count sets per team (bid_made = false, join bidder → session_players to get team)
    const { rows: setRows } = await pool.query(
      `SELECT sp.team, COUNT(*)::int AS set_count
       FROM rounds r
       JOIN session_players sp
         ON sp.user_id = r.bidder_id AND sp.session_id = r.session_id
       WHERE r.session_id = $1 AND r.bid_made = false
       GROUP BY sp.team`,
      [sessionId]
    );
    const setsPerTeam = {};
    for (const row of setRows) setsPerTeam[row.team] = row.set_count;

    const humanWinners = humanSeats.filter((s) => s.team === winningTeam);
    const humanLosers  = humanSeats.filter((s) => s.team !== winningTeam);
    if (!humanWinners.length || !humanLosers.length) return; // edge case: all bots on one side

    // Each loser forfeits: wager_base (already deducted at start) + wager_per_set × set_count
    const loserForfeitures = humanLosers.map((s) => {
      const sets = setsPerTeam[s.team] || 0;
      return wagerBase + wagerPerSet * sets;
    });
    const totalLoserPool = loserForfeitures.reduce((a, b) => a + b, 0);
    const winnerShare = Math.floor(totalLoserPool / humanWinners.length);

    await pool.query("BEGIN");
    // Deduct per-set penalty from losers (base already taken at game start)
    for (const s of humanLosers) {
      const additional = wagerPerSet * (setsPerTeam[s.team] || 0);
      if (additional > 0) {
        await pool.query(
          "UPDATE users SET chip_balance = chip_balance - $1 WHERE id = $2",
          [additional, s.userId]
        );
      }
    }
    // Credit winners: refund base + share of loser pool
    for (const s of humanWinners) {
      const gain = wagerBase + winnerShare;
      await pool.query(
        "UPDATE users SET chip_balance = chip_balance + $1 WHERE id = $2",
        [gain, s.userId]
      );
    }
    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("Chip payout error for session", sessionId, ":", err.message);
  }
}

module.exports = { saveRound, saveRoundPoints, finalizeSession };
