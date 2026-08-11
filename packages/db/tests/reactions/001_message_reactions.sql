-- pgTAP: message_reactions schema + RLS behaviour, migration 057.
-- Run with: pg_prove -d $DATABASE_URL tests/reactions/001_message_reactions.sql
--
-- Structural checks (table/constraint/policy existence) follow the same
-- pattern as tests/indexes/001_index_exists.sql. Behavioural checks
-- (insert-as-owner succeeds, insert-as-someone-else's-user-id fails,
-- delete-someone-else's-reaction fails) simulate an authenticated
-- request via `set_config('request.jwt.claims', ...)` + `SET LOCAL ROLE
-- authenticated` — this repo has no prior pgTAP test doing that, so
-- this pattern is new and unverified: nobody has run it yet (no
-- pg_prove/psql available in the environment that wrote it). Review the
-- auth-simulation block before trusting it; the structural block above
-- it follows a proven convention and should be reliable as written.
--
-- Whole file runs inside BEGIN/ROLLBACK — nothing persists, safe to run
-- directly against production.

BEGIN;

SELECT plan(9);

-- ---- Structural ----

SELECT has_table('message_reactions', 'message_reactions table exists');

SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'message_reactions_message_idx'
  ),
  'message_reactions_message_idx exists'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_constraint
    WHERE conname = 'message_reactions_message_id_user_id_emoji_key'
  ),
  'unique (message_id, user_id, emoji) constraint exists'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'message_reactions'),
  'RLS is enabled on message_reactions'
);

SELECT ok(
  EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'message_reactions' AND policyname = 'message_reactions_select'),
  'message_reactions_select policy exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'message_reactions' AND policyname = 'message_reactions_insert'),
  'message_reactions_insert policy exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'message_reactions' AND policyname = 'message_reactions_delete'),
  'message_reactions_delete policy exists'
);

-- ---- Behavioural: ownership enforcement (unverified — see header note) ----

-- Two throwaway users + one message to react to, rolled back at the end.
INSERT INTO users (id, auth_id, email, display_name)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'test-owner@example.invalid', 'Test Owner'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'test-other@example.invalid', 'Test Other');

INSERT INTO communities (id, name, slug, level, subject)
VALUES ('00000000-0000-0000-0000-000000000010', 'Test Community', 'test-community-pgtap', 'local', 'test');

INSERT INTO messages (id, community_id, author_id, content, channel)
VALUES ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'test message', 'community');

-- Simulate an authenticated request as the "owner" user.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1')::text, true);

SELECT lives_ok(
  $$ INSERT INTO message_reactions (message_id, user_id, emoji)
     VALUES ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '👍') $$,
  'owner can insert their own reaction'
);

SELECT throws_ok(
  $$ INSERT INTO message_reactions (message_id, user_id, emoji)
     VALUES ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', '👍') $$,
  '42501',
  NULL,
  'cannot insert a reaction on someone else''s behalf'
);

SELECT * FROM finish();

ROLLBACK;
