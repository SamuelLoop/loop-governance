-- PageRank cosmetic wiring (Pass 3).
-- Accreditations became subject-only in migration 023 (community_id
-- nullable on active rows). PageRank still expected a community context,
-- so scores never populated. This migration rewrites the scoring to be
-- purely per-subject and expands accreditation_scores accordingly.
--
-- Effect: nightly cron populates each user's subject-level standing.
-- Weighting delegation votes or election tallies by score is deferred
-- until the user calls for it.

BEGIN;

-- Drop the old (community, subject) unique index and add a new
-- (user, subject) partial unique so scores are subject-scoped.
DROP INDEX IF EXISTS score_user_community_subject_idx;
DROP INDEX IF EXISTS score_community_rank_idx;

ALTER TABLE accreditation_scores ALTER COLUMN community_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS score_user_subject_unique_idx
  ON accreditation_scores (user_id, subject_tag)
  WHERE community_id IS NULL;

CREATE INDEX IF NOT EXISTS score_subject_rank_idx
  ON accreditation_scores (subject_tag, score DESC);

-- Wipe stale community-scoped scores so the new subject-scoped set has
-- clean uniqueness. Historical rows are meaningless now that
-- accreditations dropped community context.
DELETE FROM accreditation_scores WHERE community_id IS NOT NULL;

-- Subject-only PageRank
CREATE OR REPLACE FUNCTION compute_accreditation_scores_by_subject(
  p_subject_tag TEXT,
  p_damping REAL DEFAULT 0.85,
  p_iterations INTEGER DEFAULT 10
) RETURNS void AS $$
DECLARE
  iter INTEGER;
  node_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT u_id) INTO node_count FROM (
    SELECT receiver_id AS u_id FROM accreditations
    WHERE subject_tag = p_subject_tag AND active = true
    UNION
    SELECT giver_id AS u_id FROM accreditations
    WHERE subject_tag = p_subject_tag AND active = true
  ) all_users;

  IF node_count = 0 THEN RETURN; END IF;

  CREATE TEMP TABLE IF NOT EXISTS _pr_scores (
    user_id UUID PRIMARY KEY,
    score REAL,
    new_score REAL
  ) ON COMMIT DROP;

  TRUNCATE _pr_scores;

  INSERT INTO _pr_scores (user_id, score, new_score)
  SELECT DISTINCT u_id, 1.0 / node_count, 0
  FROM (
    SELECT receiver_id AS u_id FROM accreditations
    WHERE subject_tag = p_subject_tag AND active = true
    UNION
    SELECT giver_id AS u_id FROM accreditations
    WHERE subject_tag = p_subject_tag AND active = true
  ) u;

  SELECT COUNT(*) INTO node_count FROM _pr_scores;

  FOR iter IN 1..p_iterations LOOP
    UPDATE _pr_scores SET new_score = (1.0 - p_damping) / node_count;

    UPDATE _pr_scores t
    SET new_score = t.new_score + p_damping * COALESCE(incoming.total, 0)
    FROM (
      SELECT
        a.receiver_id,
        SUM(s.score / GREATEST(out_count.cnt, 1)) AS total
      FROM accreditations a
      JOIN _pr_scores s ON s.user_id = a.giver_id
      JOIN (
        SELECT giver_id, COUNT(*) AS cnt
        FROM accreditations
        WHERE subject_tag = p_subject_tag AND active = true
        GROUP BY giver_id
      ) out_count ON out_count.giver_id = a.giver_id
      WHERE a.subject_tag = p_subject_tag AND a.active = true
      GROUP BY a.receiver_id
    ) incoming
    WHERE t.user_id = incoming.receiver_id;

    UPDATE _pr_scores SET score = new_score, new_score = 0;
  END LOOP;

  -- Upsert per-subject scores. community_id stays NULL for the
  -- subject-scoped rows and the partial unique above enforces one
  -- score row per (user, subject).
  INSERT INTO accreditation_scores (user_id, community_id, subject_tag, score, rank, computed_at)
  SELECT
    user_id,
    NULL,
    p_subject_tag,
    score,
    ROW_NUMBER() OVER (ORDER BY score DESC),
    now()
  FROM _pr_scores
  ON CONFLICT (user_id, subject_tag) WHERE community_id IS NULL
  DO UPDATE SET
    score = EXCLUDED.score,
    rank = EXCLUDED.rank,
    computed_at = EXCLUDED.computed_at;

  -- Reflect scoring on individual accreditation weights so a
  -- highly-accredited giver's endorsements count more.
  UPDATE accreditations a
  SET weight = COALESCE(s.score * 100.0, 1)
  FROM accreditation_scores s
  WHERE a.giver_id = s.user_id
    AND a.subject_tag = s.subject_tag
    AND s.community_id IS NULL
    AND a.subject_tag = p_subject_tag
    AND a.active = true;

  DROP TABLE IF EXISTS _pr_scores;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the cron entrypoint to loop per-subject only.
CREATE OR REPLACE FUNCTION refresh_all_accreditation_scores()
RETURNS void AS $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN
    SELECT DISTINCT subject_tag FROM accreditations WHERE active = true
  LOOP
    PERFORM compute_accreditation_scores_by_subject(s.subject_tag);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prime the scores now so the /badge page has something to show
-- before the next nightly cron run.
SELECT refresh_all_accreditation_scores();

COMMIT;
