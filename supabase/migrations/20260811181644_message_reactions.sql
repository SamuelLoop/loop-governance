-- Message reactions: emoji tallies on community/quorum chat messages.
--
-- Numbered 057, not 055/056 — those numbers are already claimed by
-- in-flight, not-yet-merged identity-verification migrations sitting
-- uncommitted on `master` as of this session. Left a gap deliberately so
-- neither branch has to renumber if the other lands first; whichever
-- merges second should check for a collision at merge time regardless.
--
-- RLS mirrors `messages` exactly (see 009_messages.sql, tightened in
-- 053_tighten_governance_rls_policies.sql) rather than inventing a new
-- visibility model: SELECT stays open (`USING (true)`) because message
-- visibility itself is enforced app-side, not at the RLS layer, for
-- `messages` today — reactions inherit that same real (if imperfect)
-- boundary rather than pretending to be stricter than the table they
-- attach to. INSERT/DELETE require the caller to own the row, same
-- ownership predicate as messages_insert.

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS message_reactions_message_idx
  ON message_reactions(message_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_reactions_select ON message_reactions
  FOR SELECT USING (true);

CREATE POLICY message_reactions_insert ON message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY message_reactions_delete ON message_reactions
  FOR DELETE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Live-updating reaction counts, matching messages' realtime enablement.
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
