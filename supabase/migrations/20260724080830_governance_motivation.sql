-- Governance motivation: each time a community's leaders authorise a
-- treasury movement, a percentage of that movement is paid to the leaders
-- of the deciding community. Higher-level leaders naturally earn more
-- because the amounts they route are larger; the per-hop percentage is
-- itself admin-tunable through the governance settings cascade.
--
-- Admin knobs:
--   governance_motivation_pct       (default 5%)  - percentage of each hop
--   governance_motivation_weighting (default 'equal') - how the pot splits
--                                                       inside a community
--       'equal'          - every leader in the deciding community gets
--                          an equal slice
--       'by_vote_weight' - future: split by accumulated vote weight
--
-- The cascade knob lives at (platform | white_label | subject | community)
-- scope, so a single organization can raise or lower motivation without
-- affecting others.

BEGIN;

-- Helper: pay leaders of a community a share of an approved money movement.
-- Returns the total governance cut actually paid (0 if nothing configured).
CREATE OR REPLACE FUNCTION pay_governance_motivation(
  p_community_id UUID,
  p_gross_amount NUMERIC,
  p_source_tx_id UUID DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  v_cascade JSONB;
  v_settings JSONB;
  v_pct NUMERIC;
  v_weighting TEXT;
  v_cut NUMERIC;
  v_leader_count INTEGER;
  v_per_leader NUMERIC;
  v_leader RECORD;
BEGIN
  IF p_community_id IS NULL OR p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RETURN 0;
  END IF;

  v_cascade := resolve_governance_settings(p_community_id);
  v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);

  v_pct := COALESCE((v_settings->>'governance_motivation_pct')::NUMERIC, 0);
  v_weighting := COALESCE(v_settings->>'governance_motivation_weighting', 'equal');

  IF v_pct <= 0 THEN
    RETURN 0;
  END IF;

  v_cut := p_gross_amount * (v_pct / 100.0);

  SELECT COUNT(*) INTO v_leader_count
  FROM community_memberships
  WHERE community_id = p_community_id
    AND role IN ('quorum', 'admin');

  IF v_leader_count = 0 THEN
    -- No leaders to pay - the cut stays with the treasury
    RETURN 0;
  END IF;

  v_per_leader := v_cut / v_leader_count;

  -- 'equal' is the only weighting implemented today; other values fall
  -- back to equal until we add them.
  IF v_weighting NOT IN ('equal', 'by_vote_weight') THEN
    v_weighting := 'equal';
  END IF;

  FOR v_leader IN
    SELECT user_id
    FROM community_memberships
    WHERE community_id = p_community_id
      AND role IN ('quorum', 'admin')
  LOOP
    INSERT INTO earnings (
      user_id, community_id, type, amount, token_type, period_start, period_end
    ) VALUES (
      v_leader.user_id, p_community_id, 'leader_reward',
      v_per_leader, 'LOOP_TKN',
      date_trunc('week', now())::DATE,
      (date_trunc('week', now()) + INTERVAL '6 days')::DATE
    );
  END LOOP;

  -- Log the aggregate outflow so treasury balance reflects the cut
  INSERT INTO treasury_transactions (
    community_id, type, direction, amount, token_type,
    description, source_entity_id, period_start, period_end
  ) VALUES (
    p_community_id, 'operational', 'outflow', v_cut, 'LOOP_TKN',
    'Governance motivation (' || v_pct || '% of ' || p_gross_amount || ')',
    p_source_tx_id, CURRENT_DATE, CURRENT_DATE
  );

  RETURN v_cut;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cascade transfers now skim governance motivation from each hop.
CREATE OR REPLACE FUNCTION cascade_treasury(
  p_parent_community_id UUID,
  p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_alloc RECORD;
  v_total_pct NUMERIC := 0;
  v_child_amount NUMERIC;
  v_results JSONB := '[]'::JSONB;
  v_motivation_paid NUMERIC := 0;
  v_out_tx_id UUID;
BEGIN
  SELECT COALESCE(SUM(allocation_pct), 0) INTO v_total_pct
  FROM regional_allocations
  WHERE parent_community_id = p_parent_community_id;

  IF v_total_pct = 0 THEN
    RETURN jsonb_build_object('error', 'No regional allocations configured for this community');
  END IF;

  -- One motivation payment for the whole authorised amount at this hop
  -- (paid to this parent community's leaders), not per child, so the
  -- decision is compensated once.
  v_motivation_paid := pay_governance_motivation(p_parent_community_id, p_amount * (v_total_pct / 100.0), NULL);

  FOR v_alloc IN
    SELECT ra.*, c.name as child_name
    FROM regional_allocations ra
    JOIN communities c ON c.id = ra.child_community_id
    WHERE ra.parent_community_id = p_parent_community_id
      AND ra.allocation_pct > 0
  LOOP
    v_child_amount := p_amount * (v_alloc.allocation_pct / 100.0);

    INSERT INTO treasury_transactions (
      community_id, type, direction, amount,
      description, source_entity_id
    ) VALUES (
      p_parent_community_id, 'project_funding', 'outflow', v_child_amount,
      'Regional cascade to ' || v_alloc.child_name,
      v_alloc.child_community_id
    ) RETURNING id INTO v_out_tx_id;

    INSERT INTO treasury_transactions (
      community_id, type, direction, amount,
      description, source_entity_id
    ) VALUES (
      v_alloc.child_community_id, 'impact_allocation', 'inflow', v_child_amount,
      'Regional cascade from parent',
      p_parent_community_id
    );

    v_results := v_results || jsonb_build_object(
      'child_id', v_alloc.child_community_id,
      'child_name', v_alloc.child_name,
      'amount', v_child_amount,
      'pct', v_alloc.allocation_pct
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_cascaded', p_amount * (v_total_pct / 100.0),
    'retained', p_amount * ((100 - v_total_pct) / 100.0),
    'motivation_paid', v_motivation_paid,
    'allocations', v_results
  );
END;
$$ LANGUAGE plpgsql;

-- Direct funding approvals also skim governance motivation.
CREATE OR REPLACE FUNCTION approve_funding_request(
  p_request_id UUID,
  p_reviewer_id UUID,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_req RECORD;
  v_pool RECORD;
  v_tx_id UUID;
  v_motivation_paid NUMERIC := 0;
BEGIN
  SELECT * INTO v_req FROM funding_requests WHERE id = p_request_id;
  IF v_req IS NULL THEN
    RETURN jsonb_build_object('error', 'Request not found');
  END IF;
  IF v_req.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'Request is not pending');
  END IF;

  SELECT * INTO v_pool FROM platform_pool WHERE id = 'main';
  IF v_pool.balance < v_req.amount THEN
    RETURN jsonb_build_object('error', 'Insufficient platform pool balance');
  END IF;

  UPDATE platform_pool SET
    balance = balance - v_req.amount,
    total_allocated = total_allocated + v_req.amount,
    updated_at = now()
  WHERE id = 'main';

  INSERT INTO treasury_transactions (
    community_id, type, direction, amount, token_type,
    description, source_entity_id, period_start, period_end
  ) VALUES (
    v_req.community_id, 'external_grant', 'inflow', v_req.amount, v_req.token_type,
    'Steering committee allocation: ' || v_req.title,
    p_request_id, CURRENT_DATE, CURRENT_DATE
  ) RETURNING id INTO v_tx_id;

  UPDATE funding_requests SET
    status = 'disbursed',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    review_note = p_note,
    disbursed_at = now(),
    transaction_id = v_tx_id
  WHERE id = p_request_id;

  v_motivation_paid := pay_governance_motivation(v_req.community_id, v_req.amount, v_tx_id);

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_req.amount,
    'community_id', v_req.community_id,
    'transaction_id', v_tx_id,
    'motivation_paid', v_motivation_paid
  );
END;
$$ LANGUAGE plpgsql;

COMMIT;
