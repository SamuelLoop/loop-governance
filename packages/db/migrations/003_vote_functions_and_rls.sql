-- Atomic vote increment functions
CREATE OR REPLACE FUNCTION increment_votes_for(p_id UUID)
RETURNS void AS $$
  UPDATE proposals SET votes_for = votes_for + 1 WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_votes_against(p_id UUID)
RETURNS void AS $$
  UPDATE proposals SET votes_against = votes_against + 1 WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Unique constraint on votes (one vote per user per proposal)
ALTER TABLE votes ADD CONSTRAINT votes_unique_voter
  UNIQUE (proposal_id, voter_id);
