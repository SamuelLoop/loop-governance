# Loop Governance — LESSONS

> Hard-won gotchas. Add a new entry the session it's discovered. Never delete.
> Last updated: 2026-08-10

---

## 0a. `vercel project inspect`'s "Build Command" does not reflect `vercel.json`

When a project's dashboard Build Command override is OFF, `vercel project
inspect` shows the Framework Preset's generic placeholder (e.g. `` `npm run
build` or `next build` ``), NOT what a real deploy will actually run.
`vercel.json`'s `buildCommand` is applied at build time from the deployed
source — it's invisible to this CLI command entirely. Don't use `project
inspect` to confirm a `vercel.json` fix took effect; check the actual build
logs on a real deployment instead. Also: `vercel.json` is resolved relative
to the project's configured Root Directory, not the repo root — a
repo-root `vercel.json` is silently unused by any project whose Root
Directory is a subdirectory (found: `apps/console/vercel.json` and
`apps/portal/vercel.json` both existed and were correct all along; an
earlier `find -maxdepth 2` search had a depth bug that missed both and
produced a false "missing" report).

## 0b. `pnpm dev` / `turbo dev` at repo root also launches `apps/mobile`'s Expo dev server

Turbo's `dev` task runs the `dev` script in every workspace that has one —
including `apps/mobile` (`expo start --dev-client`), an interactive TTY
process that doesn't behave inside Turbo's multiplexed output. Anything
describing "run the 3 web app dev servers" needs an explicit Turbo
`--filter` (planned: `pnpm dev:web`), not bare `pnpm dev`.

## 1. Migration 035 made accreditation_scores subject-only — querying by community_id returns 0 rows

**What happened:** `035_pagerank_subject_only.sql` changed the scoring model. All community-scoped rows were deleted. The nightly cron now only writes rows with `community_id IS NULL`.

**Effect:** any code that queries `accreditation_scores WHERE community_id = $communityId` silently returns 0 rows — every user appears as Bronze tier / score 0. No error, no warning.

**Correct pattern:**
```ts
.from('accreditation_scores')
.select('score, tier')
.eq('user_id', userId)
.eq('subject_tag', activeSubject)
.is('community_id', null)
```

**Files that get this right** (with comments citing migration 035): `PowerCard.tsx`, `PowerBar.tsx`, `UserBottomSheet.tsx`. Read these before writing any new score read path.

---

## 2. Drizzle schema drifts from the live database — SQL migrations win

`packages/db/src/schema/accreditations.ts` still declares `accreditationScores.communityId` as `.notNull()` — this is wrong; migration 035 made it nullable on the live table. The Drizzle schema was not updated to match.

**Rule:** When there is any discrepancy between the Drizzle schema file and a SQL migration, **the SQL migration is correct** for what the live database actually looks like. Verify against the migration files (and ideally the live schema via `supabase db diff`) before trusting Drizzle types.

---

## 3. `createClient()` is not a singleton — a fresh instance per request is intentional

It looks like a bug; it is not. Next.js App Router request scope means cookies are per-request. A module-level singleton would share cookies across concurrent requests. The `@supabase/ssr` pattern requires creating a new client on each call. Do not "fix" this by caching the client.

---

## 4. `process.env.X!` is a silent failure — add a `requireEnv()` helper for new code

The `!` non-null assertion is compile-time only. If the variable is missing at runtime, the failure happens downstream (often as a cryptic auth error or null reference), not at the point of access. 68 instances exist as of 2026-07-28 — tracked in `sessions/bugfix-backlog.md`. Do not add more. For new code:

```ts
// src/lib/env.ts
export function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required environment variable: ${name}`)
  return val
}
```

---

## 5. Admin test failures are fixture issues, not application bugs

`tests/admin-console.test.mjs` fails on FK violations because the test inserts into `proposals` without a corresponding `communities` row. This is a test setup problem (missing fixtures), not a bug in the production code. Do not try to fix by loosening FK constraints.

---

## 6. Supabase project is misnamed "loop-trading" — always use the project ID

The Supabase project hosting the governance platform is named "loop-trading" in the Supabase org (it predates the governance product and was reused). When referencing the project by name in CLI commands or docs, use the project reference ID `oztfzqkpwwfnxrydmsuo` to avoid confusion with the separate loop-trading Vite app.

---

## 7. The shared DB means a migration touches all four apps simultaneously

There is no per-app database isolation. A migration that adds a column, drops a table, or changes a constraint is live for console, portal, admin, AND mobile the instant it runs. Test migrations locally (`supabase db reset`) and verify the effect on all apps before deploying.

---

## 8. Stage/main promotion must be fast-forward only

Promoting `stage → main` with a merge commit creates a commit that exists only on main, not stage. The next promotion then can't fast-forward and is rejected. Always promote with `git merge --ff-only origin/stage` (or equivalent), never with the GitHub green merge button which creates a merge commit.

---

## 9. The mobile community_id bug looked fixed but was stale in the session prompt

`sessions/NEXT-SESSION-scaling-power-scores.md` described `PowerCard.tsx`, `UserBottomSheet.tsx`, and `PowerBar.tsx` as having a dead `.eq('community_id', communityId)` bug. The health-check session (`bugfix-backlog.md`) verified this was already fixed in all three files before the health-check ran. If a session prompt describes a bug: verify the code before assuming the prompt is current.

---

## 10. Score formula divergence between TypeScript and SQL is a real risk

`buildStats()` in `apps/portal/src/app/badge/[userId]/[subject]/power.ts` computes power scores in TypeScript. The planned `recompute_power_score()` SQL function (Problem 2 in the scaling session) must match it exactly — they cover the same computation in two languages. Test B8 in the scaling session exists specifically to catch drift. Whenever either implementation changes, update both.

---

## 11. A prior session's claim that an asset was "already sourced and reusable" needs re-verifying, not just re-reading

`web-eng-plan-output.md` recorded that real font files for `packages/ui/fonts` were already downloaded during session 3's review-artifact build and could be reused. Session 6 checked before relying on this and found nothing reachable — no `.woff2` files anywhere in the repo, git history, or any local scratchpad. Most likely explanation: session 3's interactive review was published as an external Claude Artifact with fonts embedded as base64 inside that HTML, which never left a file on disk this session could read. Session-local scratchpad state (and, per the harness, published Artifacts) does not durably persist across sessions the way a committed file does — a session prompt that says "X was already produced, just reuse it" needs the same verify-before-trusting treatment as any other claim in a prior session's output (see lesson 9), even when it's about a build artifact rather than a code claim.
