# Loop Governance — SOUL

> Operating rules and load-bearing architecture decisions. Read this first in every session.
> Last updated: 2026-08-09

## Prime directives

1. **One shared DB, four apps.** `oztfzqkpwwfnxrydmsuo` (Supabase project, misnamed "loop-trading" for historical reasons) is the live database for console, portal, admin, and mobile. A schema change here is live for all of them immediately. There is no per-app database isolation.
2. **SQL migrations are the source of truth for live table structure**, not the Drizzle schema files in `packages/db/src/schema/`. The two can drift — they have already (see LESSONS.md #1).
3. **RLS is the safety layer.** `createClient()` (user-scoped) respects RLS. `createServiceClient()` bypasses RLS entirely — only use it for privileged operations: admin actions, cron jobs, treasury writes, score computation.
4. **Project boundaries are sacred.** A console session never updates portal continuity and vice versa unless Samuel explicitly asks for a cross-app change.
5. **Verify, don't guess.** If unsure how something behaves: check the migration SQL, check the live schema, check the actual component. A confident-sounding comment in a doc is not a substitute for reading the code.

## What this platform is

A community governance platform where:
- Users belong to **communities** arranged in a tree (micro → local → city → state → national → continental → global)
- Users **delegate votes** (scoped to community + subject) transitively up to a configurable depth
- Users **accredit** each other's expertise in subjects — feeds a PageRank-style scoring system
- Users create **proposals** (fund allocation or policy), which pass to voting and, if approved, trigger treasury allocations cascading down the community hierarchy
- The system computes **power scores** per user per subject, displayed on shareable badge pages and in the Power Tree visualisation

## Architecture decisions — load-bearing

### Auth (all three Next.js apps)

Two client constructors in `apps/*/src/lib/supabase-server.ts`:
- **`createClient()`** — async, request-scoped, built fresh per call using the current request's cookies via `@supabase/ssr`. Respects RLS as the calling user. **NOT a singleton** — cookies are request-scoped in Next's App Router; a fresh client per request is intentional and correct.
- **`createServiceClient()`** — uses the service-role key, bypasses RLS entirely. For privileged server-side operations only.

### Accreditation scores: subject-only since migration 035

**CRITICAL — gets new developers wrong every time:**

Migration `035_pagerank_subject_only.sql` changed `accreditation_scores` from community+subject scoped to **subject-only**:
- All community-scoped rows were deleted
- `community_id` was made nullable on the table
- The nightly cron `refresh_all_accreditation_scores()` writes rows with `community_id IS NULL` only

**Correct filter for any new read path:**
```sql
WHERE user_id = $1 AND subject_tag = $activeSubject AND community_id IS NULL
```
Not `.eq('community_id', someId)` — that returns 0 rows and silently shows every user as Bronze.

Files that get this right (with explanatory comments citing migration 035): `PowerCard.tsx`, `PowerBar.tsx`, `UserBottomSheet.tsx`. Follow their pattern.

**Drizzle drift:** `packages/db/src/schema/accreditations.ts` still declares `accreditationScores.communityId` as `.notNull()` — stale. The migration SQL is correct; the Drizzle schema file is wrong for this one table.

### Delegation vs accreditation — do not conflate

- **`delegations`** — "I delegate my vote." Transitive, scoped to `(delegator_id, community_id, subject_tag)`. Community_id NOT NULL.
- **`accreditations`** — "I vouch for this person's competence." Feeds PageRank scoring. Scoped to `(giver_id, receiver_id, community_id, subject_tag)`. Community_id NOT NULL here too. But `accreditation_scores` (the computed output) is subject-only — see above.

### Communities

Self-referencing (`parent_id`) with materialised `path` (ltree-style) and H3 geospatial cells. Governance parameters (quorum size, delegation depth limit, decay, anonymous voting) are configured per community and inherited/overridden down the tree via the admin app.

### Treasury

`proposals` → `allocation_slices` → `allocation_directions` — full ledger with cascade tracking. All treasury reads/writes go through `createServiceClient()`. Unclaimed slices expire after 365 days via the `sweep-expired-allocations` cron in `apps/console`.

### On-chain sync

`chain_tx_hash` on proposals/campaigns/elections. Postgres is the primary record; Base L2 sync is secondary. `packages/contracts` is an independent Hardhat build system, not part of the TS/ESLint pipeline.

### Power scores

Score formula: `delegationsReceived * 10 + accreditationWeight * 5 + votes * 2 + proposals * 1` (approximate — verify in `apps/portal/src/app/badge/[userId]/[subject]/power.ts` `buildStats()`).

Scores are currently computed live on every badge page request (6 DB queries). This will not scale. A denormalised `user_power_scores` table + trigger-based recomputation is the planned fix — session prompt at `NEXT-SESSION-scaling-power-scores.md`.

### Power Tree

Live: `apps/portal/src/lib/power-tree.ts` (`fetchPowerTree()`) + `apps/portal/src/app/badge/[userId]/[subject]/page.tsx`. SVG rendered server-side, embedded via `dangerouslySetInnerHTML`. OG image at `/badge/[userId]/[subject]/og/route.tsx` uses Satori + ImageResponse. Implemented ~2026-07-25.

## Quality baseline (as of 2026-07-28)

- ESLint: configured in all apps (flat config)
- TypeScript: clean (`pnpm type-check` passes)
- Tests: portal has Vitest tests in `src/__tests__/scaling/`; admin has a Node test script (`tests/admin-console.test.mjs`) with 5 failing assertions (FK fixture issue); console and mobile have no test suites yet
- Build: `pnpm build` passes

## Apps at a glance

| App | URL | Main features |
|---|---|---|
| console | console.loopcmbntr.live | Dashboard, delegation, accreditation, proposals, elections, treasury, community chat, badge, campaigns, token activity, map |
| portal | gov.loopcmbntr.live | Public badge pages, Power Tree, join flows, Stripe checkout for LOOP tokens |
| admin | (internal) | Platform admin, org-admin/manager roles, moderation queue, governance config editor, audit log |
| mobile | iOS + Android | Power score, community chat, delegation/accreditation flows, Power Tree |
