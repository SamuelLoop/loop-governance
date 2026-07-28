# Loop Governance: audit treasury/loyalty SECURITY DEFINER functions — 2026-07-28

## Context

Part 3 of the security advisor backlog (`security-01`, `security-02` cover
the other categories). This is the highest-stakes session in the set: 6 of
the 17 `SECURITY DEFINER` functions callable by `anon`/`authenticated` move
real value (LOOP token, treasury funds, loyalty points). If any of them is
missing an internal authorization check, a logged-in user (or, depending on
grants, anyone with the anon key) could call it directly via
`supabase.rpc(...)` and trigger a payout or transfer they have no business
triggering.

`SECURITY DEFINER` means the function runs with the privileges of whoever
created it (effectively superuser-level table access), regardless of the
caller's own permissions or RLS. That's *why* these functions can move
money across RLS boundaries in the first place — normal app code, and the
`create_client()` (RLS-respecting) client, couldn't do this on their own.
The function's own body is the **only** thing standing between "authorized
governance payout" and "anyone drains the treasury." That's what you're
auditing.

**Functions in scope for this session:**
```
award_loyalty
convert_loyalty_to_loop
distribute_treasury_from_proposal
disburse_approved_proposal
cascade_treasury_from_proposal
pay_governance_motivation
```

---

## Step 1: Pull the actual function bodies

```bash
cd "/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-trading"
supabase db query --linked --output json "
select p.proname, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = any(array[
    'award_loyalty','convert_loyalty_to_loop',
    'distribute_treasury_from_proposal','disburse_approved_proposal',
    'cascade_treasury_from_proposal','pay_governance_motivation'
  ]);
"
```

Also check who can currently call each one:

```bash
supabase db query --linked --output json "
select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name = any(array[
    'award_loyalty','convert_loyalty_to_loop',
    'distribute_treasury_from_proposal','disburse_approved_proposal',
    'cascade_treasury_from_proposal','pay_governance_motivation'
  ]);
"
```

---

## Step 2: For each function, answer these questions

1. **Does it validate its own inputs against real state**, or does it trust
   whatever the caller passes? E.g. `disburse_approved_proposal(p_proposal_id)`
   — does the function body actually check `WHERE status = 'approved'`
   before disbursing, or does it disburse whatever proposal ID it's given
   regardless of status? (The function *names* suggest they check — but
   verify the actual `WHERE` clauses, don't assume from the name.)
2. **Does it check the caller's identity/relationship to the data**, e.g.
   does `award_loyalty` check that `auth.uid()` matches the intended
   recipient or an authorized granter, or can any authenticated user award
   loyalty points to any other user (or themselves) arbitrarily?
3. **Is it idempotent / does it prevent double-spending?** E.g. can
   `convert_loyalty_to_loop` be called twice in quick succession to convert
   the same loyalty balance twice before the first conversion's balance
   deduction commits?
4. **Should it be `SECURITY DEFINER` at all**, or could it be rewritten as a
   normal function that relies on the caller's own RLS-scoped permissions?
   Not all of these necessarily need elevated privileges — some may only
   need it because of a design choice that could be revisited.

---

## Step 3: Fix what needs fixing

Depending on what Step 2 finds, fixes generally take one of these shapes:

- **Add a `WHERE` guard the function was missing** (e.g. require
  `status = 'approved'` before disbursing) — safe, additive, closes a real
  hole.
- **Add an `auth.uid()` check inside the function body** comparing the
  caller to the relevant row (e.g. `IF auth.uid() != v_recipient THEN RAISE
  EXCEPTION ...`) — only do this if the function is meant to be called
  by end users directly; if it's meant to be cron/admin-only, the better
  fix is Step 4 below (revoke the grant) rather than adding auth logic to
  a function that shouldn't be user-callable at all.
- **Revoke `EXECUTE` from `anon`/`authenticated`** if a function should
  only ever run via `service_role` (cron jobs, admin actions) and has no
  legitimate direct-user-call use case:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.function_name(...) FROM anon, authenticated;
  ```
  This is often the *right* fix and the *simplest* one — check whether the
  app actually calls these via `supabase.rpc()` from client-side code
  (grep for `.rpc('award_loyalty'` etc. across all four apps) or only ever
  server-side via a route/action already using `createServiceClient()`. If
  it's server-only today, revoking the public grant costs nothing
  functionally and removes the entire class of risk in one line, no need to
  touch the function body at all.

Write whatever combination is needed to
`packages/db/migrations/048_treasury_function_hardening.sql`.

---

## Step 4: Verify

```bash
supabase db advisors --linked --type security --level warn
```

Confirm the 6 functions in scope no longer show as
`anon_security_definer_function_executable` /
`authenticated_security_definer_function_executable` (if you revoked
grants) or note explicitly in your summary if you left the grant in place
because a legitimate direct-call use case exists, plus what internal check
now protects it.

**Functional re-test is mandatory here, not optional** — this touches real
money/token movement:
- Trigger a real proposal disbursement in a test community and confirm
  funds still move correctly end to end.
- Confirm loyalty award/conversion still works for a real test user.
- If you revoked any grants, confirm the legitimate server-side call paths
  (cron routes, admin actions) still work — they use `service_role`, which
  is unaffected by revoking `anon`/`authenticated` grants, but verify this
  rather than assuming it.

## What success looks like

- Each of the 6 functions has a documented answer to "what stops misuse,"
  either via a body-level check or a revoked grant
- Migration file at `packages/db/migrations/048_...sql`
- A real (not just smoke-tested) end-to-end test of proposal disbursement
  and loyalty conversion after the change
