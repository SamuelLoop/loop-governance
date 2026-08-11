-- Cascading governance settings.
-- Values inherit CSS-style: community < subject < white_label < platform.
-- Storage: one JSONB blob per scope row. Absent keys = inherit from parent.

BEGIN;

CREATE TABLE IF NOT EXISTS governance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform','white_label','subject','community')),
  white_label_id UUID REFERENCES white_label_configs(id) ON DELETE CASCADE,
  subject TEXT,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Scope-shape sanity: enforce that each scope_type only sets its own keys
  CHECK (
    (scope_type = 'platform'    AND white_label_id IS NULL AND subject IS NULL AND community_id IS NULL) OR
    (scope_type = 'white_label' AND white_label_id IS NOT NULL AND subject IS NULL AND community_id IS NULL) OR
    (scope_type = 'subject'     AND white_label_id IS NOT NULL AND subject IS NOT NULL AND community_id IS NULL) OR
    (scope_type = 'community'   AND community_id IS NOT NULL AND white_label_id IS NULL AND subject IS NULL)
  )
);

-- One row per scope (partial uniques so NULLs are treated correctly)
CREATE UNIQUE INDEX governance_settings_platform_unique
  ON governance_settings ((true)) WHERE scope_type = 'platform';
CREATE UNIQUE INDEX governance_settings_white_label_unique
  ON governance_settings (white_label_id) WHERE scope_type = 'white_label';
CREATE UNIQUE INDEX governance_settings_subject_unique
  ON governance_settings (white_label_id, subject) WHERE scope_type = 'subject';
CREATE UNIQUE INDEX governance_settings_community_unique
  ON governance_settings (community_id) WHERE scope_type = 'community';

ALTER TABLE governance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY governance_settings_select ON governance_settings FOR SELECT USING (true);
CREATE POLICY governance_settings_insert ON governance_settings FOR INSERT WITH CHECK (true);
CREATE POLICY governance_settings_update ON governance_settings FOR UPDATE USING (true);

-- Resolve effective settings for a community by walking up the cascade.
-- Returns the merged JSONB with a sibling _sources object recording which
-- scope each key came from, so the admin UI can render inheritance badges.
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
  v_merged JSONB;
  v_sources JSONB := '{}';
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

  -- Resolve the white-label owning this community's subject tree.
  -- The subject root is the topmost community in the ltree path; its
  -- source_white_label_id (if any) determines the org.
  SELECT sr.source_white_label_id
  INTO v_white_label_id
  FROM communities sr
  WHERE sr.path = subpath(v_community.path, 0, 1)
    OR sr.slug = split_part(v_community.path::text, '.', 1)
  LIMIT 1;

  -- Load each scope's blob
  SELECT COALESCE(settings, '{}') INTO v_platform
    FROM governance_settings
    WHERE scope_type = 'platform' LIMIT 1;

  IF v_white_label_id IS NOT NULL THEN
    SELECT COALESCE(settings, '{}') INTO v_wl
      FROM governance_settings
      WHERE scope_type = 'white_label' AND white_label_id = v_white_label_id
      LIMIT 1;

    SELECT COALESCE(settings, '{}') INTO v_subj
      FROM governance_settings
      WHERE scope_type = 'subject'
        AND white_label_id = v_white_label_id
        AND subject = v_subject
      LIMIT 1;
  END IF;

  SELECT COALESCE(settings, '{}') INTO v_comm
    FROM governance_settings
    WHERE scope_type = 'community' AND community_id = p_community_id
    LIMIT 1;

  -- Merge: each level overrides the previous
  v_merged := COALESCE(v_platform, '{}') || COALESCE(v_wl, '{}') || COALESCE(v_subj, '{}') || COALESCE(v_comm, '{}');

  -- Record which scope contributed each key (highest wins)
  FOR k IN SELECT jsonb_object_keys(v_merged) LOOP
    IF v_comm ? k THEN
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
    'white_label_id', v_white_label_id,
    'subject', v_subject
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMIT;
