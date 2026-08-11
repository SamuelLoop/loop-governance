-- Make accreditations subject-scoped only.
-- Accreditation is a declaration that a person knows a subject, independent
-- of any specific community. Community-scoped delegations still exist and
-- remain unchanged.

BEGIN;

-- 1. Dedupe: keep newest active row per (giver, receiver, subject_tag);
--    revoke the rest so the new unique index below can be created.
UPDATE accreditations
SET active = false, revoked_at = now()
WHERE active = true
  AND id NOT IN (
    SELECT DISTINCT ON (giver_id, receiver_id, subject_tag) id
    FROM accreditations
    WHERE active = true
    ORDER BY giver_id, receiver_id, subject_tag, created_at DESC
  );

-- 2. Community reference is no longer required; null it out so callers
--    can't rely on it. Historical revoked rows keep their community_id.
ALTER TABLE accreditations ALTER COLUMN community_id DROP NOT NULL;
UPDATE accreditations SET community_id = NULL WHERE active = true;

-- 3. Replace the old (giver, receiver, community, subject) unique index
--    with a subject-only partial index over active rows.
DROP INDEX IF EXISTS accreditation_pair_subject_idx;
DROP INDEX IF EXISTS accreditation_community_subject_idx;
DROP INDEX IF EXISTS accreditation_receiver_idx;

CREATE UNIQUE INDEX accreditation_active_pair_subject_idx
  ON accreditations (giver_id, receiver_id, subject_tag)
  WHERE active = true;

CREATE INDEX accreditation_receiver_subject_idx
  ON accreditations (receiver_id, subject_tag)
  WHERE active = true;

CREATE INDEX accreditation_giver_subject_idx
  ON accreditations (giver_id, subject_tag)
  WHERE active = true;

COMMIT;
