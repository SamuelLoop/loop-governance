-- Off-chain allocation slice tracking for the LoopToken V2 flow.
--
-- Contract stores a single per-buyer allocation total; we track individual
-- slices off-chain so we can enforce the 1-year expiry rule and know
-- exactly which purchase each slice came from. On expiry the daily sweep
-- calls directAllocationFor(buyer, IMPACT_COMMUNITY_ID, expired_amount)
-- on the contract.

BEGIN;

CREATE TABLE IF NOT EXISTS allocation_slices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_wallet TEXT NOT NULL,          -- 0x-prefixed EOA that received the mint
  purchase_id UUID NOT NULL REFERENCES token_purchases(id) ON DELETE CASCADE,
  original_amount NUMERIC NOT NULL CHECK (original_amount > 0),
  remaining_amount NUMERIC NOT NULL CHECK (remaining_amount >= 0),
  minted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  swept_at TIMESTAMPTZ,                -- populated when the expiry sweep runs
  swept_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS allocation_slice_wallet_idx
  ON allocation_slices (buyer_wallet)
  WHERE swept_at IS NULL AND remaining_amount > 0;

CREATE INDEX IF NOT EXISTS allocation_slice_expiry_idx
  ON allocation_slices (expires_at)
  WHERE swept_at IS NULL AND remaining_amount > 0;

-- Record of every allocation direction the buyer initiates. Includes both
-- user-directed (via /claim UI) and expiry-swept flows so the audit trail
-- shows why the balance changed.
CREATE TABLE IF NOT EXISTS allocation_directions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_wallet TEXT NOT NULL,
  community_id UUID REFERENCES communities(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL CHECK (reason IN ('philanthropy','advertising','expiry_sweep')),
  tx_hash TEXT,
  actor_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS allocation_direction_wallet_idx
  ON allocation_directions (buyer_wallet, created_at DESC);

-- Track token_purchases -> on-chain mint tx.
ALTER TABLE token_purchases ADD COLUMN IF NOT EXISTS mint_tx_hash TEXT;

-- Record impact treasury movements initiated by super admin so the admin
-- console can render an audit history.
CREATE TABLE IF NOT EXISTS impact_treasury_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_wallet TEXT NOT NULL,
  recipient_label TEXT,                -- e.g. community name, grantee name
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reason TEXT,
  tx_hash TEXT,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS impact_treasury_transfers_recent_idx
  ON impact_treasury_transfers (created_at DESC);

COMMIT;
