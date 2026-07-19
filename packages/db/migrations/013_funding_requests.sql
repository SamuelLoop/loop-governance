-- Funding requests: communities request allocation from the platform steering committee pool
-- The quorum leadership of a subject can approve requests, releasing funds into the community treasury

CREATE TABLE IF NOT EXISTS funding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(18,4) NOT NULL CHECK (amount > 0),
  token_type TEXT NOT NULL DEFAULT 'LOOP_TKN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  disbursed_at TIMESTAMPTZ,
  transaction_id UUID REFERENCES treasury_transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funding_req_community_idx
  ON funding_requests(community_id, status);
CREATE INDEX IF NOT EXISTS funding_req_status_idx
  ON funding_requests(status, created_at DESC);

-- Platform pool: a single row tracking the steering committee's unallocated fund balance
CREATE TABLE IF NOT EXISTS platform_pool (
  id TEXT PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  balance NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_allocated NUMERIC(18,4) NOT NULL DEFAULT 0,
  total_deposited NUMERIC(18,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_pool (id, balance) VALUES ('main', 0) ON CONFLICT DO NOTHING;

-- Function: approve and disburse a funding request
CREATE OR REPLACE FUNCTION approve_funding_request(
  p_request_id UUID,
  p_reviewer_id UUID,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_req RECORD;
  v_pool RECORD;
  v_tx_id UUID;
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

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_req.amount,
    'community_id', v_req.community_id,
    'transaction_id', v_tx_id
  );
END;
$$ LANGUAGE plpgsql;
