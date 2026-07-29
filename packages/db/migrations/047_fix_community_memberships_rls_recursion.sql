-- Fix infinite recursion (42P17) in the "Members can read memberships in
-- their communities" RLS policy on public.community_memberships, present
-- since 001_initial.sql. Its USING clause selects from
-- community_memberships to find "my" community ids, which re-triggers this
-- same policy on every row, causing Postgres to recurse indefinitely. This
-- was never caught because the app path that reaches it (loading a user's
-- communities) required a working `users` row lookup first, which was
-- broken by the recursive policy fixed in 046.
--
-- Fix: move the self-lookup into a SECURITY DEFINER function, same pattern
-- as 046. It runs as the function owner (table owner), and table owners
-- are exempt from RLS by default, so the inner lookup no longer re-enters
-- the policy.

BEGIN;

CREATE OR REPLACE FUNCTION public.my_community_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT community_id FROM public.community_memberships
  WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid());
$$;

DROP POLICY IF EXISTS "Members can read memberships in their communities" ON public.community_memberships;

CREATE POLICY "Members can read memberships in their communities"
  ON public.community_memberships FOR SELECT
  USING (community_id IN (SELECT public.my_community_ids()));

COMMIT;
