-- pgTAP: verify mobile-critical indexes exist (all were pre-existing before 040).
-- Run with: pg_prove -d $DATABASE_URL tests/indexes/002_index_exists_mobile.sql

BEGIN;

SELECT plan(2);

SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'messages_community_channel_idx'),
  'messages_community_channel_idx (community_id, channel, created_at DESC) exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'users_auth_id_key'),
  'users_auth_id_key unique (auth_id) exists'
);

SELECT * FROM finish();

ROLLBACK;
