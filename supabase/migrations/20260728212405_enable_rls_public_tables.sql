-- Close public exposure flagged by Supabase's security advisor
-- (rls_disabled_in_public, ERROR level, 2026-07-28).
--
-- These six tables had Row Level Security disabled, meaning anyone with
-- the project's public anon key could read/write them directly via the
-- PostgREST API, bypassing the app entirely.
--
-- Verified every app code path against all six tables uses
-- createServiceClient() (the service-role key), never the anon client.
-- Service-role bypasses RLS regardless of policy, so enabling RLS here
-- has zero effect on the running apps and only blocks the direct public
-- REST access. No policies are added — default-deny is the intended
-- behaviour for these backend-only tables.

BEGIN;

ALTER TABLE public.user_power_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_slices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_treasury_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_score_queue ENABLE ROW LEVEL SECURITY;

COMMIT;
