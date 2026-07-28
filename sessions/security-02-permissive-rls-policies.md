# Loop Governance: review permissive RLS policies — 2026-07-28

## Context

Part 2 of the security advisor backlog (see `security-01-quick-wins.md` for
part 1, and `ARCHITECTURE.md` for the shared-database context). This session
covers `rls_policy_always_true`: 21 policies across ~13 tables where the
`USING` or `WITH CHECK` clause is the literal `true` for an INSERT, UPDATE,
or DELETE operation.

**This is a review-and-judgment session, not a mechanical fix.** A policy
with `WITH CHECK (true)` is not automatically wrong — it's fine if the real
access control is happening via the policy's `roles` restriction (e.g. a
policy scoped to `service_role` only, which the app already trusts
completely). It's a problem if the policy is scoped to `anon` or
`authenticated` with no row-level restriction, meaning any logged-in (or
even anonymous) user can insert/update/delete rows they shouldn't be able to
touch.

**Critical rule for this session:** do not blindly tighten every policy.
For each one: identify what role(s) it applies to, read the surrounding
application code to understand the intended access model, and only change
policies that are actually wrong for their role. If a policy's row-level
condition is `true` but it's scoped to `service_role`, leave it — that's
correct and intentional (service_role is already fully trusted).

---

## Step 1: Get current policy details

```bash
cd "/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-trading"
supabase db query --linked --output json "
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where tablename in (
  'admin_assignments','admin_audit_log','bank_waitlist','canada_signups',
  'cmbntr_agents','cmbntr_knowledge','cmbntr_messages','cmbntr_sessions',
  'cmbntr_users','delegations','governance_settings','messages',
  'moderation_flags','subject_allocations','token_purchases'
)
order by tablename, policyname;
"
```

This gives you the `roles` array for every flagged policy — that's the key
piece of information the advisor summary alone doesn't show you.

---

## Step 2: Triage by table ownership

**Not `loop-governance` tables — do not fix without checking with the
owning project first, just note them:**
- `bank_waitlist` (loop-bank)
- `canada_signups` (loop-canada)
- `cmbntr_agents`, `cmbntr_knowledge`, `cmbntr_messages`, `cmbntr_sessions`,
  `cmbntr_users` (Loop Cmbntr)

These share the same Supabase project but belong to different products.
If their policies are genuinely scoped to `service_role` only (check
Step 1's output), they're almost certainly fine as-is (the `cmbntr_*`
policy name `cmbntr_service_all` strongly suggests this). Flag anything
that looks scoped to `anon`/`authenticated` with an unrestricted check, but
don't change it — that's Loop Cmbntr's or Loop Bank's call, not this
session's.

**`loop-governance` tables — in scope for this session:**
- `admin_assignments` (2 policies: insert, update)
- `admin_audit_log` (1 policy: insert)
- `delegations` (2 policies: insert, update)
- `governance_settings` (2 policies: insert, update)
- `messages` (2 policies: insert, update)
- `moderation_flags` (2 policies: insert, update)
- `subject_allocations` (2 policies: insert, update)
- `token_purchases` (1 policy: "Service role can insert purchases" — name
  strongly suggests this is `service_role`-scoped and fine as-is; confirm
  via Step 1 and skip if so)

---

## Step 3: For each in-scope table, review and fix

For each policy:
1. Check the `roles` column from Step 1. If it's `{service_role}`, confirm
   the app only ever writes to this table via `createServiceClient()`
   (grep the relevant app's `src` for `.from("table_name")` and check which
   client each call site uses — same method used in the 2026-07-28 RLS
   session). If confirmed, this policy is fine — skip it.
2. If the policy is scoped to `authenticated` or `anon` with `USING (true)`
   / `WITH CHECK (true)`, figure out what the row-level restriction *should*
   be:
   - `delegations` insert/update — a user should presumably only be able to
     insert/update their own delegation (`delegator_id = auth.uid()`), not
     anyone's.
   - `messages` insert/update — a user should presumably only post as
     themselves and only edit their own messages.
   - `admin_assignments`, `moderation_flags`, `governance_settings` — these
     sound like they should be restricted to admin roles, not any
     authenticated user.
3. Write the tightened policy (`DROP POLICY` + `CREATE POLICY` with a real
   `USING`/`WITH CHECK` expression), add it to
   `packages/db/migrations/047_tighten_governance_rls_policies.sql`.
4. **Before applying**, check whether the app itself relies on the current
   loose behavior anywhere (e.g. does an admin action currently insert a
   delegation on a user's behalf via the anon-scoped client rather than
   service role — if so, tightening the policy could break that flow, and
   you'd need to either scope the policy to include that case or switch
   that code path to use `createServiceClient()` instead).

This step is genuinely the slow part — don't rush it. Getting a policy
wrong in either direction (too loose = security hole, too tight = breaks a
legitimate flow) is worse than leaving it as a documented open item.

---

## Step 4: Apply and verify

```bash
supabase db query --linked --file packages/db/migrations/047_tighten_governance_rls_policies.sql
supabase db advisors --linked --type security --level warn
```

Confirm the `rls_policy_always_true` count dropped by exactly the number of
policies you tightened (not more — if it dropped by more, something
unexpected happened, investigate before moving on).

**Then functionally test each affected flow as the relevant role** —
this is the one place in the security backlog where "run tsc and lint" isn't
enough verification, because you're changing row-level access. At minimum:
- Delegate to someone in console, confirm it still works
- Post a message in console chat, confirm it still works
- If you tightened `admin_assignments`/`moderation_flags`/`governance_settings`,
  test the relevant admin-app flow as an actual `org_admin` or
  `platform_admin` session, not just as a superuser/service-role script

## What success looks like

- A migration file documenting exactly which policies were tightened and why
- `rls_policy_always_true` count reduced only for `loop-governance`-owned
  tables (the shared-project tables from other products are flagged in your
  summary, not touched)
- Every affected app flow manually re-tested and confirmed still working
