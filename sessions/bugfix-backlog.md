# Bugfix backlog — from health-check session, 2026-07-28

Deferred issues found while establishing the ESLint + TypeScript quality
baseline (`sessions/health-check.md`). None of these were fixed inline —
either they require a genuine logic/behaviour decision, or fixing them at
scale carried more risk than value for a quality-only session.

---

## Deferred logic issues (not fixed)

### 1. `apps/console/src/hooks/use-mobile.ts` and `apps/admin/src/hooks/use-mobile.ts` — `set-state-in-effect` warning
Both files call `setIsMobile(...)` synchronously inside a `useEffect` to
compute the initial value once `window` exists (standard shadcn
`useIsMobile` boilerplate — `window` is unavailable during SSR, so this
can't be a lazy `useState` initializer). Suppressed inline with
`eslint-disable-next-line react-hooks/set-state-in-effect` and a comment.
The textbook-correct fix is `useSyncExternalStore`, but that changes the
hook's implementation and was out of scope for a no-logic-change session.

### 2. `apps/admin/src/app/(dashboard)/governance/governance-editor.tsx:212` — `set-state-in-effect` warning
`setFormKey((k) => k + 1)` inside an effect, used to force-remount the
settings form when the selected scope changes (discarding unsaved edits).
Suppressed inline with a comment. Could be rewritten using React's
"adjusting state during render" pattern instead of an effect, but that's a
behavioural rewrite, not a quality fix.

### 3. `apps/mobile` — `react-hooks/set-state-in-effect` and `react-hooks/immutability` downgraded to warn (config-level)
The newly-installed `eslint-plugin-react-hooks` v7 (React Compiler-oriented
rules) fires broadly on two idiomatic patterns used throughout the mobile
app:
- Fetch-on-mount effects (`useEffect(() => { load() }, [...])`) — flagged
  as `set-state-in-effect`.
- `react-native-reanimated`'s `.value = withTiming(...)` mutation pattern
  (`GivePowerSheet.tsx`, `UserBottomSheet.tsx`) — flagged as `immutability`,
  a known false-positive category for this library.

Rather than adding ~5+ per-line suppressions for a pattern this pervasive,
both rules were downgraded to `warn` at the mobile `eslint.config.mjs`
level. If the codebase later adopts the React Compiler, these warnings are
the punch list to work through.

### 4. `apps/admin` test failures — Postgres FK violation
`pnpm --filter admin test` (`tests/admin-console.test.mjs`) has 5 failing
assertions, all failing on:
```
Insert failed: insert or update on table "proposals" violates foreign key
constraint "proposals_community_id_fkey"
```
This looks like a missing test fixture (no `community_id` row exists before
the insert) rather than an application bug — but it hits a real database,
so it wasn't touched under the "no logic changes" rule. Needs a dedicated
look at the test setup/teardown.

### 5. Session prompt's claimed mobile bug — already fixed, no action needed
`sessions/health-check.md` (§4g) claimed `PowerCard.tsx`, `UserBottomSheet.tsx`,
and `PowerBar.tsx` had dead `.eq('community_id', communityId)` queries
that always return 0 rows since migration 035. This is **stale** — all
three files already use `.is('community_id', null)` with a comment citing
migration 035 (someone fixed this before the health-check session ran).
The remaining `.eq('community_id', communityId)` usage in
`DelegationList.tsx` and `useRealtimeChannel.ts` queries `delegations` and
realtime channels, tables migration 035 never touched — those are correct
as-is. No bugfix file was created since there's no bug.

---

## Bulk pattern deferred: unchecked `process.env.X!` access

68 instances across the three Next.js apps (45 in portal, 13 in console,
10 in admin) use `process.env.SOME_VAR!` — the `!` is a compile-time-only
assertion; if the var is actually missing at runtime, this fails silently
downstream instead of with a clear error. `sessions/health-check.md` (§4f)
suggests a `requireEnv()` helper. Not applied at scale this session: 68
call sites is a large mechanical sweep, and verifying each one individually
(some may already be guarded elsewhere) was more risk than a quality-only
session should carry. Recommended as a dedicated follow-up:
1. Add `requireEnv(name: string): string` to each app's `src/lib/env.ts`.
2. Replace `process.env.X!` with `requireEnv("X")` call-site by call-site.

## Bulk pattern deferred: `@typescript-eslint/no-explicit-any`

~100+ warnings across the four apps (mostly untyped Supabase query results).
ESLint now surfaces all of these as warnings (not errors), which satisfies
this session's "lint exits 0, warnings acceptable" bar. Fixing them
properly means either generating real Supabase row types from the DB
schema or hand-writing per-table types — a typing project, not a
quality-baseline pass. Left as-is, tracked via the existing lint warning
count (137 console, 27 admin, 51 portal, 66 mobile as of this session).

---

## eslint-disable comments added this session

| File | Rule | Reason |
|---|---|---|
| `apps/console/src/hooks/use-mobile.ts` | `react-hooks/set-state-in-effect` | SSR-safe initial value computation (shadcn boilerplate), not a cascading-render bug |
| `apps/admin/src/hooks/use-mobile.ts` | `react-hooks/set-state-in-effect` | Same as above |
| `apps/admin/.../governance-editor.tsx` | `react-hooks/set-state-in-effect` | Intentional form remount on scope change |

## Config-level rule downgrades

| App | Rule | From → To | Reason |
|---|---|---|---|
| mobile | `react-hooks/set-state-in-effect` | error → warn | Fires on idiomatic fetch-on-mount effects throughout the app |
| mobile | `react-hooks/immutability` | error → warn | False positive on `react-native-reanimated` `.value` mutation |

---

## Environment fixes made (not logic, but worth recording)

- `packages/db/package.json` was missing `@supabase/supabase-js` as a
  dependency despite importing it in `src/white-label.ts` — added.
- `apps/admin/package.json` was missing `@types/node`, and
  `apps/admin/node_modules/next/dist/bin/next` was missing entirely
  (broken install) — both fixed by adding the dependency and re-running
  `pnpm install`. These were blocking `pnpm type-check` and `pnpm lint`
  across the whole monorepo before any real code issue could even be seen.
- Pinned `eslint` to `^9.39.5` (not the freshly-released `10.x`) across all
  four apps — `eslint-config-next@16.2.12`'s bundled parser crashes on
  ESLint 10 (`scopeManager.addGlobals is not a function`). Peer ranges
  claim ESLint 10 support but it's broken in practice with this parser.
