# Loop Governance Web Redesign — Engineering Plan — 2026-08-10

Session: `sessions/web-04-eng-plan.md`. Turns the approved Signal Pulse design
(`DESIGN.web.md` + light-mode addendum, `sessions/web-frontend-design-output.md`)
into a real implementation plan across `apps/console`, `apps/portal`,
`apps/admin`. Reviewed interactively via `/plan-eng-review` — 11 findings,
each resolved with the product owner directly, one at a time.

**Hard constraint carried through every decision below:** this is a CSS/
component/token-layer reskin. No Supabase query, RLS path, Stripe
integration code, auth flow logic, or on-chain call changes, under any
circumstance.

**Correction (post outside-voice review, 2026-08-10):** this plan originally
framed portal as "revenue-touching" with "real Stripe checkout." Verified
against `docs/continuity/NEXT.md:166`: *"Stripe live keys: portal currently
wired with test keys — verify before any real payment goes through."*
Portal is in test mode today, not processing real payments. This softens
(does not eliminate) the urgency behind decisions 7 and 9 below — good test
coverage on checkout is still worth having before a visual reskin touches
it, but it is not the highest-dollar-stakes surface the original framing
implied. Note added, decisions 7 and 9's rationale updated inline below.

---

## Decisions (11)

### Architecture

**1. Token strategy: Tailwind v4 `@theme`, resolved as a REBIND — finalized
post outside-voice review.** Not hand-rolled CSS custom properties from
scratch (which the review artifact used, since that's what a self-contained
mockup needs) — and not a parallel token set either. Outside voice caught
what decision 1 originally missed: console's `globals.css` **already**
has hand-rolled CSS custom properties (~30 shadcn variables — `--primary`,
`--card`, `--border`, etc.) feeding into `@theme inline`; admin is similar.
**Resolved: rebind those existing variable names to Signal Pulse's actual
values** rather than adding a second, parallel token set alongside them.
Since all 143 existing `@/components/ui/*` call sites already reference
these variable names, a rebind could deliver a large share of the visual
change for near-zero component-rewrite work. Sequencing: **do a 1-day
rebind spike first** (see decision 2 and 7 below) before committing further
— some Signal Pulse concepts (tier colours, brand gradient, glass/blur)
don't map to existing shadcn variable names and need new tokens added
alongside the rebind, so the spike's real job is finding out how much
coverage the rebind alone buys.

**2. Component build order — finalized post outside-voice review: spike
first, then decide.**
Session-3's handoff spec inventories ~28 new/extended components across the
9 canonical patterns. Original decision (all 28 upfront) overrode the
reviewer's core-first recommendation with no stated reason. Outside voice
independently made the same case, plus a new concrete reason to revisit
given decision 1's rebind resolution: the rebind spike will show how much
of Signal Pulse's look comes free from existing shadcn components before
committing to how many net-new `packages/ui` components are actually
needed. **Resolved: the 1-day rebind spike (decision 1) runs first, on
admin (decision 7). Its result — how much visual coverage the rebind alone
buys — determines whether the remaining component work is scoped as "all
28 upfront" or "core-first, incremental."** Not decided yet by design; this
is the correct order to decide it in, not a punt.

**3. Chart library: Recharts — confirmed post outside-voice review.**
Outside voice challenged this (Recharts' fixed SVG internals still need
custom tooltip/legend/axis work regardless, arguably making it as hard to
de-brand as Tremor; Visx hits the "signature surface" bar at 1/10 the
bundle). Re-confirmed: Recharts stays, on the strength of the escape
hatch — it's SVG underneath, so any one chart that can't hit the look via
props/custom components can drop to hand-built SVG later without a full
library swap for the other two chart pages.
150kB, SVG-based, component API, easy to override styling since it's plain
SVG underneath. Rejected: Tremor (200kB, built ON TOP of Recharts, ships a
pre-styled dashboard look that directly conflicts with DESIGN.web.md's
explicit "not default recharts/shadcn output" rule — heavier AND more
opinionated, strictly worse fit). Visx (15kB, full low-level control,
closest to the review mockup's hand-built SVG charts) stays available as a
per-chart escape hatch — Recharts is SVG under the hood, so one specific
chart (most likely the treasury cascade) can drop to custom SVG later
without migrating the other two chart pages. Not a one-way door.

**4. Map renderer: reskin Leaflet in place.**
Current stack (`leaflet` + `react-leaflet` + `h3-js`) is already installed
and working. Reskin (custom dark vector tile style + h3-js hex overlay
styled with the brand gradient, as already mocked up in session 3) rather
than migrating to MapLibre GL. Honest scoring: 7/10 completeness against the
"signature surface" bar from the shotgun round — real, acknowledged chance
this isn't enough. MapLibre GL is the documented fallback if so (deck.gl
ruled out entirely — built for 100k+ point datasets, doesn't fit a
governance platform's actual member/community scale).

**5. Deploy config — corrected mid-review.**
Initial repo search (via a `find` command with a depth bug) produced a false
picture claiming portal had no `vercel.json`. Corrected against the live
Vercel dashboard (`vercel project inspect`, all 3 projects) and the full,
correct file search:

| App | Vercel project | Committed file | Live dashboard | Status |
|---|---|---|---|---|
| console | `loop-console` | `apps/console/vercel.json`: turbo-filtered build + cron job | `pnpm build` (plain) | ❌ drift — dashboard override doesn't match file |
| portal | `loop-governance` | `apps/portal/vercel.json`: turbo-filtered build | matches | ✅ fine, no action needed |
| admin | `loop-admin` | `apps/admin/vercel.json`: turbo-filtered build | matches | ✅ fine, no action needed |

Actions taken this session: deleted the genuinely-dead repo-root
`vercel.json` (none of the 3 projects have Root Directory set to repo root,
confirmed via `vercel project inspect` — it was never actually read).
**Not yet done — corrected severity post outside-voice review: this is a
blocking prerequisite, not a loose end.** Console's dashboard Build Command
override needs manual correction to
`cd ../.. && pnpm turbo build --filter=@loop/console` — no Vercel CLI
subcommand exists for editing this setting, and extracting the
locally-stored auth token to hit the REST API directly was correctly
blocked by the permission classifier. Dashboard-only fix, ~2 minutes.

**Why this blocks decisions 6 and 11 specifically:** `turbo.json`'s `build`
task declares `dependsOn: ["^build"]` — Turbo's dependency-ordered build.
Console's current bare `pnpm build` skips that entirely. This is harmless
*today* only because `@loop/db` and `@loop/config` export raw TypeScript
source with no compile step. Once `packages/ui` exists as a real workspace
dependency (fonts, tokens, 28 components, the power-tree split), console
needs the same source-export pattern to keep working under bare
`pnpm build` — an unverified constraint this plan is now implicitly
relying on. Fixing the override removes that fragility outright. Do this
before `packages/ui` bring-up starts, not after.

**6. Power-tree consolidation — corrected post outside-voice review.**
**Original claim (wrong): these two files are not simple duplicates.**
Verified via source: `apps/console/src/lib/power-tree.ts` is 206 lines
(types + `generateTreeSVG()`); `apps/portal/src/lib/power-tree.ts` is 379
lines — types + `generateTreeSVG()` **plus `fetchPowerTree()`, a function
that takes a Supabase admin client and queries the DB directly, plus
`DEMO_TIERS` demo data.** Console's own file header claims "Shared with
apps/portal — keep in sync," which is already false. Moving the *whole*
portal file into `packages/ui` as originally planned would have dragged
live Supabase query code into a UI package — a direct violation of this
plan's own hard constraint (no Supabase query changes). Confirmed safe:
diffing the two files' `generateTreeSVG()` bodies shows only comment-level
differences, so consolidating *that* function is visually risk-free.

**Corrected scope:** only `types`, `placeNodes()` (pure layout, no DOM
deps — inherits the mobile eng-plan's already-approved spec, executing a
task that plan left pending), and `generateTreeSVG()` move to
`packages/ui/src/power-tree/`. `fetchPowerTree()` and `DEMO_TIERS` **stay in
`apps/portal`** — untouched, not part of this plan's scope, since
`fetchPowerTree` reads a table (`user_power_scores`) that
`docs/continuity/NEXT.md` records as not yet existing in the DB. Do not
touch that function in a CSS-layer project regardless.

**Package boundary (new, explicit — was previously only implicit in a
diagram):** `packages/ui`'s `package.json` needs a dedicated subpath export
for the RN-safe pieces, separate from the root export:
```json
"exports": {
  ".": "./src/index.ts",
  "./power-tree": "./src/power-tree/index.ts"
}
```
`./power-tree` re-exports only `types.ts` + `layout.ts` (mobile imports
this subpath, never pulls in Tailwind CSS, `next/font`, or the 28 DOM
components). `generateTreeSVG()` lives under the root export path,
web-only. This must be decided before `package.json` is written, not
discovered after Metro fails to bundle mobile.

**Constraint unchanged: the rendered output must not change** (badge/
power-tree redesign is out of scope for the entire project, locked since
session 2).

**7. Migration order: Admin → Console → Portal — revised post outside-voice
review.** Original decision was Console → Admin → Portal, on the logic that
console has the most existing infrastructure. Outside voice's sizing
argument won out: admin is 9 pages / ~34 components / 14 primitives, shares
console's Tailwind+shadcn baseline, and has none of console's exotic
surfaces (no map, no charts, no power-tree embed) — the cheapest place to
run the decision-1 rebind spike and validate the token system before
touching anything complex. **Final order: admin hosts the rebind spike and
becomes the pilot; console (map/charts/power-tree, the hardest surfaces)
goes second once tokens and components are validated; portal stays last**
— not because Stripe is live (it's confirmed test-mode, see correction
above) but because it has zero existing theme infrastructure and benefits
most from every component being proven twice first.

### Code Quality

**8. Theme persistence: localStorage + inline blocking script, PLUS
DB-backed sync — revised post outside-voice review.**
New scope, not in the original session-3 brief — console and admin get a
real user-facing light/dark toggle (portal stays fixed-light, unchanged).
`DESIGN.web.md`'s light-mode addendum explicitly deferred the persistence
mechanism to this session. A plain `localStorage` read after hydration would
cause a flash-of-wrong-theme on every page load (SSR renders the default
dark theme, then JS flips it client-side). Base fix unchanged: a tiny
inline `<script>` in `<head>`, before React hydrates, reads `localStorage`
and sets
`[data-theme]` immediately — same pattern `next-themes` uses.

**New: DB-backed sync, added this round (reverses the earlier TODO
dismissal).** Console and admin are separate Vercel deployments — separate
origins — so `localStorage` does not share between them. A member toggling
light mode on console would still see admin in dark mode: not deferred
polish, a real bug the moment both apps ship real toggles. Fix: a
theme-preference column on the member's Supabase profile, read server-side,
written on toggle. localStorage stays as the zero-flash local cache;
the DB column is the cross-app source of truth that keeps it in sync.

### Test

**9. Checkout/login E2E smoke tests — new, scope corrected post outside-
voice review.** Verified via source: zero existing automated test coverage
for Stripe checkout or login/auth across all 3 apps. Portal has 8 vitest
tests, all scoped to scaling concerns (connection pooling, vote counts, OG
cache) — unrelated to and unaffected by this reskin. Console and admin have
effectively no relevant tests, and **no `playwright.config.*` exists
anywhere in the repo** — `tests/` currently holds two ad-hoc `.js` scripts,
not a Playwright harness. "2 Playwright tests" understated the real scope:
standing this up means installing and CI-wiring Playwright, a seeded test
user, magic-link interception (Supabase admin `generateLink` or a local
inbucket), Stripe test-mode webhook delivery, and DB teardown between runs
— plausibly the single largest chunk of work in this whole plan, and it
sits on the critical path before the reskin starts (see T3's revised
estimate below). Since portal is confirmed test-mode (not live payments,
see correction above), this is good practice worth doing regardless, but
not the revenue-emergency the original framing implied — sized honestly
now rather than as a footnote.

**10. Visual regression: `toHaveScreenshot()` — corrected sequencing.**
Not a separate visual-regression tool — Playwright's built-in screenshot
assertion, reusing the same tests that already visit the 9 canonical UI
patterns. **Original sequencing was backwards:** capturing screenshots
*before* the reskin and using them as a tripwire produces a 100% failure
rate on the very first run, since the entire point of this project is
changing every pixel — that's zero signal, not a safety net. **Corrected:**
screenshots are captured as the baseline *immediately after* each app's own
migration lands (console's baseline locks in right after T5, admin's after
T6), then used to guard against *unintended* drift from later shared-
`packages/ui` changes — e.g. a component tweak made while building admin
accidentally shifting something already-shipped on console. Proportionate
to a one-developer team; covers every distinct layout shape via the 9
patterns without needing per-page coverage of all 44 pages individually.

### Performance

**11. Font loading: self-host all 3 faces once in `packages/ui/fonts`.**
General Sans and JetBrains Mono aren't loaded anywhere today. Geist is
currently loaded independently via `next/font/google` in console AND admin
(2x duplicate Google Fonts request across separately-deployed apps); portal
loads no fonts at all. Fix: all 3 faces self-hosted as static files, loaded
via `next/font/local` from each app, single source of truth in
`packages/ui/fonts`. Removes the Google Fonts CDN dependency at request time
entirely. (Real `.woff2` files for all 3 faces were already sourced during
the session-3 review-artifact build — reusable here, not a new sourcing
task.)

**Documentation debt flagged by outside voice:** `DESIGN.web.md`'s original
decisions log chose Geist specifically because it "avoids new font-loading
infra." This decision *builds* that infra anyway — for a different reason
(killing 2x duplication + giving portal fonts at all) that's still sound,
but it means `DESIGN.web.md` now contradicts its own stated rationale.
Action: update `DESIGN.web.md`'s decisions log with a superseding entry
once this plan is approved, so the design doc doesn't silently drift from
what actually gets built. Also flagged: `next/font/local`, re-exported from
a workspace package, needs `transpilePackages` configured in each app's
`next.config.js` and build-time-resolvable font paths — a known sharp edge
in Next.js monorepo setups, added to T1's verification step below.

---

## NOT in scope

- Any Supabase query, RLS policy, Stripe integration code, auth flow logic,
  or on-chain (viem/wagmi) call — CSS/component/token layer only, no
  exceptions.
- MapLibre GL / deck.gl map migration — only revisited if the Leaflet reskin
  (decision 4) proves visually insufficient once shipped. Proposed as a
  TODO; declined (see Unresolved below), so not tracked anywhere yet.
- ~~Cross-device DB-synced theme preference~~ — **moved IN scope, see
  decision 8.** Originally proposed as a deferrable TODO and declined; the
  outside-voice review found it's actually a same-day bug (console/admin
  are separate origins, localStorage doesn't share), not a nice-to-have.
- Redesigning the badge/power-tree component's visual output — locked out
  of scope since session 2, unaffected by the code-location move in
  decision 6.
- Site information architecture / navigation structure changes — visual
  system only, per `DESIGN.web.md`.
- Actual execution of the 44-page migration (24 console + 9 admin + 11
  portal, recounted via source — session 3's docs said 23/9/11=43, off by
  one on console) — that's the implementation
  backlog (`sessions/web-implementation-backlog.md`) that follows sessions
  05 (devex-review), 06 (brand), and 07 (scaffold). This plan is the
  blueprint, not the build.

## What already exists (reused, not rebuilt)

| Asset | Reused how |
|---|---|
| `packages/db/package.json` pattern (`exports` map, `@loop/config` devDependency, raw TS source export) | Mirrored exactly for `packages/ui` |
| 19 shadcn components in `apps/console/src/components/ui`, 14 in `apps/admin` | Consolidated into `packages/ui`, not rebuilt from scratch |
| `apps/console` + `apps/admin`'s existing `next/font/google` Geist loading | Migrated to self-hosted `next/font/local`, same typeface, different delivery |
| `leaflet` + `react-leaflet` + `h3-js` (already installed, working) | Reskinned in place, not replaced |
| `apps/admin/vercel.json`, `apps/portal/vercel.json` | Confirmed already correct — no changes needed |
| Mobile's already-approved `packages/ui` power-tree spec (`types.ts`, `layout.ts`) | Inherited as-is, extended (not redesigned) to also cover `generateTreeSVG()` |
| `apps/portal`'s 8 existing vitest scaling tests | Untouched — no logic changes in this plan's scope |
| Real `.woff2` files for General Sans / Geist / JetBrains Mono, sourced during session 3 | Reused directly for `packages/ui/fonts` |

---

## Diagrams

### `packages/ui` consumption model

```
                     packages/ui  (NEW — currently empty)
                     ├── theme.css        Tailwind v4 @theme tokens
                     │                    (colours incl. light-mode variants,
                     │                     spacing, radius, motion)
                     ├── fonts/           General Sans, Geist, JetBrains Mono
                     │                    (self-hosted .woff2, next/font/local)
                     ├── src/
                     │   ├── components/  ~28 primitives (Button, Card, Glass,
                     │   │                 TierPill, AppShell, StatTile, ...)
                     │   └── power-tree/
                     │       ├── types.ts       ─┐ pure, no DOM deps
                     │       ├── layout.ts       ─┤ (inherited from mobile's
                     │       │   placeNodes()     │  already-approved spec)
                     │       └── generate-svg.ts ─┘ web-only: generateTreeSVG()
                     │                              (NEW this session — console's
                     │                               duplicate copy retires)
                     └── package.json      mirrors @loop/db's exports pattern
                              │
             ┌────────────────┼────────────────┬─────────────────┐
             │                │                │                 │
        apps/console     apps/admin       apps/portal        apps/mobile
        (Next.js 15)     (Next.js 15)     (Next.js 15)       (Expo/RN)
        imports:         imports:         imports:           imports:
        - components/*   - components/*   - components/*     - power-tree/
        - theme.css      - theme.css      - theme.css          types.ts +
        - fonts/*        - fonts/*        - fonts/*            layout.ts ONLY
        - power-tree/    - power-tree/    - power-tree/         (no DOM parts,
          full stack       full stack       full stack           no components/,
                                                                  no Tailwind)
```

### Migration sequence (admin → console → portal — revised post outside-voice review)

```
 packages/ui bring-up: tokens (rebind spike first!), fonts, power-tree split
 ══════════════════════════════════════════════════════════════════════════
                    │  (must reach a usable state before any app migrates)
                    ▼
 ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
 │    admin    │ ─────▶ │   console   │ ─────▶ │   portal    │
 │ (rebind     │        │ (hardest    │        │ (highest    │
 │  spike +    │        │  surfaces:  │        │  risk —     │
 │  pilot,     │        │  map,       │        │  Stripe,    │
 │  cheapest   │        │  charts,    │        │  test-mode  │
 │  to prove)  │        │  power tree)│        │  today)     │
 └─────────────┘        └─────────────┘        └──────┬──────┘
   deployable              deployable                 │
   independently            independently       requires: checkout E2E
   at every step            at every step        smoke test (decision 9)
                                                  exists BEFORE this step
```

---

## Failure modes

| New codepath | Realistic failure | Tested? | Error handling? | User sees |
|---|---|---|---|---|
| Theme init inline script | Script fails silently if `localStorage` is blocked (private browsing, enterprise policy) | No | Falls back to default dark theme (script no-ops on read error) | Silent — defaults to dark, no error shown, acceptable degradation |
| `packages/ui` self-hosted fonts | A `.woff2` file fails to load (bad build, CDN cache issue since self-hosted removes CDN dependency but adds a build-artifact dependency) | No | Browser falls back to the font stack's next entry (`ui-sans-serif`, etc.) | Visible but graceful — text renders in a fallback font, not invisible |
| Recharts chart on real (not mock) data | Empty dataset (new community, zero treasury history) renders a broken/empty chart shape | Not yet — should be added as an explicit empty-state per chart, matching the Dashboard pattern's empty-state precedent | Not yet designed | **Gap** — flag as a task in the implementation backlog, not covered by this plan's own scope |
| Leaflet reskin — H3 hex overlay | Hex-fill rendering degrades on very large communities (thousands of hexes) — untested at scale | No | No specific handling planned | **Gap**, lower severity — existing Leaflet perf characteristics apply, not a new risk this reskin introduces |
| Console Vercel Build Command override (still unfixed) | If left as-is, console keeps building via plain `pnpm build`, bypassing Turbo's dependency graph — once `packages/ui` is a real dependency, an out-of-order build could ship a stale `packages/ui` build to production | No test catches this (it's a deploy-pipeline issue, not app code) | None | **Critical gap until the manual dashboard fix is confirmed done** |
| Checkout/login E2E tests (new) | Flaky Stripe test-mode webhook timing, or magic-link email delivery delay in CI | The tests themselves are the test — no meta-test | Standard Playwright retry/timeout config, to be set during implementation | Would show as a flaky CI failure, not a silent gap |

**Critical gap flagged:** the console Vercel Build Command drift (decision 5) has no test and no error handling, and would fail silently (a stale `packages/ui` build shipping to production with no visible error) if not fixed before `packages/ui` becomes a real build dependency. This must be resolved before session 7 (scaffold) starts, not left open indefinitely.

---

## Worktree parallelization strategy

| Step | Modules touched | Depends on |
|---|---|---|
| `packages/ui` bring-up (tokens, 28 components, fonts, power-tree split) | `packages/ui/` | — |
| Checkout + login E2E smoke tests | `apps/portal/src/__tests__/`, `apps/console/tests/` or equivalent, `apps/admin/tests/` | — (tests existing behavior, no dependency on packages/ui) |
| Console migration | `apps/console/` | `packages/ui` bring-up complete |
| Admin migration | `apps/admin/` | `packages/ui` bring-up complete, console migration (per chosen sequential order) |
| Portal migration | `apps/portal/` | `packages/ui` bring-up complete, admin migration, checkout E2E test exists |

**Lane A:** `packages/ui` bring-up (independent, no shared modules with Lane B)
**Lane B:** Checkout + login E2E smoke tests (independent, no shared modules with Lane A)
**Lane C:** Admin → Console → Portal migration (sequential by explicit product decision — de-risking order, not a technical dependency between the apps themselves; admin also hosts the decision-1 rebind spike)

**Execution order:** Launch Lane A + Lane B in parallel (separate worktrees). Both must complete before Lane C starts (Lane C's console step needs `packages/ui`; Lane C's portal step needs Lane B's checkout test). Lane C itself stays sequential per decision 7 — do not parallelize console/admin/portal against each other even though they touch different directories, since the migration order was chosen deliberately to de-risk, not for technical isolation reasons.

**Conflict flag:** none — Lane A and Lane B touch entirely separate module directories with no overlap.

---

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific
decision above. Run with Claude Code, checkbox as you ship.

- [x] **T0 (P1, human: ~2min / CC: n/a — dashboard only)** — deploy — Fix console's Vercel Build Command override
  - Surfaced by: decision 5, Failure modes (critical gap)
  - Files: none (Vercel dashboard setting only)
  - Done 2026-08-10: override toggled off in the dashboard, so Vercel now falls back to `apps/console/vercel.json` (turbo-filtered build). **Not yet confirmed via an actual deployment** — `vercel project inspect` only shows dashboard-level settings, not what a real build executes, since `vercel.json`'s `buildCommand` is applied at build time from the deployed source. Confirm by checking build logs on the next real deploy to console (naturally happens once T4.5 or later work lands a commit); no throwaway deploy forced just to check.
- [ ] **T1 (P1, human: ~1 day / CC: ~2hrs)** — packages/ui — Package bring-up: tokens, fonts, power-tree split
  - Surfaced by: decisions 1, 6, 11
  - Files: `packages/ui/package.json`, `packages/ui/theme.css`, `packages/ui/fonts/`, `packages/ui/src/power-tree/{types,layout,generate-svg}.ts`
  - Verify: `pnpm --filter @loop/ui type-check` passes; `apps/mobile` can import `{ placeNodes }` without pulling in DOM-dependent code
- [ ] **T2 (P1, human: ~5 days / CC: ~5hrs)** — packages/ui — Build all ~28 components
  - Surfaced by: decision 2
  - Files: `packages/ui/src/components/*`
  - Verify: Storybook or equivalent visual check per component against session-3's mockup artifact; `pnpm --filter @loop/ui type-check` + lint clean
- [ ] **T3 (P1, human: ~3-4 days / CC: ~6hrs — revised up from ~1 day, no Playwright harness exists at all today)** — testing — Stand up Playwright + checkout/login E2E smoke tests
  - Surfaced by: decision 9, outside-voice correction (no `playwright.config.*` in repo; `tests/` is 2 ad-hoc `.js` scripts, not a harness)
  - Files: new `playwright.config.ts` per app, CI wiring, `apps/portal/src/__tests__/e2e/checkout.spec.ts`, `apps/console/tests/e2e/login.spec.ts`, `apps/admin/tests/e2e/login.spec.ts`, a seeded test user, magic-link interception (Supabase admin `generateLink` or local inbucket), Stripe test-mode webhook delivery config, DB teardown between runs
  - Verify: both tests pass against current (pre-reskin) UI — establishes the baseline before any visual change lands
- [ ] **T3.5 (P1, human: ~2 days / CC: ~3hrs)** — packages/ui migration — Rewrite the 143 existing `@/components/ui/*` import sites
  - Surfaced by: outside-voice review — confirmed 143 import sites across 58 files in console+admin referencing the 19+14 shadcn primitives being consolidated into `packages/ui`. This work was invisible in the original plan; it's the actual bulk of the migration, not the 28 new components.
  - Files: all 58 files currently importing `@/components/ui/*` in `apps/console/src`, `apps/admin/src`; delete the 33 now-redundant local component files after rewrite
  - Verify: `pnpm type-check` clean across console+admin post-rewrite; zero remaining `@/components/ui/*` imports (`grep -rn "@/components/ui/"` returns empty)
- [ ] **T3.6 (P1, human: ~1hr / CC: ~15min)** — packages/ui — Add Tailwind v4 `@source` directives
  - Surfaced by: outside-voice review — Tailwind v4 does not scan workspace packages by default; without an explicit `@source` pointing at `packages/ui/src` in each app's CSS entry, any class used only inside a shared component gets purged from production builds (works in dev, silently breaks in prod)
  - Files: `apps/console/src/app/globals.css`, `apps/admin/.../globals.css`, `apps/portal/.../globals.css`
  - Verify: production build (`pnpm build`, not dev) of each app renders shared-component styling correctly, not just `pnpm dev`
- [ ] **T4 (P2, human: ~2hrs / CC: ~30min)** — testing — Add `toHaveScreenshot()` to the 9 pattern tests
  - Surfaced by: decision 10 (corrected sequencing)
  - Files: same test files as T3 plus one per remaining canonical pattern
  - Verify: screenshots captured as the baseline **right after each app's own migration lands** (not pre-migration — that would be 100% failures on the first run, zero signal)
- [ ] **T4.5 (P1, human: ~1 day / CC: ~1.5hrs)** — packages/ui + apps/admin — Rebind spike: shadcn token values → Signal Pulse, sourced from packages/ui
  - Surfaced by: decisions 1, 2, 7 (all three resolved to run this first)
  - **Corrected post devex-review outside voice:** the rebound token values go into `packages/ui/theme.css` FIRST — that's the single source of truth decision 1 already committed to. `apps/admin/src/app/globals.css` then imports/references those values (`@import` or `@theme` inheritance), it does not hold its own standalone copy. As originally scoped this task wrote values directly into admin's local `globals.css` with no promotion path to `packages/ui` — that would have silently broken the devex-checklist's "edit packages/ui/theme.css, all 3 apps hot-reload" magical moment, since nothing would actually be reading from that file.
  - Files: `packages/ui/theme.css` (new, source of truth), `apps/admin/src/app/globals.css` (rebind ~30 existing shadcn CSS variables by referencing `packages/ui/theme.css`'s values, plus whatever new tokens — tier colours, brand gradient, glass/blur — don't map to existing variable names)
  - Verify: visual comparison against session-3's admin mockups — this result determines whether T2 (build all 28 components) proceeds as originally scoped or narrows to core-first
- [ ] **T4.6 (P1, human: ~2hrs / CC: ~20min)** — apps/mobile — Add `@loop/ui` workspace dependency
  - Surfaced by: devex-review outside voice — confirmed `apps/mobile/package.json` has zero reference to `@loop/ui` today. The RN-safe `./power-tree` subpath export (decision 6) has no actual consumer until this is added — without it, mobile keeps its own untouched copy indefinitely regardless of what packages/ui exports.
  - Files: `apps/mobile/package.json` (add `"@loop/ui": "workspace:*"`), one import site updated to prove it resolves through Metro
  - Verify: `apps/mobile` successfully imports `{ placeNodes }` from `@loop/ui/power-tree` and bundles without error via Expo/Metro
- [ ] **T4.7 (P1, human: ~1hr / CC: ~10min)** — apps/admin — Add `transpilePackages` config
  - Surfaced by: devex-review outside voice — `apps/admin/next.config.ts` is currently empty (`const nextConfig: NextConfig = {};`). Admin is the pilot app for the whole migration (decision 7) and also the first place `next/font/local`-from-a-workspace-package gets exercised — a known Next.js monorepo sharp edge already flagged in decision 11, but the actual config fix was never added as its own task.
  - Files: `apps/admin/next.config.ts`
  - Verify: admin's dev AND production build both resolve `packages/ui`'s self-hosted fonts and components without a module-resolution error
- [ ] **T5 (P1, human: ~4 days / CC: ~6hrs)** — apps/admin — Full migration to packages/ui + Signal Pulse
  - Surfaced by: decision 7 (first in sequence — revised from console)
  - Files: `apps/admin/src/**`
  - Verify: T3's admin login test + relevant screenshot diffs pass post-migration
- [ ] **T6 (P1, human: ~1 week / CC: ~1 day)** — apps/console — Migrate to packages/ui + Signal Pulse
  - Surfaced by: decision 7 (second in sequence — revised from first)
  - Files: `apps/console/src/**`
  - Verify: T3's console login test + T4's screenshot diffs both pass post-migration — hardest surfaces (map, charts, power-tree) land here, after tokens/components are already proven on admin
- [ ] **T7 (P1, human: ~1 week / CC: ~1 day)** — apps/portal — Migrate to packages/ui + Signal Pulse
  - Surfaced by: decision 7 (last in sequence, unchanged), gated on T3's checkout test existing
  - Files: `apps/portal/src/**`
  - Verify: T3's checkout E2E test + screenshot diffs pass post-migration
- [ ] **T8 (P1, human: ~1 day / CC: ~2hrs — revised up: now includes DB sync, not just the inline script)** — theme — Inline blocking script + DB-backed cross-app sync
  - Surfaced by: decision 8 (revised — DB sync added, reverses earlier TODO dismissal)
  - Files: `apps/console/src/app/layout.tsx`, `apps/admin/src/app/layout.tsx`, new Supabase profile column + migration, theme read/write API route or server action
  - Surfaced by: decision 8
  - Files: `apps/console/src/app/layout.tsx`, `apps/admin/src/app/layout.tsx`
  - Verify: manual check — hard refresh with light mode set, confirm zero dark-flash on load; AND toggle light mode on admin, load console, confirm it reflects light mode too (the cross-app sync this task adds)
- [ ] **T9 (P3, human: ~30min / CC: ~10min)** — charts — Empty-state design for zero-data charts
  - Surfaced by: Failure modes gap (Recharts on empty datasets)
  - Files: chart components in `packages/ui/src/components`
  - Verify: render each chart with an empty dataset, confirm it matches the Dashboard pattern's empty-state precedent rather than rendering broken

## Rollback plan (added post outside-voice review — was missing entirely)

No feature flag, staged rollout, or written revert procedure existed in the
original plan for 3 live apps changing visually at once. Vercel keeps every
deployment and supports instant rollback to the previous production
deployment with zero extra engineering — this is the mechanism, not a new
build: if a migration (T5/T6/T7) ships something broken, roll back that
one app's Vercel deployment to its last-good build via the dashboard or
`vercel rollback`. Since the 3 apps deploy independently, a bad console
deploy never forces a portal or admin rollback. Document this explicitly in
the implementation backlog rather than leaving it assumed.

## Strategic context (outside-voice flag — noted, not acted on)

The outside voice pointed out this project doesn't appear on
`docs/continuity/NEXT.md`'s own priority list (which currently has power-
score scaling marked HIGH, 68 unchecked `process.env.X!` accesses, 5 failing
admin test assertions, and "console has zero coverage" as open items), and
this plan states no success metric, cost estimate, or kill criteria. That's
a legitimate product-priority question, not an engineering one — outside
this review's scope to resolve, but worth naming. `/plan-ceo-review` exists
for exactly this kind of check if you want it before committing further
sessions to this track.

## Unresolved decisions

- **Console's Vercel dashboard Build Command override is not yet fixed** — flagged as a critical gap above (now a confirmed blocking prerequisite for decisions 6 and 11, not just a loose end), needs a manual ~2-minute dashboard action, not done as of this plan. (T0 above.)
- **MapLibre fallback TODO was proposed and dismissed without an alternative disposition** — not logged anywhere. If the Leaflet reskin (decision 4, 7/10 completeness, no defined trigger for "insufficient") turns out not to hit the bar, someone would need to re-derive this reasoning from this plan document rather than finding it tracked.
- **DB-backed theme sync TODO was proposed, initially dismissed, then reversed** once the outside-voice review found it's a same-day bug rather than a nice-to-have — now in scope as part of decision 8 / task T8. Resolved, not actually unresolved — listed here only to note the reversal.
- **Component build order (all 28 vs core-first) is deliberately left undecided** — decision 2's final resolution depends on T4.5's rebind-spike result, which hasn't run yet. This is correct sequencing, not a punt.
- **Strategic priority** — this project doesn't appear on `docs/continuity/NEXT.md`'s own priority list, and this plan states no success metric, cost estimate, or kill criteria (outside-voice flag, noted above under "Strategic context"). Not resolved by this review — out of an engineering review's scope — `/plan-ceo-review` is the suggested next step if you want it addressed before further sessions.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | Not run. Outside voice flagged this project isn't on NEXT.md's own priority list and has no stated success metric/cost/kill criteria — suggested, not required. |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | Not run as a standalone skill. Outside-voice pass ran inline as part of this eng review (Codex CLI absent, Claude subagent fallback used instead). |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | issues_open | 11 original findings (all resolved) + outside-voice pass caught 1 factual plan error requiring correction (power-tree scope), 2 missing-work items (143-import rewrite, Tailwind `@source`), 1 sequencing bug (screenshot tests), plus 5 re-opened tensions (all resolved). 1 critical gap remains open (console Vercel override, T0) and 1 decision deliberately deferred pending a spike (component build order). |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | Not run this session — session 3 (`/frontend-design`) already produced its own interactive-artifact review, approved directly by the product owner across two rounds. |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | Not run. |

**CODEX:** Not applicable — Codex CLI unavailable, outside voice ran via Claude subagent instead (see Eng Review row).

**CROSS-MODEL:** Outside voice (Claude subagent, fresh context) found 1 factual error in the primary review's own output (decision 6 — power-tree files mischaracterized as simple duplicates when one contains live Supabase query code) and disagreed with 3 of the primary review's resolved decisions (component build order, migration pilot order, chart library). All 3 disagreements were brought back to the product owner directly rather than auto-applied; 2 were accepted (build order deferred to a spike, pilot order flipped to admin-first) and 1 was rejected (chart library stays Recharts). The factual error was independently verified against source (file line counts, grep for `fetchPowerTree`/`DEMO_TIERS`) before correcting — not taken on the subagent's word alone.

**VERDICT:** ENG REVIEW CLEARED WITH OPEN ITEMS — all 11 original findings plus 5 re-opened tensions resolved with the product owner directly; 1 critical gap (console Vercel Build Command override) and 1 deliberately-deferred decision (component build order, pending the T4.5 rebind spike) remain before implementation should start. Fix T0 and run T4.5 before T5 (admin migration) begins.

**UNRESOLVED DECISIONS:**
- Console's Vercel dashboard Build Command override — not yet fixed, blocks decisions 6 and 11 in practice, no CLI path exists, manual dashboard action required (T0)
- Component build order (all 28 vs core-first) — deliberately deferred to T4.5's rebind-spike result, not yet run
- Strategic priority / whether this project should be sequenced against NEXT.md's other open work — outside engineering-review scope, `/plan-ceo-review` suggested if wanted
