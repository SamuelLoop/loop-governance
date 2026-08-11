-- Campaign banner image
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Community questions (Pose a Question feature)
CREATE TABLE IF NOT EXISTS community_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'discussing')),
  upvote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  answer_summary TEXT
);

CREATE INDEX IF NOT EXISTS community_questions_community_idx ON community_questions(community_id);
CREATE INDEX IF NOT EXISTS community_questions_status_idx ON community_questions(community_id, status);

-- Question upvotes
CREATE TABLE IF NOT EXISTS question_upvotes (
  question_id UUID NOT NULL REFERENCES community_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, user_id)
);

-- Treasury project funding split (governance % vs project %)
ALTER TABLE communities ADD COLUMN IF NOT EXISTS governance_split_pct NUMERIC NOT NULL DEFAULT 50
  CHECK (governance_split_pct >= 0 AND governance_split_pct <= 100);
ALTER TABLE communities ADD COLUMN IF NOT EXISTS max_governance_cap_pct NUMERIC NOT NULL DEFAULT 5;

-- User avatar and display fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
