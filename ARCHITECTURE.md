# Loop Governance — Architecture

A monorepo for a community governance platform: users delegate votes, accredit
each other's expertise, vote on proposals, and route treasury funds through a
hierarchy of nested communities. This doc explains the domain model and how
the pieces fit together — read it before making schema or cross-app changes.

## Apps and packages

```
apps/portal    Next.js 15 — public site (gov.loopcmbntr.live). Badges, join
               flows, campaigns, the /badge/[userId]/[subject] power-tree
               visualisation, Stripe checkout for LOOP token purchases.
apps/console   Next.js 15 — member dashboard (console.loopcmbntr.live).
               Delegation, accreditation, proposals, elections, treasury,
               chat per community.
apps/admin     Next.js 15 — internal ops panel. Platform-wide admin/org-admin/
               org-manager roles, moderation queue, governance config editor,
               audit log.
apps/mobile    Expo / React Native (iOS + Android), added 2026-07-28. Mirrors
               console's core loop (power, chat, delegate/accredit) for phone.
packages/db    Drizzle schema + raw SQL migrations. Single source of truth
               for table shapes — see "Schema drift" below for a caveat.
packages/contracts   Solidity (Hardhat). LOOP token contracts on Base L2.
                     Independent build system — not part of the TS/ESLint
                     pipeline.
packages/config, packages/ui, packages/email, packages/geo, packages/chain,
packages/governance   Shared TS config, UI components, email templates,
                       H3 geo helpers, viem/chain clients, governance logic.
```

All four apps + `packages/db` point at **one shared Supabase Postgres
project** (`oztfzqkpwwfnxrydmsuo`, named "loop-trading" in the Supabase org
for historical reasons — it predates the governance product and is also used
by the separate Loop Cmbntr marketing site). Schema changes here are live for
all of them; there is no per-app database isolation.

## Domain model

### Communities are a tree, not a flat list

`communities` is self-referencing (`parent_id`) and stores a materialised
`path` (ltree-style: `global.americas.canada.bc.vancouver.local_12`) plus H3
geospatial cells for location-based queries. `level` is one of `micro, local,
city, state, national, continental, global`. Governance parameters
(quorum size, delegation depth limit, delegation decay, anonymous voting)
are configured **per community**, inherited/overridden down the tree via the
admin app's governance editor.

### Two distinct trust relationships: delegation vs. accreditation

These are separate tables and mean different things — don't conflate them:

- **`delegations`** — "I delegate my *vote* to this person." Transitive: if
  A delegates to B and B delegates to C, C votes with the combined weight.
  Scoped to `(delegator_id, community_id, subject_tag)`.
- **`accreditations`** — "I vouch for this person's *competence* in this
  subject." Feeds the PageRank-style scoring system (below). Scoped to
  `(giver_id, receiver_id, community_id, subject_tag)`.

Both are **community + subject scoped**, and both stay in the schema as
`community_id NOT NULL` — this is real, current behaviour.

### Scoring became subject-only in migration 035 — this is the one gotcha to know

Originally `accreditation_scores` was scoped like accreditations
(`user, community, subject`). **Migration 035** (`035_pagerank_subject_only.sql`)
changed this: scores are now computed **per subject only**, with
`community_id` forced to `NULL` on every row (old community-scoped rows were
deleted). The nightly cron (`refresh_all_accreditation_scores()`) runs
PageRank once per distinct `subject_tag` across all accreditations, not once
per community.

**Practical effect on app code:** anywhere you read `accreditation_scores`,
the correct filter is `.is('community_id', null)`, not `.eq('community_id',
someId)`. `PowerCard.tsx`, `PowerBar.tsx`, and `UserBottomSheet.tsx` (mobile)
already do this correctly with a comment citing migration 035 — if you add a
new read path for scores, follow the same pattern.

**Known schema drift:** `packages/db/src/schema/accreditations.ts` still
declares `accreditationScores.communityId` as `.notNull()` in the Drizzle
schema, but migration 035 dropped that constraint on the live table. The
Drizzle schema file is stale relative to the real database here — don't
trust it blindly for this one table; the migration SQL is the source of
truth until schema.ts is updated to match.

### Treasury: proposals → allocations → cascades

- **`proposals`** — fund allocation or policy proposals, scoped to a
  community, with `votesFor`/`votesAgainst`, an optional `budget_request_cents`,
  and an optional `directDemocracy` flag (opens voting to all members, not
  just leaders).
- **`impact_treasury_transfers`**, **`allocation_slices`**,
  **`allocation_directions`** — the ledger for how an approved proposal's
  funds actually move: a top-level pool disburses into slices that cascade
  down through the community hierarchy (leader / participant / delegator
  splits), each direction/slice tracked as its own row so the cascade is
  auditable. `apps/console/src/app/api/cron/sweep-expired-allocations`
  expires unclaimed slices after 365 days.
- All treasury reads/writes go through `createServiceClient()` — never the
  anon client. There is currently no end-user-facing path that queries these
  tables directly; everything is mediated by server actions.

### On-chain sync

Proposals, campaigns, and elections all carry a `chain_tx_hash` column —
governance decisions can be mirrored to the LOOP token contracts on Base L2
(`packages/contracts`), but the Postgres tables are the primary record; the
chain sync is a secondary write, not the source of truth for app reads.

## Auth & data access pattern

`apps/*/src/lib/supabase-server.ts` exports two client constructors (same
shape in all three Next.js apps):

- **`createClient()`** — async, request-scoped, built fresh per call using
  the current request's cookies via `@supabase/ssr`. Respects RLS as the
  calling user. This is deliberately **not** a singleton — cookies are
  request-scoped in Next's App Router, so a fresh client per request is
  correct, not a bug.
- **`createServiceClient()`** — uses the service-role key, **bypasses RLS
  entirely**. Used for anything privileged: admin actions, cron jobs, treasury
  writes, score computation.

Guideline: if a table is only ever touched via `createServiceClient()` (true
today for `accreditation_score_queue`, `user_power_scores`,
`impact_treasury_transfers`, `allocation_slices`, `allocation_directions`),
enabling Postgres RLS on it costs nothing functionally — service-role ignores
RLS regardless of policy — but it closes direct public access via the
Supabase REST API using the anon key, which is otherwise wide open.

## Testing

- `apps/portal` — Vitest, `src/__tests__/scaling/`. Covers KV caching, vote
  count materialisation, connection pooling, incremental PageRank
  (`refresh-pagerank/process-queue.ts`), OG image caching.
- `apps/admin` — a plain Node test script (`tests/admin-console.test.mjs`)
  that hits the real database — no mocking. Some assertions currently fail on
  FK violations from missing fixtures (see `sessions/bugfix-backlog.md`).
- No test suite exists yet for console or mobile.

## Quality tooling

ESLint (flat config) and `tsc --noEmit` are wired up per app as of the
2026-07-28 health-check session — see `sessions/health-check.md` and
`sessions/bugfix-backlog.md` for what was fixed and what's still open
(mainly: ~280 `any`-typed Supabase query results, and ~68 unchecked
`process.env.X!` accesses that should route through a `requireEnv()`
helper instead).
