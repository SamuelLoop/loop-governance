-- Add quorum entry threshold: percentage of community votes needed to join quorum
ALTER TABLE communities ADD COLUMN IF NOT EXISTS quorum_threshold_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00;

-- Increase threshold at lower levels (more local = harder to enter)
UPDATE communities SET quorum_threshold_pct = 5.00 WHERE level = 'global';
UPDATE communities SET quorum_threshold_pct = 10.00 WHERE level = 'continental';
UPDATE communities SET quorum_threshold_pct = 15.00 WHERE level = 'national';
UPDATE communities SET quorum_threshold_pct = 20.00 WHERE level = 'city';

-- Campaign profiles: users advertise why they should be voted as leader
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  pitch TEXT NOT NULL,
  experience TEXT,
  goals TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, community_id)
);

CREATE INDEX campaigns_community_idx ON campaigns(community_id) WHERE active = true;
CREATE INDEX campaigns_user_idx ON campaigns(user_id);
