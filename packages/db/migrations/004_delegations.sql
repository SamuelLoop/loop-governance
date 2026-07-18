-- Liquid democracy: standing vote delegations by subject
CREATE TABLE IF NOT EXISTS delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delegate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  subject_tag TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- One active delegation per person per community per subject
CREATE UNIQUE INDEX delegation_unique_idx
  ON delegations (delegator_id, community_id, subject_tag)
  WHERE active = true;

CREATE INDEX delegation_delegate_idx ON delegations (delegate_id, community_id);
CREATE INDEX delegation_community_subject_idx ON delegations (community_id, subject_tag);

-- Prevent self-delegation
ALTER TABLE delegations ADD CONSTRAINT no_self_delegation
  CHECK (delegator_id != delegate_id);

-- Function to compute transitive delegation weight for a voter on a proposal
-- Walks the delegation chain for the proposal's community and matching subject tags
CREATE OR REPLACE FUNCTION compute_vote_weight(
  p_voter_id UUID,
  p_community_id UUID,
  p_subject_tags TEXT[]
) RETURNS INTEGER AS $$
DECLARE
  weight INTEGER := 1;
  delegation_count INTEGER;
BEGIN
  -- Count active delegations pointing to this voter for any matching subject tag
  SELECT COUNT(*)
  INTO delegation_count
  FROM delegations
  WHERE delegate_id = p_voter_id
    AND community_id = p_community_id
    AND subject_tag = ANY(p_subject_tags)
    AND active = true;

  -- Each delegation adds 1 to weight (the delegator's own vote)
  -- For transitive: recursively count delegators-of-delegators
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
      AND c.depth < 10  -- prevent infinite loops, max 10 levels deep
  )
  SELECT COUNT(*) + 1 INTO weight FROM chain;

  RETURN weight;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated vote increment that accepts a weight parameter
CREATE OR REPLACE FUNCTION increment_votes_for(p_id UUID, p_weight INTEGER DEFAULT 1)
RETURNS void AS $$
  UPDATE proposals SET votes_for = votes_for + p_weight WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_votes_against(p_id UUID, p_weight INTEGER DEFAULT 1)
RETURNS void AS $$
  UPDATE proposals SET votes_against = votes_against + p_weight WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS policies for delegations
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY delegations_select ON delegations FOR SELECT USING (true);
CREATE POLICY delegations_insert ON delegations FOR INSERT WITH CHECK (true);
CREATE POLICY delegations_update ON delegations FOR UPDATE USING (true);
