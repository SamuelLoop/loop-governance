# Loop Governance: audit voting/scoring SECURITY DEFINER functions — 2026-07-28

## Status: done, 2026-08-09

Ran the same methodology as `security-03-treasury-function-audit.md`, using
the now-working `supabase` CLI (see that file's part 2 for how it got
installed/linked in this session).

**Live grants confirmed first:** all 11 originally-scoped functions had
`anon`/`authenticated` EXECUTE. Bodies pulled via `pg_get_functiondef` and
read directly rather than assumed, per function:

### Findings, worst first

1. **`increment_votes_for(p_id)` / `increment_votes_against(p_id)`** (the
   1-arg overloads) are literally:
   ```sql
   UPDATE proposals SET votes_for = votes_for + 1 WHERE id = p_id;
   ```
   Zero auth check, zero membership check, no relationship to the `votes`
   table at all — this doesn't even go through the vote-recording flow, it
   just increments a raw counter. Confirmed live and exposed: **anyone
   with the public anon API key and a proposal ID (visible in any
   proposal's URL) could call this in a loop and stuff arbitrary vote
   counts on any proposal.** This is exactly the "browser console
   vote-stuffing" scenario the original brief flagged as the worst case,
   and it was real. The 2-arg `(p_id, p_weight)` overloads have the
   identical problem — the app's real path (`proposals/[id]/actions.ts`
   `castVote`) only calls the 2-arg version via `service_role`,
   immediately after a real `votes` table insert; a direct caller skips
   that insert entirely and just moves the counter.

2. **`award_leader_activity(p_user_id, p_event_type, p_community_id)`** —
   same shape as `award_loyalty` (security-03) but worse: it mints real
   `LOOP_TKN`, not `LOOP_LOYALTY`, trusting the caller's claimed event type
   completely, rate-limited only by a weekly cap.

3. **`compute_accreditation_scores` / `compute_accreditation_scores_by_subject`**
   — uncapped iterative PageRank. `p_iterations` has no upper-bound
   validation in the function body; a direct caller can pass any value.
   Writes real `accreditation_scores` + `accreditations.weight`.
   `refresh_all_accreditation_scores()` loops this across every subject
   with activity in the last 24h, in one call, with no cooldown/rate
   limit. All three: a genuine DoS/resource-exhaustion vector on the one
   shared Postgres instance backing console, portal, admin, and mobile —
   plus a data-integrity angle, since adversarial damping/iteration
   choices could skew computed influence scores.

4. **`evaluate_proposal` / `evaluate_all_proposals` / `compute_vote_weight`
   / `recompute_power_score`** — lower individual risk. None can fabricate
   vote tallies or scores beyond real underlying data (`evaluate_proposal`
   only finalizes proposals whose `closes_at` has already passed;
   `recompute_power_score` derives entirely from real counted rows). But
   grepping every app confirmed no legitimate direct-client-call use case
   exists for any of them either — revoked for consistency/defense-in-depth,
   same bar applied to everything else in this migration.
   `evaluate_all_proposals` additionally has a real DoS angle (scans every
   open+overdue proposal platform-wide per call).

**Not revoked:** `resolve_governance_settings` — confirmed `STABLE`,
read-only, no `INSERT`/`UPDATE`/`DELETE` anywhere in the body. Nothing to
protect; left as-is per the original brief's own suggestion that read-only
functions are lower priority.

### Fix applied and verified

`packages/db/migrations/052_voting_function_hardening.sql` — revokes
`anon`/`authenticated` EXECUTE on all 10 functions/overloads above.
Applied via `supabase db query --linked -f`.

Verified:
- Direct grants query post-apply: zero `anon`/`authenticated` rows remain
  across all 10.
- `SET ROLE anon; select increment_votes_for(<uuid>, 1);` → `permission
  denied for function increment_votes_for` (the worst finding, individually
  confirmed live).
- `SET ROLE service_role; select increment_votes_for(<bogus-uuid>, 1);` →
  succeeds, returns `null` (void function; the `UPDATE` matched zero rows
  since the UUID doesn't exist, so nothing mutated) — confirms the app's
  real path is unaffected.

`supabase db advisors` was unreachable during this session (`api.supabase.com`
Cloudflare 502, same outage noted in security-03) — not required here since
the direct grants/`SET ROLE` checks above are more authoritative than the
advisor's own summary of the same table.

### security-02 still open

RLS policy review (`sessions/security-02-permissive-rls-policies.md`) is
the one piece of the original backlog not yet run. Different methodology
(reviewing `USING`/`WITH CHECK` clauses on 21 policies, not function
grants) — same CLI is now available for it, no blocker.
