-- White label configuration
CREATE TABLE IF NOT EXISTS white_label_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL UNIQUE,
  brand_name TEXT NOT NULL,
  brand_logo_url TEXT,
  brand_color TEXT DEFAULT '#f59e0b',
  -- Link to a private Loop governance community
  governance_community_id UUID REFERENCES communities(id),
  -- Auto-enrol white label users into these Loop communities
  auto_enrol_community_ids UUID[] DEFAULT '{}',
  -- SSO settings
  shared_auth BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track which white label a user came from
ALTER TABLE users ADD COLUMN IF NOT EXISTS source_white_label_id UUID REFERENCES white_label_configs(id);

-- When a user signs up via a white label, auto-enrol them
-- This is handled in application code via the auto_enrol_community_ids array
