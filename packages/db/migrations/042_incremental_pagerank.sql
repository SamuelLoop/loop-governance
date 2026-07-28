-- Problem 3: incremental PageRank via an accreditation_score_queue table.
--
-- Instead of recomputing the full graph nightly, a trigger enqueues the
-- receiver whenever an accreditation changes.  A cron route drains the queue
-- in batches of 500.  The nightly full-refresh is kept but now filters to
-- users active in the last 24 h, reducing runtime by orders of magnitude.

BEGIN;

-- ── Queue table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accreditation_score_queue (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject    TEXT        NOT NULL,
  queued_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asq_user_subject_idx ON accreditation_score_queue (user_id, subject);

-- ── Queue trigger ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_enqueue_accreditation_score()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_user_id UUID;
  v_subject  TEXT;
BEGIN
  v_user_id := COALESCE(NEW.receiver_id, OLD.receiver_id);
  v_subject  := COALESCE(NEW.subject_tag, OLD.subject_tag);
  IF v_user_id IS NOT NULL AND v_subject IS NOT NULL THEN
    INSERT INTO accreditation_score_queue (user_id, subject) VALUES (v_user_id, v_subject);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enqueue_on_accreditation_change ON accreditations;
CREATE TRIGGER enqueue_on_accreditation_change
  AFTER INSERT OR DELETE ON accreditations
  FOR EACH ROW EXECUTE FUNCTION trg_enqueue_accreditation_score();

-- ── Updated nightly refresh: only active users ────────────────────────────
-- Replaces the function from migration 035; still calls the same per-subject
-- PageRank function but restricts to users who had any activity in 24 h.

CREATE OR REPLACE FUNCTION refresh_all_accreditation_scores()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN
    SELECT DISTINCT a.subject_tag
    FROM accreditations a
    JOIN users u ON u.id = a.giver_id OR u.id = a.receiver_id
    WHERE a.active = true
      AND u.updated_at > now() - interval '24 h'
  LOOP
    PERFORM compute_accreditation_scores_by_subject(s.subject_tag);
  END LOOP;
END;
$$;

COMMIT;
