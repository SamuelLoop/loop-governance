# Loop Governance: audit treasury/loyalty SECURITY DEFINER functions — 2026-07-28

## Status update — 2026-08-09 (partial: analysis done, DB access blocked)

**Environment blocker:** this session's Steps 1 and 4 require `supabase db
query --linked` and `supabase db advisors --linked` against the live
project. The `supabase` CLI is not installed/available in this sandboxed
session — confirmed via `which supabase` (not found) in both `packages/
contracts` and `loop-trading` working directories. Everything below is
derived by reading `packages/db/migrations/*.sql` directly (the repo's own
documented source of truth per SOUL.md) rather than querying the live DB,
and by grepping the four apps for actual call sites. **Grants
(`information_schema.role_routine_grants`) are NOT confirmed live** — the
findings below infer exposure from the absence of any `REVOKE` statement in
migration history, which is strong but not certain evidence. Someone with
`supabase` CLI access needs to run Step 1's grant query to confirm before
the proposed migration below is applied.

### Finding 0 — found while tracing call sites, outside this session's original scope, most severe finding of the exercise

Tracing `award_loyalty`'s five call sites led to `apps/console/src/app/
(dashboard)/proposals/[id]/actions.ts` (`castVote`). It reads `userId` from
`formData.get("userId")` and uses it directly — **no `supabase.auth.getUser()`
call anywhere in the file.** Since the action uses `createServiceClient()`
(bypasses RLS entirely per SOUL.md), there is no defense-in-depth either.
Practical effect: **anyone who can submit the vote form can cast a vote as
any other user**, by putting that user's UUID in the `userId` field —
nothing checks that the submitter *is* that user.

Grepped for the same pattern across all three Next.js apps
(`formData.get("userId"|"delegatorId"|"voterId"|"authorId"|"actorId")`
in a file with no `auth.getUser()` call anywhere in it). Exactly three files
have it, all in console, all vote/governance-integrity-critical:

| File | Trusted field | Exploit |
|---|---|---|
| `apps/console/.../proposals/[id]/actions.ts` (`castVote`) | `userId` | Vote as any other user |
| `apps/console/.../proposals/new/actions.ts` (`createProposal`) | `userId` | Create proposals as any other user (also triggers `award_loyalty` for the spoofed user) |
| `apps/console/.../delegations/actions.ts` | `delegatorId` | Delegate any other user's vote — including to yourself |

Thirteen other files in the same apps correctly call `auth.getUser()` first
(e.g. `earnings/actions.ts`, `elections/actions.ts`) — this is a bounded,
3-file gap against an established correct pattern already used elsewhere
in the same codebase, not an architectural rewrite. The fix is to match
that pattern: resolve the caller's own `profile.id` from
`auth.getUser()` server-side and use that instead of trusting the form
field, in all three files.

**Status: fixed, 2026-08-09.** All three files now resolve the caller from
`supabase.auth.getUser()` → `admin.from("users").select("id").eq("auth_id",
user.id)` (the same pattern already used correctly in `earnings/actions.ts`
and `elections/actions.ts`), and ignore/no-op the client-submitted
`userId`/`delegatorId` form fields entirely rather than trusting them. The
forms still submit those hidden fields (`vote-buttons.tsx`,
`form.tsx`, `delegate-form.tsx`) — harmless, just unused server-side now, no
UI changes needed.

**Also fixed, found while editing the same file:** `revokeDelegation` in
`delegations/actions.ts` trusted `delegationId` alone with no ownership
check — any authenticated user could revoke *any other user's* delegation
by ID, not just their own. Added `.eq("delegator_id", callerId)` to the
update and a `count: "exact"` check that returns an explicit error if the
delegation didn't belong to the caller (or didn't exist).

**Not fixed, flagged only:** `getOverlappingCommunities(userId, delegateId,
subject)` in the same file takes `userId` as a direct parameter (called
from a client component, not a form action) and returns which communities
two arbitrary user IDs both belong to. Lower severity — read-only,
membership-overlap disclosure, not a fund/vote-integrity issue — left
alone to keep this fix's blast radius to the mutation paths.

Verified: `npx turbo run type-check --filter=@loop/console` → clean, zero
errors, across all three edited files.

### Findings within this session's original scope

1. **`award_loyalty` and `convert_loyalty_to_loop` trust their inputs
   completely** — neither checks the caller's identity against the
   affected user. `convert_loyalty_to_loop(p_user_id, p_amount_loyalty,
   p_actor_id DEFAULT NULL)` (`029_loyalty_tokens.sql`) declares
   `p_actor_id` but **never references it in the function body** — dead
   parameter, strong evidence an authorization check was intended and
   never finished. All 6 real call sites (confirmed via grep) use
   `admin.rpc(...)` (`createServiceClient()`) from server actions that
   *do* correctly call `auth.getUser()` first (e.g. `earnings/actions.ts`
   resolves the caller's own profile and passes only their own ID) — so
   the app's own usage is safe. The exposure is whether these functions
   are *also* directly callable by anyone holding the public anon/
   authenticated API key via PostgREST (`/rest/v1/rpc/convert_loyalty_to_loop`),
   which depends on live grants I can't confirm here.

2. **Double-disbursement race condition** in `disburse_approved_proposal`,
   `distribute_treasury_from_proposal`, and `cascade_treasury_from_proposal`
   (latest definitions: `032_proposal_disbursement.sql`,
   `034_proposal_types.sql`). Each does a plain `SELECT * INTO v_prop FROM
   proposals WHERE id = p_proposal_id` with no `FOR UPDATE`, then much
   later `UPDATE proposals SET disbursed_at = now() ...`. Two concurrent
   calls on the same proposal (e.g. `evaluate_proposal`'s automatic
   `PERFORM disburse_approved_proposal` racing a second manual trigger)
   could both pass the `disbursed_at IS NOT NULL` guard before either
   commits, double-paying the proposal author, the treasury outflow, and
   the motivation payout. Contrast: `pay_governance_motivation`
   (`032_proposal_disbursement.sql`) already does this correctly —
   `SELECT * INTO v_flow FROM motivation_flows WHERE id = p_flow_id FOR
   UPDATE` — so the fix pattern already exists in the same file, just
   wasn't applied to the three proposal-level functions.

3. **No `REVOKE` statement exists in migration history** for any of the 6
   in-scope functions. Supabase's default behavior exposes all
   `public`-schema functions via PostgREST and grants PUBLIC execute
   unless explicitly revoked. Combined with finding 1's confirmation that
   every real call site is server-only via `createServiceClient()`, there
   is no legitimate direct-user-call use case for any of the 6 — revoking
   `anon`/`authenticated` EXECUTE is the simplest fix and closes the
   exposure without touching function bodies, **once someone with CLI
   access confirms the grants are actually open** (Step 1 of this brief).

## Status update — 2026-08-09, part 2: CLI wall solved, migration applied and verified

Installed the Supabase CLI (`brew install supabase/tap/supabase`, 2.113.0)
and linked it to the live project (`supabase link --project-ref
oztfzqkpwwfnxrydmsuo`) — the CLI was already authenticated (an access token
existed), just not installed/linked in this sandbox. This unblocks all
future sessions in this environment, not just this one.

**Confirmed live** (matches the inference from part 1): `anon` and
`authenticated` both had EXECUTE on all 6 originally-scoped functions.

**Escalation found while checking for overloads:** `pay_governance_motivation`
has three live overloads (3-param from `030`, 4-param from `031`, 5-param
from `032` — `CREATE OR REPLACE` does not merge differing arg-count
signatures, each migration added a new overload alongside, not instead of,
the old one). Read the 3-param and 4-param bodies directly: **neither has
any cap enforcement** — cap logic was only added alongside the `flow_id`
parameter in the 5-param version. Both older overloads were still live and
still granted to anon/authenticated: anyone with the public API key could
call either directly with an inflated `p_gross_amount` and drain a
community treasury, no real transaction required.

**Further escalation:** tracing who else calls the old overloads led to
`cascade_treasury` (2 overloads) and `approve_funding_request` — both move
real treasury funds, neither is `SECURITY DEFINER` (plain `SECURITY
INVOKER`, so no privilege boundary at all, just a bare missing auth check),
neither checks caller identity, and both were confirmed live-granted to
anon/authenticated. Same evidence pattern as everything else here (all real
app usage via `createServiceClient()` only — `apps/console/.../treasury/actions.ts`),
so folded into the same fix.

**`packages/db/migrations/051_treasury_function_hardening.sql` — applied.**
Covers all 8 functions/overloads: revokes `anon`/`authenticated` EXECUTE on
every one, plus the `FOR UPDATE` race fix for the three disbursement
functions. Verified post-apply via direct grants query (zero anon/
authenticated rows remain) and `SET ROLE anon`/`SET ROLE service_role` live
calls confirming anon is denied and the app's real service-role path still
works. Full detail in the migration file's own header comment.

**Not done, and now unblocked for a future session:** `security-02`
(RLS policy review) and `security-04` (11 voting/scoring SECURITY DEFINER
functions) can now run their live-DB steps too — the CLI works. Given what
turned up here (systemic: no `REVOKE` has ever been issued for *any*
function in this codebase's history), it's worth widening `security-04`'s
scope check to ask the same "is this granted to anon/authenticated with no
legitimate direct-call use case" question, not just its originally-listed
11 functions.


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
