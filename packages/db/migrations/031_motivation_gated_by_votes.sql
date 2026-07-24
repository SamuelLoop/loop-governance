-- Only leaders who actually voted (for / against / abstain) earn a share
-- of the governance motivation cut. Absent leaders and no-shows earn zero.
-- Movement authorised outside a proposal vote pays nothing.

BEGIN;

-- Give funding requests an optional link to the proposal that authorised
-- them, so approve_funding_request can propagate voter context.
ALTER TABLE funding_requests
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS funding_req_proposal_idx
  ON funding_requests(proposal_id);

-- Reworked: split the motivation cut among actual voters on the proposal
-- that authorised this movement. If no proposal id is supplied, no one
-- earns anything - it is not a governance decision the ledger can attribute.
CREATE OR REPLACE FUNCTION pay_governance_motivation(
  p_community_id UUID,
  p_gross_amount NUMERIC,
  p_source_tx_id UUID DEFAULT NULL,
  p_proposal_id UUID DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  v_cascade JSONB;
  v_settings JSONB;
  v_pct NUMERIC;
  v_weighting TEXT;
  v_cut NUMERIC;
  v_voter_count INTEGER;
  v_per_voter NUMERIC;
  v_voter RECORD;
BEGIN
  IF p_community_id IS NULL OR p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RETURN 0;
  END IF;

  -- Vote-gated: no proposal, no attribution, no payout.
  IF p_proposal_id IS NULL THEN
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

  -- Voters on this proposal, deduplicated. Includes for / against / abstain
  -- since 'showing up and casting a considered vote' is the earning event.
  SELECT COUNT(DISTINCT voter_id) INTO v_voter_count
  FROM votes
  WHERE proposal_id = p_proposal_id;

  IF v_voter_count = 0 THEN
    -- Vote gated but no one voted - the cut stays with the treasury
    RETURN 0;
  END IF;

  v_per_voter := v_cut / v_voter_count;

  IF v_weighting NOT IN ('equal', 'by_vote_weight') THEN
    v_weighting := 'equal';
  END IF;

  FOR v_voter IN
    SELECT DISTINCT voter_id
    FROM votes
    WHERE proposal_id = p_proposal_id
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

  -- Aggregate outflow so treasury balance reflects the cut
  INSERT INTO treasury_transactions (
    community_id, type, direction, amount, token_type,
    description, source_entity_id, period_start, period_end
  ) VALUES (
    p_community_id, 'operational', 'outflow', v_cut, 'LOOP_TKN',
    'Governance motivation (' || v_pct || '% of ' || p_gross_amount
      || ' to ' || v_voter_count || ' voters)',
    p_source_tx_id, CURRENT_DATE, CURRENT_DATE
  );

  RETURN v_cut;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cascade transfers: accept an optional proposal_id and forward it.
-- Existing UI callers pass NULL, which means no motivation is paid until
-- the UI is updated to route regional cascades through proposals.
CREATE OR REPLACE FUNCTION cascade_treasury(
  p_parent_community_id UUID,
  p_amount NUMERIC,
  p_proposal_id UUID DEFAULT NULL
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

  v_motivation_paid := pay_governance_motivation(
    p_parent_community_id,
    p_amount * (v_total_pct / 100.0),
    NULL,
    p_proposal_id
  );

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

-- Approve funding request: propagate any proposal_id linked on the request.
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

  -- Only pays out if the funding request was linked to a proposal,
  -- and only to leaders who actually voted on that proposal.
  v_motivation_paid := pay_governance_motivation(
    v_req.community_id, v_req.amount, v_tx_id, v_req.proposal_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_req.amount,
    'community_id', v_req.community_id,
    'transaction_id', v_tx_id,
    'motivation_paid', v_motivation_paid,
    'proposal_id', v_req.proposal_id
  );
END;
$$ LANGUAGE plpgsql;

COMMIT;
