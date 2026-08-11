-- Two governance corrections:
-- 1. tally_election now enforces quorum_threshold_pct: a candidate must
--    receive at least (threshold %) of total votes cast to win a seat.
--    Candidates below the threshold do not fill their seat even if they
--    are top-N. This makes the leadership entry threshold real.
-- 2. check_and_trigger_elections stops silently clamping seats to 5;
--    an auto-triggered replacement election uses the community's full
--    quorum_size the same way a manual election does.

BEGIN;

CREATE OR REPLACE FUNCTION tally_election(p_election_id UUID)
RETURNS VOID AS $$
DECLARE
  r_election RECORD;
  r_candidate RECORD;
  v_threshold_pct NUMERIC;
  v_total_votes NUMERIC;
  v_min_votes NUMERIC;
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

  -- Look up the entry threshold for this community
  SELECT COALESCE(quorum_threshold_pct, 10.00)
  INTO v_threshold_pct
  FROM communities
  WHERE id = r_election.community_id;

  SELECT COALESCE(SUM(weight), 0)
  INTO v_total_votes
  FROM election_votes
  WHERE election_id = p_election_id;

  -- Minimum votes required = threshold% of the total votes cast
  v_min_votes := (v_threshold_pct / 100.0) * v_total_votes;

  -- Mark top N candidates as elected, but only if they clear the threshold
  FOR r_candidate IN
    SELECT id, user_id, votes_received
    FROM candidates
    WHERE election_id = p_election_id
    ORDER BY votes_received DESC
    LIMIT r_election.seats
  LOOP
    IF r_candidate.votes_received > 0 AND r_candidate.votes_received >= v_min_votes THEN
      UPDATE candidates SET elected = true WHERE id = r_candidate.id;
      seat_count := seat_count + 1;

      UPDATE quorum_terms
      SET active = false
      WHERE community_id = r_election.community_id
        AND user_id = r_candidate.user_id
        AND active = true;

      INSERT INTO quorum_terms (community_id, user_id, election_id, starts_at, expires_at)
      VALUES (
        r_election.community_id,
        r_candidate.user_id,
        p_election_id,
        now(),
        now() + (r_election.term_days || ' days')::INTERVAL
      );

      UPDATE community_memberships
      SET role = 'quorum'
      WHERE community_id = r_election.community_id
        AND user_id = r_candidate.user_id
        AND role = 'member';
    END IF;
  END LOOP;

  UPDATE elections SET status = 'completed' WHERE id = p_election_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-triggered replacement elections should offer the full quorum_size,
-- not silently cap at 5.
CREATE OR REPLACE FUNCTION check_and_trigger_elections()
RETURNS INTEGER AS $$
DECLARE
  triggered INTEGER := 0;
  r RECORD;
  nom_close TIMESTAMPTZ;
  vote_open TIMESTAMPTZ;
  vote_close TIMESTAMPTZ;
BEGIN
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
      r.quorum_size,
      90,
      now(), nom_close, vote_open, vote_close
    );

    triggered := triggered + 1;
  END LOOP;

  RETURN triggered;
END;
$$ LANGUAGE plpgsql;

COMMIT;
