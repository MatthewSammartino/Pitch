-- The legacy `games` table holds nightly per-player dollar results that
-- predate the migration system. Production already has this table (created
-- manually before migrations existed); fresh environments (staging, local)
-- need it to satisfy the foreign key in 004_game_sessions.sql:
--   legacy_game_id INTEGER REFERENCES games(id)
--
-- Using IF NOT EXISTS so this is a no-op on prod.
CREATE TABLE IF NOT EXISTS games (
  id    SERIAL PRIMARY KEY,
  date  DATE,
  time  TIME,
  matt  INTEGER,
  seth  INTEGER,
  mack  INTEGER,
  arnav INTEGER,
  henry INTEGER
);
