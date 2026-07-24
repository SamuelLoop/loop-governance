-- Install pg_cron and schedule the periodic governance jobs.
-- Before this migration these functions existed but only ran when a
-- human clicked a button in the console.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- If any job with these names already exists (e.g. an earlier attempt),
-- remove it before rescheduling. cron.unschedule raises when the name is
-- not found, so we swallow the error.
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('advance-election-phases');
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    PERFORM cron.unschedule('expire-quorum-terms');
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    PERFORM cron.unschedule('check-and-trigger-elections');
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    PERFORM cron.unschedule('evaluate-all-proposals');
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    PERFORM cron.unschedule('refresh-accreditation-scores');
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Every 5 minutes: move elections through phases (nominations -> voting ->
-- completed) once their timestamps pass. Tally happens at voting -> completed.
SELECT cron.schedule(
  'advance-election-phases',
  '*/5 * * * *',
  $$SELECT advance_election_phases();$$
);

-- Every hour: retire leadership terms that have expired and demote members.
SELECT cron.schedule(
  'expire-quorum-terms',
  '0 * * * *',
  $$SELECT expire_quorum_terms();$$
);

-- Daily at 06:00 UTC: create replacement elections 14 days before terms lapse.
SELECT cron.schedule(
  'check-and-trigger-elections',
  '0 6 * * *',
  $$SELECT check_and_trigger_elections();$$
);

-- Every 10 minutes: mark proposals approved / rejected when they hit their
-- quorum + threshold. Currently, if unscheduled, proposals never resolve.
SELECT cron.schedule(
  'evaluate-all-proposals',
  '*/10 * * * *',
  $$SELECT evaluate_all_proposals();$$
);

-- Nightly at 03:00 UTC: recompute peer accreditation PageRank so
-- delegation weights reflect the current accreditation graph.
SELECT cron.schedule(
  'refresh-accreditation-scores',
  '0 3 * * *',
  $$SELECT refresh_all_accreditation_scores();$$
);

COMMIT;
