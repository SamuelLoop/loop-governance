-- Configurable delegation chain settings per community
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS max_delegation_depth INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS delegation_decay NUMERIC(4,3) NOT NULL DEFAULT 1.000;

-- Rebuild compute_vote_weight to use per-community settings
-- decay = 1.0 means full transitive (no loss per hop)
-- decay = 0.9 means 10% loss per hop (depth 1 = 0.9, depth 2 = 0.81, etc.)
-- Final weight is FLOOR of the sum, minimum 1 (the voter's own vote)
CREATE OR REPLACE FUNCTION compute_vote_weight(
  p_voter_id UUID,
  p_community_id UUID,
  p_subject_tags TEXT[]
) RETURNS INTEGER AS $$
DECLARE
  v_max_depth INTEGER;
  v_decay NUMERIC;
  v_weight NUMERIC := 1;
BEGIN
  SELECT max_delegation_depth, delegation_decay
  INTO v_max_depth, v_decay
  FROM communities
  WHERE id = p_community_id;

  IF v_max_depth IS NULL THEN
    v_max_depth := 10;
    v_decay := 1.0;
  END IF;

  WITH RECURSIVE chain AS (
    SELECT delegator_id, 1 AS depth
    FROM delegations
    WHERE delegate_id = p_voter_id
      AND community_id = p_community_id
      AND subject_tag = ANY(p_subject_tags)
      AND active = true
    UNION ALL
    SELECT d.delegator_id, c.depth + 1
    FROM delegations d
    JOIN chain c ON d.delegate_id = c.delegator_id
    WHERE d.community_id = p_community_id
      AND d.subject_tag = ANY(p_subject_tags)
      AND d.active = true
      AND c.depth < v_max_depth
  )
  SELECT 1 + COALESCE(SUM(POWER(v_decay, depth)), 0)
  INTO v_weight
  FROM chain;

  RETURN GREATEST(1, FLOOR(v_weight));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
