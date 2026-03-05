// Run this script once after deploying to import your existing games
// Usage: DATABASE_URL=your_railway_url node import-games.js

const { Pool } = require("pg");
const games = require("./games-backup.json").games;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function importGames() {
  console.log(`Importing ${games.length} games...`);
  
  for (const game of games) {
    await pool.query(
      `INSERT INTO games (date, time, matt, seth, mack, arnav, henry) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [game.date, game.time, game.Matt, game.Seth, game.Mack, game.Arnav, game.Henry]
    );
    process.stdout.write(".");
  }
  
  console.log(`\n✓ Imported ${games.length} games successfully!`);
  await pool.end();
}

importGames().catch(console.error);
