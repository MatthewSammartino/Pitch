CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id     VARCHAR(128) UNIQUE,
  display_name  VARCHAR(80)  NOT NULL,
  email         VARCHAR(255) UNIQUE,
  avatar_url    TEXT,
  legacy_name   VARCHAR(20),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ
);
