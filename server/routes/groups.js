const express = require("express");
const crypto = require("crypto");
const pool = require("../db/pool");
const authenticate = require("../middleware/authenticate");
const requireGroupMember = require("../middleware/requireGroupMember");

const router = express.Router();

// All group routes require auth
router.use(authenticate);

// GET /api/groups — list all groups the current user belongs to
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT fg.id, fg.name, fg.slug, fg.invite_token, fg.created_at,
              gm.role,
              (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = fg.id) AS member_count
       FROM friend_groups fg
       JOIN group_members gm ON gm.group_id = fg.id
       WHERE gm.user_id = $1
       ORDER BY fg.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /groups error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/groups — create a new group
router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Group name is required" });
  }

  // Build a URL-safe slug from the name + random suffix to ensure uniqueness
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const suffix = crypto.randomBytes(3).toString("hex");
  const slug = `${base}-${suffix}`;
  const inviteToken = crypto.randomBytes(32).toString("hex");

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO friend_groups (name, slug, created_by, invite_token)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name.trim(), slug, req.user.id, inviteToken]
      );
      const group = rows[0];
      await client.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [group.id, req.user.id]
      );
      await client.query("COMMIT");
      res.status(201).json(group);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /groups error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/groups/:slug — get group info + members (must be a member)
router.get("/:slug", requireGroupMember, async (req, res) => {
  try {
    const { rows: members } = await pool.query(
      `SELECT u.id, u.display_name, u.avatar_url, u.legacy_name, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [req.group.id]
    );
    res.json({ ...req.group, members });
  } catch (err) {
    console.error("GET /groups/:slug error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/groups/:slug/members/:userId — remove a member (admin only)
router.delete("/:slug/members/:userId", requireGroupMember, async (req, res) => {
  // Check the requester is admin
  const { rows: roleCheck } = await pool.query(
    "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2",
    [req.group.id, req.user.id]
  );
  if (!roleCheck.length || roleCheck[0].role !== "admin") {
    return res.status(403).json({ error: "Only admins can remove members" });
  }
  try {
    await pool.query(
      "DELETE FROM group_members WHERE group_id = $1 AND user_id = $2",
      [req.group.id, req.params.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/groups/:slug/invite/regenerate — regenerate invite token (admin only)
router.post("/:slug/invite/regenerate", requireGroupMember, async (req, res) => {
  const { rows: roleCheck } = await pool.query(
    "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2",
    [req.group.id, req.user.id]
  );
  if (!roleCheck.length || roleCheck[0].role !== "admin") {
    return res.status(403).json({ error: "Only admins can regenerate the invite link" });
  }
  const newToken = crypto.randomBytes(32).toString("hex");
  const { rows } = await pool.query(
    "UPDATE friend_groups SET invite_token = $1 WHERE id = $2 RETURNING invite_token",
    [newToken, req.group.id]
  );
  res.json({ invite_token: rows[0].invite_token });
});

// POST /api/groups/join/:token — join a group via invite link (no slug needed)
router.post("/join/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM friend_groups WHERE invite_token = $1",
      [token]
    );
    if (!rows.length) return res.status(404).json({ error: "Invalid invite link" });
    const group = rows[0];

    // Already a member? Just return success
    const { rows: existing } = await pool.query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [group.id, req.user.id]
    );
    if (existing.length) return res.json({ group });

    await pool.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')",
      [group.id, req.user.id]
    );
    res.json({ group });
  } catch (err) {
    console.error("POST /groups/join/:token error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
