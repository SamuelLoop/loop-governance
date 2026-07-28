-- Problem 2: pre-computed power scores (write-time, not read-time)
-- Problem 4: tree_snapshot column for materialised tree (3 layers)
--
-- recompute_power_score(p_user_id, p_subject) is called by triggers on
-- delegations, accreditations, votes, and proposals.  getPowerStats() does
-- a single row read instead of 6 queries; KV is a second cache layer above it.

BEGIN;

-- ── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_power_scores (
  user_id                  UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject                  TEXT    NOT NULL,
  score                    NUMERIC NOT NULL DEFAULT 0,
  tier                     TEXT    NOT NULL DEFAULT 'Bronze',
  delegations_received     INTEGER NOT NULL DEFAULT 0,
  accreditations_received  INTEGER NOT NULL DEFAULT 0,
  accreditation_weight     NUMERIC NOT NULL DEFAULT 0,
  votes_cast               INTEGER NOT NULL DEFAULT 0,
  proposals_authored       INTEGER NOT NULL DEFAULT 0,
  communities_joined       INTEGER NOT NULL DEFAULT 0,
  total_earnings           NUMERIC NOT NULL DEFAULT 0,
  tree_snapshot            JSONB,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, subject)
);

CREATE INDEX IF NOT EXISTS ups_subject_score_idx ON user_power_scores (subject, score DESC);

-- ── Tree snapshot builder ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION build_tree_snapshot(p_user_id UUID, p_subject TEXT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_l1_ids  UUID[];
  v_l2_ids  UUID[];
  v_nodes   JSONB := '[]'::JSONB;
  v_tail    INTEGER := 0;
  r         RECORD;
BEGIN
  -- L1: direct delegators and accrediters
  SELECT ARRAY_AGG(DISTINCT node_id) INTO v_l1_ids FROM (
    SELECT delegator_id AS node_id FROM delegations
      WHERE delegate_id = p_user_id AND subject_tag = p_subject AND active = true
    UNION
    SELECT giver_id AS node_id FROM accreditations
      WHERE receiver_id = p_user_id AND subject_tag = p_subject AND active = true
  ) x;

  IF v_l1_ids IS NULL THEN
    RETURN jsonb_build_object('nodes', '[]'::JSONB, 'tailCount', 0);
  END IF;

  -- L1 nodes
  FOR r IN
    SELECT u.id,
           COALESCE(u.display_name, '—') AS name,
           LEAST(1.0, GREATEST(0.05, COALESCE(s.score::FLOAT, 0.1))) AS score,
           CASE WHEN EXISTS(
             SELECT 1 FROM delegations WHERE delegator_id = u.id
               AND delegate_id = p_user_id AND subject_tag = p_subject AND active = true
           ) THEN 'delegation' ELSE 'accreditation' END AS edge_type
    FROM users u
    LEFT JOIN accreditation_scores s
      ON s.user_id = u.id AND s.subject_tag = p_subject AND s.community_id IS NULL
    WHERE u.id = ANY(v_l1_ids)
  LOOP
    v_nodes := v_nodes || jsonb_build_array(jsonb_build_object(
      'id', r.id, 'parentId', p_user_id, 'name', r.name,
      'score', r.score, 'edgeType', r.edge_type, 'depth', 1
    ));
  END LOOP;

  -- L2: delegators of L1 nodes
  SELECT ARRAY_AGG(DISTINCT delegator_id) INTO v_l2_ids
  FROM delegations
  WHERE delegate_id = ANY(v_l1_ids)
    AND subject_tag = p_subject AND active = true
    AND delegator_id != p_user_id
    AND delegator_id != ALL(v_l1_ids);

  v_l2_ids := COALESCE(v_l2_ids, '{}');

  FOR r IN
    SELECT d.delegator_id AS id,
           d.delegate_id  AS parent_id,
           COALESCE(u.display_name, '—') AS name,
           LEAST(1.0, GREATEST(0.05, COALESCE(s.score::FLOAT, 0.1))) AS score
    FROM delegations d
    JOIN users u ON u.id = d.delegator_id
    LEFT JOIN accreditation_scores s
      ON s.user_id = d.delegator_id AND s.subject_tag = p_subject AND s.community_id IS NULL
    WHERE d.delegate_id = ANY(v_l1_ids)
      AND d.subject_tag = p_subject AND d.active = true
      AND d.delegator_id != p_user_id
      AND d.delegator_id != ALL(v_l1_ids)
  LOOP
    v_nodes := v_nodes || jsonb_build_array(jsonb_build_object(
      'id', r.id, 'parentId', r.parent_id, 'name', r.name,
      'score', r.score, 'edgeType', 'delegation', 'depth', 2
    ));
  END LOOP;

  -- L3: delegators of L2, capped at 30; compute tail count first
  SELECT GREATEST(0, COUNT(*) - 30) INTO v_tail
  FROM delegations
  WHERE delegate_id = ANY(v_l2_ids)
    AND subject_tag = p_subject AND active = true
    AND delegator_id != p_user_id
    AND delegator_id != ALL(v_l1_ids)
    AND delegator_id != ALL(v_l2_ids);

  FOR r IN
    SELECT d.delegator_id AS id,
           d.delegate_id  AS parent_id,
           LEAST(1.0, GREATEST(0.05, COALESCE(s.score::FLOAT, 0.1))) AS score
    FROM delegations d
    LEFT JOIN accreditation_scores s
      ON s.user_id = d.delegator_id AND s.subject_tag = p_subject AND s.community_id IS NULL
    WHERE d.delegate_id = ANY(v_l2_ids)
      AND d.subject_tag = p_subject AND d.active = true
      AND d.delegator_id != p_user_id
      AND d.delegator_id != ALL(v_l1_ids)
      AND d.delegator_id != ALL(v_l2_ids)
    LIMIT 30
  LOOP
    v_nodes := v_nodes || jsonb_build_array(jsonb_build_object(
      'id', r.id, 'parentId', r.parent_id, 'name', '',
      'score', r.score, 'edgeType', 'delegation', 'depth', 3
    ));
  END LOOP;

  RETURN jsonb_build_object('nodes', v_nodes, 'tailCount', v_tail);
END;
$$;

-- ── Score recomputation function ──────────────────────────────────────────

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

  SELECT COUNT(*) INTO v_votes FROM votes WHERE user_id = p_user_id;

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

-- ── Trigger functions ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_recompute_on_delegation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_user_id UUID;
  v_subject  TEXT;
BEGIN
  v_user_id := COALESCE(NEW.delegate_id, OLD.delegate_id);
  v_subject  := COALESCE(NEW.subject_tag, OLD.subject_tag);
  IF v_user_id IS NOT NULL AND v_subject IS NOT NULL THEN
    PERFORM recompute_power_score(v_user_id, v_subject);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION trg_recompute_on_accreditation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_user_id UUID;
  v_subject  TEXT;
BEGIN
  v_user_id := COALESCE(NEW.receiver_id, OLD.receiver_id);
  v_subject  := COALESCE(NEW.subject_tag, OLD.subject_tag);
  IF v_user_id IS NOT NULL AND v_subject IS NOT NULL THEN
    PERFORM recompute_power_score(v_user_id, v_subject);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION trg_recompute_on_vote()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Recompute every subject this user already has a power row for
  PERFORM recompute_power_score(NEW.user_id, subject)
  FROM (SELECT DISTINCT subject FROM user_power_scores WHERE user_id = NEW.user_id) s;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_recompute_on_proposal()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM recompute_power_score(NEW.author_id, subject)
  FROM (SELECT DISTINCT subject FROM user_power_scores WHERE user_id = NEW.author_id) s;
  RETURN NEW;
END;
$$;

-- ── Triggers ──────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS after_delegation_change ON delegations;
CREATE TRIGGER after_delegation_change
  AFTER INSERT OR UPDATE OR DELETE ON delegations
  FOR EACH ROW EXECUTE FUNCTION trg_recompute_on_delegation();

DROP TRIGGER IF EXISTS after_accreditation_change ON accreditations;
CREATE TRIGGER after_accreditation_change
  AFTER INSERT OR UPDATE OR DELETE ON accreditations
  FOR EACH ROW EXECUTE FUNCTION trg_recompute_on_accreditation();

DROP TRIGGER IF EXISTS after_vote_insert ON votes;
CREATE TRIGGER after_vote_insert
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION trg_recompute_on_vote();

DROP TRIGGER IF EXISTS after_proposal_insert ON proposals;
CREATE TRIGGER after_proposal_insert
  AFTER INSERT ON proposals
  FOR EACH ROW EXECUTE FUNCTION trg_recompute_on_proposal();

COMMIT;
