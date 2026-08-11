-- Materialise vote and proposal counts for O(1) reads.
-- Replaces live COUNT(*) queries on votes and proposals tables.

CREATE TABLE proposal_vote_counts (
  proposal_id   UUID PRIMARY KEY REFERENCES proposals(id) ON DELETE CASCADE,
  for_count     BIGINT NOT NULL DEFAULT 0,
  against_count BIGINT NOT NULL DEFAULT 0,
  abstain_count BIGINT NOT NULL DEFAULT 0,
  total_count   BIGINT GENERATED ALWAYS AS (for_count + against_count + abstain_count) STORED,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_vote_proposal_counts (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  votes_cast         BIGINT NOT NULL DEFAULT 0,
  proposals_authored BIGINT NOT NULL DEFAULT 0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep proposal_vote_counts in sync with the votes table.
-- Votes use choice enum: 'for' | 'against' | 'abstain'.
CREATE OR REPLACE FUNCTION trg_update_proposal_vote_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO proposal_vote_counts (proposal_id, for_count, against_count, abstain_count)
    VALUES (
      NEW.proposal_id,
      CASE WHEN NEW.choice = 'for'     THEN 1 ELSE 0 END,
      CASE WHEN NEW.choice = 'against' THEN 1 ELSE 0 END,
      CASE WHEN NEW.choice = 'abstain' THEN 1 ELSE 0 END
    )
    ON CONFLICT (proposal_id) DO UPDATE SET
      for_count     = proposal_vote_counts.for_count     + EXCLUDED.for_count,
      against_count = proposal_vote_counts.against_count + EXCLUDED.against_count,
      abstain_count = proposal_vote_counts.abstain_count + EXCLUDED.abstain_count,
      updated_at    = now();
  ELSIF TG_OP = 'DELETE' THEN
    -- GREATEST(0, ...) guards against negative counts from out-of-order events.
    UPDATE proposal_vote_counts SET
      for_count     = GREATEST(0, for_count     - CASE WHEN OLD.choice = 'for'     THEN 1 ELSE 0 END),
      against_count = GREATEST(0, against_count - CASE WHEN OLD.choice = 'against' THEN 1 ELSE 0 END),
      abstain_count = GREATEST(0, abstain_count - CASE WHEN OLD.choice = 'abstain' THEN 1 ELSE 0 END),
      updated_at    = now()
    WHERE proposal_id = OLD.proposal_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_votes_update_proposal_counts
AFTER INSERT OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION trg_update_proposal_vote_counts();

-- Keep user_vote_proposal_counts in sync with votes and proposals tables.
-- Uses voter_id (votes) and author_id (proposals) per the schema.
CREATE OR REPLACE FUNCTION trg_update_user_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'votes' THEN
    INSERT INTO user_vote_proposal_counts (user_id, votes_cast)
    VALUES (NEW.voter_id, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      votes_cast = user_vote_proposal_counts.votes_cast + 1,
      updated_at = now();
  ELSIF TG_TABLE_NAME = 'proposals' THEN
    INSERT INTO user_vote_proposal_counts (user_id, proposals_authored)
    VALUES (NEW.author_id, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      proposals_authored = user_vote_proposal_counts.proposals_authored + 1,
      updated_at = now();
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_votes_user_counts
AFTER INSERT ON votes
FOR EACH ROW EXECUTE FUNCTION trg_update_user_counts();

CREATE TRIGGER trg_proposals_user_counts
AFTER INSERT ON proposals
FOR EACH ROW EXECUTE FUNCTION trg_update_user_counts();

-- Backfill: proposal_vote_counts from existing votes.
INSERT INTO proposal_vote_counts (proposal_id, for_count, against_count, abstain_count)
SELECT
  proposal_id,
  COUNT(*) FILTER (WHERE choice = 'for'),
  COUNT(*) FILTER (WHERE choice = 'against'),
  COUNT(*) FILTER (WHERE choice = 'abstain')
FROM votes
GROUP BY proposal_id
ON CONFLICT (proposal_id) DO NOTHING;

-- Backfill: user_vote_proposal_counts from existing votes and proposals.
-- Only inserts rows for users with at least one vote or proposal.
INSERT INTO user_vote_proposal_counts (user_id, votes_cast, proposals_authored)
SELECT
  u.id,
  COALESCE(v.cnt, 0),
  COALESCE(p.cnt, 0)
FROM users u
LEFT JOIN (SELECT voter_id, COUNT(*) AS cnt FROM votes GROUP BY voter_id) v ON v.voter_id = u.id
LEFT JOIN (SELECT author_id, COUNT(*) AS cnt FROM proposals GROUP BY author_id) p ON p.author_id = u.id
WHERE v.voter_id IS NOT NULL OR p.author_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
