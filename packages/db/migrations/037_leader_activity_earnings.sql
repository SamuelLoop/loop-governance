-- Pass 4C: leader activity earnings.
--
-- Same mechanism as award_loyalty for members, but for leader-only
-- activities that don't count toward the loyalty weekly cap. Runs off
-- its own set of cascade knobs (leader_activity_*) so admins can tune
-- separately.
--
-- Wired events:
--   'moderation' - a leader resolves a moderation flag (action or
--                  dismiss). Fires from the admin console today.
--
-- Configured but not yet wired (no application trigger point yet):
--   'learning' - encourage learning about the subject
--   'advert'   - gate an advert to the community
--
-- Tokens are issued as leader_reward in LOOP_TKN (matches distribution
-- and motivation rewards), not LOOP_LOYALTY, since these are leadership
-- compensation not member engagement.

BEGIN;

CREATE OR REPLACE FUNCTION award_leader_activity(
  p_user_id UUID,
  p_event_type TEXT,   -- 'moderation' | 'learning' | 'advert'
  p_community_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_cascade JSONB;
  v_settings JSONB;
  v_enabled BOOLEAN;
  v_base NUMERIC;
  v_weekly_cap NUMERIC;
  v_this_week_total NUMERIC;
  v_amount NUMERIC;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  IF p_community_id IS NULL THEN RETURN 0; END IF;

  v_cascade := resolve_governance_settings(p_community_id);
  v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);

  v_enabled := CASE p_event_type
    WHEN 'moderation' THEN COALESCE((v_settings->>'leader_activity_award_moderation')::BOOLEAN, false)
    WHEN 'learning'   THEN COALESCE((v_settings->>'leader_activity_award_learning')::BOOLEAN, false)
    WHEN 'advert'     THEN COALESCE((v_settings->>'leader_activity_award_advert')::BOOLEAN, false)
    ELSE false
  END;
  IF NOT v_enabled THEN RETURN 0; END IF;

  v_base := CASE p_event_type
    WHEN 'moderation' THEN COALESCE((v_settings->>'leader_activity_tokens_per_moderation')::NUMERIC, 0)
    WHEN 'learning'   THEN COALESCE((v_settings->>'leader_activity_tokens_per_learning')::NUMERIC, 0)
    WHEN 'advert'     THEN COALESCE((v_settings->>'leader_activity_tokens_per_advert')::NUMERIC, 0)
  END;
  IF v_base <= 0 THEN RETURN 0; END IF;

  v_weekly_cap := COALESCE((v_settings->>'leader_activity_weekly_cap')::NUMERIC, 100);

  v_week_start := date_trunc('week', now())::DATE;
  v_week_end := (v_week_start + INTERVAL '6 days')::DATE;

  -- Weekly cap tracks only leader_activity earnings (LOOP_TKN,
  -- type=leader_reward, with a description tag so we don't double-count
  -- treasury distributions or motivation payouts).
  SELECT COALESCE(SUM(amount), 0) INTO v_this_week_total
  FROM earnings
  WHERE user_id = p_user_id
    AND token_type = 'LOOP_TKN'
    AND type = 'leader_reward'
    AND distributed_at >= v_week_start
    AND community_id = p_community_id;

  IF v_this_week_total >= v_weekly_cap THEN RETURN 0; END IF;

  v_amount := LEAST(v_base, v_weekly_cap - v_this_week_total);
  IF v_amount <= 0 THEN RETURN 0; END IF;

  INSERT INTO earnings (
    user_id, community_id, type, amount, token_type, period_start, period_end
  ) VALUES (
    p_user_id, p_community_id, 'leader_reward', v_amount, 'LOOP_TKN',
    v_week_start, v_week_end
  );

  RETURN v_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
