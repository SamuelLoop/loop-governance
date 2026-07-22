-- AI expert account support
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_ai BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_expertise TEXT[];

CREATE INDEX IF NOT EXISTS users_is_ai_idx ON users(is_ai) WHERE is_ai = true;
