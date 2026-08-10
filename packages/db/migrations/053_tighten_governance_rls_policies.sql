-- 053_tighten_governance_rls_policies.sql
-- Security-02 audit. See sessions/security-02-permissive-rls-policies.md.
--
-- Step 1's pg_policies query revealed something the brief didn't
-- anticipate: EVERY flagged policy on every loop-governance table is
-- scoped to `roles: {public}` with an unconditional `true` check — none
-- of them were actually service_role-scoped, including the one named
-- "Service role can insert purchases" on token_purchases (the name
-- describes the intent, not the enforced reality). `{public}` in
-- pg_policies.roles means the policy applies to every connecting role —
-- anon and authenticated included, not just service_role.
--
-- Confirmed `service_role` has BYPASSRLS at the Postgres role level
-- (`select rolbypassrls from pg_roles where rolname = 'service_role'` ->
-- true), so tightening these policies for anon/authenticated cannot break
-- any `createServiceClient()` call path anywhere in any app, by database
-- guarantee, not just by convention.
--
-- Per-table disposition, based on grepping every .from("<table>") call
-- site across console/admin/portal/mobile and checking which Supabase
-- client each one uses:
--
--   admin_assignments, admin_audit_log, governance_settings,
--   moderation_flags, subject_allocations, token_purchases(insert) —
--   every real write goes through createServiceClient() only (admin app,
--   or server-only webhook routes for token_purchases). subject_allocations
--   specifically has ZERO write call sites anywhere — restricting it to
--   service_role is a safe default-deny, nothing currently relies on
--   broader access. Fix: restrict INSERT/UPDATE to `TO service_role`.
--
--   admin_assignments in particular was letting ANY anon/authenticated
--   caller insert or update rows in the table that grants platform_admin/
--   org_admin/org_manager roles — i.e. a direct privilege-escalation path
--   to full platform admin, with no auth check of any kind. governance_settings
--   was the same shape for the table that holds quorum sizes and the
--   governance_motivation caps the security-03 migration just spent effort
--   protecting at the function-grant layer — this RLS gap would have let
--   anyone rewrite those caps directly, bypassing that fix entirely.
--
--   delegations, messages — genuinely MIXED. Confirmed direct writes as
--   `authenticated` (not service_role) from two mobile components:
--   apps/mobile/src/components/GivePowerSheet.tsx inserts/updates
--   `delegations` directly (delegator_id = the caller's own id, by
--   app-level convention only — never enforced by the database until
--   this migration); apps/mobile/src/components/MessageInput.tsx inserts
--   `messages` directly the same way (author_id = the caller's own id).
--   No app anywhere calls .update() on messages directly, so that one
--   stays service_role-only. Fix: real row-level checks for `authenticated`
--   requiring the row's owner column match the caller's own resolved
--   users.id, using the same `(SELECT id FROM users WHERE auth_id =
--   auth.uid())` idiom already proven working in token_purchases' existing
--   "Users can view own purchases" SELECT policy in this same database.

BEGIN;

-- admin_assignments — was: any anon/authenticated caller could insert or
-- update admin role grants directly (full privilege escalation to
-- platform_admin, zero auth check).
DROP POLICY IF EXISTS admin_assignments_insert ON admin_assignments;
CREATE POLICY admin_assignments_insert ON admin_assignments
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS admin_assignments_update ON admin_assignments;
CREATE POLICY admin_assignments_update ON admin_assignments
  FOR UPDATE TO service_role USING (true);

-- admin_audit_log — was: anyone could write fake/tampered audit entries.
DROP POLICY IF EXISTS admin_audit_log_insert ON admin_audit_log;
CREATE POLICY admin_audit_log_insert ON admin_audit_log
  FOR INSERT TO service_role WITH CHECK (true);

-- delegations — real direct-authenticated-write path from mobile
-- (GivePowerSheet.tsx), so this needs an enforced ownership check, not a
-- blanket service_role restriction.
DROP POLICY IF EXISTS delegations_insert ON delegations;
CREATE POLICY delegations_insert ON delegations
  FOR INSERT TO authenticated
  WITH CHECK (delegator_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS delegations_update ON delegations;
CREATE POLICY delegations_update ON delegations
  FOR UPDATE TO authenticated
  USING (delegator_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- governance_settings — was: anyone could rewrite platform-wide quorum
-- sizes, governance motivation percentages/caps, and every other cascade
-- setting, directly bypassing every app-level admin check.
DROP POLICY IF EXISTS governance_settings_insert ON governance_settings;
CREATE POLICY governance_settings_insert ON governance_settings
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS governance_settings_update ON governance_settings;
CREATE POLICY governance_settings_update ON governance_settings
  FOR UPDATE TO service_role USING (true);

-- messages — same real direct-write pattern as delegations, from
-- MessageInput.tsx. No app anywhere updates messages directly, so update
-- stays service_role-only.
DROP POLICY IF EXISTS messages_insert ON messages;
CREATE POLICY messages_insert ON messages
  FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS messages_update ON messages;
CREATE POLICY messages_update ON messages
  FOR UPDATE TO service_role USING (true);

-- moderation_flags — was: anyone could flag/unflag any user as a bad
-- actor, or clear real flags, with no admin check.
DROP POLICY IF EXISTS moderation_flags_insert ON moderation_flags;
CREATE POLICY moderation_flags_insert ON moderation_flags
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS moderation_flags_update ON moderation_flags;
CREATE POLICY moderation_flags_update ON moderation_flags
  FOR UPDATE TO service_role USING (true);

-- subject_allocations — zero write call sites anywhere in any app.
-- Default-deny to service_role; nothing currently relies on broader access.
DROP POLICY IF EXISTS subject_allocations_insert ON subject_allocations;
CREATE POLICY subject_allocations_insert ON subject_allocations
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS subject_allocations_update ON subject_allocations;
CREATE POLICY subject_allocations_update ON subject_allocations
  FOR UPDATE TO service_role USING (true);

-- token_purchases — was: anyone could insert a fake purchase row directly
-- (the policy's name implied this was already service_role-only; it
-- wasn't). Both real purchase-recording paths (Stripe webhook, crypto
-- record route) use the service-role key exclusively — webhooks have no
-- user session to scope a real check to anyway.
DROP POLICY IF EXISTS "Service role can insert purchases" ON token_purchases;
CREATE POLICY "Service role can insert purchases" ON token_purchases
  FOR INSERT TO service_role WITH CHECK (true);

COMMIT;
