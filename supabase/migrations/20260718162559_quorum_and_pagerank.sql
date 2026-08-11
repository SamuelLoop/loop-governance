-- ============================================================
-- QUORUM ENFORCEMENT
-- ============================================================

-- Evaluate a single proposal: close it if quorum met or time expired
CREATE OR REPLACE FUNCTION evaluate_proposal(p_id UUID)
RETURNS TEXT AS $$
DECLARE
  prop RECORD;
  community RECORD;
  total_votes INTEGER;
  member_count INTEGER;
  result TEXT;
BEGIN
  SELECT * INTO prop FROM proposals WHERE id = p_id;
  IF NOT FOUND OR prop.status != 'open' THEN
    RETURN 'not_open';
  END IF;

  SELECT * INTO community FROM communities WHERE id = prop.community_id;

  -- Count unique voters (not vote weight)
  SELECT COUNT(*) INTO total_votes FROM votes WHERE proposal_id = p_id;

  -- Count community members
  SELECT COUNT(*) INTO member_count
  FROM community_memberships
  WHERE community_id = prop.community_id;

  -- Check if voting period has expired
  IF prop.closes_at IS NOT NULL AND prop.closes_at <= now() THEN
    -- Time expired: evaluate with whatever votes exist
    IF total_votes >= community.quorum_size THEN
      IF prop.votes_for > prop.votes_against THEN
        UPDATE proposals SET status = 'approved' WHERE id = p_id;
        result := 'approved';
      ELSE
        UPDATE proposals SET status = 'rejected' WHERE id = p_id;
        result := 'rejected';
      END IF;
    ELSE
      -- Quorum not met, proposal fails
      UPDATE proposals SET status = 'rejected' WHERE id = p_id;
      result := 'rejected_no_quorum';
    END IF;
    RETURN result;
  END IF;

  -- Voting still open: check if quorum already met
  IF total_votes >= community.quorum_size THEN
    -- Quorum met but voting window still open, mark it
    -- Don't auto-close: let the full window play out
    -- but track that quorum was reached
    RETURN 'quorum_met';
  END IF;

  RETURN 'open';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Batch evaluate all open proposals (called by pg_cron or on-demand)
CREATE OR REPLACE FUNCTION evaluate_all_proposals()
RETURNS TABLE(proposal_id UUID, result TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, evaluate_proposal(p.id)
  FROM proposals p
  WHERE p.status = 'open'
    AND p.closes_at IS NOT NULL
    AND p.closes_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PAGERANK ACCREDITATION SCORING
-- ============================================================

-- Compute PageRank-style accreditation scores for a community+subject
-- Uses iterative power method (10 iterations)
CREATE OR REPLACE FUNCTION compute_accreditation_scores(
  p_community_id UUID,
  p_subject_tag TEXT,
  p_damping REAL DEFAULT 0.85,
  p_iterations INTEGER DEFAULT 10
)
RETURNS void AS $$
DECLARE
  iter INTEGER;
  node_count INTEGER;
BEGIN
  -- Count active participants in this community+subject
  SELECT COUNT(DISTINCT receiver_id) INTO node_count
  FROM accreditations
  WHERE community_id = p_community_id
    AND subject_tag = p_subject_tag
    AND active = true;

  IF node_count = 0 THEN RETURN; END IF;

  -- Initialize scores: everyone starts at 1/N
  -- Use a temp table for iterative computation
  CREATE TEMP TABLE IF NOT EXISTS _pr_scores (
    user_id UUID PRIMARY KEY,
    score REAL,
    new_score REAL
  ) ON COMMIT DROP;

  TRUNCATE _pr_scores;

  -- Seed all receivers and givers
  INSERT INTO _pr_scores (user_id, score, new_score)
  SELECT DISTINCT u_id, 1.0 / node_count, 0
  FROM (
    SELECT receiver_id AS u_id FROM accreditations
    WHERE community_id = p_community_id AND subject_tag = p_subject_tag AND active = true
    UNION
    SELECT giver_id AS u_id FROM accreditations
    WHERE community_id = p_community_id AND subject_tag = p_subject_tag AND active = true
  ) all_users;

  -- Update node_count to include all participants
  SELECT COUNT(*) INTO node_count FROM _pr_scores;

  -- Iterative PageRank
  FOR iter IN 1..p_iterations LOOP
    -- Reset new scores to base value
    UPDATE _pr_scores SET new_score = (1.0 - p_damping) / node_count;

    -- Add incoming score contributions
    -- Each giver distributes their score equally among all receivers
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
        WHERE community_id = p_community_id
          AND subject_tag = p_subject_tag
          AND active = true
        GROUP BY giver_id
      ) out_count ON out_count.giver_id = a.giver_id
      WHERE a.community_id = p_community_id
        AND a.subject_tag = p_subject_tag
        AND a.active = true
      GROUP BY a.receiver_id
    ) incoming
    WHERE t.user_id = incoming.receiver_id;

    -- Swap scores
    UPDATE _pr_scores SET score = new_score, new_score = 0;
  END LOOP;

  -- Write results to accreditation_scores (upsert)
  INSERT INTO accreditation_scores (user_id, community_id, subject_tag, score, rank, computed_at)
  SELECT
    user_id,
    p_community_id,
    p_subject_tag,
    score,
    ROW_NUMBER() OVER (ORDER BY score DESC),
    now()
  FROM _pr_scores
  ON CONFLICT (user_id, community_id, subject_tag)
  DO UPDATE SET
    score = EXCLUDED.score,
    rank = EXCLUDED.rank,
    computed_at = EXCLUDED.computed_at;

  -- Update accreditation weights based on giver scores
  UPDATE accreditations a
  SET weight = COALESCE(s.score, 1)
  FROM accreditation_scores s
  WHERE a.giver_id = s.user_id
    AND a.community_id = s.community_id
    AND a.subject_tag = s.subject_tag
    AND a.community_id = p_community_id
    AND a.subject_tag = p_subject_tag
    AND a.active = true;

  DROP TABLE IF EXISTS _pr_scores;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compute scores for ALL community+subject combinations
CREATE OR REPLACE FUNCTION refresh_all_accreditation_scores()
RETURNS void AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT community_id, subject_tag
    FROM accreditations
    WHERE active = true
  LOOP
    PERFORM compute_accreditation_scores(rec.community_id, rec.subject_tag);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
