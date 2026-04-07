const express = require("express");
const pool = require("../db/pool");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.use(authenticate);

// GET /api/users/me — full profile of the current user
router.get("/me", (req, res) => {
  const { id, display_name, email, avatar_url, legacy_name, created_at } = req.user;
  res.json({ id, display_name, email, avatar_url, legacy_name, created_at });
});

// PATCH /api/users/me — update display name
router.patch("/me", async (req, res) => {
  const { display_name } = req.body;
  if (!display_name || !display_name.trim()) {
    return res.status(400).json({ error: "display_name is required" });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE users SET display_name = $1 WHERE id = $2
       RETURNING id, display_name, email, avatar_url, legacy_name`,
      [display_name.trim(), req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/users/claim — link current user to a legacy stub account
// Body: { legacy_name: 'matt', password: 'hmmmmm' }
router.post("/claim", async (req, res) => {
  const { legacy_name, password } = req.body;

  // Guests cannot claim — they have no persistent account to merge from
  if (req.user.is_guest) {
    return res.status(403).json({ error: "Sign in with Google before linking a legacy account." });
  }

  // Password gate
  if (password !== "hmmmmm") {
    return res.status(403).json({ error: "Incorrect password." });
  }

  if (!legacy_name) return res.status(400).json({ error: "legacy_name is required" });

  // Current user must not already have a legacy_name
  if (req.user.legacy_name) {
    return res.status(400).json({ error: "You have already claimed a legacy account" });
  }

  try {
    // Find unclaimed stub with this legacy_name
    const { rows: stubs } = await pool.query(
      "SELECT * FROM users WHERE legacy_name = $1 AND google_id IS NULL",
      [legacy_name]
    );
    if (!stubs.length) {
      return res.status(404).json({ error: "No unclaimed account found for that name" });
    }
    const stub = stubs[0];

    // Merge: update the stub with the current user's Google credentials,
    // then delete the current user (since stub becomes the real account)
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Move group memberships from temp account to stub (before deleting temp user)
      await client.query(
        `INSERT INTO group_members (group_id, user_id, role, joined_at)
         SELECT group_id, $1, role, joined_at FROM group_members WHERE user_id = $2
         ON CONFLICT DO NOTHING`,
        [stub.id, req.user.id]
      );

      // 2. Delete the temporary user account first — this releases the google_id
      //    from the UNIQUE constraint so we can assign it to the stub
      await client.query("DELETE FROM users WHERE id = $1", [req.user.id]);

      // 3. Now update stub with the freed google credentials
      await client.query(
        `UPDATE users
         SET google_id = $1, email = $2, avatar_url = $3, last_seen_at = NOW()
         WHERE id = $4`,
        [req.user.google_id, req.user.email, req.user.avatar_url, stub.id]
      );

      await client.query("COMMIT");

      // Refresh the session to use the stub account
      // Re-fetch stub so the response has the updated email/avatar_url (not the pre-update stale row)
      req.login(stub, async (err) => {
        if (err) return res.status(500).json({ error: "Session refresh failed" });
        const { rows: fresh } = await pool.query(
          "SELECT id, display_name, email, avatar_url, legacy_name FROM users WHERE id = $1",
          [stub.id]
        );
        res.json(fresh[0]);
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /users/claim error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
