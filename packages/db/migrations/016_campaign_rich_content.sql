-- Rich content campaigns: WYSIWYG editor content, YouTube embeds, photos
-- type: 'campaign' (vote for me) or 'flyer' (community recruitment)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'campaign'
  CHECK (type IN ('campaign', 'flyer'));

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS campaigns_slug_idx ON campaigns(slug) WHERE slug IS NOT NULL;
