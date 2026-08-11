-- Fix "column user_id does not exist" thrown from recompute_power_score(),
-- which is called by a trigger on every delegations/accreditations/votes/
-- proposals insert. The `votes` table's column is `voter_id` (see
-- 001_initial.sql), not `user_id` — 041_user_power_scores.sql introduced
-- this function with the wrong column name in two places:
--   1. recompute_power_score(): `FROM votes WHERE user_id = p_user_id`
--   2. trg_recompute_on_vote(): `recompute_power_score(NEW.user_id, ...)`
-- (1) broke the mobile app's Delegate action (trigger fires on delegation
-- insert). (2) is the same bug on the vote-insert trigger itself, not yet
-- hit by mobile testing but would break voting the same way.

BEGIN;

CREATE OR REPLACE FUNCTION recompute_power_score(p_user_id UUID, p_subject TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_del_count   INTEGER;
  v_acc_count   INTEGER;
  v_acc_weight  NUMERIC;
  v_votes       INTEGER;
  v_proposals   INTEGER;
  v_communities INTEGER;
  v_earnings    NUMERIC;
  v_score       NUMERIC;
  v_tier        TEXT;
  v_snapshot    JSONB;
BEGIN
  SELECT COUNT(*) INTO v_del_count
  FROM delegations WHERE delegate_id = p_user_id AND subject_tag = p_subject AND active = true;

  SELECT COUNT(*), COALESCE(SUM(weight), 0)
  INTO v_acc_count, v_acc_weight
  FROM accreditations WHERE receiver_id = p_user_id AND subject_tag = p_subject AND active = true;

  SELECT COUNT(*) INTO v_votes FROM votes WHERE voter_id = p_user_id;

  SELECT COUNT(*) INTO v_proposals FROM proposals WHERE author_id = p_user_id;

  SELECT COUNT(*) INTO v_communities
  FROM community_memberships cm
  JOIN communities c ON c.id = cm.community_id
  WHERE cm.user_id = p_user_id AND c.subject = p_subject;

  SELECT COALESCE(SUM(e.amount), 0) INTO v_earnings
  FROM earnings e
  JOIN communities c ON c.id = e.community_id
  WHERE e.user_id = p_user_id AND c.subject = p_subject;

  v_score :=
    v_del_count   * 10 +
    v_acc_weight  *  5 +
    v_votes       *  2 +
    v_proposals   *  8 +
    v_communities *  3 +
    FLOOR(v_earnings * 0.1);

  v_tier := CASE
    WHEN v_score >= 500 THEN 'Diamond'
    WHEN v_score >= 200 THEN 'Platinum'
    WHEN v_score >=  80 THEN 'Gold'
    WHEN v_score >=  30 THEN 'Silver'
    ELSE 'Bronze'
  END;

  v_snapshot := build_tree_snapshot(p_user_id, p_subject);

  INSERT INTO user_power_scores (
    user_id, subject, score, tier,
    delegations_received, accreditations_received, accreditation_weight,
    votes_cast, proposals_authored, communities_joined, total_earnings,
    tree_snapshot, updated_at
  ) VALUES (
    p_user_id, p_subject, v_score, v_tier,
    v_del_count, v_acc_count, v_acc_weight,
    v_votes, v_proposals, v_communities, v_earnings,
    v_snapshot, now()
  )
  ON CONFLICT (user_id, subject) DO UPDATE SET
    score                   = EXCLUDED.score,
    tier                    = EXCLUDED.tier,
    delegations_received    = EXCLUDED.delegations_received,
    accreditations_received = EXCLUDED.accreditations_received,
    accreditation_weight    = EXCLUDED.accreditation_weight,
    votes_cast              = EXCLUDED.votes_cast,
    proposals_authored      = EXCLUDED.proposals_authored,
    communities_joined      = EXCLUDED.communities_joined,
    total_earnings          = EXCLUDED.total_earnings,
    tree_snapshot           = EXCLUDED.tree_snapshot,
    updated_at              = now();
END;
$$;

CREATE OR REPLACE FUNCTION trg_recompute_on_vote()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Recompute every subject this user already has a power row for
  PERFORM recompute_power_score(NEW.voter_id, subject)
  FROM (SELECT DISTINCT subject FROM user_power_scores WHERE user_id = NEW.voter_id) s;
  RETURN NEW;
END;
$$;

COMMIT;
