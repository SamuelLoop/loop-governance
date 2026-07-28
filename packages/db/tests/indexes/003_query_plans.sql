-- pgTAP: verify the 3 new delegation indexes cause index scans on real query patterns.
-- Run with: pg_prove -d $DATABASE_URL tests/indexes/003_query_plans.sql

BEGIN;

SELECT plan(6);

-- Helper: returns EXPLAIN text for a query.
CREATE OR REPLACE FUNCTION _explain(query_sql text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  plan  text := '';
  r     record;
BEGIN
  FOR r IN EXECUTE 'EXPLAIN ' || query_sql LOOP
    plan := plan || r."QUERY PLAN" || E'\n';
  END LOOP;
  RETURN plan;
END;
$$;

-- I1: badge page — incoming delegations by (delegate_id, subject_tag, active)
SELECT ok(
  _explain($q$SELECT * FROM delegations
    WHERE delegate_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND subject_tag = 'environment' AND active = true$q$)
    ILIKE '%idx_delegations_delegate_subject_active%',
  'I1: incoming delegations by subject uses idx_delegations_delegate_subject_active'
);
SELECT ok(
  _explain($q$SELECT * FROM delegations
    WHERE delegate_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND subject_tag = 'environment' AND active = true$q$)
    NOT ILIKE '%Seq Scan on delegations%',
  'I1: no seq scan on delegations (incoming subject)'
);

-- I2: power tree — outgoing delegations by (delegator_id, subject_tag, active)
SELECT ok(
  _explain($q$SELECT * FROM delegations
    WHERE delegator_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND subject_tag = 'environment' AND active = true$q$)
    ILIKE '%idx_delegations_delegator_subject_active%',
  'I2: outgoing delegations by subject uses idx_delegations_delegator_subject_active'
);
SELECT ok(
  _explain($q$SELECT * FROM delegations
    WHERE delegator_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND subject_tag = 'environment' AND active = true$q$)
    NOT ILIKE '%Seq Scan on delegations%',
  'I2: no seq scan on delegations (outgoing subject)'
);

-- I3: mobile Power tab — outgoing delegations by (delegator_id, community_id, active)
SELECT ok(
  _explain($q$SELECT id, community_id FROM delegations
    WHERE delegator_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND community_id = '00000000-0000-0000-0000-000000000002'::uuid
    AND active = true$q$)
    ILIKE '%idx_delegations_delegator_community_active%',
  'I3: mobile outgoing delegations by community uses idx_delegations_delegator_community_active'
);
SELECT ok(
  _explain($q$SELECT id, community_id FROM delegations
    WHERE delegator_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND community_id = '00000000-0000-0000-0000-000000000002'::uuid
    AND active = true$q$)
    NOT ILIKE '%Seq Scan on delegations%',
  'I3: no seq scan on delegations (mobile outgoing community)'
);

DROP FUNCTION _explain(text);

SELECT * FROM finish();

ROLLBACK;
