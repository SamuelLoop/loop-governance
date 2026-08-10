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

---

## 12. A `/*...*/` comment mentioning a glob path like `apps/*/src/...` breaks CSS/JS parsing

**What happened:** A comment written as `/* ... apps/*/src/lib/power-tree.ts ... */` (session 7, web scaffold) contains the literal two-character substring `*/` inside `apps/*/src` — the asterisk from the glob immediately followed by the slash in `/src`. Both CSS and JS/TSX block comments end at the *first* `*/` they find, so the comment closes right there, and everything after it (including the real closing `*/`) is parsed as live code/CSS. This bit twice in the same session: once already-present in `packages/ui/theme.css` (from session 6), once freshly introduced in `community-map.tsx`.

**Effect:** In CSS (`theme.css`, imported by all 3 apps), this is silent in some code paths and loud in others — portal's dev server 500'd on every route with a `CssSyntaxError` the moment it actually compiled `globals.css`; console/admin hadn't hit a page that forced the compile yet, so they looked fine until they did. In TSX, it's a hard syntax error (`tsc`/webpack refuses to parse) — caught immediately, not silent.

**Correct pattern:** Never write a real glob-with-asterisk path (`apps/*/src/...`, `packages/*/dist/...`) inside a `/* ... */` comment. Rephrase to avoid the literal `*/` substring — e.g. "each app's lib/power-tree.ts" instead of "apps/*/src/lib/power-tree.ts". If you must reference a real glob pattern in a comment, break it up (`apps/`+`*`+`/src`) or use a different delimiter style entirely.

---

## 13. Naming a custom `@theme` token `--spacing-{named-key}` in Tailwind v4 silently shadows `max-w-{named-key}` (and the rest of that key's reserved scale)

**What happened:** `packages/ui/theme.css` §3 defined named spacing aliases as `--spacing-xs`/`--spacing-sm`/`--spacing-md`/`--spacing-lg`/`--spacing-xl`/`--spacing-2xl` (session 6), intended purely as convenience aliases for component code (`var(--spacing-md)` instead of memorising `--spacing-4`). Once `theme.css` actually got imported into an app's `globals.css` for the first time (session 7), this silently broke `max-w-xs/sm/md/lg/xl/2xl` sitewide: Tailwind v4 normally backs those from its own `--container-*` scale (`--container-sm: 24rem`, `--container-md: 28rem`, `--container-xl: 36rem`, `--container-2xl: 42rem`, …), but a user-defined `--spacing-{key}` with a matching named suffix takes priority and the built-in `--container-{key}` token stops being emitted entirely. Confirmed by inspecting the actual compiled CSS: `.max-w-2xl{max-width:var(--spacing-12)}` (48px) instead of `.max-w-2xl{max-width:var(--container-2xl)}` (672px) — off by roughly 14x, and in the direction of collapsing layouts, not expanding them (though downstream effects on flex/overflow children can visually read as "everything's oversized" just as easily as "everything's crushed," depending on what's inside).

**Effect:** Every card/dialog/page-content wrapper using `max-w-sm`, `max-w-md`, `max-w-xl`, or `max-w-2xl` anywhere in console or admin (extremely common — the login page's card, the badge page's whole content wrapper, dialogs, etc.) silently rendered at the wrong width the moment `theme.css` was wired in. No build error, no lint warning, no console error — a real user had to notice the visual breakage and report it.

**Correct pattern:** Tailwind v4's reserved theme namespaces (`--spacing-*`, `--color-*`, `--font-*`, `--text-*`, `--radius-*`, `--container-*`, `--breakpoint-*`, etc.) are **shared keyspaces**, not scoped to the specific utility family you're thinking about — defining any key under a reserved prefix affects *every* utility family that reads from that prefix, including ones you didn't intend to touch. Before adding a named (non-numeric) key under any of Tailwind's reserved `--theme-namespace-*` prefixes, check whether that exact key already has reserved meaning elsewhere in Tailwind's default theme (T-shirt sizes — `xs/sm/md/lg/xl/2xl/3xl/4xl/5xl/6xl/7xl` — are the highest-risk names, since multiple utility families use them: `max-w-*`/`min-w-*` via `--container-*`, `text-*` via `--text-*`, `rounded-*` via `--radius-*`, `screen-*` via `--breakpoint-*`). When in doubt, use a **non-reserved prefix** for custom aliases (e.g. `--space-*` instead of `--spacing-*`) rather than trusting that a same-named key under a reserved prefix will only affect the one utility family you're picturing. Verify any new named `@theme` token by grepping the actual compiled production CSS for the utility classes you'd expect to still work — `pnpm build` then `grep '\.max-w-2xl' .next/static/css/*.css` — not just by reading the source and reasoning about it, and not just by checking `pnpm dev` (dev-mode CSS chunking made this specific bug much harder to spot via `curl` than the production build's single compiled file).
