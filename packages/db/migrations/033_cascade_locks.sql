-- Cascade locks: platform (and org) admins can pin a setting so lower
-- scopes cannot override it. Storage lives in each scope's JSONB blob
-- under a reserved key '_locked_keys' as an array of setting names.
-- Merge order becomes: any key locked at a higher scope wins regardless
-- of what a lower scope tries to set.

BEGIN;

CREATE OR REPLACE FUNCTION resolve_governance_settings(p_community_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_community RECORD;
  v_white_label_id UUID;
  v_subject TEXT;
  v_platform JSONB := '{}';
  v_wl JSONB := '{}';
  v_subj JSONB := '{}';
  v_comm JSONB := '{}';
  v_platform_locks JSONB := '[]';
  v_wl_locks JSONB := '[]';
  v_subj_locks JSONB := '[]';
  v_merged JSONB := '{}';
  v_sources JSONB := '{}';
  v_locked_by JSONB := '{}';
  k TEXT;
BEGIN
  SELECT c.id, c.subject, c.path
  INTO v_community
  FROM communities c
  WHERE c.id = p_community_id;

  IF v_community.id IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;

  v_subject := v_community.subject;

  SELECT sr.source_white_label_id INTO v_white_label_id
  FROM communities sr
  WHERE sr.path = subpath(v_community.path, 0, 1)
    OR sr.slug = split_part(v_community.path::text, '.', 1)
  LIMIT 1;

  SELECT COALESCE(settings, '{}') INTO v_platform
    FROM governance_settings WHERE scope_type = 'platform' LIMIT 1;
  v_platform_locks := COALESCE(v_platform->'_locked_keys', '[]'::JSONB);

  IF v_white_label_id IS NOT NULL THEN
    SELECT COALESCE(settings, '{}') INTO v_wl
      FROM governance_settings
      WHERE scope_type = 'white_label' AND white_label_id = v_white_label_id
      LIMIT 1;
    v_wl_locks := COALESCE(v_wl->'_locked_keys', '[]'::JSONB);

    SELECT COALESCE(settings, '{}') INTO v_subj
      FROM governance_settings
      WHERE scope_type = 'subject'
        AND white_label_id = v_white_label_id
        AND subject = v_subject
      LIMIT 1;
    v_subj_locks := COALESCE(v_subj->'_locked_keys', '[]'::JSONB);
  END IF;

  SELECT COALESCE(settings, '{}') INTO v_comm
    FROM governance_settings
    WHERE scope_type = 'community' AND community_id = p_community_id
    LIMIT 1;

  -- Base merge (each level would override the previous)
  v_merged := (v_platform - '_locked_keys')
           || (v_wl - '_locked_keys')
           || (v_subj - '_locked_keys')
           || (v_comm - '_locked_keys');

  -- Enforce locks in cascade order. A key locked at a higher scope wins
  -- over any value at a lower scope, so we walk the higher scopes and
  -- force their value + record the locking scope.
  FOR k IN SELECT jsonb_array_elements_text(v_platform_locks) LOOP
    IF v_platform ? k THEN
      v_merged := v_merged || jsonb_build_object(k, v_platform->k);
      v_locked_by := v_locked_by || jsonb_build_object(k, 'platform');
    END IF;
  END LOOP;
  FOR k IN SELECT jsonb_array_elements_text(v_wl_locks) LOOP
    IF (NOT v_locked_by ? k) AND v_wl ? k THEN
      v_merged := v_merged || jsonb_build_object(k, v_wl->k);
      v_locked_by := v_locked_by || jsonb_build_object(k, 'white_label');
    END IF;
  END LOOP;
  FOR k IN SELECT jsonb_array_elements_text(v_subj_locks) LOOP
    IF (NOT v_locked_by ? k) AND v_subj ? k THEN
      v_merged := v_merged || jsonb_build_object(k, v_subj->k);
      v_locked_by := v_locked_by || jsonb_build_object(k, 'subject');
    END IF;
  END LOOP;

  -- Sources reflect where each effective value came from
  FOR k IN SELECT jsonb_object_keys(v_merged) LOOP
    IF v_locked_by ? k THEN
      v_sources := v_sources || jsonb_build_object(k, v_locked_by->>k);
    ELSIF v_comm ? k THEN
      v_sources := v_sources || jsonb_build_object(k, 'community');
    ELSIF v_subj ? k THEN
      v_sources := v_sources || jsonb_build_object(k, 'subject');
    ELSIF v_wl ? k THEN
      v_sources := v_sources || jsonb_build_object(k, 'white_label');
    ELSE
      v_sources := v_sources || jsonb_build_object(k, 'platform');
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'values', v_merged,
    'sources', v_sources,
    'locked_by', v_locked_by,
    'white_label_id', v_white_label_id,
    'subject', v_subject
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMIT;
