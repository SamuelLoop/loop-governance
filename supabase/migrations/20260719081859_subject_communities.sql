-- Each community tree belongs to one subject.
-- The root of each tree is a "global" level community for that subject.
-- Geographic children inherit the subject.

ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS subject TEXT;

-- Populate from first subject_tag for existing communities
UPDATE communities
SET subject = (subject_tags->>0)
WHERE subject_tags IS NOT NULL
  AND jsonb_array_length(subject_tags) > 0
  AND subject IS NULL;

-- Default any remaining to 'governance'
UPDATE communities
SET subject = 'governance'
WHERE subject IS NULL;

ALTER TABLE communities
  ALTER COLUMN subject SET NOT NULL;

CREATE INDEX IF NOT EXISTS communities_subject_idx ON communities(subject);

-- Unique constraint: one root (global, no parent) per subject
CREATE UNIQUE INDEX IF NOT EXISTS communities_subject_root_idx
  ON communities(subject)
  WHERE level = 'global' AND parent_id IS NULL;
