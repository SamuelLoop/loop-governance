-- Composite index audit (2026-07-28).
-- All other tables already have the needed indexes from prior migrations.
-- Only three delegation indexes are genuinely missing.

BEGIN;

-- badge page: incoming delegations filtered by (delegate_id, subject_tag, active).
-- Existing delegation_delegate_idx covers (delegate_id, community_id) — no subject_tag.
CREATE INDEX IF NOT EXISTS idx_delegations_delegate_subject_active
  ON delegations (delegate_id, subject_tag)
  WHERE active = true;

-- power tree outgoing: filtered by (delegator_id, subject_tag, active).
-- Existing delegation_unique_idx covers (delegator_id, community_id, subject_tag) WHERE active.
-- That index cannot serve queries without a community_id filter since community_id is
-- the second column. A dedicated (delegator_id, subject_tag) partial index fixes this.
CREATE INDEX IF NOT EXISTS idx_delegations_delegator_subject_active
  ON delegations (delegator_id, subject_tag)
  WHERE active = true;

-- mobile Power tab / DelegationList: outgoing delegations by (delegator_id, community_id, active).
-- Existing delegation_unique_idx requires subject_tag in the filter to scan efficiently.
-- Mobile queries omit subject_tag, so a dedicated (delegator_id, community_id) partial index
-- is needed.
CREATE INDEX IF NOT EXISTS idx_delegations_delegator_community_active
  ON delegations (delegator_id, community_id)
  WHERE active = true;

COMMIT;
