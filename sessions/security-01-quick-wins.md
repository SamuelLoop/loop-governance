# Loop Governance: security advisor quick wins — 2026-07-28

## Context

Following the 2026-07-28 RLS/SECURITY DEFINER fixes (`sessions/bugfix-backlog.md`
has the history — migrations 044 and 045), `supabase db advisors --linked
--type security` still shows 102 WARN-level findings on the shared Supabase
project `oztfzqkpwwfnxrydmsuo` ("loop-trading" — this database backs
`loop-governance` AND other products: Loop Cmbntr, loop-bank, loop-canada.
See "Shared database" note in `ARCHITECTURE.md`).

This session is the cheap, mechanical, low-risk slice of that backlog:
`function_search_path_mutable` (38 functions) + `auth_leaked_password_protection`
(1 project setting). No judgment calls, no reading application logic — just
apply the standard fix and verify.

**Do not touch** the other two WARN categories (`rls_policy_always_true`,
`security_definer_function_executable`) in this session — they need real
judgment and have their own dedicated sessions (`security-02`, `security-03`,
`security-04`).

---

## Step 1: Confirm current state

```bash
cd "/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-trading"
supabase db advisors --linked --type security --level warn
```

Confirm the counts still roughly match (38 `function_search_path_mutable`, 1
`auth_leaked_password_protection`). If the numbers have changed a lot, stop
and figure out why before proceeding — someone else may have already worked
on this.

---

## Step 2: Fix `function_search_path_mutable` (38 functions)

Affected functions (get the current list from Step 1's output, this is the
list as of 2026-07-28 for reference):

```
acctg_set_updated_at, increment_votes_for, increment_votes_against,
compute_vote_weight, evaluate_proposal, evaluate_all_proposals,
compute_accreditation_scores, refresh_all_accreditation_scores,
advance_election_phases, tally_election, expire_quorum_terms,
check_and_trigger_elections, distribute_treasury, approve_funding_request,
cascade_treasury, enforce_proposal_cap, resolve_governance_settings,
apply_governance_cascade_on_insert, award_loyalty, convert_loyalty_to_loop,
pay_governance_motivation, disburse_approved_proposal,
cascade_treasury_from_proposal, distribute_treasury_from_proposal,
compute_accreditation_scores_by_subject, award_leader_activity,
build_tree_snapshot, recompute_power_score, trg_recompute_on_delegation,
trg_recompute_on_accreditation, trg_recompute_on_vote,
trg_recompute_on_proposal, trg_enqueue_accreditation_score
```

**Important caveat:** `acctg_set_updated_at` is a Loop Accounting function
(the `acctg_` prefix), not a `loop-governance` function — it's only in this
list because the Supabase project is shared. Fix it too (it's the same
mechanical change), but don't touch any other `acctg_` object, and mention in
your summary that you touched a Loop Accounting function so that project's
owner knows.

**The fix**, generated as a migration (`packages/db/migrations/046_fix_function_search_paths.sql`):

```sql
-- Generate one ALTER FUNCTION per affected function. Use pg_proc to get
-- exact signatures first — several names above are overloaded (e.g.
-- pay_governance_motivation, cascade_treasury appear more than once in the
-- advisor output, meaning multiple overloads exist).
select
  'ALTER FUNCTION ' || n.nspname || '.' || p.proname || '(' ||
  pg_get_function_identity_arguments(p.oid) || ') SET search_path = '''';'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = ANY(ARRAY[
    'acctg_set_updated_at','increment_votes_for','increment_votes_against',
    'compute_vote_weight','evaluate_proposal','evaluate_all_proposals',
    'compute_accreditation_scores','refresh_all_accreditation_scores',
    'advance_election_phases','tally_election','expire_quorum_terms',
    'check_and_trigger_elections','distribute_treasury','approve_funding_request',
    'cascade_treasury','enforce_proposal_cap','resolve_governance_settings',
    'apply_governance_cascade_on_insert','award_loyalty','convert_loyalty_to_loop',
    'pay_governance_motivation','disburse_approved_proposal',
    'cascade_treasury_from_proposal','distribute_treasury_from_proposal',
    'compute_accreditation_scores_by_subject','award_leader_activity',
    'build_tree_snapshot','recompute_power_score','trg_recompute_on_delegation',
    'trg_recompute_on_accreditation','trg_recompute_on_vote',
    'trg_recompute_on_proposal','trg_enqueue_accreditation_score'
  ]);
```

Run that `select` first via `supabase db query --linked` to generate the
exact `ALTER FUNCTION` statements (it resolves overloads correctly), paste
the output into the migration file below the comment, then apply the
migration:

```bash
supabase db query --linked --file packages/db/migrations/046_fix_function_search_paths.sql
```

`SET search_path = ''` is the standard Supabase-recommended fix — it forces
fully-qualified references inside the function body. If any function breaks
because it relies on unqualified table names resolving via search_path
(rare, but check trigger functions especially), use `SET search_path =
'public'` for that one instead of `''`, and note which one and why.

---

## Step 3: Fix `auth_leaked_password_protection`

This is not a SQL fix — it's a Supabase Auth project setting (checks new
passwords against the HaveIBeenPwned breached-password database). Enable it
via the Supabase dashboard (Authentication → Policies → "Leaked password
protection") or the Management API — there's no CLI migration for this one.

Per this session's standing instructions: changing account/security settings
requires explicit user confirmation before you flip it. Ask first.

---

## Step 4: Verify

```bash
cd "/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-trading"
supabase db advisors --linked --type security --level warn
```

Confirm `function_search_path_mutable` and `auth_leaked_password_protection`
are both gone (or down to whatever's left after any exceptions noted in
Step 2). Then smoke-test:

```bash
curl -s -o /dev/null -w "portal home: %{http_code}\n" https://gov.loopcmbntr.live/
curl -s -o /dev/null -w "console login: %{http_code}\n" https://console.loopcmbntr.live/login
```

Both of the governance-relevant vote/treasury/election flows exercise most
of these functions indirectly (voting, proposal evaluation, treasury
distribution) — if you can, trigger a vote or a proposal action in a test
community rather than relying on the smoke test alone.

## What success looks like

- `pnpm` migration file committed at `packages/db/migrations/046_...sql`
- `supabase db advisors --linked --type security --level warn` shows 0
  `function_search_path_mutable` and 0 `auth_leaked_password_protection`
  (or documented exceptions)
- No new errors in portal/console/admin smoke tests
