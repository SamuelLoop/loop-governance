-- Elections / Power Shifts
-- Timed leadership rotation: nominations -> voting -> quorum term

CREATE TABLE IF NOT EXISTS elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'nominations'
    CHECK (status IN ('nominations', 'voting', 'completed', 'cancelled')),
  seats INTEGER NOT NULL DEFAULT 5,
  term_days INTEGER NOT NULL DEFAULT 90,
  nominations_open TIMESTAMPTZ NOT NULL DEFAULT now(),
  nominations_close TIMESTAMPTZ NOT NULL,
  voting_open TIMESTAMPTZ NOT NULL,
  voting_close TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS elections_community_idx ON elections(community_id, status);
CREATE INDEX IF NOT EXISTS elections_status_idx ON elections(status);

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  statement TEXT,
  subject_expertise TEXT,
  votes_received INTEGER NOT NULL DEFAULT 0,
  elected BOOLEAN NOT NULL DEFAULT false,
  nominated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(election_id, user_id)
);

CREATE INDEX IF NOT EXISTS candidate_election_idx ON candidates(election_id);

CREATE TABLE IF NOT EXISTS election_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  weight INTEGER NOT NULL DEFAULT 1,
  cast_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(election_id, voter_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS election_vote_election_idx ON election_votes(election_id);
CREATE INDEX IF NOT EXISTS election_vote_candidate_idx ON election_votes(candidate_id);

CREATE TABLE IF NOT EXISTS quorum_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  election_id UUID REFERENCES elections(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quorum_term_community_idx ON quorum_terms(community_id, active);
CREATE INDEX IF NOT EXISTS quorum_term_user_idx ON quorum_terms(user_id);
CREATE INDEX IF NOT EXISTS quorum_term_expires_idx ON quorum_terms(expires_at);

-- Advance election phases based on timestamps
CREATE OR REPLACE FUNCTION advance_election_phases()
RETURNS INTEGER AS $$
DECLARE
  advanced INTEGER := 0;
BEGIN
  -- Move nominations -> voting when nominations_close has passed
  UPDATE elections
  SET status = 'voting'
  WHERE status = 'nominations'
    AND nominations_close <= now();
  GET DIAGNOSTICS advanced = ROW_COUNT;

  -- Move voting -> completed when voting_close has passed
  -- and tally results
  PERFORM tally_election(id)
  FROM elections
  WHERE status = 'voting'
    AND voting_close <= now();

  RETURN advanced;
END;
$$ LANGUAGE plpgsql;

-- Tally an election: count votes, mark winners, create quorum terms
CREATE OR REPLACE FUNCTION tally_election(p_election_id UUID)
RETURNS VOID AS $$
DECLARE
  r_election RECORD;
  r_candidate RECORD;
  seat_count INTEGER := 0;
BEGIN
  SELECT * INTO r_election FROM elections WHERE id = p_election_id;
  IF r_election IS NULL OR r_election.status != 'voting' THEN
    RETURN;
  END IF;

  -- Tally votes for each candidate
  UPDATE candidates c
  SET votes_received = COALESCE(sub.total, 0)
  FROM (
    SELECT candidate_id, SUM(weight) AS total
    FROM election_votes
    WHERE election_id = p_election_id
    GROUP BY candidate_id
  ) sub
  WHERE c.id = sub.candidate_id
    AND c.election_id = p_election_id;

  -- Mark top N candidates as elected
  FOR r_candidate IN
    SELECT id, user_id, votes_received
    FROM candidates
    WHERE election_id = p_election_id
    ORDER BY votes_received DESC
    LIMIT r_election.seats
  LOOP
    IF r_candidate.votes_received > 0 THEN
      UPDATE candidates SET elected = true WHERE id = r_candidate.id;
      seat_count := seat_count + 1;

      -- Expire any active quorum terms for this community
      UPDATE quorum_terms
      SET active = false
      WHERE community_id = r_election.community_id
        AND user_id = r_candidate.user_id
        AND active = true;

      -- Create new quorum term
      INSERT INTO quorum_terms (community_id, user_id, election_id, starts_at, expires_at)
      VALUES (
        r_election.community_id,
        r_candidate.user_id,
        p_election_id,
        now(),
        now() + (r_election.term_days || ' days')::INTERVAL
      );

      -- Promote membership role to quorum
      UPDATE community_memberships
      SET role = 'quorum'
      WHERE community_id = r_election.community_id
        AND user_id = r_candidate.user_id
        AND role = 'member';
    END IF;
  END LOOP;

  -- Mark election as completed
  UPDATE elections SET status = 'completed' WHERE id = p_election_id;
END;
$$ LANGUAGE plpgsql;

-- Expire quorum terms that have passed and demote members back to regular
CREATE OR REPLACE FUNCTION expire_quorum_terms()
RETURNS INTEGER AS $$
DECLARE
  expired INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, community_id, user_id
    FROM quorum_terms
    WHERE active = true AND expires_at <= now()
  LOOP
    UPDATE quorum_terms SET active = false WHERE id = r.id;

    -- Only demote if no other active term exists for this user+community
    IF NOT EXISTS (
      SELECT 1 FROM quorum_terms
      WHERE community_id = r.community_id
        AND user_id = r.user_id
        AND active = true
        AND id != r.id
    ) THEN
      UPDATE community_memberships
      SET role = 'member'
      WHERE community_id = r.community_id
        AND user_id = r.user_id
        AND role = 'quorum';
    END IF;

    expired := expired + 1;
  END LOOP;

  RETURN expired;
END;
$$ LANGUAGE plpgsql;

-- Auto-trigger an election when quorum terms are about to expire
-- and no active election exists for that community
CREATE OR REPLACE FUNCTION check_and_trigger_elections()
RETURNS INTEGER AS $$
DECLARE
  triggered INTEGER := 0;
  r RECORD;
  nom_close TIMESTAMPTZ;
  vote_open TIMESTAMPTZ;
  vote_close TIMESTAMPTZ;
BEGIN
  -- Find communities with expiring terms (within 14 days)
  -- that don't have an active election
  FOR r IN
    SELECT DISTINCT qt.community_id, c.name, c.quorum_size,
           MIN(qt.expires_at) AS earliest_expiry
    FROM quorum_terms qt
    JOIN communities c ON c.id = qt.community_id
    WHERE qt.active = true
      AND qt.expires_at <= now() + INTERVAL '14 days'
      AND NOT EXISTS (
        SELECT 1 FROM elections e
        WHERE e.community_id = qt.community_id
          AND e.status IN ('nominations', 'voting')
      )
    GROUP BY qt.community_id, c.name, c.quorum_size
  LOOP
    nom_close := now() + INTERVAL '7 days';
    vote_open := nom_close;
    vote_close := vote_open + INTERVAL '7 days';

    INSERT INTO elections (
      community_id, title, description, seats, term_days,
      nominations_open, nominations_close, voting_open, voting_close
    ) VALUES (
      r.community_id,
      r.name || ' Election',
      'Automated election triggered by expiring quorum terms',
      LEAST(r.quorum_size, 5),
      90,
      now(), nom_close, vote_open, vote_close
    );

    triggered := triggered + 1;
  END LOOP;

  RETURN triggered;
END;
$$ LANGUAGE plpgsql;
