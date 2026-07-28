-- pgTAP: verify the 3 composite indexes from 040_composite_indexes.sql exist,
-- plus spot-checks on key pre-existing indexes that the app depends on.
-- Run with: pg_prove -d $DATABASE_URL tests/indexes/001_index_exists.sql

BEGIN;

SELECT plan(14);

-- ---- New indexes from migration 040 ----

SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delegations_delegate_subject_active'),
  'idx_delegations_delegate_subject_active exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delegations_delegator_subject_active'),
  'idx_delegations_delegator_subject_active exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delegations_delegator_community_active'),
  'idx_delegations_delegator_community_active exists'
);

-- ---- Pre-existing indexes the app depends on (regression guard) ----

SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'delegation_delegate_idx'),
  'delegation_delegate_idx (delegate_id, community_id) exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'accreditation_receiver_subject_idx'),
  'accreditation_receiver_subject_idx exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'accreditation_giver_subject_idx'),
  'accreditation_giver_subject_idx exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'score_user_subject_unique_idx'),
  'score_user_subject_unique_idx (user_id, subject_tag WHERE community_id IS NULL) exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'membership_user_community_idx'),
  'membership_user_community_idx (user_id, community_id) unique exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'votes_voter_idx'),
  'votes_voter_idx (voter_id) exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'votes_proposal_idx'),
  'votes_proposal_idx (proposal_id) exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'proposals_author_idx'),
  'proposals_author_idx (author_id) exists'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'communities_subject_idx'),
  'communities_subject_idx (subject) exists'
);
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
