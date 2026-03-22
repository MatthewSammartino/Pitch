CREATE TABLE IF NOT EXISTS auth_sessions (
  sid     VARCHAR(255) PRIMARY KEY,
  sess    JSONB        NOT NULL,
  expire  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_sessions_expire_idx ON auth_sessions (expire);
