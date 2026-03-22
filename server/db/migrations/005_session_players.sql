CREATE TABLE IF NOT EXISTS session_players (
  session_id   UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat         SMALLINT NOT NULL,
  team         SMALLINT NOT NULL,
  final_score  INTEGER,
  PRIMARY KEY (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_players_user ON session_players (user_id);
