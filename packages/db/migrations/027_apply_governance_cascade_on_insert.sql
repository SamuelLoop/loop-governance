-- On community insert, if the governance cascade has any value set at
-- platform / white_label / subject scope for this new community's subject
-- and owning white_label, use it - otherwise keep whatever the caller
-- provided (matches current 10/5/3-by-level defaults).
-- Community-scope settings do not apply to new communities of course, since
-- they belong to a specific community_id that only exists after insert.

BEGIN;

CREATE OR REPLACE FUNCTION apply_governance_cascade_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_wl UUID;
  v_root_slug TEXT;
  v_platform JSONB := '{}';
  v_wl_scope JSONB := '{}';
  v_subj JSONB := '{}';
  v_merged JSONB;
BEGIN
  v_root_slug := split_part(NEW.path::text, '.', 1);

  SELECT source_white_label_id INTO v_wl
  FROM communities
  WHERE slug = v_root_slug AND level = 'global'
  LIMIT 1;

  SELECT COALESCE(settings, '{}') INTO v_platform
  FROM governance_settings
  WHERE scope_type = 'platform'
  LIMIT 1;

  IF v_wl IS NOT NULL THEN
    SELECT COALESCE(settings, '{}') INTO v_wl_scope
    FROM governance_settings
    WHERE scope_type = 'white_label' AND white_label_id = v_wl
    LIMIT 1;

    SELECT COALESCE(settings, '{}') INTO v_subj
    FROM governance_settings
    WHERE scope_type = 'subject' AND white_label_id = v_wl AND subject = NEW.subject
    LIMIT 1;
  END IF;

  v_merged := v_platform || v_wl_scope || v_subj;

  IF v_merged ? 'quorum_size' THEN
    NEW.quorum_size := (v_merged->>'quorum_size')::INTEGER;
  END IF;
  IF v_merged ? 'quorum_threshold_pct' THEN
    NEW.quorum_threshold_pct := (v_merged->>'quorum_threshold_pct')::NUMERIC;
  END IF;
  IF v_merged ? 'dunbar_limit' THEN
    NEW.dunbar_limit := (v_merged->>'dunbar_limit')::INTEGER;
  END IF;
  IF v_merged ? 'max_delegation_depth' THEN
    NEW.max_delegation_depth := (v_merged->>'max_delegation_depth')::INTEGER;
  END IF;
  IF v_merged ? 'delegation_decay' THEN
    NEW.delegation_decay := (v_merged->>'delegation_decay')::NUMERIC;
  END IF;
  IF v_merged ? 'proposal_cap_cents' THEN
    NEW.proposal_cap_cents := (v_merged->>'proposal_cap_cents')::INTEGER;
  END IF;
  IF v_merged ? 'default_visibility' AND NEW.visibility IS NULL THEN
    NEW.visibility := v_merged->>'default_visibility';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_governance_cascade ON communities;
CREATE TRIGGER trg_apply_governance_cascade
  BEFORE INSERT ON communities
  FOR EACH ROW
  EXECUTE FUNCTION apply_governance_cascade_on_insert();

COMMIT;
