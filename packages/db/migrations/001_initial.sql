-- Loop Governance: Initial Schema
-- Replaces empty POC tables (communities, trade_listings, trade_matches)

-- Drop old POC tables (confirmed empty)
DROP TABLE IF EXISTS trade_matches CASCADE;
DROP TABLE IF EXISTS trade_listings CASCADE;
DROP TABLE IF EXISTS communities CASCADE;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  h3_index TEXT,
  location_name TEXT,
  subject_expertise JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX users_auth_idx ON users (auth_id);
CREATE INDEX users_h3_idx ON users (h3_index);

-- Communities (fractal hierarchy)
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL CHECK (level IN ('micro','local','city','state','national','continental','global')),
  path TEXT NOT NULL,
  parent_id UUID REFERENCES communities(id),
  h3_cells JSONB DEFAULT '[]',
  h3_index TEXT,
  quorum_size INTEGER NOT NULL DEFAULT 10,
  quorum_volatility_days INTEGER NOT NULL DEFAULT 90,
  dunbar_limit INTEGER NOT NULL DEFAULT 150,
  voting_anonymous BOOLEAN NOT NULL DEFAULT true,
  allow_candidates BOOLEAN NOT NULL DEFAULT false,
  subject_tags JSONB DEFAULT '[]',
  fund_balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX communities_path_idx ON communities (path);
CREATE INDEX communities_parent_idx ON communities (parent_id);
CREATE INDEX communities_level_idx ON communities (level);
CREATE INDEX communities_h3_idx ON communities (h3_index);
CREATE UNIQUE INDEX communities_slug_parent_idx ON communities (slug, parent_id);

-- Community memberships
CREATE TABLE community_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','quorum','admin')),
  channel_prefs JSONB DEFAULT '{"email":true,"sms":false,"push":true}',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX membership_user_community_idx ON community_memberships (user_id, community_id);
CREATE INDEX membership_community_idx ON community_memberships (community_id);
CREATE INDEX membership_role_idx ON community_memberships (community_id, role);

-- Peer accreditations
CREATE TABLE accreditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  subject_tag TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX accreditation_pair_subject_idx ON accreditations (giver_id, receiver_id, community_id, subject_tag);
CREATE INDEX accreditation_receiver_idx ON accreditations (receiver_id, community_id);
CREATE INDEX accreditation_community_subject_idx ON accreditations (community_id, subject_tag);

-- Accreditation scores (materialized, recomputed by pg_cron)
CREATE TABLE accreditation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  subject_tag TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  rank REAL NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX score_user_community_subject_idx ON accreditation_scores (user_id, community_id, subject_tag);
CREATE INDEX score_community_rank_idx ON accreditation_scores (community_id, subject_tag, score);

-- Governance proposals
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','approved','rejected')),
  budget_request_cents INTEGER,
  consequence TEXT,
  chain_tx_hash TEXT,
  votes_for INTEGER NOT NULL DEFAULT 0,
  votes_against INTEGER NOT NULL DEFAULT 0,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX proposals_community_idx ON proposals (community_id, status);
CREATE INDEX proposals_author_idx ON proposals (author_id);

-- Votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES users(id),
  choice TEXT NOT NULL CHECK (choice IN ('for','against','abstain')),
  weight INTEGER NOT NULL DEFAULT 1,
  delegated_from UUID,
  chain_tx_hash TEXT,
  cast_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX votes_proposal_idx ON votes (proposal_id);
CREATE INDEX votes_voter_idx ON votes (voter_id);

-- Community fund transactions
CREATE TABLE fund_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trade_fee','allocation','deposit','withdrawal')),
  amount_cents INTEGER NOT NULL,
  description TEXT,
  proposal_id UUID REFERENCES proposals(id),
  chain_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX fund_tx_community_idx ON fund_transactions (community_id);

-- Trade listings
CREATE TABLE trade_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  community_id UUID NOT NULL REFERENCES communities(id),
  type TEXT NOT NULL CHECK (type IN ('buy','sell')),
  category TEXT NOT NULL CHECK (category IN ('commodity','service')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER,
  unit TEXT,
  price_cents INTEGER NOT NULL,
  price_flexible BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  h3_index TEXT,
  subject_tags JSONB DEFAULT '[]',
  available_from TIMESTAMPTZ,
  available_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','confirmed','closed','cancelled')),
  matched_with_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX listings_community_idx ON trade_listings (community_id, status);
CREATE INDEX listings_user_idx ON trade_listings (user_id);
CREATE INDEX listings_type_category_idx ON trade_listings (type, category, status);
CREATE INDEX listings_h3_idx ON trade_listings (h3_index);

-- Enrollment funnels (configurable per community)
CREATE TABLE enrollment_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  steps JSONB NOT NULL,
  theme JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX funnel_community_idx ON enrollment_funnels (community_id);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE accreditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accreditation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_funnels ENABLE ROW LEVEL SECURITY;

-- Public read policies for communities and enrollment funnels
CREATE POLICY "Communities are publicly readable"
  ON communities FOR SELECT USING (true);

CREATE POLICY "Active funnels are publicly readable"
  ON enrollment_funnels FOR SELECT USING (active = true);

-- Authenticated users can read their own data
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth_id = auth.uid());

-- Members can read community data
CREATE POLICY "Members can read memberships in their communities"
  ON community_memberships FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_memberships
      WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Open proposals and scores are publicly readable
CREATE POLICY "Open proposals are publicly readable"
  ON proposals FOR SELECT USING (status IN ('open','closed','approved','rejected'));

CREATE POLICY "Accreditation scores are publicly readable"
  ON accreditation_scores FOR SELECT USING (true);

-- Trade listings are publicly readable when open
CREATE POLICY "Open listings are publicly readable"
  ON trade_listings FOR SELECT USING (status = 'open');

-- Fund transactions are publicly readable (transparency)
CREATE POLICY "Fund transactions are publicly readable"
  ON fund_transactions FOR SELECT USING (true);

-- Seed a root global community
INSERT INTO communities (name, slug, level, path, subject_tags) VALUES
  ('Global', 'global', 'global', 'global', '["governance","economics","ecology","education","health","technology"]');
