# Loop Governance: audit voting/scoring SECURITY DEFINER functions — 2026-07-28

## Context

Part 4 of the security advisor backlog — same audit methodology as
`security-03-treasury-function-audit.md`, applied to the remaining 11
`SECURITY DEFINER` functions callable by `anon`/`authenticated`. These don't
move money directly, but they control vote tallies, election outcomes, and
accreditation scores (which in turn drive delegation weight and treasury
payout splits) — getting one of these wrong lets a user manipulate election
results or inflate their own influence, which is a real integrity problem
even without a direct financial angle.

Run `security-03` first if you haven't — the two sessions share the same
"is this trusted enough to run with elevated privileges" review method, and
having just done it once makes this one faster.

**Functions in scope:**
```
increment_votes_for
increment_votes_against
compute_vote_weight
evaluate_proposal
evaluate_all_proposals
compute_accreditation_scores
compute_accreditation_scores_by_subject
refresh_all_accreditation_scores
recompute_power_score
resolve_governance_settings
award_leader_activity
```

---

## Step 1: Pull function bodies and grants

```bash
cd "/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-trading"
supabase db query --linked --output json "
select p.proname, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = any(array[
    'increment_votes_for','increment_votes_against','compute_vote_weight',
    'evaluate_proposal','evaluate_all_proposals','compute_accreditation_scores',
    'compute_accreditation_scores_by_subject','refresh_all_accreditation_scores',
    'recompute_power_score','resolve_governance_settings','award_leader_activity'
  ]);
"
supabase db query --linked --output json "
select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name = any(array[
    'increment_votes_for','increment_votes_against','compute_vote_weight',
    'evaluate_proposal','evaluate_all_proposals','compute_accreditation_scores',
    'compute_accreditation_scores_by_subject','refresh_all_accreditation_scores',
    'recompute_power_score','resolve_governance_settings','award_leader_activity'
  ]);
"
```

---

## Step 2: The specific things to check per function

- **`increment_votes_for` / `increment_votes_against`** — the most
  directly exploitable pair if wrong. Does the function check that the
  caller is actually a member with standing to vote on this specific
  proposal, and that they haven't already voted (or that a repeat call
  doesn't double-count)? If a user can call
  `supabase.rpc('increment_votes_for', {proposal_id: 'x'})` in a loop from
  the browser console, that's a live vote-stuffing bug.
- **`compute_vote_weight`** — is this read-only (just calculates and
  returns a number) or does it write anything? If read-only, it's lower
  risk even if broadly callable; if it writes back to a table, treat it
  like the increment functions above.
- **`evaluate_proposal` / `evaluate_all_proposals`** — do these just
  compute status (safe-ish, but check whether they mutate `proposals.status`
  based on data the caller could have manipulated in the same transaction),
  or trigger downstream effects like closing voting early?
- **`compute_accreditation_scores*` / `refresh_all_accreditation_scores` /
  `recompute_power_score`** — these back the PageRank-style scoring system
  (see `ARCHITECTURE.md`). Check whether a user could call
  `refresh_all_accreditation_scores()` directly and force an expensive
  recompute on demand (a resource-exhaustion/DoS angle, not just a data
  -integrity one — this function loops over every subject and runs an
  iterative PageRank calc per `035_pagerank_subject_only.sql`; check if
  it's rate-limited or if there's nothing stopping repeated direct calls).
- **`resolve_governance_settings`** — read-only settings resolution
  (cascades community → subject → global per `ARCHITECTURE.md`'s
  "Communities are a tree" section) or does it write? If read-only, this
  one's probably fine being broadly callable; confirm before assuming.
- **`award_leader_activity`** — same category of question as
  `award_loyalty` in `security-03`: does it check the caller is authorized
  to award activity credit to the target user, or can any user call it for
  themselves/anyone?

---

## Step 3: Fix per the same pattern as security-03

- Add a missing `WHERE`/ownership guard inside the function body, or
- Revoke `EXECUTE` from `anon`/`authenticated` for anything that's actually
  cron/admin-only today (grep each app's `src` for `.rpc('function_name'`
  to confirm whether client code calls it directly or it's server-only).

Write fixes to `packages/db/migrations/049_voting_function_hardening.sql`.

---

## Step 4: Verify

```bash
supabase db advisors --linked --type security --level warn
```

Confirm all 11 are resolved or documented with a reason for leaving the
grant in place.

**Functional re-test:**
- Cast a real vote in a test proposal, confirm the count updates correctly
  and a second vote from the same user doesn't double-count (if that's
  supposed to be prevented).
- Trigger the nightly score refresh manually (or via the cron route) and
  confirm scores still populate correctly.
- If you revoked any grants, confirm the app's own server-side call paths
  for these functions (portal's cron route, console/admin server actions)
  still work.

## What success looks like

- Each of the 11 functions has a documented answer to "what stops misuse"
- Migration file at `packages/db/migrations/049_...sql`
- A real vote-cast test and a real score-refresh test, both confirmed
  working after the change
- `supabase db advisors --linked --type security --level warn` down to 0
  (or only the tables/functions explicitly deferred to other products, per
  `security-02`'s triage)
