-- Fix infinite recursion (42P17) in the "Platform admins can read all users"
-- RLS policy on public.users. That policy was added directly against the
-- live DB (not through a migration) and its EXISTS subquery selects from
-- `users` again, which re-triggers this same policy on every row, causing
-- Postgres to recurse indefinitely. Any authenticated query against
-- public.users (including a user reading their own row) hit this.
--
-- Fix: move the self-lookup into a SECURITY DEFINER function. It runs as
-- the function owner (table owner), and table owners are exempt from RLS
-- by default, so the inner lookup no longer re-enters the policy.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND platform_role = 'platform_admin'
  );
$$;

DROP POLICY IF EXISTS "Platform admins can read all users" ON public.users;

CREATE POLICY "Platform admins can read all users"
  ON public.users FOR SELECT
  USING (public.is_platform_admin());

COMMIT;
