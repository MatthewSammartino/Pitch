-- Add chip balance + daily claim tracking to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS chip_balance       INTEGER     NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS last_chip_claim_at TIMESTAMPTZ;

-- Add wager fields to game sessions
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS wager_base    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wager_per_set INTEGER NOT NULL DEFAULT 0;
