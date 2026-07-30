-- migration 050: make trg_enqueue_accreditation_score SECURITY DEFINER
--
-- accreditation_score_queue has RLS enabled (migration 044) but no insert
-- policy for authenticated users. The trigger fires as the calling user (anon
-- key) and is blocked. Recreating it as SECURITY DEFINER runs it as the
-- function owner (postgres) and bypasses RLS, same pattern as migrations
-- 046/047 for users and community_memberships.

CREATE OR REPLACE FUNCTION trg_enqueue_accreditation_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_subject  TEXT;
BEGIN
  v_user_id := COALESCE(NEW.receiver_id, OLD.receiver_id);
  v_subject  := COALESCE(NEW.subject_tag, OLD.subject_tag);
  IF v_user_id IS NOT NULL AND v_subject IS NOT NULL THEN
    INSERT INTO accreditation_score_queue (user_id, subject)
    VALUES (v_user_id, v_subject)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
