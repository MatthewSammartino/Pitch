const express = require("express");
const pool = require("../db/pool");
const authenticate = require("../middleware/authenticate");

const router = express.Router();
router.use(authenticate);

const CLAIM_AMOUNT   = 10;
const CLAIM_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in ms

// Guests have no persistent account — block them from both endpoints
function requirePersistentUser(req, res, next) {
  if (req.user.is_guest) return res.status(403).json({ error: "Guests cannot hold chips. Sign in with Google." });
  next();
}

// GET /api/chips/balance
router.get("/balance", requirePersistentUser, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT chip_balance, last_chip_claim_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const { chip_balance, last_chip_claim_at } = rows[0];
    let next_claim_at = null;
    if (last_chip_claim_at) {
      const nextTs = new Date(last_chip_claim_at).getTime() + CLAIM_INTERVAL;
      if (nextTs > Date.now()) next_claim_at = new Date(nextTs).toISOString();
    }

    res.json({ balance: chip_balance, next_claim_at });
  } catch (err) {
    console.error("GET /chips/balance error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/chips/claim — grant daily chips if 24h has elapsed
router.post("/claim", requirePersistentUser, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT chip_balance, last_chip_claim_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const { last_chip_claim_at } = rows[0];
    if (last_chip_claim_at) {
      const nextTs = new Date(last_chip_claim_at).getTime() + CLAIM_INTERVAL;
      if (nextTs > Date.now()) {
        return res.status(429).json({
          error: "Already claimed today.",
          next_claim_at: new Date(nextTs).toISOString(),
        });
      }
    }

    const { rows: updated } = await pool.query(
      `UPDATE users
       SET chip_balance = chip_balance + $1, last_chip_claim_at = NOW()
       WHERE id = $2
       RETURNING chip_balance`,
      [CLAIM_AMOUNT, req.user.id]
    );

    res.json({ balance: updated[0].chip_balance, claimed: CLAIM_AMOUNT });
  } catch (err) {
    console.error("POST /chips/claim error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
