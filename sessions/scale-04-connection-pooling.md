# Loop Governance: Supabase connection pooling — 2026-07-28

## Context

The Loop Governance platform (`/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-governance`)
uses Supabase Postgres as its database. All queries go through the standard
Supabase client which connects directly to Postgres on port 5432.

At scale, direct Postgres connections are the bottleneck:
- Supabase Pro allows ~500 direct connections
- Each Vercel serverless function invocation opens a new connection
- At 100M users with viral badge sharing, hundreds of simultaneous invocations
  exhaust the connection pool, causing `too many connections` errors that surface
  as 500s

The fix is PgBouncer (Supabase's built-in connection pooler) in transaction mode.
PgBouncer multiplexes thousands of app connections over a small pool of actual
Postgres connections (typically 20-50), reducing peak Postgres connections by
99%+.

This session also adds a read-only database client for queries that do not need
`service_role` permissions, reducing the attack surface and enabling future
read-replica routing.

---

## What exists today (read these files first)

| File | Role |
|---|---|
| `apps/portal/src/lib/supabase-server.ts` | `createServiceClient()` + `createClient()` — direct Postgres connections |
| `apps/console/src/lib/supabase-server.ts` | Same pattern in console app |
| `.env.local` (not in repo) / Vercel env vars | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` etc. |

The Supabase pooler URL is different from the direct URL:
- Direct (port 5432): `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
- Pooler transaction mode (port 6543): `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

The pooler URL is available in the Supabase dashboard under
Settings > Database > Connection pooling. It is NOT the same as `SUPABASE_URL`
(which is the REST/PostgREST URL).

---

## Changes needed

### 1. Add pooler env vars

Add to Vercel environment (all environments: production, preview, development):
```
SUPABASE_DB_POOLER_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

This is a Postgres connection string (not the Supabase REST URL). Do not confuse
the two. Get it from Supabase Dashboard > Settings > Database > Connection pooling
> Transaction mode.

### 2. Add a server-side Postgres client for raw queries

Install:
```
pnpm add postgres --filter portal --filter console
```

Create `apps/portal/src/lib/db.ts`:
```ts
import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!_sql) {
    _sql = postgres(process.env.SUPABASE_DB_POOLER_URL!, {
      max: 5,           // max connections per lambda instance
      idle_timeout: 20, // release idle connections after 20s
      connect_timeout: 10,
    });
  }
  return _sql;
}
```

Mirror the file in `apps/console/src/lib/db.ts`.

Note: `postgres` (the `postgres` npm package) works in Node.js serverless
functions. Do not use it in Vercel middleware (Edge runtime).

### 3. Switch heavy read queries to the pooler client

The badge page and power stats queries are the highest-volume read path. In
`apps/portal/src/app/badge/[userId]/[subject]/power.ts`, replace the Supabase
client calls for pure reads with raw SQL via `getDb()`:

Before (Supabase client):
```ts
const { count } = await admin
  .from("votes")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId);
```

After (pooler, once `user_vote_proposal_counts` table exists from session scale-02):
```ts
const sql = getDb();
const [row] = await sql`
  SELECT votes_cast, proposals_authored
  FROM user_vote_proposal_counts
  WHERE user_id = ${userId}
`;
```

### 4. Keep Supabase client for writes and auth

Do not replace the Supabase client for:
- Auth operations (always use `createClient()`)
- Realtime subscriptions
- Row-Level Security dependent queries (RLS only applies through PostgREST/Supabase client)
- Writes — direct Postgres bypasses RLS, which is intentional for `service_role`
  operations but must be used carefully

The pattern is: Supabase client for auth + RLS queries, pooler for high-volume
reads in server components and API routes.

### 5. Configure Supabase pooler in the dashboard

In Supabase Dashboard > Settings > Database > Connection pooling:
- Mode: **Transaction** (required for serverless; Session mode is for long-lived connections)
- Pool size: start at 20, increase if you see pool exhaustion in Supabase logs
- Max client connections: leave at default unless Supabase advises otherwise

---

## TDD test suite

Place tests in `apps/portal/src/__tests__/scaling/connection-pool.test.ts`.

```
P1  getDb() returns a postgres client instance
    Assert: getDb() returns an object with a query method
    Assert: calling getDb() twice returns the same instance (singleton)

P2  getDb() uses SUPABASE_DB_POOLER_URL env var
    Assert: the connection string used by getDb() equals SUPABASE_DB_POOLER_URL
    Assert: does NOT use SUPABASE_URL or port 5432

P3  pooler client can execute a simple read query
    Query: SELECT 1 AS ping
    Assert: result[0].ping === 1

P4  pooler client does not open more than max connections per instance
    Open 20 concurrent queries via getDb()
    Assert: active connections in pg_stat_activity <= 5 (the configured max)

P5  badge page power stats load via pooler (no direct Postgres port 5432)
    Assert: no database connection string in app code references port 5432
    (Grep check: no string ':5432' in power.ts or badge page.tsx)

P6  auth still uses Supabase client (not raw postgres)
    Assert: createClient() is called for auth.getUser()
    Assert: no raw SQL query runs in the auth flow

P7  50 concurrent badge page loads complete without connection errors
    Simulate 50 concurrent requests to getPowerStats() with a real DB connection
    Assert: all 50 return valid PowerStats objects
    Assert: no 'too many connections' or connection timeout errors in logs

P8  getDb() handles connection failure with a clear error (does not hang)
    Point SUPABASE_DB_POOLER_URL at an invalid host
    Assert: getDb() call rejects within connect_timeout (10s)
    Assert: error message identifies the connection string issue

P9  badge page falls back gracefully if DB is unreachable
    (Integration test with mocked DB failure)
    Assert: page returns HTTP 200 with an error state UI, not HTTP 500
    Assert: error is logged server-side

P10 console badge page also uses pooler client
    Assert: apps/console/src/lib/db.ts exists and uses SUPABASE_DB_POOLER_URL
    Assert: console badge page imports from '@/lib/db' for read queries
```

---

## Mobile app notes

The mobile app (`apps/mobile`) uses `@supabase/supabase-js` client-side over
HTTPS/REST (PostgREST), not direct Postgres. It does not open Postgres connections
and does not need PgBouncer configuration. No changes to mobile for this session.

However, two mobile query patterns are worth flagging for a future optimisation
session:

1. **N+1 in `useRealtimeChannel.ts`:** on every incoming Realtime message the hook
   fires individual queries for `users WHERE id = $1` and `accreditation_scores
   WHERE user_id = $1 AND community_id = $2`. The second query always returns empty
   (migration 035 deleted community-scoped scores). At chat volume this is 2 wasted
   round trips per message. Fix: batch author lookups and switch to subject-scoped
   score queries once the `user_power_scores` table from
   `NEXT-SESSION-scaling-power-scores.md` exists.

2. **Repeated score fetches across components:** `PowerCard`, `UserBottomSheet`,
   and `PowerBar` all independently fetch scores on mount. A Zustand store or
   React Query cache layer would eliminate the duplicate fetches within the same
   session.

---

## Key constraints

- Transaction-mode pooling does not support prepared statements with the default
  Supabase Postgres setup — if you see prepared statement errors, add
  `prepare: false` to the `postgres()` options
- Never hardcode connection strings — always read from env vars
- The direct connection URL (port 5432) can stay in the codebase for migrations
  (`supabase db push` uses it); only the application read path uses the pooler
- Test the pooler connection in Supabase Studio > SQL Editor before wiring up
  the app — confirm the pooler URL works and the password is correct
- PgBouncer in transaction mode is incompatible with `SET LOCAL` session
  variables and advisory locks — avoid these in server code
