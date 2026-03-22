CREATE TABLE IF NOT EXISTS rounds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  round_number  SMALLINT NOT NULL,
  trump_suit    VARCHAR(8) NOT NULL,
  bid_amount    SMALLINT NOT NULL CHECK (bid_amount BETWEEN 2 AND 5),
  bidder_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  bid_made      BOOLEAN,
  team_a_points SMALLINT,
  team_b_points SMALLINT,
  completed_at  TIMESTAMPTZ,
  UNIQUE (session_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_rounds_session ON rounds (session_id, round_number);

CREATE TABLE IF NOT EXISTS round_points (
  round_id     UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  point_type   VARCHAR(10) NOT NULL
                 CHECK (point_type IN ('high','low','jack','off_jack','game')),
  captured_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  team         SMALLINT,
  PRIMARY KEY (round_id, point_type)
);

CREATE INDEX IF NOT EXISTS idx_round_points_user ON round_points (captured_by);
