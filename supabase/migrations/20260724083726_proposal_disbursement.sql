-- Pass 4A: proposal-driven disbursement + hard-cap governance motivation.
--
-- When a proposal with budget_request_cents > 0 is approved by
-- evaluate_proposal, disburse_approved_proposal now fires automatically:
-- pays the proposal author from the community treasury and compensates
-- the voters via governance motivation, bounded by a per-flow hard cap.
--
-- motivation_flows tracks each disbursement's motivation pot so admins
-- can enforce the platform's "leaders take no more than X% of origin,
-- no matter how many hops" rule.

BEGIN;

-- Track motivation payouts per origin flow so the hard cap is enforceable.
CREATE TABLE IF NOT EXISTS motivation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  origin_community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  origin_amount NUMERIC NOT NULL CHECK (origin_amount >= 0),
  cap_pct NUMERIC NOT NULL CHECK (cap_pct >= 0 AND cap_pct <= 100),
  cap_amount NUMERIC NOT NULL CHECK (cap_amount >= 0),
  paid_so_far NUMERIC NOT NULL DEFAULT 0 CHECK (paid_so_far >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS motivation_flow_proposal_idx
  ON motivation_flows(origin_proposal_id);

-- Proposal disbursement tracking columns
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disbursed_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS disbursed_tx_id UUID REFERENCES treasury_transactions(id),
  ADD COLUMN IF NOT EXISTS motivation_flow_id UUID REFERENCES motivation_flows(id);

-- Updated pay_governance_motivation:
--   Accepts an optional flow_id. When provided, the actual cut is bounded
--   by the flow's remaining pot (cap_amount - paid_so_far). When absent,
--   behavior falls back to the previous vote-gated model (nothing paid
--   without a proposal_id, no cap enforcement).
CREATE OR REPLACE FUNCTION pay_governance_motivation(
  p_community_id UUID,
  p_gross_amount NUMERIC,
  p_source_tx_id UUID DEFAULT NULL,
  p_proposal_id UUID DEFAULT NULL,
  p_flow_id UUID DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  v_cascade JSONB;
  v_settings JSONB;
  v_pct NUMERIC;
  v_weighting TEXT;
  v_desired_cut NUMERIC;
  v_actual_cut NUMERIC;
  v_flow RECORD;
  v_cap_remaining NUMERIC;
  v_voter_count INTEGER;
  v_per_voter NUMERIC;
  v_voter RECORD;
BEGIN
  IF p_community_id IS NULL OR p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RETURN 0;
  END IF;
  IF p_proposal_id IS NULL THEN
    RETURN 0;
  END IF;

  v_cascade := resolve_governance_settings(p_community_id);
  v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);
  v_pct := COALESCE((v_settings->>'governance_motivation_pct')::NUMERIC, 0);
  v_weighting := COALESCE(v_settings->>'governance_motivation_weighting', 'equal');

  IF v_pct <= 0 THEN RETURN 0; END IF;

  v_desired_cut := p_gross_amount * (v_pct / 100.0);
  v_actual_cut := v_desired_cut;

  -- Enforce the flow's hard cap if a flow was supplied
  IF p_flow_id IS NOT NULL THEN
    SELECT * INTO v_flow FROM motivation_flows WHERE id = p_flow_id FOR UPDATE;
    IF v_flow.id IS NOT NULL THEN
      v_cap_remaining := GREATEST(v_flow.cap_amount - v_flow.paid_so_far, 0);
      v_actual_cut := LEAST(v_desired_cut, v_cap_remaining);
      IF v_actual_cut <= 0 THEN RETURN 0; END IF;
    END IF;
  END IF;

  SELECT COUNT(DISTINCT voter_id) INTO v_voter_count
  FROM votes
  WHERE proposal_id = p_proposal_id;
  IF v_voter_count = 0 THEN RETURN 0; END IF;

  v_per_voter := v_actual_cut / v_voter_count;

  IF v_weighting NOT IN ('equal', 'by_vote_weight') THEN
    v_weighting := 'equal';
  END IF;

  FOR v_voter IN
    SELECT DISTINCT voter_id FROM votes WHERE proposal_id = p_proposal_id
  LOOP
    INSERT INTO earnings (
      user_id, community_id, type, amount, token_type, period_start, period_end
    ) VALUES (
      v_voter.voter_id, p_community_id, 'leader_reward',
      v_per_voter, 'LOOP_TKN',
      date_trunc('week', now())::DATE,
      (date_trunc('week', now()) + INTERVAL '6 days')::DATE
    );
  END LOOP;

  INSERT INTO treasury_transactions (
    community_id, type, direction, amount, token_type,
    description, source_entity_id, period_start, period_end
  ) VALUES (
    p_community_id, 'operational', 'outflow', v_actual_cut, 'LOOP_TKN',
    'Governance motivation (' || ROUND(v_actual_cut::NUMERIC, 4) || ' to '
      || v_voter_count || ' voters on proposal ' || p_proposal_id || ')',
    p_source_tx_id, CURRENT_DATE, CURRENT_DATE
  );

  -- Update the flow's paid-so-far
  IF p_flow_id IS NOT NULL THEN
    UPDATE motivation_flows
    SET paid_so_far = paid_so_far + v_actual_cut
    WHERE id = p_flow_id;
  END IF;

  RETURN v_actual_cut;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-disburse when a budget proposal is approved.
-- Called from evaluate_proposal. Safe to invoke on non-budget proposals
-- (returns quietly) and on already-disbursed proposals (idempotent).
CREATE OR REPLACE FUNCTION disburse_approved_proposal(p_proposal_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_prop RECORD;
  v_amount NUMERIC;
  v_cascade JSONB;
  v_settings JSONB;
  v_cap_pct NUMERIC;
  v_flow_id UUID;
  v_balance NUMERIC;
  v_out_tx_id UUID;
  v_motivation_paid NUMERIC;
BEGIN
  SELECT * INTO v_prop FROM proposals WHERE id = p_proposal_id;
  IF v_prop.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Proposal not found');
  END IF;
  IF v_prop.status != 'approved' THEN
    RETURN jsonb_build_object('error', 'Proposal is not approved');
  END IF;
  IF v_prop.disbursed_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already disbursed', 'disbursed_at', v_prop.disbursed_at);
  END IF;
  IF v_prop.budget_request_cents IS NULL OR v_prop.budget_request_cents <= 0 THEN
    -- Not a budget proposal - nothing to disburse
    RETURN jsonb_build_object('skipped', true, 'reason', 'no budget');
  END IF;

  -- Convert cents to token units. Treasury operates in whole LOOP_TKN
  -- numeric values, one token per dollar for now (design tunable).
  v_amount := v_prop.budget_request_cents::NUMERIC / 100.0;

  -- Check the community treasury has enough
  SELECT COALESCE(SUM(CASE WHEN direction = 'inflow' THEN amount ELSE -amount END), 0)
  INTO v_balance
  FROM treasury_transactions
  WHERE community_id = v_prop.community_id
    AND token_type = 'LOOP_TKN';

  IF v_balance < v_amount THEN
    RETURN jsonb_build_object(
      'error', 'insufficient community balance',
      'required', v_amount,
      'balance', v_balance
    );
  END IF;

  -- Build the motivation flow with the cap captured at disbursement time
  v_cascade := resolve_governance_settings(v_prop.community_id);
  v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);
  v_cap_pct := COALESCE((v_settings->>'governance_motivation_max_pct_of_origin')::NUMERIC, 20);

  INSERT INTO motivation_flows (
    origin_proposal_id, origin_community_id, origin_amount, cap_pct, cap_amount
  ) VALUES (
    p_proposal_id, v_prop.community_id, v_amount, v_cap_pct,
    v_amount * (v_cap_pct / 100.0)
  ) RETURNING id INTO v_flow_id;

  -- Outflow from the community treasury for the disbursement
  INSERT INTO treasury_transactions (
    community_id, type, direction, amount, token_type,
    description, source_entity_id, period_start, period_end
  ) VALUES (
    v_prop.community_id, 'project_funding', 'outflow', v_amount, 'LOOP_TKN',
    'Proposal disbursement: ' || v_prop.title,
    p_proposal_id, CURRENT_DATE, CURRENT_DATE
  ) RETURNING id INTO v_out_tx_id;

  -- Pay the author. Represented as an earnings row so the author sees it
  -- in their Earnings page and the token type is normal LOOP_TKN.
  INSERT INTO earnings (
    user_id, community_id, type, amount, token_type, period_start, period_end
  ) VALUES (
    v_prop.author_id, v_prop.community_id, 'participant_reward',
    v_amount, 'LOOP_TKN',
    date_trunc('week', now())::DATE,
    (date_trunc('week', now()) + INTERVAL '6 days')::DATE
  );

  -- Pay the voters through the motivation flow
  v_motivation_paid := pay_governance_motivation(
    v_prop.community_id, v_amount, v_out_tx_id, p_proposal_id, v_flow_id
  );

  UPDATE proposals SET
    disbursed_at = now(),
    disbursed_amount = v_amount,
    disbursed_tx_id = v_out_tx_id,
    motivation_flow_id = v_flow_id
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_amount,
    'author_paid', v_amount,
    'motivation_paid', v_motivation_paid,
    'flow_id', v_flow_id,
    'tx_id', v_out_tx_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update evaluate_proposal to trigger disbursement when it flips a
-- proposal to 'approved'. Non-budget proposals are unaffected.
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

  SELECT COUNT(*) INTO total_votes FROM votes WHERE proposal_id = p_id;

  SELECT COUNT(*) INTO member_count
  FROM community_memberships
  WHERE community_id = prop.community_id;

  IF prop.closes_at IS NOT NULL AND prop.closes_at <= now() THEN
    IF total_votes >= community.quorum_size THEN
      IF prop.votes_for > prop.votes_against THEN
        UPDATE proposals SET status = 'approved' WHERE id = p_id;
        result := 'approved';
        -- Trigger disbursement for budget proposals
        PERFORM disburse_approved_proposal(p_id);
      ELSE
        UPDATE proposals SET status = 'rejected' WHERE id = p_id;
        result := 'rejected';
      END IF;
    ELSE
      UPDATE proposals SET status = 'rejected' WHERE id = p_id;
      result := 'rejected_no_quorum';
    END IF;
    RETURN result;
  END IF;

  IF total_votes >= community.quorum_size THEN
    RETURN 'quorum_met';
  END IF;

  RETURN 'open';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
