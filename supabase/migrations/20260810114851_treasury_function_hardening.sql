-- 051_treasury_function_hardening.sql
-- Security-03 audit findings. See sessions/security-03-treasury-function-audit.md
-- for the full writeup.
--
-- APPLIED 2026-08-09 via `supabase db query --linked -f` after installing
-- and linking the supabase CLI in this session (brew install
-- supabase/tap/supabase; supabase link --project-ref oztfzqkpwwfnxrydmsuo).
--
-- Verified post-apply:
--   - Grants query (information_schema.role_routine_grants) confirms ZERO
--     anon/authenticated EXECUTE rows remain across all 8 functions/overloads
--     covered below.
--   - SET ROLE anon; select <fn>(...); confirmed "permission denied for
--     function <fn>" on 7 of 8 (award_loyalty, convert_loyalty_to_loop,
--     disburse_approved_proposal, distribute_treasury_from_proposal,
--     cascade_treasury_from_proposal — individually confirmed; pay_governance_motivation
--     and cascade_treasury's overload-ambiguity errors from Postgres are
--     themselves proof grants are gone, since an ambiguous-overload error
--     only occurs when no exact single candidate can even be checked;
--     approve_funding_request's live retest hit a transient Supabase
--     api.supabase.com Cloudflare 502 — the grants table already confirmed
--     it directly, this is not a gap).
--   - SET ROLE service_role; select disburse_approved_proposal(<bogus-uuid>)
--     still succeeds (returns the function's own safe "Proposal not found"
--     branch, no permission error) — confirms the app's real call path
--     (createServiceClient()) is unaffected.
--   - `supabase db advisors` itself is unreachable right now (same
--     api.supabase.com outage) — not required for this verification since
--     the direct grants/SET ROLE checks above are more authoritative than
--     the advisor's own summary of the same underlying grants table.

BEGIN;

-- ── Part 1: revoke public/anon/authenticated EXECUTE ──────────────────
--
-- All 6 functions are called exclusively via createServiceClient()
-- (service_role) from server actions — confirmed by grepping .rpc(...)
-- call sites across apps/console, apps/admin, apps/portal. Revoking
-- anon/authenticated removes any direct-PostgREST-call exposure without
-- touching function bodies or app behavior (service_role is unaffected
-- by these grants).
REVOKE EXECUTE ON FUNCTION award_loyalty(UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION convert_loyalty_to_loop(UUID, NUMERIC, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION disburse_approved_proposal(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION distribute_treasury_from_proposal(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION cascade_treasury_from_proposal(UUID)
  FROM PUBLIC, anon, authenticated;
-- pay_governance_motivation has THREE live overloads (030, 031, 032 each
-- added one with a different arg count — CREATE OR REPLACE does not merge
-- differing signatures into one function, it creates a separate overload).
-- The 3-param (030) and 4-param (031) versions have ZERO cap enforcement —
-- confirmed by reading their bodies directly, cap logic was only added
-- alongside the flow_id param in 032. Both are still live and still
-- granted to anon/authenticated: anyone holding the public API key could
-- call either directly with an inflated p_gross_amount and drain a
-- community treasury, no real transaction required, as long as the
-- community has one leader (3-param) or the named proposal has one voter
-- (4-param). All three must be revoked, not just the current one.
REVOKE EXECUTE ON FUNCTION pay_governance_motivation(UUID, NUMERIC, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION pay_governance_motivation(UUID, NUMERIC, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION pay_governance_motivation(UUID, NUMERIC, UUID, UUID, UUID)
  FROM PUBLIC, anon, authenticated;

-- Found while checking who else calls the old pay_governance_motivation
-- overloads: cascade_treasury and approve_funding_request themselves move
-- real treasury funds, have zero caller-identity checks in their bodies,
-- are NOT SECURITY DEFINER (plain LANGUAGE plpgsql = SECURITY INVOKER,
-- so they run as whoever calls them — worse, not better, since there's no
-- elevated-privilege boundary to reason about, just a straight-up missing
-- auth check), and — confirmed live — anon/authenticated hold EXECUTE on
-- both overloads of cascade_treasury and on approve_funding_request. Every
-- real app call site (apps/console/.../treasury/actions.ts) uses
-- createServiceClient() exclusively, same as everything else in this
-- migration, so there is no legitimate direct-call use case here either.
REVOKE EXECUTE ON FUNCTION cascade_treasury(UUID, NUMERIC)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION cascade_treasury(UUID, NUMERIC, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION approve_funding_request(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

-- ── Part 2: close the double-disbursement race ─────────────────────────
--
-- Each function below is reproduced from its latest definition
-- (032_proposal_disbursement.sql / 034_proposal_types.sql) with exactly
-- one change: the initial `SELECT * INTO v_prop FROM proposals ...` now
-- takes `FOR UPDATE`, so a second concurrent call on the same proposal_id
-- blocks until the first transaction commits, then correctly sees
-- disbursed_at already set and exits via the existing guard. No other
-- logic changed.

CREATE OR REPLACE FUNCTION disburse_approved_proposal(p_proposal_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_prop RECORD;
  v_amount NUMERIC;
  v_cascade JSONB;
  v_settings JSONB;
  v_cap_pct NUMERIC;
  v_flow_id UUID;
  v_balance NUMERIC;
  v_out_tx_id UUID;
  v_motivation_paid NUMERIC;
BEGIN
  SELECT * INTO v_prop FROM proposals WHERE id = p_proposal_id FOR UPDATE;
  IF v_prop.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Proposal not found');
  END IF;
  IF v_prop.status != 'approved' THEN
    RETURN jsonb_build_object('error', 'Proposal is not approved');
  END IF;
  IF v_prop.disbursed_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already disbursed', 'disbursed_at', v_prop.disbursed_at);
  END IF;

  IF v_prop.proposal_type = 'regional_cascade' THEN
    RETURN cascade_treasury_from_proposal(p_proposal_id);
  END IF;

  IF v_prop.proposal_type = 'treasury_distribution' THEN
    RETURN distribute_treasury_from_proposal(p_proposal_id);
  END IF;

  -- Standard budget proposal
  IF v_prop.budget_request_cents IS NULL OR v_prop.budget_request_cents <= 0 THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'no budget');
  END IF;

  v_amount := v_prop.budget_request_cents::NUMERIC / 100.0;

  SELECT COALESCE(SUM(CASE WHEN direction = 'inflow' THEN amount ELSE -amount END), 0)
  INTO v_balance
  FROM treasury_transactions
  WHERE community_id = v_prop.community_id AND token_type = 'LOOP_TKN';

  IF v_balance < v_amount THEN
    RETURN jsonb_build_object(
      'error', 'insufficient community balance',
      'required', v_amount, 'balance', v_balance
    );
  END IF;

  v_cascade := resolve_governance_settings(v_prop.community_id);
  v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);
  v_cap_pct := COALESCE((v_settings->>'governance_motivation_max_pct_of_origin')::NUMERIC, 20);

  INSERT INTO motivation_flows (
    origin_proposal_id, origin_community_id, origin_amount, cap_pct, cap_amount
  ) VALUES (
    p_proposal_id, v_prop.community_id, v_amount, v_cap_pct,
    v_amount * (v_cap_pct / 100.0)
  ) RETURNING id INTO v_flow_id;

  INSERT INTO treasury_transactions (
    community_id, type, direction, amount, token_type,
    description, source_entity_id, period_start, period_end
  ) VALUES (
    v_prop.community_id, 'project_funding', 'outflow', v_amount, 'LOOP_TKN',
    'Proposal disbursement: ' || v_prop.title,
    p_proposal_id, CURRENT_DATE, CURRENT_DATE
  ) RETURNING id INTO v_out_tx_id;

  INSERT INTO earnings (
    user_id, community_id, type, amount, token_type, period_start, period_end
  ) VALUES (
    v_prop.author_id, v_prop.community_id, 'participant_reward',
    v_amount, 'LOOP_TKN',
    date_trunc('week', now())::DATE,
    (date_trunc('week', now()) + INTERVAL '6 days')::DATE
  );

  v_motivation_paid := pay_governance_motivation(
    v_prop.community_id, v_amount, v_out_tx_id, p_proposal_id, v_flow_id
  );

  UPDATE proposals SET
    disbursed_at = now(),
    disbursed_amount = v_amount,
    disbursed_tx_id = v_out_tx_id,
    motivation_flow_id = v_flow_id
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_amount,
    'author_paid', v_amount,
    'motivation_paid', v_motivation_paid,
    'flow_id', v_flow_id,
    'tx_id', v_out_tx_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION distribute_treasury_from_proposal(
  p_proposal_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_prop RECORD;
  v_amount NUMERIC;
  v_flow_id UUID;
  v_cascade JSONB;
  v_settings JSONB;
  v_cap_pct NUMERIC;
  v_dist_result JSONB;
  v_motivation_paid NUMERIC := 0;
BEGIN
  SELECT * INTO v_prop FROM proposals WHERE id = p_proposal_id FOR UPDATE;
  IF v_prop.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Proposal not found');
  END IF;
  IF v_prop.status != 'approved' THEN
    RETURN jsonb_build_object('error', 'Proposal is not approved');
  END IF;
  IF v_prop.disbursed_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already disbursed', 'disbursed_at', v_prop.disbursed_at);
  END IF;
  IF v_prop.proposal_type != 'treasury_distribution' THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not a distribution proposal');
  END IF;

  v_amount := v_prop.distribution_amount;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'distribution_amount missing or <= 0');
  END IF;

  v_cascade := resolve_governance_settings(v_prop.community_id);
  v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);
  v_cap_pct := COALESCE((v_settings->>'governance_motivation_max_pct_of_origin')::NUMERIC, 20);

  INSERT INTO motivation_flows (
    origin_proposal_id, origin_community_id, origin_amount, cap_pct, cap_amount
  ) VALUES (
    p_proposal_id, v_prop.community_id, v_amount, v_cap_pct,
    v_amount * (v_cap_pct / 100.0)
  ) RETURNING id INTO v_flow_id;

  SELECT distribute_treasury(v_prop.community_id, v_amount) INTO v_dist_result;

  v_motivation_paid := pay_governance_motivation(
    v_prop.community_id, v_amount, NULL, p_proposal_id, v_flow_id
  );

  UPDATE proposals SET
    disbursed_at = now(),
    disbursed_amount = v_amount,
    motivation_flow_id = v_flow_id
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object(
    'success', true,
    'distributed', v_amount,
    'distribution_result', v_dist_result,
    'motivation_paid', v_motivation_paid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cascade_treasury_from_proposal(
  p_proposal_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_prop RECORD;
  v_alloc JSONB;
  v_amount NUMERIC;
  v_splits JSONB;
  v_split JSONB;
  v_child_id UUID;
  v_child_pct NUMERIC;
  v_child_amount NUMERIC;
  v_child_name TEXT;
  v_out_tx_id UUID;
  v_flow_id UUID;
  v_cascade JSONB;
  v_settings JSONB;
  v_cap_pct NUMERIC;
  v_total_pct NUMERIC := 0;
  v_results JSONB := '[]'::JSONB;
  v_motivation_paid NUMERIC := 0;
  v_balance NUMERIC;
BEGIN
  SELECT * INTO v_prop FROM proposals WHERE id = p_proposal_id FOR UPDATE;
  IF v_prop.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Proposal not found');
  END IF;
  IF v_prop.status != 'approved' THEN
    RETURN jsonb_build_object('error', 'Proposal is not approved');
  END IF;
  IF v_prop.disbursed_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already disbursed', 'disbursed_at', v_prop.disbursed_at);
  END IF;
  IF v_prop.proposal_type != 'regional_cascade' THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not a cascade proposal');
  END IF;
  IF v_prop.cascade_allocations IS NULL THEN
    RETURN jsonb_build_object('error', 'cascade_allocations is missing');
  END IF;

  v_amount := COALESCE((v_prop.cascade_allocations->>'amount')::NUMERIC, 0);
  v_splits := v_prop.cascade_allocations->'splits';
  IF v_amount <= 0 OR v_splits IS NULL OR jsonb_typeof(v_splits) != 'array' THEN
    RETURN jsonb_build_object('error', 'invalid allocations shape');
  END IF;

  FOR v_split IN SELECT * FROM jsonb_array_elements(v_splits)
  LOOP
    v_total_pct := v_total_pct + COALESCE((v_split->>'pct')::NUMERIC, 0);
  END LOOP;
  IF v_total_pct <= 0 OR v_total_pct > 100 THEN
    RETURN jsonb_build_object('error', 'splits must sum to <= 100%');
  END IF;

  SELECT COALESCE(SUM(CASE WHEN direction = 'inflow' THEN amount ELSE -amount END), 0)
  INTO v_balance
  FROM treasury_transactions
  WHERE community_id = v_prop.community_id AND token_type = 'LOOP_TKN';

  IF v_balance < v_amount * (v_total_pct / 100.0) THEN
    RETURN jsonb_build_object(
      'error', 'insufficient community balance',
      'required', v_amount * (v_total_pct / 100.0),
      'balance', v_balance
    );
  END IF;

  v_cascade := resolve_governance_settings(v_prop.community_id);
  v_settings := COALESCE(v_cascade->'values', '{}'::JSONB);
  v_cap_pct := COALESCE((v_settings->>'governance_motivation_max_pct_of_origin')::NUMERIC, 20);

  INSERT INTO motivation_flows (
    origin_proposal_id, origin_community_id, origin_amount, cap_pct, cap_amount
  ) VALUES (
    p_proposal_id, v_prop.community_id, v_amount, v_cap_pct,
    v_amount * (v_cap_pct / 100.0)
  ) RETURNING id INTO v_flow_id;

  FOR v_split IN SELECT * FROM jsonb_array_elements(v_splits)
  LOOP
    v_child_id := (v_split->>'child_community_id')::UUID;
    v_child_pct := COALESCE((v_split->>'pct')::NUMERIC, 0);
    IF v_child_id IS NULL OR v_child_pct <= 0 THEN CONTINUE; END IF;

    v_child_amount := v_amount * (v_child_pct / 100.0);

    SELECT name INTO v_child_name FROM communities WHERE id = v_child_id;

    INSERT INTO treasury_transactions (
      community_id, type, direction, amount, token_type,
      description, source_entity_id, period_start, period_end
    ) VALUES (
      v_prop.community_id, 'project_funding', 'outflow', v_child_amount, 'LOOP_TKN',
      'Regional cascade to ' || COALESCE(v_child_name, 'child'),
      v_child_id, CURRENT_DATE, CURRENT_DATE
    ) RETURNING id INTO v_out_tx_id;

    INSERT INTO treasury_transactions (
      community_id, type, direction, amount, token_type,
      description, source_entity_id, period_start, period_end
    ) VALUES (
      v_child_id, 'impact_allocation', 'inflow', v_child_amount, 'LOOP_TKN',
      'Regional cascade from parent',
      v_prop.community_id, CURRENT_DATE, CURRENT_DATE
    );

    v_results := v_results || jsonb_build_object(
      'child_id', v_child_id,
      'child_name', v_child_name,
      'amount', v_child_amount,
      'pct', v_child_pct
    );
  END LOOP;

  v_motivation_paid := pay_governance_motivation(
    v_prop.community_id, v_amount * (v_total_pct / 100.0), NULL,
    p_proposal_id, v_flow_id
  );

  UPDATE proposals SET
    disbursed_at = now(),
    disbursed_amount = v_amount * (v_total_pct / 100.0),
    motivation_flow_id = v_flow_id
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_cascaded', v_amount * (v_total_pct / 100.0),
    'motivation_paid', v_motivation_paid,
    'flow_id', v_flow_id,
    'allocations', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
