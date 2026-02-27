const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, "games.json");

app.use(cors());
app.use(express.json());

// Seed file if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  const seed = {
    games: [
      { id: 1, Matt: null, Seth: 2, Mack: -2, Arnav: -2, Henry: 2 },
      { id: 2, Matt: 5, Seth: -5, Mack: null, Arnav: 5, Henry: -5 },
      { id: 3, Matt: 2, Seth: -2, Mack: -2, Arnav: 2, Henry: null },
      { id: 4, Matt: 4, Seth: null, Mack: -4, Arnav: 4, Henry: -4 },
      { id: 5, Matt: -2, Seth: 2, Mack: 2, Arnav: -2, Henry: null },
      { id: 6, Matt: null, Seth: 3, Mack: 3, Arnav: -3, Henry: -3 },
      { id: 7, Matt: 3, Seth: -3, Mack: -3, Arnav: null, Henry: 3 },
      { id: 8, Matt: 2, Seth: -2, Mack: null, Arnav: -2, Henry: 2 },
      { id: 9, Matt: -3, Seth: null, Mack: 3, Arnav: 3, Henry: -3 },
      { id: 10, Matt: 4, Seth: 4, Mack: -4, Arnav: -4, Henry: null },
      { id: 11, Matt: 4, Seth: 4, Mack: -4, Arnav: null, Henry: -4 },
      { id: 12, Matt: 4, Seth: 4, Mack: null, Arnav: -4, Henry: -4 },
      { id: 13, Matt: 3, Seth: 3, Mack: null, Arnav: -3, Henry: -3 },
      { id: 14, Matt: -2, Seth: 2, Mack: 2, Arnav: null, Henry: -2 },
      { id: 15, Matt: 4, Seth: -4, Mack: -4, Arnav: 4, Henry: null },
      { id: 16, Matt: -3, Seth: null, Mack: 3, Arnav: -3, Henry: 3 },
      { id: 17, Matt: null, Seth: 5, Mack: -5, Arnav: 5, Henry: -5 },
      { id: 18, Matt: 3, Seth: -3, Mack: null, Arnav: -3, Henry: 3 },
      { id: 19, Matt: -3, Seth: 3, Mack: 3, Arnav: null, Henry: -3 },
      { id: 20, Matt: 6, Seth: -6, Mack: -6, Arnav: 6, Henry: null },
      { id: 21, Matt: 4, Seth: null, Mack: -4, Arnav: 4, Henry: -4 },
      { id: 22, Matt: 3, Seth: null, Mack: -3, Arnav: 3, Henry: -3 },
      { id: 23, Matt: 2, Seth: null, Mack: -2, Arnav: 2, Henry: -2 },
      { id: 24, Matt: 4, Seth: null, Mack: -4, Arnav: 4, Henry: -4 },
      { id: 25, Matt: -5, Seth: null, Mack: 5, Arnav: -5, Henry: 5 },
      { id: 26, Matt: -3, Seth: null, Mack: 3, Arnav: -3, Henry: 3 },
      { id: 27, Matt: 2, Seth: null, Mack: -2, Arnav: 2, Henry: -2 },
      { id: 28, Matt: 2, Seth: 2, Mack: null, Arnav: -2, Henry: -2 },
      { id: 29, Matt: -4, Seth: -4, Mack: null, Arnav: 4, Henry: 4 },
      { id: 30, Matt: -3, Seth: -3, Mack: null, Arnav: 3, Henry: 3 },
      { id: 31, Matt: 2, Seth: 2, Mack: null, Arnav: -2, Henry: -2 },
      { id: 32, Matt: -2, Seth: 2, Mack: null, Arnav: -2, Henry: 2 },
      { id: 33, Matt: null, Seth: 2, Mack: -2, Arnav: -2, Henry: 2 },
      { id: 34, Matt: 2, Seth: -2, Mack: 2, Arnav: null, Henry: -2 },
      { id: 35, Matt: 3, Seth: -3, Mack: 3, Arnav: -3, Henry: null },
      { id: 36, Matt: 3, Seth: null, Mack: 3, Arnav: -3, Henry: -3 },
      { id: 37, Matt: -2, Seth: 2, Mack: null, Arnav: -2, Henry: 2 },
      { id: 38, Matt: -3, Seth: 3, Mack: -3, Arnav: null, Henry: 3 },
      { id: 39, Matt: null, Seth: 2, Mack: -2, Arnav: -2, Henry: 2 },
      { id: 40, Matt: -4, Seth: 4, Mack: null, Arnav: -4, Henry: 4 },
      { id: 41, Matt: -2, Seth: null, Mack: 2, Arnav: -2, Henry: 2 },
      { id: 42, Matt: null, Seth: 2, Mack: -2, Arnav: 2, Henry: -2 },
      { id: 43, Matt: -3, Seth: 3, Mack: -3, Arnav: 3, Henry: null },
      { id: 44, Matt: -2, Seth: 2, Mack: null, Arnav: 2, Henry: -2 },
      { id: 45, Matt: -5, Seth: 5, Mack: null, Arnav: 5, Henry: -5 },
      { id: 46, Matt: 5, Seth: -5, Mack: null, Arnav: -5, Henry: 5 },
      { id: 47, Matt: -2, Seth: 2, Mack: null, Arnav: 2, Henry: -2 },
      { id: 48, Matt: 4, Seth: -4, Mack: null, Arnav: -4, Henry: 4 },
      { id: 49, Matt: -4, Seth: 4, Mack: null, Arnav: 4, Henry: -4 },
      { id: 50, Matt: 3, Seth: -3, Mack: null, Arnav: -3, Henry: 3 },
      { id: 51, Matt: 3, Seth: -3, Mack: null, Arnav: 3, Henry: -3 },
      { id: 52, Matt: 3, Seth: -3, Mack: null, Arnav: 3, Henry: -3 },
      { id: 53, Matt: -2, Seth: 2, Mack: null, Arnav: -2, Henry: 2 },
      { id: 54, Matt: 4, Seth: -4, Mack: null, Arnav: 4, Henry: -4 },
      { id: 55, Matt: 3, Seth: -3, Mack: null, Arnav: 3, Henry: -3 },
      { id: 56, Matt: -3, Seth: 3, Mack: null, Arnav: -3, Henry: 3 },
      { id: 57, Matt: 4, Seth: -4, Mack: null, Arnav: 4, Henry: -4 },
      { id: 58, Matt: -3, Seth: 3, Mack: null, Arnav: -3, Henry: 3 },
    ],
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
  console.log("📁 Created games.json with seed data");
}

const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// GET all games
app.get("/api/games", (req, res) => {
  const db = readDB();
  res.json(db.games);
});

// POST new game
app.post("/api/games", (req, res) => {
  const { Matt, Seth, Mack, Arnav, Henry } = req.body;
  const db = readDB();
  const newGame = {
    id: db.games.length > 0 ? Math.max(...db.games.map((g) => g.id)) + 1 : 1,
    Matt: Matt !== "" ? Number(Matt) : null,
    Seth: Seth !== "" ? Number(Seth) : null,
    Mack: Mack !== "" ? Number(Mack) : null,
    Arnav: Arnav !== "" ? Number(Arnav) : null,
    Henry: Henry !== "" ? Number(Henry) : null,
  };
  db.games.push(newGame);
  writeDB(db);
  res.status(201).json(newGame);
});

// DELETE a game by id
app.delete("/api/games/:id", (req, res) => {
  const id = Number(req.params.id);
  const db = readDB();
  const idx = db.games.findIndex((g) => g.id === id);
  if (idx === -1) return res.status(404).json({ error: "Game not found" });
  const [deleted] = db.games.splice(idx, 1);
  writeDB(db);
  res.json(deleted);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🃏 Pitch Tracker API running at http://localhost:${PORT}`);
  console.log(`   Accessible on your network at http://<your-ip>:${PORT}\n`);
});
