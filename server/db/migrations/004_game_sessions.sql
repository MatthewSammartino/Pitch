CREATE TABLE IF NOT EXISTS game_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID REFERENCES friend_groups(id) ON DELETE SET NULL,
  variant         SMALLINT NOT NULL CHECK (variant IN (4, 6)),
  status          VARCHAR(20) NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting','bidding','playing','completed','abandoned')),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  team_a_score    INTEGER,
  team_b_score    INTEGER,
  legacy_game_id  INTEGER REFERENCES games(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_group ON game_sessions (group_id, completed_at DESC);
