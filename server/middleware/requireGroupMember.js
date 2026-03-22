const pool = require("../db/pool");

// Requires authenticate middleware to run first (req.user must be set).
// Looks up group by :slug param and checks membership.
// Attaches req.group to the request for downstream use.
async function requireGroupMember(req, res, next) {
  const { slug } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT fg.id, fg.name, fg.slug, fg.invite_token
       FROM friend_groups fg
       JOIN group_members gm ON gm.group_id = fg.id
       WHERE fg.slug = $1 AND gm.user_id = $2`,
      [slug, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.group = rows[0];
    next();
  } catch (err) {
    console.error("requireGroupMember error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = requireGroupMember;
