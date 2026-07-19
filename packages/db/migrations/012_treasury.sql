-- Treasury system: token flow management for governance communities
-- Tracks inflows (impact allocation, ad donations) and outflows (participant/leader rewards)

-- Distribution rules: how each community splits incoming funds
CREATE TABLE IF NOT EXISTS distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  leader_pct NUMERIC(5,2) NOT NULL DEFAULT 40.00,
  participant_pct NUMERIC(5,2) NOT NULL DEFAULT 35.00,
  delegator_pct NUMERIC(5,2) NOT NULL DEFAULT 25.00,
  min_activity_threshold INTEGER NOT NULL DEFAULT 1,
  distribution_period_days INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id),
  CONSTRAINT pct_sum_100 CHECK (leader_pct + participant_pct + delegator_pct = 100.00)
);

-- Treasury transactions: every token movement in or out
CREATE TABLE IF NOT EXISTS treasury_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'impact_allocation',
    'ad_donation',
    'external_grant',
    'member_contribution',
    'leader_reward',
    'participant_reward',
    'delegator_reward',
    'project_funding',
    'operational'
  )),
  direction TEXT NOT NULL CHECK (direction IN ('inflow', 'outflow')),
  amount NUMERIC(18,4) NOT NULL CHECK (amount > 0),
  token_type TEXT NOT NULL DEFAULT 'LOOP_TKN',
  description TEXT,
  source_entity_id UUID,
  recipient_user_id UUID REFERENCES users(id),
  period_start DATE,
  period_end DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS treasury_tx_community_idx
  ON treasury_transactions(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS treasury_tx_type_idx
  ON treasury_transactions(type, direction);
CREATE INDEX IF NOT EXISTS treasury_tx_recipient_idx
  ON treasury_transactions(recipient_user_id, created_at DESC);

-- Earnings: aggregated per-user per-community per-period
-- Materialised from treasury_transactions for fast dashboard queries
CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('leader_reward', 'participant_reward', 'delegator_reward')),
  amount NUMERIC(18,4) NOT NULL CHECK (amount >= 0),
  token_type TEXT NOT NULL DEFAULT 'LOOP_TKN',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transaction_id UUID REFERENCES treasury_transactions(id),
  UNIQUE(user_id, community_id, type, period_start)
);

CREATE INDEX IF NOT EXISTS earnings_user_idx
  ON earnings(user_id, distributed_at DESC);
CREATE INDEX IF NOT EXISTS earnings_community_idx
  ON earnings(community_id, period_start DESC);

-- View: community treasury balance (sum of inflows minus outflows)
CREATE OR REPLACE VIEW community_treasury_balance AS
SELECT
  community_id,
  token_type,
  COALESCE(SUM(CASE WHEN direction = 'inflow' THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN direction = 'outflow' THEN amount ELSE 0 END), 0) AS balance,
  COALESCE(SUM(CASE WHEN direction = 'inflow' THEN amount ELSE 0 END), 0) AS total_inflow,
  COALESCE(SUM(CASE WHEN direction = 'outflow' THEN amount ELSE 0 END), 0) AS total_outflow,
  COUNT(*) FILTER (WHERE direction = 'inflow') AS inflow_count,
  COUNT(*) FILTER (WHERE direction = 'outflow') AS outflow_count
FROM treasury_transactions
GROUP BY community_id, token_type;

-- Function: distribute treasury funds for a community based on its rules
-- Called periodically (cron or manual trigger) to pay out participants
CREATE OR REPLACE FUNCTION distribute_treasury(
  p_community_id UUID,
  p_amount NUMERIC,
  p_period_start DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_period_end DATE DEFAULT CURRENT_DATE
) RETURNS JSONB AS $$
DECLARE
  v_rules RECORD;
  v_leader_pool NUMERIC;
  v_participant_pool NUMERIC;
  v_delegator_pool NUMERIC;
  v_leaders UUID[];
  v_participants UUID[];
  v_delegators UUID[];
  v_per_leader NUMERIC;
  v_per_participant NUMERIC;
  v_per_delegator NUMERIC;
  v_uid UUID;
  v_tx_id UUID;
  v_result JSONB;
BEGIN
  -- Get distribution rules (or use defaults)
  SELECT * INTO v_rules
  FROM distribution_rules
  WHERE community_id = p_community_id;

  IF v_rules IS NULL THEN
    v_rules := ROW(
      NULL, p_community_id,
      40.00, 35.00, 25.00,
      1, 30, now()
    )::distribution_rules;
  END IF;

  -- Calculate pools
  v_leader_pool := p_amount * (v_rules.leader_pct / 100.0);
  v_participant_pool := p_amount * (v_rules.participant_pct / 100.0);
  v_delegator_pool := p_amount * (v_rules.delegator_pct / 100.0);

  -- Find eligible leaders (quorum members)
  SELECT ARRAY_AGG(user_id) INTO v_leaders
  FROM community_memberships
  WHERE community_id = p_community_id AND role = 'quorum';

  -- Find eligible active participants (voted or proposed in period)
  SELECT ARRAY_AGG(DISTINCT u.id) INTO v_participants
  FROM users u
  WHERE u.id IN (
    SELECT voter_id FROM votes v
    JOIN proposals p ON p.id = v.proposal_id
    WHERE p.community_id = p_community_id
      AND v.cast_at >= p_period_start
      AND v.cast_at < p_period_end + INTERVAL '1 day'
    UNION
    SELECT author_id FROM proposals
    WHERE community_id = p_community_id
      AND created_at >= p_period_start
      AND created_at < p_period_end + INTERVAL '1 day'
  )
  AND u.id NOT IN (SELECT UNNEST(COALESCE(v_leaders, ARRAY[]::UUID[])));

  -- Find eligible delegators (anyone who delegated to someone in this community)
  SELECT ARRAY_AGG(DISTINCT delegator_id) INTO v_delegators
  FROM delegations d
  JOIN community_memberships cm ON cm.user_id = d.delegate_id
    AND cm.community_id = p_community_id
  WHERE d.subject_tag = (
    SELECT subject FROM communities WHERE id = p_community_id
  )
  AND d.delegator_id NOT IN (SELECT UNNEST(COALESCE(v_leaders, ARRAY[]::UUID[])))
  AND d.delegator_id NOT IN (SELECT UNNEST(COALESCE(v_participants, ARRAY[]::UUID[])));

  -- Distribute to leaders
  IF v_leaders IS NOT NULL AND array_length(v_leaders, 1) > 0 THEN
    v_per_leader := v_leader_pool / array_length(v_leaders, 1);
    FOREACH v_uid IN ARRAY v_leaders LOOP
      INSERT INTO treasury_transactions (community_id, type, direction, amount, recipient_user_id, period_start, period_end, description)
      VALUES (p_community_id, 'leader_reward', 'outflow', v_per_leader, v_uid, p_period_start, p_period_end, 'Period distribution: leader reward')
      RETURNING id INTO v_tx_id;

      INSERT INTO earnings (user_id, community_id, type, amount, period_start, period_end, transaction_id)
      VALUES (v_uid, p_community_id, 'leader_reward', v_per_leader, p_period_start, p_period_end, v_tx_id)
      ON CONFLICT (user_id, community_id, type, period_start) DO UPDATE SET
        amount = earnings.amount + EXCLUDED.amount;
    END LOOP;
  END IF;

  -- Distribute to participants
  IF v_participants IS NOT NULL AND array_length(v_participants, 1) > 0 THEN
    v_per_participant := v_participant_pool / array_length(v_participants, 1);
    FOREACH v_uid IN ARRAY v_participants LOOP
      INSERT INTO treasury_transactions (community_id, type, direction, amount, recipient_user_id, period_start, period_end, description)
      VALUES (p_community_id, 'participant_reward', 'outflow', v_per_participant, v_uid, p_period_start, p_period_end, 'Period distribution: participant reward')
      RETURNING id INTO v_tx_id;

      INSERT INTO earnings (user_id, community_id, type, amount, period_start, period_end, transaction_id)
      VALUES (v_uid, p_community_id, 'participant_reward', v_per_participant, p_period_start, p_period_end, v_tx_id)
      ON CONFLICT (user_id, community_id, type, period_start) DO UPDATE SET
        amount = earnings.amount + EXCLUDED.amount;
    END LOOP;
  END IF;

  -- Distribute to delegators
  IF v_delegators IS NOT NULL AND array_length(v_delegators, 1) > 0 THEN
    v_per_delegator := v_delegator_pool / array_length(v_delegators, 1);
    FOREACH v_uid IN ARRAY v_delegators LOOP
      INSERT INTO treasury_transactions (community_id, type, direction, amount, recipient_user_id, period_start, period_end, description)
      VALUES (p_community_id, 'delegator_reward', 'outflow', v_per_delegator, v_uid, p_period_start, p_period_end, 'Period distribution: delegator reward')
      RETURNING id INTO v_tx_id;

      INSERT INTO earnings (user_id, community_id, type, amount, period_start, period_end, transaction_id)
      VALUES (v_uid, p_community_id, 'delegator_reward', v_per_delegator, p_period_start, p_period_end, v_tx_id)
      ON CONFLICT (user_id, community_id, type, period_start) DO UPDATE SET
        amount = earnings.amount + EXCLUDED.amount;
    END LOOP;
  END IF;

  v_result := jsonb_build_object(
    'community_id', p_community_id,
    'total_distributed', p_amount,
    'leader_pool', v_leader_pool,
    'participant_pool', v_participant_pool,
    'delegator_pool', v_delegator_pool,
    'leaders_paid', COALESCE(array_length(v_leaders, 1), 0),
    'participants_paid', COALESCE(array_length(v_participants, 1), 0),
    'delegators_paid', COALESCE(array_length(v_delegators, 1), 0)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
