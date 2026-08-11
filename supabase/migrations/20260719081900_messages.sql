-- Community messaging: open chat + quorum-only chat with message referencing

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'community'
    CHECK (channel IN ('community', 'quorum')),
  -- Quorum members can reference community messages in decisions
  referenced_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  -- Optional link to a proposal this message relates to
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_community_channel_idx
  ON messages(community_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_author_idx
  ON messages(author_id);
CREATE INDEX IF NOT EXISTS messages_referenced_idx
  ON messages(referenced_message_id)
  WHERE referenced_message_id IS NOT NULL;

-- RLS: community members can read community channel,
-- quorum members can read both channels
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select ON messages FOR SELECT USING (true);
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY messages_update ON messages FOR UPDATE USING (true);

-- Enable realtime on messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
