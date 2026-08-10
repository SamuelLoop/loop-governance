# Loop Governance: review permissive RLS policies — 2026-07-28

## Status: done, 2026-08-09

## What Step 1 actually found

Ran the brief's own Step 1 query. Result was worse than the brief
anticipated: **every single flagged policy — all 15 in scope, across all 7
loop-governance tables — was scoped to `roles: {public}`**, none of them
were actually `service_role`-scoped despite some names implying it. `{public}`
in `pg_policies.roles` means the policy applies to every connecting role:
`anon` and `authenticated` included, not just `service_role`. This included
the policy literally named `"Service role can insert purchases"` on
`token_purchases` — the name described the intent, not the enforced
reality.

Confirmed `service_role` has `BYPASSRLS` at the Postgres role level
(`select rolbypassrls from pg_roles` → `true`), so tightening any of these
policies for `anon`/`authenticated` can never break a
`createServiceClient()` call path, by database guarantee — this made the
"will this break something" question entirely about grepping for direct
non-service-role writes, not about second-guessing the service-role paths.

## Findings, worst first

1. **`admin_assignments`** — any `anon`/`authenticated` caller could
   insert or update rows in the table that grants `platform_admin`/
   `org_admin`/`org_manager` roles. Zero auth check. A direct
   privilege-escalation path to full platform admin.
2. **`governance_settings`** — anyone could rewrite platform-wide quorum
   sizes and the `governance_motivation_pct`/cap settings directly —
   bypassing everything `security-03`'s migration had just locked down at
   the function-grant layer. This RLS gap would have let an attacker route
   around that entire fix by just editing the settings row instead of
   calling the function.
3. **`token_purchases`** (insert) — anyone could insert a fabricated
   purchase row directly, despite the policy's name implying this was
   already closed.
4. **`moderation_flags`**, **`admin_audit_log`** — anyone could flag/unflag
   any user as a bad actor or write tampered audit-log entries.
5. **`delegations`**, **`messages`** — genuinely mixed. Confirmed real
   direct writes as `authenticated` (not `service_role`) from
   `apps/mobile/src/components/GivePowerSheet.tsx` (delegations,
   accreditations) and `MessageInput.tsx` (messages) — mobile can never
   hold the service-role key, so this is a legitimate, necessary pattern,
   just never enforced at the row level (`delegator_id`/`author_id` were
   trusted from app code alone, same shape as the identity-spoofing bug
   fixed in `security-03`, just one layer lower in the stack).
6. **`subject_allocations`** — zero write call sites found anywhere in any
   app; default-deny to `service_role` is a safe, low-risk tightening.

## Fix applied and verified

`packages/db/migrations/053_tighten_governance_rls_policies.sql`:
- 12 policies restricted to `TO service_role` (admin_assignments x2,
  admin_audit_log, governance_settings x2, moderation_flags x2,
  subject_allocations x2, token_purchases, messages update).
- 3 policies given a real row-level check for `TO authenticated`
  (delegations insert/update, messages insert), requiring the row's owner
  column match the caller's own resolved `users.id` via
  `(SELECT id FROM users WHERE auth_id = auth.uid())` — the same idiom
  already proven working in `token_purchases`' pre-existing "Users can view
  own purchases" policy.

**Functional verification** — the brief was explicit that `tsc`/lint isn't
enough here since this changes row-level access, and it caught something
concrete. Simulated real user sessions with `SET request.jwt.claim.sub =
'<real auth_id>'; SET ROLE authenticated;` inside a transaction, always
ending in `ROLLBACK` so no live data was touched:
- Self-insert into `messages` as the real owner → succeeded.
- Impersonation attempt (insert `messages` with someone else's
  `author_id`) → `new row violates row-level security policy for table
  "messages"`.
- Self-delegation into `delegations` → **initially failed** with
  `permission denied for function recompute_power_score` — a real
  regression, not from this migration but from `security-04`'s
  `052_voting_function_hardening.sql`. `trg_recompute_on_delegation()` (and
  `trg_recompute_on_accreditation()`) are `SECURITY INVOKER` triggers that
  `PERFORM recompute_power_score(...)` — since mobile inserts delegations/
  accreditations directly as `authenticated`, the trigger's internal call
  ran under that same role, and `052` had revoked `authenticated`'s
  EXECUTE on that function. `votes`/`proposals` triggers were unaffected
  (always written via `service_role` in every app, and `052` never touched
  `service_role`'s own grant).
- Fixed with `packages/db/migrations/054_restore_recompute_power_score_grant.sql`
  — a targeted re-grant of just this one function to `authenticated`,
  not a reversal of any of `052`'s other 9 revocations. Re-verified after:
  self-delegation succeeded, impersonation attempt still correctly denied
  (`new row violates row-level security policy for table "delegations"`).
- Self-grant of `platform_admin` via `admin_assignments` → denied
  (`new row violates row-level security policy for table
  "admin_assignments"`).
- Final `pg_policies` query confirms all 15 policies now show the correct
  `roles` value (`{service_role}` × 12, `{authenticated}` × 3 with real
  `qual`/`with_check` expressions) — no leftover `{public}`/unconditional-
  true policy remains on any loop-governance table.

## Out of scope, flagged separately

`cmbntr_agents`/`cmbntr_knowledge`/`cmbntr_messages`/`cmbntr_sessions`/
`cmbntr_users` (Loop Cmbntr, different product, same shared Supabase
project) have the identical issue — a policy named `cmbntr_service_all`
with `roles: {public}`, `qual: "true"` (unconditional, not even a
`auth.role() = 'service_role'` check like `canada_signups`' equivalent
policy correctly does). Per this brief's own table-ownership rule, not
fixed here — flagged as a separate background task
(`task_46c10fb5`) rather than touched.

`bank_waitlist` and `canada_signups` were checked too: both are
intentional public-signup-form patterns (insert-open, no read policy) or
already correctly gated (`canada_signups`' `service_role_all` policy
checks `auth.role() = 'service_role'` inside the condition even though
`roles` shows `{public}` — a different, safe pattern from the
unconditional-`true` ones above). Neither needed changes.
