-- Pass 4B + Treasury-as-proposal.
-- Adds two new proposal_type values so cascade decisions and treasury
-- distributions run through the normal voting flow:
--
--   'regional_cascade' - the parent community's leaders vote on how to
--       split a treasury amount across children. On approval, funds
--       move per the proposal's cascade_allocations and voters on
--       this proposal are compensated via governance motivation.
--
--   'treasury_distribution' - a community votes to distribute an
--       amount from its treasury via the existing distribute_treasury
--       rules (leader / participant / delegator). On approval, the
--       distribution fires and voters are compensated.
--
-- Non-budget standard proposals are unaffected.

BEGIN;

-- proposal_type column (default 'standard' preserves current behavior)
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS proposal_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (proposal_type IN ('standard','regional_cascade','treasury_distribution'));

-- For regional_cascade proposals: the vote itself is on this allocation.
-- Shape: {"amount": 200000, "splits": [{"child_community_id":"...","pct":50},...]}
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS cascade_allocations JSONB;

-- For treasury_distribution proposals: how much to distribute
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS distribution_amount NUMERIC;

-- Cascade an approved regional_cascade proposal's allocations. This is a
-- variant of cascade_treasury that reads the proposal's own splits rather
-- than the persistent regional_allocations table, so a single proposal
-- represents a single one-shot decision.
CREATE OR REPLACE FUNCTION cascade_treasury_from_proposal(
  p_proposal_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_prop RECORD;
  v_alloc JSONB;
  v_amount NUMERIC;
  v_splits JSONB;
  v_split JSONB;
  v_child_id UUID;
  v_child_pct NUMERIC;
  v_child_amount NUMERIC;
  v_child_name TEXT;
  v_out_tx_id UUID;
  v_flow_id UUID;
  v_cascade JSONB;
  v_settings JSONB;
  v_cap_pct NUMERIC;
  v_total_pct NUMERIC := 0;
  v_results JSONB := '[]'::JSONB;
  v_motivation_paid NUMERIC := 0;
  v_balance NUMERIC;
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
  IF v_prop.proposal_type != 'regional_cascade' THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not a cascade proposal');
  END IF;
  IF v_prop.cascade_allocations IS NULL THEN
    RETURN jsonb_build_object('error', 'cascade_allocations is missing');
  END IF;

  v_amount := COALESCE((v_prop.cascade_allocations->>'amount')::NUMERIC, 0);
  v_splits := v_prop.cascade_allocations->'splits';
  IF v_amount <= 0 OR v_splits IS NULL OR jsonb_typeof(v_splits) != 'array' THEN
    RETURN jsonb_build_object('error', 'invalid allocations shape');
  END IF;

  FOR v_split IN SELECT * FROM jsonb_array_elements(v_splits)
  LOOP
    v_total_pct := v_total_pct + COALESCE((v_split->>'pct')::NUMERIC, 0);
  END LOOP;
  IF v_total_pct <= 0 OR v_total_pct > 100 THEN
    RETURN jsonb_build_object('error', 'splits must sum to <= 100%');
  END IF;

  -- Check the community treasury has enough
  SELECT COALESCE(SUM(CASE WHEN direction = 'inflow' THEN amount ELSE -amount END), 0)
  INTO v_balance
  FROM treasury_transactions
  WHERE community_id = v_prop.community_id AND token_type = 'LOOP_TKN';

  IF v_balance < v_amount * (v_total_pct / 100.0) THEN
    RETURN jsonb_build_object(
      'error', 'insufficient community balance',
      'required', v_amount * (v_total_pct / 100.0),
      'balance', v_balance
    );
  END IF;

  -- Create the motivation flow (hard cap enforced by pay_governance_motivation)
  v_cascade := resolve_governance_settings(v_prop.community_id);
  v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);
  v_cap_pct := COALESCE((v_settings->>'governance_motivation_max_pct_of_origin')::NUMERIC, 20);

  INSERT INTO motivation_flows (
    origin_proposal_id, origin_community_id, origin_amount, cap_pct, cap_amount
  ) VALUES (
    p_proposal_id, v_prop.community_id, v_amount, v_cap_pct,
    v_amount * (v_cap_pct / 100.0)
  ) RETURNING id INTO v_flow_id;

  FOR v_split IN SELECT * FROM jsonb_array_elements(v_splits)
  LOOP
    v_child_id := (v_split->>'child_community_id')::UUID;
    v_child_pct := COALESCE((v_split->>'pct')::NUMERIC, 0);
    IF v_child_id IS NULL OR v_child_pct <= 0 THEN CONTINUE; END IF;

    v_child_amount := v_amount * (v_child_pct / 100.0);

    SELECT name INTO v_child_name FROM communities WHERE id = v_child_id;

    INSERT INTO treasury_transactions (
      community_id, type, direction, amount, token_type,
      description, source_entity_id, period_start, period_end
    ) VALUES (
      v_prop.community_id, 'project_funding', 'outflow', v_child_amount, 'LOOP_TKN',
      'Regional cascade to ' || COALESCE(v_child_name, 'child'),
      v_child_id, CURRENT_DATE, CURRENT_DATE
    ) RETURNING id INTO v_out_tx_id;

    INSERT INTO treasury_transactions (
      community_id, type, direction, amount, token_type,
      description, source_entity_id, period_start, period_end
    ) VALUES (
      v_child_id, 'impact_allocation', 'inflow', v_child_amount, 'LOOP_TKN',
      'Regional cascade from parent',
      v_prop.community_id, CURRENT_DATE, CURRENT_DATE
    );

    v_results := v_results || jsonb_build_object(
      'child_id', v_child_id,
      'child_name', v_child_name,
      'amount', v_child_amount,
      'pct', v_child_pct
    );
  END LOOP;

  -- Compensate the voters (bounded by cap)
  v_motivation_paid := pay_governance_motivation(
    v_prop.community_id, v_amount * (v_total_pct / 100.0), NULL,
    p_proposal_id, v_flow_id
  );

  UPDATE proposals SET
    disbursed_at = now(),
    disbursed_amount = v_amount * (v_total_pct / 100.0),
    motivation_flow_id = v_flow_id
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_cascaded', v_amount * (v_total_pct / 100.0),
    'motivation_paid', v_motivation_paid,
    'flow_id', v_flow_id,
    'allocations', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Distribution proposal handler.
CREATE OR REPLACE FUNCTION distribute_treasury_from_proposal(
  p_proposal_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_prop RECORD;
  v_amount NUMERIC;
  v_flow_id UUID;
  v_cascade JSONB;
  v_settings JSONB;
  v_cap_pct NUMERIC;
  v_dist_result JSONB;
  v_motivation_paid NUMERIC := 0;
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
  IF v_prop.proposal_type != 'treasury_distribution' THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not a distribution proposal');
  END IF;

  v_amount := v_prop.distribution_amount;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'distribution_amount missing or <= 0');
  END IF;

  -- Set up motivation flow so voters on THIS distribution proposal earn
  v_cascade := resolve_governance_settings(v_prop.community_id);
  v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);
  v_cap_pct := COALESCE((v_settings->>'governance_motivation_max_pct_of_origin')::NUMERIC, 20);

  INSERT INTO motivation_flows (
    origin_proposal_id, origin_community_id, origin_amount, cap_pct, cap_amount
  ) VALUES (
    p_proposal_id, v_prop.community_id, v_amount, v_cap_pct,
    v_amount * (v_cap_pct / 100.0)
  ) RETURNING id INTO v_flow_id;

  -- Do the actual distribution (leader/participant/delegator by role)
  SELECT distribute_treasury(v_prop.community_id, v_amount) INTO v_dist_result;

  -- Compensate the voters on THIS distribution proposal
  v_motivation_paid := pay_governance_motivation(
    v_prop.community_id, v_amount, NULL, p_proposal_id, v_flow_id
  );

  UPDATE proposals SET
    disbursed_at = now(),
    disbursed_amount = v_amount,
    motivation_flow_id = v_flow_id
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object(
    'success', true,
    'distributed', v_amount,
    'distribution_result', v_dist_result,
    'motivation_paid', v_motivation_paid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Route to the right handler based on proposal_type
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

  IF v_prop.proposal_type = 'regional_cascade' THEN
    RETURN cascade_treasury_from_proposal(p_proposal_id);
  END IF;

  IF v_prop.proposal_type = 'treasury_distribution' THEN
    RETURN distribute_treasury_from_proposal(p_proposal_id);
  END IF;

  -- Standard budget proposal (Pass 4A behaviour)
  IF v_prop.budget_request_cents IS NULL OR v_prop.budget_request_cents <= 0 THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'no budget');
  END IF;

  v_amount := v_prop.budget_request_cents::NUMERIC / 100.0;

  SELECT COALESCE(SUM(CASE WHEN direction = 'inflow' THEN amount ELSE -amount END), 0)
  INTO v_balance
  FROM treasury_transactions
  WHERE community_id = v_prop.community_id AND token_type = 'LOOP_TKN';

  IF v_balance < v_amount THEN
    RETURN jsonb_build_object(
      'error', 'insufficient community balance',
      'required', v_amount, 'balance', v_balance
    );
  END IF;

  v_cascade := resolve_governance_settings(v_prop.community_id);
  v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);
  v_cap_pct := COALESCE((v_settings->>'governance_motivation_max_pct_of_origin')::NUMERIC, 20);

  INSERT INTO motivation_flows (
    origin_proposal_id, origin_community_id, origin_amount, cap_pct, cap_amount
  ) VALUES (
    p_proposal_id, v_prop.community_id, v_amount, v_cap_pct,
    v_amount * (v_cap_pct / 100.0)
  ) RETURNING id INTO v_flow_id;

  INSERT INTO treasury_transactions (
    community_id, type, direction, amount, token_type,
    description, source_entity_id, period_start, period_end
  ) VALUES (
    v_prop.community_id, 'project_funding', 'outflow', v_amount, 'LOOP_TKN',
    'Proposal disbursement: ' || v_prop.title,
    p_proposal_id, CURRENT_DATE, CURRENT_DATE
  ) RETURNING id INTO v_out_tx_id;

  INSERT INTO earnings (
    user_id, community_id, type, amount, token_type, period_start, period_end
  ) VALUES (
    v_prop.author_id, v_prop.community_id, 'participant_reward',
    v_amount, 'LOOP_TKN',
    date_trunc('week', now())::DATE,
    (date_trunc('week', now()) + INTERVAL '6 days')::DATE
  );

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

COMMIT;
