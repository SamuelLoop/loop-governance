# Loop Governance: code health check + quality fixes — 2026-07-28

## Context

The Loop Governance platform is a Turborepo monorepo at
`/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-governance` with:
- `apps/portal` — public site at `gov.loopcmbntr.live` (Next.js 15)
- `apps/console` — internal dashboard at `console.loopcmbntr.live` (Next.js 15)
- `apps/admin` — admin panel
- `apps/mobile` — iOS + Android app (Expo / React Native) — added 2026-07-28
- `packages/db` — database schema and migrations (Drizzle + Supabase)
- `packages/contracts` — onchain contracts

**Current state of quality tooling (as of 2026-07-28):**
- TypeScript: configured (`tsconfig.json` exists in each app), `pnpm type-check` runs via Turbo
- ESLint: NOT configured in any app or package (only exists inside `node_modules`)
- Tests: NONE — no `*.test.ts` or `*.spec.ts` files exist in the source code
- Build: `pnpm build` runs via Turbo; status unknown
- Lint script: `pnpm lint` is in the root `package.json` but ESLint is not set up

This session:
1. Runs `/health` to get automated findings
2. Establishes ESLint and TypeScript strictness as the baseline safety net
3. Fixes all issues found WITHOUT changing any observable behaviour
4. Leaves a passing `pnpm type-check` and `pnpm lint` as proof the codebase is clean

---

## Critical rule for this session

**Do not change any logic, database queries, or UI behaviour.** The codebase has
no tests. The only safety net is: if the page rendered before, it must render
the same after. Restrict all changes to:
- Type annotations
- ESLint suppressions where rules fire on intentional patterns
- Removing dead imports and unused variables
- Fixing TypeScript errors that are genuine bugs (e.g. `undefined` not handled)
- Extracting duplicated code only if the extraction is trivially safe

If you find a logic issue during the health check, FILE IT as a separate task
(create a `sessions/bugfix-NNN.md`) rather than fixing it inline. Do not mix
correctness fixes with quality fixes in the same session.

---

## Step 1: Run /health

Invoke the `/health` slash command. Read its full output before doing anything
else. The findings from `/health` are the authoritative list of issues for this
session.

---

## Step 2: Set up ESLint (if /health flags it as missing)

If ESLint is not configured, set it up before attempting to lint:

**Next.js apps (portal, console, admin):**
```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react \
  eslint-plugin-react-hooks eslint-config-next --filter portal --filter console --filter admin
```

**Mobile app (Expo/React Native — do NOT use `eslint-config-next` here):**
```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react \
  eslint-plugin-react-hooks eslint-plugin-react-native --filter mobile
```

Create `apps/portal/eslint.config.mjs` (and mirror for console, admin):
```js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "react-hooks/exhaustive-deps": "warn",
    }
  }
];
```

Update the `lint` script in each Next.js app's `package.json`:
```json
"lint": "next lint"
```

For `apps/mobile/package.json`, `next lint` does not apply — use:
```json
"lint": "eslint src --ext .ts,.tsx"
```

Run `pnpm lint` from the repo root after setup and capture all output.

---

## Step 3: TypeScript check

Run:
```bash
pnpm type-check
```

Capture all errors. Fix them in this order:

**Priority 1 — Genuine safety issues:**
- `Object is possibly 'undefined'` or `null` where the code proceeds without a guard
- Type assertions (`as any`, `as unknown as X`) that hide real mismatches
- Missing return types on exported functions (can cause silent `undefined` returns)

**Priority 2 — Noise / configuration issues:**
- `Property does not exist on type 'never'` caused by missing type narrowing
- Unused imports flagged by TypeScript `noUnusedLocals`
- Module resolution errors for `@/lib/...` path aliases

**Priority 3 — Intentional patterns that need `// eslint-disable` or type cast:**
- `dangerouslySetInnerHTML` — intentional, add a comment explaining why
- `any` types in Supabase query results — these are structural; add a `// TODO: type this` comment

---

## Step 4: Common patterns to look for in this codebase

The following patterns appear frequently in the existing code (based on code
review). Look for these specifically:

### 4a. Unguarded `.data` access on Supabase responses
```ts
// Risky:
const { data } = await admin.from("users").select("*").eq("id", userId).single();
const name = data.display_name; // data could be null if user not found
```
Fix: add a null guard or use `.maybeSingle()` + early return.

### 4b. `any` typed Supabase rows
Every `.select()` result is typed as `any` in the existing code because the
Supabase client is not fully typed with the DB schema. Add inline types:
```ts
const { data } = await admin.from("delegations").select("delegator_id");
const ids = (data ?? []).map((d: { delegator_id: string }) => d.delegator_id);
```
Or define a type file `src/types/db.ts` with the row shapes used most frequently.

### 4c. `console.log` statements in server components
Search: `grep -rn "console\.log" apps/portal/src apps/console/src`
Replace with `console.error` where it is error logging, or remove if it is debug output.

### 4d. Missing `loading.tsx` or `error.tsx` for routes
Next.js App Router routes that call async functions and have no `error.tsx`
sibling will crash the whole page on any DB error. Check:
```bash
find apps/portal/src/app -name "page.tsx" | while read f; do
  dir=$(dirname "$f")
  [ ! -f "$dir/error.tsx" ] && echo "Missing error.tsx: $dir"
done
```
Add a minimal `error.tsx` for each route that fetches from the DB.

### 4e. Duplicated Supabase client instantiation
`createServiceClient()` is called at the top of every server component file.
Confirm this is not creating a new Supabase client on every render — it should
be a cached singleton. Check `apps/portal/src/lib/supabase-server.ts`.

### 4g. Mobile-specific patterns

**Dead community-scoped score queries (data bug, not just type error):**
```ts
// In PowerCard.tsx, UserBottomSheet.tsx, PowerBar.tsx:
.eq('community_id', communityId)  // always returns 0 rows since migration 035
```
File these as a bugfix task (do not fix inline — it requires a query change, not
just a type annotation). Create `sessions/bugfix-001-mobile-score-queries.md`.

**Any-typed Supabase results in mobile components:**
Every `.map((d: any) => ...)` in `DelegationList`, `AccreditationList`,
`PowerCard`, `UserBottomSheet`, `useRealtimeChannel`. Add inline types or a
`src/types/db.ts` file with row shapes.

**Missing error boundaries in mobile screens:**
`ChatScreen`, `PowerScreen`, and `ProfileScreen` have no error boundary or
catch on their async effects. A failed Supabase query leaves the screen blank
with no feedback. Add `try/catch` + an error state to each `useEffect` that
fetches data.

### 4f. Environment variable access without validation
Any `process.env.X` that is not checked for `undefined` at startup will silently
fail in production if the var is missing. Add startup validation:
```ts
// In apps/portal/src/lib/env.ts
export function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}
```
Then replace bare `process.env.SUPABASE_SERVICE_ROLE_KEY!` with
`requireEnv("SUPABASE_SERVICE_ROLE_KEY")`.

---

## Step 5: Verify nothing broke

After all fixes, run:
```bash
pnpm type-check
pnpm lint
pnpm build
```

Note: `pnpm build` will NOT build `apps/mobile` — Expo uses `expo build` / EAS,
not the Turbo `build` pipeline. Run mobile type-check separately:
```bash
cd apps/mobile && npx tsc --noEmit
```

All three (plus the mobile tsc) must pass with zero errors. Warnings are acceptable if they are
intentional patterns with comments. A build failure means something was changed
that broke a Next.js expectation — revert that specific change.

Check the demo badge pages load (no DB required, safe to test):
- `https://gov.loopcmbntr.live/badge/demo/gold/governance`
- `https://gov.loopcmbntr.live/badge/demo/diamond/governance`

---

## Step 6: Document remaining issues

After the session, create `sessions/bugfix-backlog.md` listing:
- Any logic issues found but NOT fixed (deferred to avoid scope creep)
- Any `// TODO: type this` comments added
- Any ESLint rules disabled with `eslint-disable` and the reason

This file becomes the input for future bugfix sessions.

---

## What success looks like

- `pnpm type-check` exits 0 with zero errors across all apps
- `cd apps/mobile && npx tsc --noEmit` exits 0
- `pnpm lint` exits 0 (or 0 errors, warnings only)
- `pnpm build` succeeds for all apps (excludes mobile — Expo has its own build)
- No observable change to any page, API, or mobile screen behaviour
- A `sessions/bugfix-backlog.md` file exists documenting deferred issues
- A `sessions/bugfix-001-mobile-score-queries.md` file documents the mobile
  community-scoped score bug for a dedicated fix session

---

## Key constraints

- No logic changes — quality only
- No new features or refactors beyond what ESLint/TypeScript require
- If a type fix requires changing a function signature, check all callers before
  changing — in a monorepo a type change in `packages/db` can break both apps
- The `packages/contracts` directory contains Solidity/onchain tooling — do not
  apply TypeScript or ESLint rules to it; it has its own build system
- `apps/mobile` uses Expo/React Native — do not apply `eslint-config-next` or
  `next lint` to it; use `eslint-plugin-react-native` instead
- Do not run `/health` more than once — use the first run's output as the
  authoritative findings list
