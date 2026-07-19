-- Regional allocations: how a parent community splits funds to its children
-- Each parent community's quorum decides what percentage goes to each child region

CREATE TABLE IF NOT EXISTS regional_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  child_community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  allocation_pct NUMERIC(5,2) NOT NULL CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_community_id, child_community_id)
);

CREATE INDEX IF NOT EXISTS regional_alloc_parent_idx
  ON regional_allocations(parent_community_id);

-- Function: cascade funds from a parent community to its children
-- based on regional allocation percentages
CREATE OR REPLACE FUNCTION cascade_treasury(
  p_parent_community_id UUID,
  p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_alloc RECORD;
  v_total_pct NUMERIC := 0;
  v_child_amount NUMERIC;
  v_results JSONB := '[]'::JSONB;
BEGIN
  -- Validate total allocation doesn't exceed 100%
  SELECT COALESCE(SUM(allocation_pct), 0) INTO v_total_pct
  FROM regional_allocations
  WHERE parent_community_id = p_parent_community_id;

  IF v_total_pct = 0 THEN
    RETURN jsonb_build_object('error', 'No regional allocations configured for this community');
  END IF;

  FOR v_alloc IN
    SELECT ra.*, c.name as child_name
    FROM regional_allocations ra
    JOIN communities c ON c.id = ra.child_community_id
    WHERE ra.parent_community_id = p_parent_community_id
    AND ra.allocation_pct > 0
  LOOP
    v_child_amount := p_amount * (v_alloc.allocation_pct / 100.0);

    -- Outflow from parent
    INSERT INTO treasury_transactions (
      community_id, type, direction, amount,
      description, source_entity_id
    ) VALUES (
      p_parent_community_id, 'project_funding', 'outflow', v_child_amount,
      'Regional cascade to ' || v_alloc.child_name,
      v_alloc.child_community_id
    );

    -- Inflow to child
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
    'allocations', v_results
  );
END;
$$ LANGUAGE plpgsql;
