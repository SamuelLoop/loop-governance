-- Loyalty token issuance.
-- Actions (votes, proposals, delegations) earn LOOP_LOYALTY tokens.
-- Amounts, weekly caps, streak rules and conversion rate are all read
-- from the governance_settings cascade so admins can tune per platform,
-- white-label or subject via the existing Governance page.

BEGIN;

-- earnings.community_id is NOT NULL today. Loyalty from a vote is tied
-- to the proposal's community; loyalty from a delegation is tied to the
-- delegation's community. So no schema change here.

-- Bump the earnings.type check to include loyalty rewards.
ALTER TABLE earnings DROP CONSTRAINT IF EXISTS earnings_type_check;
ALTER TABLE earnings ADD CONSTRAINT earnings_type_check
  CHECK (type IN ('leader_reward','participant_reward','delegator_reward','loyalty_reward','streak_bonus','loyalty_conversion'));

-- Migrate existing loyalty_config values into the governance cascade
-- so nothing is lost when admins move to the Governance page.
INSERT INTO governance_settings (scope_type, white_label_id, settings, updated_by)
SELECT
  'white_label',
  lc.white_label_id,
  jsonb_build_object(
    'loyalty_tokens_per_vote',       lc.tokens_per_action,
    'loyalty_tokens_per_proposal',   lc.tokens_per_action * 5,
    'loyalty_tokens_per_delegation', lc.delegation_reward,
    'loyalty_weekly_cap',            lc.weekly_cap,
    'loyalty_streak_multiplier',     lc.streak_multiplier,
    'loyalty_streak_threshold_weeks', lc.streak_threshold_weeks,
    'loyalty_streak_bonus',          lc.streak_bonus,
    'loyalty_award_votes',           true,
    'loyalty_award_proposals',       true,
    'loyalty_award_delegations',     true,
    'loyalty_to_loop_rate',          0.01
  ),
  lc.updated_by
FROM loyalty_config lc
WHERE NOT EXISTS (
  SELECT 1 FROM governance_settings gs
  WHERE gs.scope_type = 'white_label' AND gs.white_label_id = lc.white_label_id
);

-- Award loyalty tokens for an event. Returns the amount actually issued
-- after the weekly cap and streak multiplier are applied. Returns 0 if
-- disabled or capped. Safe to call unconditionally from server actions.
CREATE OR REPLACE FUNCTION award_loyalty(
  p_user_id UUID,
  p_event_type TEXT,        -- 'vote' | 'proposal' | 'delegation'
  p_community_id UUID       -- the community this action happened in
) RETURNS NUMERIC AS $$
DECLARE
  v_cascade JSONB;
  v_settings JSONB;
  v_enabled BOOLEAN;
  v_base NUMERIC;
  v_weekly_cap NUMERIC;
  v_this_week_total NUMERIC;
  v_streak_weeks INTEGER := 0;
  v_streak_threshold INTEGER;
  v_streak_multiplier NUMERIC;
  v_streak_bonus NUMERIC;
  v_amount NUMERIC;
  v_bonus_paid_this_streak BOOLEAN;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  IF p_community_id IS NULL THEN RETURN 0; END IF;

  v_cascade := resolve_governance_settings(p_community_id);
  v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);

  -- Event toggle
  v_enabled := CASE p_event_type
    WHEN 'vote'       THEN COALESCE((v_settings->>'loyalty_award_votes')::BOOLEAN, false)
    WHEN 'proposal'   THEN COALESCE((v_settings->>'loyalty_award_proposals')::BOOLEAN, false)
    WHEN 'delegation' THEN COALESCE((v_settings->>'loyalty_award_delegations')::BOOLEAN, false)
    ELSE false
  END;
  IF NOT v_enabled THEN RETURN 0; END IF;

  -- Base amount per event
  v_base := CASE p_event_type
    WHEN 'vote'       THEN COALESCE((v_settings->>'loyalty_tokens_per_vote')::NUMERIC, 0)
    WHEN 'proposal'   THEN COALESCE((v_settings->>'loyalty_tokens_per_proposal')::NUMERIC, 0)
    WHEN 'delegation' THEN COALESCE((v_settings->>'loyalty_tokens_per_delegation')::NUMERIC, 0)
  END;
  IF v_base <= 0 THEN RETURN 0; END IF;

  v_weekly_cap        := COALESCE((v_settings->>'loyalty_weekly_cap')::NUMERIC, 50);
  v_streak_threshold  := COALESCE((v_settings->>'loyalty_streak_threshold_weeks')::INTEGER, 4);
  v_streak_multiplier := COALESCE((v_settings->>'loyalty_streak_multiplier')::NUMERIC, 1.0);
  v_streak_bonus      := COALESCE((v_settings->>'loyalty_streak_bonus')::NUMERIC, 0);

  v_week_start := date_trunc('week', now())::DATE;
  v_week_end := (v_week_start + INTERVAL '6 days')::DATE;

  -- Weekly cap: sum this week's loyalty earnings for the user
  SELECT COALESCE(SUM(amount), 0) INTO v_this_week_total
  FROM earnings
  WHERE user_id = p_user_id
    AND token_type = 'LOOP_LOYALTY'
    AND type IN ('loyalty_reward','streak_bonus')
    AND distributed_at >= v_week_start;

  IF v_this_week_total >= v_weekly_cap THEN
    RETURN 0;
  END IF;

  -- Streak: consecutive prior weeks (before this one) with at least
  -- one loyalty earning. If this is the user's first activity ever,
  -- streak is 0 so multiplier does not apply yet.
  WITH prior_weeks AS (
    SELECT DISTINCT date_trunc('week', distributed_at)::DATE AS wk
    FROM earnings
    WHERE user_id = p_user_id
      AND token_type = 'LOOP_LOYALTY'
      AND type IN ('loyalty_reward','streak_bonus')
      AND distributed_at < v_week_start
    ORDER BY wk DESC
    LIMIT 52
  ),
  numbered AS (
    SELECT wk, ROW_NUMBER() OVER (ORDER BY wk DESC) AS rn
    FROM prior_weeks
  )
  SELECT COUNT(*)
  INTO v_streak_weeks
  FROM numbered
  WHERE wk = v_week_start - (rn * INTERVAL '7 days')::INTERVAL;

  -- Base amount with cap
  v_amount := LEAST(v_base, v_weekly_cap - v_this_week_total);

  -- Streak multiplier (applies only while streak is active)
  IF v_streak_weeks >= v_streak_threshold AND v_streak_multiplier > 1 THEN
    v_amount := LEAST(v_amount * v_streak_multiplier, v_weekly_cap - v_this_week_total);
  END IF;

  IF v_amount <= 0 THEN RETURN 0; END IF;

  INSERT INTO earnings (
    user_id, community_id, type, amount, token_type, period_start, period_end
  ) VALUES (
    p_user_id, p_community_id, 'loyalty_reward', v_amount, 'LOOP_LOYALTY',
    v_week_start, v_week_end
  );

  -- Streak bonus (one-off): pay when this week's activity pushes the
  -- streak count from < threshold to >= threshold, and no bonus has
  -- been paid for the current unbroken streak.
  IF v_streak_bonus > 0 AND v_streak_weeks = v_streak_threshold - 1 THEN
    -- Check whether a bonus was already paid for this streak
    SELECT EXISTS (
      SELECT 1 FROM earnings
      WHERE user_id = p_user_id
        AND type = 'streak_bonus'
        AND distributed_at >= v_week_start - (v_streak_threshold * INTERVAL '7 days')
    ) INTO v_bonus_paid_this_streak;

    IF NOT v_bonus_paid_this_streak THEN
      INSERT INTO earnings (
        user_id, community_id, type, amount, token_type, period_start, period_end
      ) VALUES (
        p_user_id, p_community_id, 'streak_bonus', v_streak_bonus, 'LOOP_LOYALTY',
        v_week_start, v_week_end
      );
      v_amount := v_amount + v_streak_bonus;
    END IF;
  END IF;

  RETURN v_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Convert a user's LOOP_LOYALTY balance into LOOP_TKN at the current
-- cascade-configured rate. Uses the user's home community (any of them)
-- to resolve the rate. Ledger entry uses type = 'loyalty_conversion' and
-- posts a positive LOOP_TKN entry with a negative LOOP_LOYALTY offset.
CREATE OR REPLACE FUNCTION convert_loyalty_to_loop(
  p_user_id UUID,
  p_amount_loyalty NUMERIC,
  p_actor_id UUID DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
  v_rate NUMERIC;
  v_loop NUMERIC;
  v_community_id UUID;
  v_cascade JSONB;
  v_settings JSONB;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  IF p_amount_loyalty IS NULL OR p_amount_loyalty <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Determine user's current loyalty balance
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM earnings
  WHERE user_id = p_user_id
    AND token_type = 'LOOP_LOYALTY';

  IF p_amount_loyalty > v_balance THEN
    RAISE EXCEPTION 'Cannot convert % LOOP_LOYALTY: balance is %', p_amount_loyalty, v_balance;
  END IF;

  -- Pick any community the user belongs to, to resolve the cascade
  SELECT cm.community_id INTO v_community_id
  FROM community_memberships cm
  WHERE cm.user_id = p_user_id
  ORDER BY cm.joined_at DESC
  LIMIT 1;

  IF v_community_id IS NOT NULL THEN
    v_cascade := resolve_governance_settings(v_community_id);
    v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);
    v_rate := COALESCE((v_settings->>'loyalty_to_loop_rate')::NUMERIC, 0.01);
  ELSE
    v_rate := 0.01;
  END IF;

  IF v_rate <= 0 THEN
    RAISE EXCEPTION 'Loyalty conversion rate must be positive';
  END IF;

  v_loop := p_amount_loyalty * v_rate;
  v_week_start := date_trunc('week', now())::DATE;
  v_week_end := (v_week_start + INTERVAL '6 days')::DATE;

  -- Debit loyalty balance
  INSERT INTO earnings (
    user_id, community_id, type, amount, token_type, period_start, period_end
  ) VALUES (
    p_user_id,
    COALESCE(v_community_id, (SELECT id FROM communities LIMIT 1)),
    'loyalty_conversion',
    -p_amount_loyalty,
    'LOOP_LOYALTY',
    v_week_start, v_week_end
  );

  -- Credit LOOP_TKN
  INSERT INTO earnings (
    user_id, community_id, type, amount, token_type, period_start, period_end
  ) VALUES (
    p_user_id,
    COALESCE(v_community_id, (SELECT id FROM communities LIMIT 1)),
    'loyalty_conversion',
    v_loop,
    'LOOP_TKN',
    v_week_start, v_week_end
  );

  RETURN v_loop;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
