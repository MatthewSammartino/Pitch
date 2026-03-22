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
 */
async function finalizeSession(sessionId, teamScores) {
  await pool.query(
    `UPDATE game_sessions
     SET status = 'completed', completed_at = NOW(),
         team_a_score = $1, team_b_score = $2
     WHERE id = $3`,
    [teamScores[0], teamScores[1], sessionId]
  );
}

module.exports = { saveRound, saveRoundPoints, finalizeSession };
