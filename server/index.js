const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3001;

// PostgreSQL connection - Railway provides DATABASE_URL automatically
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

app.use(cors());
app.use(express.json());

// Serve static React build files in production
app.use(express.static(path.join(__dirname, "dist")));

// Initialize database table
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        time TIME NOT NULL DEFAULT CURRENT_TIME,
        matt INTEGER,
        seth INTEGER,
        mack INTEGER,
        arnav INTEGER,
        henry INTEGER
      )
    `);
    console.log("✓ Database initialized");
  } catch (err) {
    console.error("Database init error:", err.message);
  }
}

// Password check middleware
const checkPassword = (req, res, next) => {
  const password = req.headers["x-admin-password"];
  const correctPassword = process.env.ADMIN_PASSWORD || "pitch123"; // Set ADMIN_PASSWORD in Railway!
  
  if (password !== correctPassword) {
    return res.status(401).json({ error: "Invalid password" });
  }
  next();
};

// GET all games (no password needed - anyone can view)
app.get("/api/games", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, date, TO_CHAR(time, 'HH24:MI') as time, matt AS \"Matt\", seth AS \"Seth\", mack AS \"Mack\", arnav AS \"Arnav\", henry AS \"Henry\" FROM games ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// POST new game (password required)
app.post("/api/games", checkPassword, async (req, res) => {
  const { Matt, Seth, Mack, Arnav, Henry, date, time } = req.body;
  
  const gameDate = date || new Date().toISOString().slice(0, 10);
  const gameTime = time || new Date().toTimeString().slice(0, 5);
  
  // Convert empty strings to null
  const matt = Matt !== "" && Matt !== undefined ? Number(Matt) : null;
  const seth = Seth !== "" && Seth !== undefined ? Number(Seth) : null;
  const mack = Mack !== "" && Mack !== undefined ? Number(Mack) : null;
  const arnav = Arnav !== "" && Arnav !== undefined ? Number(Arnav) : null;
  const henry = Henry !== "" && Henry !== undefined ? Number(Henry) : null;

  try {
    const result = await pool.query(
      `INSERT INTO games (date, time, matt, seth, mack, arnav, henry) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, date, TO_CHAR(time, 'HH24:MI') as time, matt AS "Matt", seth AS "Seth", mack AS "Mack", arnav AS "Arnav", henry AS "Henry"`,
      [gameDate, gameTime, matt, seth, mack, arnav, henry]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE a game by id (password required)
app.delete("/api/games/:id", checkPassword, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await pool.query(
      "DELETE FROM games WHERE id = $1 RETURNING id, date, TO_CHAR(time, 'HH24:MI') as time, matt AS \"Matt\", seth AS \"Seth\", mack AS \"Mack\", arnav AS \"Arnav\", henry AS \"Henry\"",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("DELETE error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Serve React app for all other routes (must be after API routes)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start server
initDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🃏 Pitch Tracker API running on port ${PORT}`);
  });
});
