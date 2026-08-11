-- 052_voting_function_hardening.sql
-- Security-04 audit findings. See sessions/security-04-voting-function-audit.md.
--
-- Live grants confirmed via `supabase db query --linked` before writing this:
-- all 11 originally-scoped functions had anon/authenticated EXECUTE. Bodies
-- pulled and read directly (pg_get_functiondef) rather than assumed.
--
-- Findings, worst first:
--
-- 1. increment_votes_for(p_id) / increment_votes_against(p_id) [1-arg
--    overload] are LITERALLY `UPDATE proposals SET votes_for = votes_for + 1
--    WHERE id = p_id` — zero auth check, zero membership check, zero
--    relationship to the `votes` table at all. Anyone with the public
--    anon API key and a proposal ID (visible in any proposal's URL) could
--    call this in a loop and stuff arbitrary vote counts on any proposal.
--    This is exactly the "browser console vote-stuffing" scenario the
--    security-04 brief warned about, confirmed live. The 2-arg
--    (p_id, p_weight) overloads have the same problem — real app usage
--    (apps/console/.../proposals/[id]/actions.ts castVote) only calls the
--    2-arg version via service_role, immediately after a real `votes`
--    table insert; direct callers skip that insert entirely.
--
-- 2. award_leader_activity(p_user_id, p_event_type, p_community_id) —
--    same shape as award_loyalty (security-03) but worse: it mints real
--    LOOP_TKN (not LOOP_LOYALTY), trusting the caller's claimed event
--    type completely, rate-limited only by a weekly cap.
--
-- 3. compute_accreditation_scores / compute_accreditation_scores_by_subject
--    — uncapped iterative PageRank (p_iterations has no upper bound
--    validation, defaults to 10 but a direct caller can pass any value)
--    that writes real accreditation_scores + accreditations.weight.
--    refresh_all_accreditation_scores() loops this across every subject
--    with recent activity in one call. All three: real DoS/resource-
--    exhaustion vector on the one shared Postgres instance backing all
--    four apps, plus a data-integrity angle (adversarial damping/iteration
--    choices could skew computed influence scores).
--
-- 4. evaluate_proposal / evaluate_all_proposals / compute_vote_weight /
--    recompute_power_score — lower individual risk (can't fabricate vote
--    tallies or scores beyond real underlying data; evaluate_proposal only
--    finalizes proposals whose closes_at has already passed), but grepping
--    every app confirms no legitimate direct-client-call use case exists
--    for any of them either — revoked for consistency/defense-in-depth,
--    same standard applied to every other function in this migration.
--    evaluate_all_proposals in particular has a real DoS angle (scans
--    every open+overdue proposal platform-wide per call).
--
-- NOT revoked: resolve_governance_settings — confirmed STABLE, read-only,
-- no INSERT/UPDATE/DELETE anywhere in the body. Nothing to protect; left
-- as-is per the brief's own suggestion.

BEGIN;

REVOKE EXECUTE ON FUNCTION increment_votes_for(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_votes_for(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_votes_against(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_votes_against(UUID, INTEGER) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION award_leader_activity(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION compute_accreditation_scores(UUID, TEXT, REAL, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION compute_accreditation_scores_by_subject(TEXT, REAL, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION refresh_all_accreditation_scores() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION evaluate_proposal(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION evaluate_all_proposals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION compute_vote_weight(UUID, UUID, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION recompute_power_score(UUID, TEXT) FROM PUBLIC, anon, authenticated;

COMMIT;
