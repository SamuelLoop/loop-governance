# Loop Governance: DB index audit — 2026-07-28

## Context

This is the safest and fastest scalability win for the Loop Governance platform
(`/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-governance`).

Every badge page load, delegation query, vote tally, and community lookup runs
against tables that have primary key indexes but are missing the composite
indexes needed for the filter combinations actually used in production queries.
Postgres falls back to sequential scans as tables grow. At 100M rows a seq scan
on `delegations` (filtering by `delegate_id + subject_tag + active`) takes
seconds instead of milliseconds.

This session adds composite indexes only. No application code changes, no schema
changes to columns or constraints. Pure upside, zero breaking risk.

---

## Tables and the indexes they need

Run `EXPLAIN (ANALYZE, BUFFERS)` on each query pattern below to confirm seq
scans before adding indexes. Add the index, re-run, confirm index scan.

### `delegations`

Current indexes: `delegations_pkey` (id)

Missing:
```sql
-- badge page: find who delegated to me in a subject
CREATE INDEX IF NOT EXISTS idx_delegations_delegate_subject_active
  ON delegations (delegate_id, subject_tag, active)
  WHERE active = true;

-- power tree L2/L3 walk: find who delegated to a list of L1 users
CREATE INDEX IF NOT EXISTS idx_delegations_delegator_subject_active
  ON delegations (delegator_id, subject_tag, active)
  WHERE active = true;

-- community-scoped delegation queries
CREATE INDEX IF NOT EXISTS idx_delegations_community_delegate
  ON delegations (community_id, delegate_id)
  WHERE active = true;
```

### `accreditations`

Current indexes: `accreditations_pkey` (id)

Missing:
```sql
-- badge page: find who accredited me in a subject
CREATE INDEX IF NOT EXISTS idx_accreditations_receiver_subject_active
  ON accreditations (receiver_id, subject_tag, active)
  WHERE active = true;

-- power tree: find accreditors for a list of L1 users
CREATE INDEX IF NOT EXISTS idx_accreditations_giver_subject_active
  ON accreditations (giver_id, subject_tag, active)
  WHERE active = true;
```

### `accreditation_scores`

Current indexes: `accreditation_scores_pkey` (id)

Missing:
```sql
-- badge page standing score lookup (community_id IS NULL = subject-only rank)
CREATE INDEX IF NOT EXISTS idx_accreditation_scores_user_subject_null_community
  ON accreditation_scores (user_id, subject_tag)
  WHERE community_id IS NULL;
```

### `votes`

Current indexes: `votes_pkey` (id)

Missing:
```sql
-- power score: count votes by user
CREATE INDEX IF NOT EXISTS idx_votes_user_id
  ON votes (user_id);

-- proposal detail: count votes per proposal
CREATE INDEX IF NOT EXISTS idx_votes_proposal_id
  ON votes (proposal_id);
```

### `proposals`

Current indexes: `proposals_pkey` (id)

Missing:
```sql
-- power score: count proposals by author
CREATE INDEX IF NOT EXISTS idx_proposals_author_id
  ON proposals (author_id);
```

### `community_memberships`

Current indexes: `community_memberships_pkey` (id)

Missing:
```sql
-- power score: count communities joined by user
CREATE INDEX IF NOT EXISTS idx_community_memberships_user_community
  ON community_memberships (user_id, community_id);
```

### `earnings`

Current indexes: `earnings_pkey` (id)

Missing:
```sql
-- power score: total LOOP earned by user in communities
CREATE INDEX IF NOT EXISTS idx_earnings_user_community
  ON earnings (user_id, community_id);
```

### `communities`

Current indexes: `communities_pkey` (id)

Missing:
```sql
-- badge page: find communities by subject
CREATE INDEX IF NOT EXISTS idx_communities_subject
  ON communities (subject);
```

### `messages` (mobile chat — not used by web console)

Current indexes: `messages_pkey` (id)

Missing:
```sql
-- chat feed initial load: 50 most recent messages in a community channel
-- ORDER BY created_at DESC requires the index to match direction
CREATE INDEX IF NOT EXISTS idx_messages_community_channel_created
  ON messages (community_id, channel, created_at DESC);
```

### `users` (auth lookup — mobile login)

Current indexes: `users_pkey` (id)

Missing:
```sql
-- mobile login: resolve Supabase auth UUID to internal user row
-- Called on every app open; must be fast
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_id
  ON users (auth_id);
```

### `accreditation_scores` — community-scoped (mobile chat)

The existing partial index `idx_accreditation_scores_user_subject_null_community`
only covers rows where `community_id IS NULL`. The mobile chat screen does a
bulk score lookup for all message authors in a community:

```sql
SELECT user_id, score, rank
FROM accreditation_scores
WHERE community_id = $1
AND   user_id = ANY($2);
```

Missing:
```sql
-- mobile chat: bulk author score lookup and per-user community score
-- Covers both IN($user_ids) and single-user = $1 with community = $2
CREATE INDEX IF NOT EXISTS idx_accreditation_scores_community_user
  ON accreditation_scores (community_id, user_id)
  WHERE community_id IS NOT NULL;
```

### `delegations` — community-scoped outgoing (mobile Power tab)

The existing `idx_delegations_delegator_subject_active` uses `subject_tag` as
the second column, but the mobile Power tab and DelegationList both filter
outgoing delegations by `community_id` (not `subject_tag`):

```sql
SELECT id, community_id, users!delegate_id(...)
FROM delegations
WHERE delegator_id = $1
AND   community_id = $2
AND   active = true;
```

Missing:
```sql
-- mobile Power tab: outgoing delegations for a user in a community
CREATE INDEX IF NOT EXISTS idx_delegations_delegator_community_active
  ON delegations (delegator_id, community_id)
  WHERE active = true;
```

---

## Where to put the migration

Create `packages/db/migrations/NNN_composite_indexes.sql` (use the next
sequential number after the last migration in that directory). All statements
above are `CREATE INDEX IF NOT EXISTS` so re-running is safe.

Deploy via Supabase dashboard SQL editor or `supabase db push`.

---

## TDD test suite

Place tests in `packages/db/tests/indexes/`. These are SQL-level tests using
`pgTAP` or equivalent — verify query plans, not just correctness.

```
I1  delegations seat scan uses index for (delegate_id, subject_tag, active=true)
    Query: EXPLAIN SELECT * FROM delegations
           WHERE delegate_id = $1 AND subject_tag = $2 AND active = true
    Assert: query plan contains 'Index Scan' on idx_delegations_delegate_subject_active
    Assert: query plan does NOT contain 'Seq Scan on delegations'

I2  delegations L1-to-L2 tree walk uses index for IN clause on delegate_id
    Query: EXPLAIN SELECT * FROM delegations
           WHERE delegate_id = ANY($1) AND subject_tag = $2 AND active = true
    Assert: query plan uses index (BitmapIndexScan or IndexScan)
    Assert: no Seq Scan

I3  accreditations receiver lookup uses index
    Query: EXPLAIN SELECT * FROM accreditations
           WHERE receiver_id = $1 AND subject_tag = $2 AND active = true
    Assert: Index Scan on idx_accreditations_receiver_subject_active

I4  accreditation_scores subject-only rank uses partial index
    Query: EXPLAIN SELECT * FROM accreditation_scores
           WHERE user_id = $1 AND subject_tag = $2 AND community_id IS NULL
    Assert: Index Scan on idx_accreditation_scores_user_subject_null_community

I5  votes user count uses index
    Query: EXPLAIN SELECT COUNT(*) FROM votes WHERE user_id = $1
    Assert: Index Only Scan or Index Scan on idx_votes_user_id

I6  votes proposal tally uses index
    Query: EXPLAIN SELECT COUNT(*) FROM votes WHERE proposal_id = $1
    Assert: Index Scan on idx_votes_proposal_id

I7  proposals author count uses index
    Query: EXPLAIN SELECT COUNT(*) FROM proposals WHERE author_id = $1
    Assert: Index Scan on idx_proposals_author_id

I8  community_memberships user-community lookup uses index
    Query: EXPLAIN SELECT COUNT(*) FROM community_memberships
           WHERE user_id = $1 AND community_id = ANY($2)
    Assert: Bitmap Heap Scan or Index Scan

I9  earnings user-community sum uses index
    Query: EXPLAIN SELECT SUM(amount) FROM earnings
           WHERE user_id = $1 AND community_id = ANY($2)
    Assert: Index Scan on idx_earnings_user_community

I10 communities subject filter uses index
    Query: EXPLAIN SELECT id FROM communities WHERE subject = $1
    Assert: Index Scan on idx_communities_subject

I11 all index scans complete under 5ms on 1M row seed data
    Seed: insert 1M synthetic delegations, 500K accreditations, 2M votes
    Run each query above on seeded data
    Assert: each EXPLAIN ANALYZE shows actual_time < 5ms

I12 adding indexes does not break any existing queries
    Run full test suite after migration
    Assert: all pre-existing tests still pass

-- Mobile-specific tests (apps/mobile query patterns)

I13 messages chat feed uses composite index
    Query: EXPLAIN SELECT id, content, created_at, author_id, community_id
           FROM messages
           WHERE community_id = $1 AND channel = 'community'
           ORDER BY created_at DESC
           LIMIT 50
    Assert: query plan uses idx_messages_community_channel_created
    Assert: no Seq Scan on messages
    Note: index must include DESC to avoid a sort step on ORDER BY

I14 users auth_id lookup uses unique index
    Query: EXPLAIN SELECT id, display_name, avatar_url
           FROM users WHERE auth_id = $1
    Assert: Index Scan on idx_users_auth_id
    Assert: no Seq Scan on users

I15 accreditation_scores bulk community lookup uses index
    Query: EXPLAIN SELECT user_id, score, rank
           FROM accreditation_scores
           WHERE community_id = $1 AND user_id = ANY($2)
    Assert: Bitmap Index Scan or Index Scan on idx_accreditation_scores_community_user
    Assert: no Seq Scan

I16 accreditation_scores single community score lookup uses index
    Query: EXPLAIN SELECT score, rank
           FROM accreditation_scores
           WHERE user_id = $1 AND community_id = $2
    Assert: Index Scan on idx_accreditation_scores_community_user
    Assert: no Seq Scan

I17 delegations outgoing by community uses index
    Query: EXPLAIN SELECT id, community_id
           FROM delegations
           WHERE delegator_id = $1 AND community_id = $2 AND active = true
    Assert: Index Scan on idx_delegations_delegator_community_active
    Assert: no Seq Scan

I18 all mobile index scans complete under 5ms on 1M row seed data
    Seed: insert 1M messages (mix of community_ids and channels)
    Seed: insert 100K users with auth_id values
    Run I13-I17 queries on seeded data
    Assert: each EXPLAIN ANALYZE shows actual_time < 5ms
```

---

## Key constraints

- All statements are `IF NOT EXISTS` — safe to re-run
- Do not drop any existing indexes
- Partial indexes (with `WHERE active = true`) are smaller and faster than
  full indexes — use them wherever the filter is always present
- Check `packages/db/migrations/` for the current highest migration number
  before naming this file
