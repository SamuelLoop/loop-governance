-- Admin Console schema: org-level admin assignments, subject allocations,
-- loyalty config, audit log, moderation flags, and spending cap enforcement.

-- ── 1. Extend platform_role to include org_admin and org_manager ────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_platform_role_check;
ALTER TABLE users ADD CONSTRAINT users_platform_role_check
  CHECK (platform_role IN ('member', 'platform_admin', 'org_admin', 'org_manager'));

-- ── 2. Admin assignments (links users to white-label orgs with a role) ──────
CREATE TABLE IF NOT EXISTS admin_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  white_label_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('org_admin', 'org_manager')),
  granted_by UUID NOT NULL REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, white_label_id)
);

CREATE INDEX IF NOT EXISTS admin_assignments_wl_idx
  ON admin_assignments(white_label_id);

ALTER TABLE admin_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_assignments_select ON admin_assignments
  FOR SELECT USING (true);

CREATE POLICY admin_assignments_insert ON admin_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY admin_assignments_update ON admin_assignments
  FOR UPDATE USING (true);

-- ── 3. Subject allocations (per-org budget split by subject) ────────────────
CREATE TABLE IF NOT EXISTS subject_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_label_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  allocation_pct NUMERIC(5,2) NOT NULL CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
  proposal_cap_cents INTEGER CHECK (proposal_cap_cents >= 0),
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(white_label_id, subject)
);

CREATE INDEX IF NOT EXISTS subject_allocations_wl_idx
  ON subject_allocations(white_label_id);

ALTER TABLE subject_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY subject_allocations_select ON subject_allocations
  FOR SELECT USING (true);

CREATE POLICY subject_allocations_insert ON subject_allocations
  FOR INSERT WITH CHECK (true);

CREATE POLICY subject_allocations_update ON subject_allocations
  FOR UPDATE USING (true);

-- ── 4. Loyalty config (per-org loyalty token settings) ──────────────────────
CREATE TABLE IF NOT EXISTS loyalty_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_label_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  tokens_per_action NUMERIC(8,2) NOT NULL DEFAULT 1,
  weekly_cap INTEGER NOT NULL DEFAULT 50,
  streak_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  streak_threshold_weeks INTEGER NOT NULL DEFAULT 4,
  streak_bonus NUMERIC(8,2) NOT NULL DEFAULT 10,
  delegation_reward NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(white_label_id)
);

ALTER TABLE loyalty_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY loyalty_config_select ON loyalty_config
  FOR SELECT USING (true);

CREATE POLICY loyalty_config_insert ON loyalty_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY loyalty_config_update ON loyalty_config
  FOR UPDATE USING (true);

-- ── 5. Admin audit log (append-only event trail) ────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_label_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  detail JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_wl_idx
  ON admin_audit_log(white_label_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx
  ON admin_audit_log(actor_id, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_audit_log_select ON admin_audit_log
  FOR SELECT USING (true);

CREATE POLICY admin_audit_log_insert ON admin_audit_log
  FOR INSERT WITH CHECK (true);

-- No UPDATE or DELETE policies: append-only for non-service roles

-- ── 6. Moderation flags ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_label_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('message', 'proposal', 'user', 'community')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'actioned', 'dismissed')),
  resolved_by UUID REFERENCES users(id),
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_flags_wl_idx
  ON moderation_flags(white_label_id, status);

ALTER TABLE moderation_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY moderation_flags_select ON moderation_flags
  FOR SELECT USING (true);

CREATE POLICY moderation_flags_insert ON moderation_flags
  FOR INSERT WITH CHECK (true);

CREATE POLICY moderation_flags_update ON moderation_flags
  FOR UPDATE USING (true);

-- ── 7. Spending cap on communities ──────────────────────────────────────────
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS proposal_cap_cents INTEGER CHECK (proposal_cap_cents >= 0);

-- Trigger: enforce proposal budget_request_cents <= community proposal_cap_cents
CREATE OR REPLACE FUNCTION enforce_proposal_cap()
RETURNS TRIGGER AS $$
DECLARE
  v_cap INTEGER;
BEGIN
  IF NEW.budget_request_cents IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT proposal_cap_cents INTO v_cap
  FROM communities
  WHERE id = NEW.community_id;

  IF v_cap IS NOT NULL AND NEW.budget_request_cents > v_cap THEN
    RAISE EXCEPTION 'budget_request_cents (%) exceeds community spending cap (%)',
      NEW.budget_request_cents, v_cap;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_proposal_cap ON proposals;

CREATE TRIGGER trg_enforce_proposal_cap
  BEFORE INSERT OR UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION enforce_proposal_cap();
