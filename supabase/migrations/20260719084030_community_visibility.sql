-- Community visibility: public (open, listed on portal) or private (invite-only)
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'private'));

CREATE INDEX IF NOT EXISTS communities_visibility_idx ON communities(visibility);
