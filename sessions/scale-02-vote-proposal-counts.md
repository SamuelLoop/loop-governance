# Loop Governance: materialise vote and proposal counts — 2026-07-28

## Context

The Loop Governance platform (`/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-governance`)
currently computes vote tallies and proposal counts with live `COUNT(*)` queries
on every page load. This is the same anti-pattern as the power score read-path
(covered in `NEXT-SESSION-scaling-power-scores.md`), applied to a different part
of the schema.

At 100M users with millions of votes per popular proposal:
- `SELECT COUNT(*) FROM votes WHERE proposal_id = $1` becomes a full index scan
  over millions of rows on every proposal page view
- The `console` badge page runs `SELECT COUNT(*) FROM votes WHERE user_id = $1`
  and `SELECT COUNT(*) FROM proposals WHERE author_id = $1` on every load with
  no caching

This session materialises those counts into dedicated tables updated by Postgres
triggers, so every read is an O(1) row lookup instead of O(n) count.

---

## What exists today (read these files first)

| File | Role |
|---|---|
| `apps/console/src/app/(dashboard)/badge/page.tsx` | Runs `COUNT(*)` on `votes` and `proposals` per user on every load |
| `apps/portal/src/app/badge/[userId]/[subject]/power.ts` | Calls `getPowerStats()` which also counts votes and proposals |
| `packages/db/migrations/` | Existing migrations — use the next sequential number |

---

## Changes needed

### 1. New table: `proposal_vote_counts`

```sql
CREATE TABLE proposal_vote_counts (
  proposal_id   UUID PRIMARY KEY REFERENCES proposals(id) ON DELETE CASCADE,
  yes_count     BIGINT NOT NULL DEFAULT 0,
  no_count      BIGINT NOT NULL DEFAULT 0,
  abstain_count BIGINT NOT NULL DEFAULT 0,
  total_count   BIGINT GENERATED ALWAYS AS (yes_count + no_count + abstain_count) STORED,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2. New table: `user_vote_proposal_counts`

```sql
CREATE TABLE user_vote_proposal_counts (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  votes_cast         BIGINT NOT NULL DEFAULT 0,
  proposals_authored BIGINT NOT NULL DEFAULT 0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3. Trigger: update `proposal_vote_counts` on vote write

```sql
CREATE OR REPLACE FUNCTION trg_update_proposal_vote_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO proposal_vote_counts (proposal_id, yes_count, no_count, abstain_count)
    VALUES (NEW.proposal_id,
            CASE WHEN NEW.choice = 'yes'     THEN 1 ELSE 0 END,
            CASE WHEN NEW.choice = 'no'      THEN 1 ELSE 0 END,
            CASE WHEN NEW.choice = 'abstain' THEN 1 ELSE 0 END)
    ON CONFLICT (proposal_id) DO UPDATE SET
      yes_count     = proposal_vote_counts.yes_count     + EXCLUDED.yes_count,
      no_count      = proposal_vote_counts.no_count      + EXCLUDED.no_count,
      abstain_count = proposal_vote_counts.abstain_count + EXCLUDED.abstain_count,
      updated_at    = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE proposal_vote_counts SET
      yes_count     = GREATEST(0, yes_count     - CASE WHEN OLD.choice = 'yes'     THEN 1 ELSE 0 END),
      no_count      = GREATEST(0, no_count      - CASE WHEN OLD.choice = 'no'      THEN 1 ELSE 0 END),
      abstain_count = GREATEST(0, abstain_count - CASE WHEN OLD.choice = 'abstain' THEN 1 ELSE 0 END),
      updated_at    = now()
    WHERE proposal_id = OLD.proposal_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_votes_update_proposal_counts
AFTER INSERT OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION trg_update_proposal_vote_counts();
```

### 4. Trigger: update `user_vote_proposal_counts` on vote/proposal write

Note: the `votes` table uses `voter_id` (not `user_id`) — confirmed in the schema
at `packages/db/src/schema/governance.ts`. Use `NEW.voter_id` in the votes branch.

```sql
CREATE OR REPLACE FUNCTION trg_update_user_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'votes' THEN
    INSERT INTO user_vote_proposal_counts (user_id, votes_cast)
    VALUES (NEW.voter_id, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      votes_cast = user_vote_proposal_counts.votes_cast + 1,
      updated_at = now();
  ELSIF TG_TABLE_NAME = 'proposals' THEN
    INSERT INTO user_vote_proposal_counts (user_id, proposals_authored)
    VALUES (NEW.author_id, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      proposals_authored = user_vote_proposal_counts.proposals_authored + 1,
      updated_at = now();
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_votes_user_counts
AFTER INSERT ON votes
FOR EACH ROW EXECUTE FUNCTION trg_update_user_counts();

CREATE TRIGGER trg_proposals_user_counts
AFTER INSERT ON proposals
FOR EACH ROW EXECUTE FUNCTION trg_update_user_counts();
```

### 5. Backfill on migration

```sql
INSERT INTO proposal_vote_counts (proposal_id, yes_count, no_count, abstain_count)
SELECT proposal_id,
       COUNT(*) FILTER (WHERE choice = 'yes'),
       COUNT(*) FILTER (WHERE choice = 'no'),
       COUNT(*) FILTER (WHERE choice = 'abstain')
FROM votes
GROUP BY proposal_id
ON CONFLICT (proposal_id) DO NOTHING;

INSERT INTO user_vote_proposal_counts (user_id, votes_cast, proposals_authored)
SELECT u.id,
       COALESCE(v.cnt, 0),
       COALESCE(p.cnt, 0)
FROM users u
LEFT JOIN (SELECT voter_id, COUNT(*) AS cnt FROM votes GROUP BY voter_id) v ON v.voter_id = u.id
LEFT JOIN (SELECT author_id, COUNT(*) AS cnt FROM proposals GROUP BY author_id) p ON p.author_id = u.id
ON CONFLICT (user_id) DO NOTHING;
```

### 6. Application changes

**`apps/console/src/app/(dashboard)/badge/page.tsx`**
Replace:
```ts
admin.from("votes").select("*", { count: "exact", head: true }).eq("voter_id", userId)
admin.from("proposals").select("*", { count: "exact", head: true }).eq("author_id", userId)
```
With:
```ts
admin.from("user_vote_proposal_counts")
  .select("votes_cast, proposals_authored")
  .eq("user_id", userId)
  .maybeSingle()
```

**`apps/portal/src/app/badge/[userId]/[subject]/power.ts`**
Same replacement in `getPowerStats()` — replace the two `COUNT(*)` queries with
a single read from `user_vote_proposal_counts`.

**Any proposal detail page** that currently runs `COUNT(*) FROM votes WHERE proposal_id = ?`
should read from `proposal_vote_counts` instead.

---

## TDD test suite

Place tests in `apps/portal/src/__tests__/scaling/vote-counts.test.ts`.

```
V1  proposal_vote_counts row is created on first vote for a proposal
    Insert a vote (choice = 'yes') for proposal P
    Assert: proposal_vote_counts WHERE proposal_id = P has yes_count = 1, total_count = 1

V2  subsequent votes accumulate correctly
    Insert 3 yes votes, 2 no votes, 1 abstain for proposal P
    Assert: yes_count = 3, no_count = 2, abstain_count = 1, total_count = 6

V3  vote delete decrements the correct bucket
    Start with yes_count=3; delete one yes vote
    Assert: yes_count = 2, total_count decrements by 1
    Assert: no_count and abstain_count are unchanged

V4  counts never go below 0 (GREATEST guard)
    Attempt to delete a vote when the count is already 0
    Assert: yes_count remains 0, no error thrown

V5  user_vote_proposal_counts.votes_cast increments on vote INSERT
    User U has 0 votes; insert one vote
    Assert: user_vote_proposal_counts.votes_cast = 1

V6  user_vote_proposal_counts.proposals_authored increments on proposal INSERT
    User U has 0 proposals; insert one proposal
    Assert: user_vote_proposal_counts.proposals_authored = 1

V7  backfill counts match live COUNT(*) queries
    Seed 100 votes and 20 proposals across 10 users
    Run backfill SQL
    For each user, assert:
      user_vote_proposal_counts.votes_cast === COUNT(*) FROM votes WHERE user_id = ?
      user_vote_proposal_counts.proposals_authored === COUNT(*) FROM proposals WHERE author_id = ?

V8  badge page reads from materialised table (single query, no COUNT)
    Assert: the badge page query trace includes user_vote_proposal_counts
    Assert: no .from('votes') call exists for vote counting
    Assert: no .from('proposals') call exists for proposal counting

V9  concurrent vote inserts do not cause race conditions
    Fire 50 concurrent vote inserts for the same proposal
    Assert: proposal_vote_counts.total_count = 50 exactly

V10 proposal_vote_counts row is deleted when proposal is deleted (CASCADE)
    Delete a proposal that has 10 votes in proposal_vote_counts
    Assert: proposal_vote_counts row is removed
    Assert: no orphaned rows

V11 badge page loads without error after migration
    Assert: GET /badge/{userId}/{subject} returns HTTP 200
    Assert: displayed vote count matches proposal_vote_counts value
```

---

## Mobile app notes

The mobile app (`apps/mobile`) does not currently read or display vote counts or
proposal counts, so no mobile application changes are needed for this session.

The mobile app does **write** delegations and accreditations (via `GivePowerSheet`),
which will fire the triggers added in `NEXT-SESSION-scaling-power-scores.md`.
Confirm trigger fan-out is acceptable on mobile: a delegation INSERT fires
`trg_votes_update_proposal_counts` → no; and `recompute_power_score()` → yes.
These are database-side triggers, invisible to the mobile client.

---

## Key constraints

- Backfill must run inside the migration — the tables should be consistent from
  the moment they exist
- `GREATEST(0, ...)` on the DELETE trigger prevents negative counts from
  out-of-order events
- Do not remove the `votes` and `proposals` tables — they remain the source of
  truth; `user_vote_proposal_counts` and `proposal_vote_counts` are derived
- If a `votes.choice` column does not exist (votes are binary yes/no), simplify
  `proposal_vote_counts` to just `yes_count BIGINT` and `total_count BIGINT`
  and adjust the trigger accordingly — read the schema before implementing
- File name: `packages/db/migrations/NNN_materialised_vote_counts.sql`
