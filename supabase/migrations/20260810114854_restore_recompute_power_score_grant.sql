-- 054_restore_recompute_power_score_grant.sql
-- Corrects an over-eager revocation from 052_voting_function_hardening.sql
-- (security-04), surfaced by functional re-testing while verifying
-- 053_tighten_governance_rls_policies.sql (security-02).
--
-- recompute_power_score(p_user_id, p_subject) was revoked from
-- anon/authenticated in 052 "for consistency" (no direct .rpc() call site
-- was found by grep) — but grep only catches direct calls, not trigger-
-- mediated ones. Four triggers call it via PERFORM:
--   trg_recompute_on_delegation, trg_recompute_on_accreditation,
--   trg_recompute_on_vote, trg_recompute_on_proposal
-- All four are SECURITY INVOKER (not DEFINER), so the internal
-- PERFORM recompute_power_score(...) call runs under whatever role
-- performed the ORIGINAL insert/update on delegations/accreditations/
-- votes/proposals, not under an elevated context.
--
-- votes and proposals are only ever written via createServiceClient() in
-- every app (confirmed by grep) — service_role's own EXECUTE on this
-- function was never touched by 052, so those two triggers were always
-- fine. delegations and accreditations are DIFFERENT: apps/mobile/src/
-- components/GivePowerSheet.tsx writes both directly using the anon-key
-- client as `authenticated` (mobile can never hold the service-role key).
-- Confirmed live via a rolled-back test transaction: a legitimate mobile
-- delegation insert as `authenticated` failed with "permission denied for
-- function recompute_power_score" from inside the trigger, immediately
-- after 053 was applied and re-tested.
--
-- recompute_power_score itself remains low-risk to call directly (see
-- security-04's own writeup): every input it uses to compute a score is
-- counted live from real underlying tables (delegations, accreditations,
-- votes, proposals, community_memberships, earnings) — a caller can pick
-- WHICH user/subject to recompute, but cannot fabricate a score higher
-- than what the real underlying activity supports. That's why this is a
-- targeted re-grant of this one function, not a reversal of any of the
-- other 9 revocations in 052 (increment_votes_for/against,
-- award_leader_activity, compute_accreditation_scores*,
-- refresh_all_accreditation_scores, evaluate_proposal,
-- evaluate_all_proposals, compute_vote_weight all remain revoked — none
-- of those are called by any SECURITY INVOKER trigger with a real
-- direct-authenticated-write path).

BEGIN;

GRANT EXECUTE ON FUNCTION recompute_power_score(UUID, TEXT) TO authenticated;

COMMIT;
