# Loop Governance: scale power score + tree to 100M users — 2026-07-28

## Context

The badge system (`apps/portal/src/app/badge/[userId]/[subject]/`) computes
power scores and the Power Tree live on every page request with no caching.
This is fine for early growth but will collapse under viral badge-sharing load.
This session implements the four changes needed to make it production-scale.

All four changes are additive — no existing features are removed or broken.

---

## What exists today (read these files first)

| File | Role |
|---|---|
| `apps/portal/src/app/badge/[userId]/[subject]/power.ts` | `getPowerStats()` — 6 live DB queries per request, no cache |
| `apps/portal/src/app/badge/[userId]/[subject]/page.tsx` | Public badge page — calls `getPowerStats` + `fetchPowerTree` on every load |
| `apps/portal/src/lib/power-tree.ts` | `fetchPowerTree()` — 5 sequential query rounds, including large `IN` clauses |
| `apps/console/src/app/(dashboard)/badge/page.tsx` | Console badge — same pattern, own inline fetcher |
| `packages/db/migrations/035_pagerank_subject_only.sql` | Nightly cron populates `accreditation_scores` via `refresh_all_accreditation_scores()` — full graph, will time out at scale |
| `apps/mobile/src/components/PowerCard.tsx` | Runs 3 parallel DB queries on every Power tab mount (score + upstream + downstream delegations) |
| `apps/mobile/src/components/UserBottomSheet.tsx` | Runs 5 parallel DB queries when a user taps any avatar in chat |
| `apps/mobile/src/components/PowerBar.tsx` | Queries `accreditation_scores WHERE community_id = $communityId` — returns 0 rows (see pre-existing bug below) |
| `apps/mobile/src/hooks/useRealtimeChannel.ts` | Fetches 50 messages then individually queries `accreditation_scores` per author on each incoming Realtime message |

### Pre-existing mobile data bug (fix before or during this session)

`PowerCard`, `UserBottomSheet`, and `PowerBar` all query:
```sql
SELECT score, rank FROM accreditation_scores
WHERE user_id = $1 AND community_id = $2
```

Migration `035_pagerank_subject_only.sql` made `community_id` nullable and then
ran `DELETE FROM accreditation_scores WHERE community_id IS NOT NULL`. The nightly
cron only writes rows where `community_id IS NULL`. So every community-scoped query
from the mobile app returns 0 rows — every user appears as score 0 / Bronze tier
and `PowerBar` always renders the default equal-width bar.

**Fix:** update the three mobile components to query subject-scoped scores instead:
```sql
-- Replace community_id = $communityId with:
WHERE user_id = $1 AND subject_tag = $activeSubject AND community_id IS NULL
```

`PowerBar` needs a different approach: it currently shows the tier distribution for
a community by querying community-scoped scores. Since those no longer exist, it
should either query subject-scoped scores for the community's subject tag, or be
removed until community-scoped scores are reintroduced.

---

## The four problems and their fixes

### Problem 1 — No caching on power stats (highest priority)

**What happens at scale:** every WhatsApp click on a shared badge fires 6 Supabase
queries. At 100M users sharing badges virally this saturates the DB pool.

**Fix:** wrap `getPowerStats()` with a Vercel KV cache keyed on
`power:${userId}:${subject}`, TTL 5 minutes. On cache miss, run the existing
queries and write the result back. Invalidate on delegation/accreditation events
(add a webhook or Supabase realtime trigger that calls
`kv.del('power:' + userId + ':' + subject)`).

**Files to change:**
- `apps/portal/src/app/badge/[userId]/[subject]/power.ts` — wrap with KV read/write
- `apps/portal/package.json` — add `@vercel/kv`
- New file: `apps/portal/src/lib/kv.ts` — thin wrapper around `@vercel/kv`
- Vercel env vars: `KV_REST_API_URL`, `KV_REST_API_TOKEN` (add via `vercel env add`)

**Mobile note:** the KV cache is server-side and does not help mobile, which queries
Supabase directly. Once Problem 2's `user_power_scores` table exists, update
`PowerCard` and `UserBottomSheet` to read from it (single row lookup) and add a
Zustand selector so the result is shared across components within the same session
without re-fetching.

---

### Problem 2 — Power score computed on read, not on write (medium priority)

**What happens at scale:** even with KV caching, cache misses still do 6 queries.
Worse, the score formula (`delegationsReceived * 10 + accreditationWeight * 5 + ...`)
is scattered across the codebase (portal and console both compute it
independently), so it will drift.

**Fix:** create a `user_power_scores` table:

```sql
CREATE TABLE user_power_scores (
  user_id   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  subject   TEXT NOT NULL,
  score     NUMERIC NOT NULL DEFAULT 0,
  tier      TEXT NOT NULL DEFAULT 'Bronze',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject)
);
```

Populate it via a Postgres function `recompute_power_score(p_user_id, p_subject)`
that runs the same arithmetic as today's `buildStats()`. Call that function from:
- A trigger on `delegations` (INSERT/UPDATE/DELETE)
- A trigger on `accreditations` (INSERT/UPDATE/DELETE)
- A trigger on `votes` (INSERT)
- A trigger on `proposals` (INSERT)

`getPowerStats()` then does a single row read from `user_power_scores` instead
of 6 queries. The KV cache (Problem 1) stays as a second layer for public badge
load.

**Files to change:**
- New migration: `packages/db/migrations/NNN_user_power_scores.sql`
- `apps/portal/src/app/badge/[userId]/[subject]/power.ts` — read from table
- `apps/console/src/app/(dashboard)/badge/page.tsx` — same
- `apps/mobile/src/components/PowerCard.tsx` — replace 3-query fetch with single row read from `user_power_scores`
- `apps/mobile/src/components/UserBottomSheet.tsx` — replace `accreditation_scores` score query with `user_power_scores` read

---

### Problem 3 — Nightly PageRank batch will time out at scale (medium priority)

**What happens at scale:** `refresh_all_accreditation_scores()` is a full-graph
PageRank recalculation run as a single Supabase cron job nightly. At 100M users
with millions of accreditation edges this will run for hours and either time out
or lock the DB.

**Fix:** replace the full nightly recalc with incremental edge-triggered updates.
When an accreditation is added or removed, recalculate PageRank only for the
affected receiver and their upstream ancestors (not the whole graph). Use a
Supabase trigger on `accreditations` to enqueue a job, and a lightweight edge
function or cron (runs every 5 min) to drain the queue.

Interim step (implement first, before the full incremental approach): add a
`WHERE user_id IN (SELECT id FROM users WHERE updated_at > now() - interval '24h')`
filter to `refresh_all_accreditation_scores()` so only recently-active users are
refreshed nightly. This alone reduces the batch by orders of magnitude and buys
time to build the incremental system.

**Files to change:**
- New migration: `packages/db/migrations/NNN_incremental_pagerank.sql` — adds
  `accreditation_score_queue` table + trigger on `accreditations`
- New file: `apps/portal/src/app/api/cron/refresh-pagerank/route.ts` — drains
  the queue in batches of 500, recalculates scores for queued user IDs only

---

### Problem 4 — Power Tree `IN` clauses grow unbounded (lower priority)

**What happens at scale:** a Diamond-tier user with 500+ direct delegators causes
`fetchPowerTree()` to run `WHERE delegate_id IN (500 UUIDs)` for L2, and
potentially `IN (thousands)` for L3. At 100M users the query planner degrades.

**Fix:** materialise the top 3 tree layers as a JSONB column on
`user_power_scores`:

```sql
ALTER TABLE user_power_scores ADD COLUMN tree_snapshot JSONB;
```

Populate it (along with the score) in `recompute_power_score()`. `fetchPowerTree()`
then reads the snapshot instead of walking the graph live. Snapshot rebuilds
happen on the same trigger cadence as the score itself.

**Files to change:**
- `packages/db/migrations/NNN_user_power_scores.sql` — add `tree_snapshot` column
- `apps/portal/src/lib/power-tree.ts` — `fetchPowerTree()` reads snapshot first,
  falls back to live queries if snapshot is NULL

---

## TDD test suite

Write and get sign-off on these tests BEFORE implementing any of the above.
Each test must show observable terminal pass/fail (`vitest run` or `jest`).

Place tests in `apps/portal/src/__tests__/scaling/`.

### Block A — KV caching (Problem 1)

```
A1  getPowerStats() returns cached value without hitting Supabase
    Setup: prime KV with a known PowerStats object for (userId, subject)
    Assert: Supabase client methods are never called
    Assert: returned object equals the cached value exactly

A2  getPowerStats() writes to KV on cache miss
    Setup: KV is empty; Supabase returns mock stats
    Assert: after the call, kv.get('power:userId:subject') equals the returned stats

A3  KV cache TTL is ≤ 5 minutes
    Assert: the kv.set call includes { ex: n } where n ≤ 300

A4  Cache is invalidated when a delegation is written
    Setup: cache is primed; a delegation INSERT event fires the invalidation handler
    Assert: kv.get('power:delegateId:subject') returns null after the event

A5  getPowerStats() does not throw when KV is unavailable (circuit-break)
    Setup: KV client throws on get()
    Assert: function falls back to live DB queries and returns valid stats
    Assert: no error is propagated to the caller
```

### Block B — Denormalised power score table (Problem 2)

```
B1  recompute_power_score() inserts a row when none exists
    Setup: user has 2 delegations, 1 accreditation (weight 3), 1 vote
    Expected score: 2*10 + 3*5 + 1*2 = 37
    Assert: SELECT score FROM user_power_scores WHERE user_id = ? AND subject = ?
            returns 37

B2  recompute_power_score() updates the row when it already exists
    Setup: existing row with score 10; add 1 more delegation
    Assert: row is updated (not duplicated) and score is 20

B3  Delegation INSERT triggers score recomputation for the delegate
    Setup: create delegation (delegator_id → delegate_id, subject)
    Assert: within 1 second, user_power_scores row for delegate_id reflects
            incremented score

B4  Delegation DELETE triggers score recomputation for the delegate
    Setup: existing delegation; delete it
    Assert: delegate's score decreases by 10

B5  Accreditation INSERT triggers score recomputation for receiver
    Setup: accreditation (giver → receiver, weight 2, subject)
    Assert: receiver's score increases by 2*5 = 10

B6  Tier is correctly derived after recomputation
    Setup: user score rises from 75 to 85 after a delegation INSERT
    Assert: tier column changes from 'Silver' to 'Gold'

B7  getPowerStats() reads from user_power_scores with a single query
    Setup: user_power_scores has a row for (userId, subject)
    Assert: Supabase .from('user_power_scores') is called exactly once
    Assert: no calls to .from('delegations'), .from('votes'), etc.

B8  score formula in recompute_power_score() matches the TypeScript buildStats() formula
    Setup: known fixture with all fields populated
    Assert: SQL function output === TypeScript function output for same inputs
```

### Block C — Incremental PageRank (Problem 3)

```
C1  Accreditation INSERT enqueues a job for the receiver
    Assert: accreditation_score_queue gains a row with user_id = receiver_id

C2  Accreditation DELETE enqueues a job for the receiver
    Assert: accreditation_score_queue gains a row with user_id = receiver_id

C3  Cron handler processes queued jobs and updates accreditation_scores
    Setup: queue has 3 rows; mock the PageRank calculation
    Assert: after handler runs, all 3 rows are removed from queue
    Assert: accreditation_scores is updated for each queued user_id

C4  Cron handler processes jobs in batches of ≤ 500
    Setup: queue has 1200 rows
    Assert: handler makes ceil(1200/500) = 3 batch passes, not 1200 individual queries

C5  Duplicate queue entries for same user_id are deduplicated before processing
    Setup: 5 queue rows for the same user_id (rapid successive accreditations)
    Assert: PageRank is recalculated exactly once for that user_id per cron run

C6  Nightly full-refresh only touches users active in last 24h
    Assert: refresh_all_accreditation_scores() query includes
            WHERE u.updated_at > now() - interval '24h' (or equivalent)
```

### Block D — Tree snapshot (Problem 4)

```
D1  fetchPowerTree() reads tree_snapshot when present and returns without DB queries
    Setup: user_power_scores.tree_snapshot is populated with a known 3-layer tree
    Assert: no calls to .from('delegations') or .from('accreditations')
    Assert: returned TreeData equals the snapshot exactly

D2  fetchPowerTree() falls back to live queries when snapshot is NULL
    Setup: user_power_scores row exists but tree_snapshot is NULL
    Assert: .from('delegations') is called at least once
    Assert: returned TreeData is non-null

D3  recompute_power_score() updates tree_snapshot as part of the same transaction
    Setup: a delegation INSERT fires the trigger
    Assert: user_power_scores row has updated score AND updated tree_snapshot
    Assert: both fields are updated atomically (no intermediate state visible)

D4  tree_snapshot is capped at 3 layers regardless of network depth
    Setup: user has 4 layers of delegators (L1 → L2 → L3 → L4)
    Assert: snapshot.nodes contains no node with depth > 3
    Assert: snapshot.tailCount reflects the L4+ count

D5  tree_snapshot stores at most 30 L3 nodes (matches live query cap)
    Setup: user has 50 L3 delegators
    Assert: snapshot.nodes.filter(n => n.depth === 3).length <= 30
    Assert: snapshot.tailCount === 20
```

### Block E — Regression (run these after every change)

```
E1  Public badge page returns 200 for a real userId/subject
E2  OG image route returns a 1200x630 PNG (Content-Type: image/png)
E3  Demo badge pages return 200 for all 5 tiers
E4  Power score on badge page matches user_power_scores table value
E5  Share buttons render: X, in, f, ig, WhatsApp, Copy link
E6  navigator.share() is called on Instagram button press (mobile UA)
E7  Mobile PowerCard displays non-zero score after pre-existing bug fix
    (accreditation_scores query uses subject_tag + community_id IS NULL)
E8  Mobile PowerBar shows correct tier distribution after bug fix
E9  Mobile Power tab renders without blank/0-score state for a real user
```

---

## Implementation order

1. Write and get sign-off on the TDD test suite above (Blocks A–E)
2. Implement Block A (KV cache) — smallest change, biggest immediate win
3. Implement Block B (denormalised scores) — requires a migration + triggers
4. Implement Block C (incremental PageRank) — requires a migration + cron route
5. Implement Block D (tree snapshot) — depends on Block B table existing
6. Run Block E regressions after each block

## Key constraints

- Do not change the public badge URL structure (`/badge/[userId]/[subject]`)
- Do not change the OG image dimensions (1200x630)
- The TypeScript score formula in `buildStats()` (portal/power.ts) must stay in
  sync with the SQL formula in `recompute_power_score()` — add a test (B8) to
  enforce this permanently
- Vercel KV must be provisioned in the `loop-governance` Vercel project before
  the KV code is deployed (run `vercel env add KV_REST_API_URL` etc.)
