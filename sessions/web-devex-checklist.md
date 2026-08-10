# Loop Governance Web: developer experience checklist — 2026-08-10

Session: `sessions/web-05-devex-review.md`. Reviews and operationalizes the
developer experience of building `packages/ui` and migrating console/portal/
admin, per `sessions/web-eng-plan-output.md`. Reviewed via `/plan-devex-review`
in DX POLISH mode, full external-product ceremony run at the product owner's
explicit request (packages/ui currently has one real consumer — see the
persona note below).

**Standing rule carried through this doc:** all UI verification happens
against localhost dev servers (`pnpm --filter console/portal/admin dev` +
real browser tooling), never a hosted preview pane.

---

## Developer Persona Card

```
TARGET DEVELOPER PERSONA
========================
Who:       A contractor or new hire joining the Loop Governance team
Context:   Onboarding onto the monorepo, assigned to build or extend
           packages/ui or wire a component into console/portal/admin
           within their first days
Tolerance: A few hours to get productive, not weeks
Expects:   Standard Next.js/Tailwind/pnpm-workspace conventions, but needs
           codebase-specific guidance for anything unique to this repo
           (rebind-vs-parallel tokens, RN-safe subpath export, which dev
           servers to run)
```

**Honest caveat:** this persona is speculative — `packages/ui` has exactly
one real consumer today (the product owner). The product owner chose to run
the full external-product DX ceremony anyway, explicitly to prepare for a
possible future hire rather than to solve a present pain point. Treat the
scorecard below accordingly: it measures readiness for a hire that doesn't
exist yet, not a fix for reported friction.

## Developer Empathy Narrative (confirmed accurate by product owner)

> I'm told to add a Button component to packages/ui and use it in console.
> I open the repo. No README at the root. I find packages/ui — it's an
> empty directory, two folders deep, no package.json, no hints. I check
> packages/db for a pattern to copy — it has one, but no README explaining
> why it's shaped that way. I grep CLAUDE.md and find the stack list, but
> nothing about packages/ui specifically since it doesn't exist yet. I
> don't know: does this need next/font/local or next/font/google, is
> Tailwind v4 @theme already wired anywhere I can copy, will my component
> work in mobile too or break Metro's bundler if I import the wrong path.
> I ask Samuel. That's the onboarding path right now: ask Samuel.

## Competitive DX Benchmark

| Tool | TTHW | Notable DX choice | Source |
|---|---|---|---|
| Vercel's official Turborepo "Design System" template | <2 min | Storybook wired into Turbo's `dev` task — one command shows every component | [vercel.com/templates/react/turborepo-design-system](https://vercel.com/templates/react/turborepo-design-system) |
| shadcn/ui | N/A (copy-paste, not installed) | Components split into `ui/` (raw) vs `primitives/` (modified) vs `blocks/` (compositions) — keeps "what changed from stock" legible | community best-practice writeups, 2026 |
| Loop Governance `packages/ui` (before this session) | Undefined (Red Flag — "ask Samuel") | — | current state |
| Loop Governance `packages/ui` (target) | 2-5 min (Competitive) | README + `pnpm dev:web` + 3-server live-reload magical moment | this session |

Champion tier (<2min, full Storybook) was considered and explicitly
declined — see "NOT in scope" below.

## Magical Moment Specification

**Chosen:** edit a token in `packages/ui/theme.css`, watch console, admin,
and portal — all three running via `pnpm dev:web` — hot-reload live and
simultaneously in three open browser tabs.

**Implementation requirements:**
- `packages/ui` needs a Turbo `dev` task (watch mode: TypeScript + Tailwind
  v4) that the 3 apps' own `dev` tasks depend on via `dependsOn`
- New root `package.json` script: `"dev:web": "turbo dev --filter=console --filter=admin --filter=portal"` (exact filter syntax to be confirmed against this repo's Turbo config in session 7)
- No separate isolated-preview infrastructure (Storybook/Ladle/apps/ui-preview) — explicitly declined, see "NOT in scope"

## Developer Journey Map (all friction points resolved)

| Stage | Developer does | Friction found | Status |
|---|---|---|---|
| Discover | Told to work on packages/ui | No README, empty directory | **Fixed** — new `packages/ui/README.md` |
| Install | `pnpm install` at repo root | None — already documented in root `CLAUDE.md` | OK, no change needed |
| Hello World | Run 3 dev servers, see the magical moment | Didn't know 3 manual terminal tabs were needed | **Fixed** — `pnpm dev:web` script |
| Real Usage | Build a component, use the token system | Rebind-vs-parallel decision and RN-safe export boundary undocumented | **Fixed** — covered in README |
| Debug | Something breaks | Tailwind `@source` gap is silent in dev, breaks prod with zero error | **Fixed** — CI runs real `pnpm build`, not just dev checks |
| Debug (2) | Wrong import crosses the RN-safe boundary | ~~Metro throws a generic crash~~ — **false premise, corrected**: `generateTreeSVG()` has zero DOM references (verified), this crash cannot occur with the actual code | N/A — no fix needed, the scenario was hypothetical |
| Upgrade | A shared component's props change | N/A — TypeScript compile errors at every call site are the built-in safety net (monorepo, not a published/versioned package) | OK, no change needed |

## First-Time Developer Confusion Report (with fixes applied, confirmed by product owner)

```
T+0:00  Reads packages/ui/README.md. Understands the package's purpose,
        the token rebind decision, the RN-safe export split.
T+0:02  Runs `pnpm dev:web` from repo root. All 3 apps start via Turbo.
T+0:04  Opens 3 browser tabs (console/admin/portal on localhost). Edits a
        color in packages/ui/theme.css.
T+0:05  Watches all 3 tabs hot-reload with the new color. Magical moment
        lands.
T+0:20  Starts building an actual component. README's subpath-export
        section, backed by the ESLint rule, stops them importing
        generateTreeSVG into the RN-safe path by mistake.
T+1:30  Opens a PR. CI runs pnpm build (real production build) alongside
        dev-mode checks — catches a missing @source directive before
        merge, with a clear failing check rather than a silent prod bug
        later.
```

---

## NOT in scope

- **Storybook / Ladle / a dedicated `apps/ui-preview` app** — Champion tier
  (<2min TTHW) was on the table via the Vercel template's exact pattern, but
  declined: real ongoing maintenance cost (stories per component) for a
  marginal gain over the chosen Competitive tier, on a team that's
  currently one person.
- **DX measurement/analytics instrumentation** (TTHW tracking, journey
  analytics, feedback buttons) — premature for zero current external
  users. The real measurement mechanism is running `/devex-review` on the
  live product once a real contractor exists, checking reality against the
  2-5min target set here.
- **Community/ecosystem investment** (open-source readiness, contributing
  guide, plugin ecosystem) — not applicable, closed-source internal
  package.
- **Traditional semver/deprecation-warning/codemod tooling** — unnecessary
  for a single-monorepo package; TypeScript's compiler is the migration
  safety net (breaking changes surface as compile errors at every call
  site immediately, no separate versioning needed).

## What already exists (reused, not rebuilt)

| Asset | Reused how |
|---|---|
| Root `CLAUDE.md`'s documented `pnpm install` / `pnpm --filter <app> dev` commands | Already correct, `dev:web` is additive, not a replacement |
| `packages/db`'s package structure (exports map, no README either — a gap this session doesn't fix for db, only for ui) | Pattern mirrored for `packages/ui`'s `package.json`, per the eng-plan's decision |
| shadcn's existing naming conventions (`variant`, `size`, etc.) | Inherited via the rebind decision — no new API surface invented |
| Vercel's own official Turborepo Design System template | Direct structural reference for the Turbo `dev` task wiring and the "3 apps depend on packages/ui's dev task" pattern |

---

## Operational workflow: visual regression review (not a manual checklist)

Per eng-plan decision 10 (corrected sequencing): screenshots are captured
as the baseline *immediately after* each app's own migration lands, then
guard against later drift. Day-to-day, this is the actual workflow a single
developer runs locally:

1. **After finishing work on a pattern** (e.g., just migrated the Dashboard
   pattern in console): run `pnpm --filter console test:e2e -- --update-snapshots`
   locally against the running dev server. This captures the new baseline
   screenshot for that pattern and commits it alongside the code change —
   the baseline IS part of the diff, reviewed like any other file.
2. **Before merging any later change that touches shared `packages/ui`
   components:** run `pnpm --filter console test:e2e` (no update flag) against
   `localhost:3000`. Playwright's `toHaveScreenshot()` compares the live
   render to the committed baseline.
3. **If it passes:** nothing visibly changed for that pattern. Merge normally.
4. **If it fails:** Playwright writes a diff image
   (`test-results/<test-name>/diff.png`) showing exactly what pixels
   changed, side by side with expected/actual. Open it. Two outcomes:
   - **Unintended regression** (e.g., a token change on the pattern you're
     NOT working on shifted unexpectedly): fix the shared component, rerun
     until clean.
   - **Intentional change** (you meant to update that pattern too): rerun
     with `--update-snapshots`, commit the new baseline, note why in the
     commit message.
5. **In CI:** the same `pnpm test:e2e` command (no update flag) runs on every
   PR touching `packages/ui` or any of the 3 apps — a failing screenshot
   diff blocks merge until triaged via step 4.
6. **Reviewing a diff PR:** since baselines are committed image files, a
   PR that updates a `.png` snapshot is visible in the diff like any other
   file — reviewable (self-review, since it's a team of one today) before
   merge, not a hidden CI artifact.

This reuses the same Playwright tests that already exist for the 9
canonical patterns (eng-plan task T3/T4) — no separate visual-regression
tool or service.

---

## Setup steps (numbered, actionable — ready for session 7)

1. [ ] Write `packages/ui/README.md` — purpose, rebind-vs-parallel token
   decision + why, RN-safe subpath export split (`.` vs `./power-tree`),
   how to run the 3-app dev loop, one copy-paste-complete example of using
   a component in a real app
2. [ ] Add root `package.json` script `dev:web` — starts console + admin +
   portal concurrently via Turbo
3. [ ] Wire `packages/ui`'s own `dev` task into `turbo.json` with
   `dependsOn` so the 3 apps' dev servers pick up token/component changes
   without a manual rebuild step
4. ~~Add an ESLint import-boundary rule~~ — **dropped, false premise** (see
   D3 correction below — `generateTreeSVG` has no DOM dependencies, the
   crash it would prevent can't happen with the actual code)
5. [ ] Add a direct verification script (not a full CI pipeline) that runs
   `pnpm build` then greps the emitted CSS for a known shared-component
   class — the actual, correct way to catch a missing Tailwind `@source`
   directive (a full CI build exits 0 on this failure, see D4 correction
   below). Real CI stands up later, for its own reasons, once there's a PR
   flow to gate.
5.5 [ ] Add `@loop/ui` as a workspace dependency in `apps/mobile/package.json`
   (currently zero reference — the RN-safe subpath export has no real
   consumer without this)
5.6 [ ] Add `transpilePackages` config to `apps/admin/next.config.ts`
   (currently empty — admin is the migration pilot app and the first place
   this gets exercised)
6. [ ] Confirm `next/font/local` re-exported from `packages/ui` resolves
   correctly in each app — needs `transpilePackages` in each app's
   `next.config.js` (known Next.js monorepo sharp edge, flagged during the
   eng-plan's outside-voice review)
7. [ ] Document the Vercel rollback flow (dashboard → Deployments → select
   previous production deployment → Promote to Production, or `vercel
   rollback` CLI) somewhere actionable — e.g., a `## Rollback` section in
   root `CLAUDE.md` — so it's not just asserted as available but has an
   actual documented command path

---

## DX Scorecard

```
+====================================================================+
|              DX PLAN REVIEW — SCORECARD                             |
+====================================================================+
| Dimension            | Score  | Notes                               |
|-----------------------|--------|------------------------------------|
| Getting Started      | 8/10   | Fixed via README + dev:web + magical moment |
| API/CLI/SDK           | 8/10   | Inherits shadcn conventions, no new surface |
| Error Messages        | 7/10   | Direct @source verification script (corrected from a CI pipeline that wouldn't have caught its own target failure); RN-boundary "crash" was a false premise, no fix needed |
| Documentation          | 8/10   | README with real example, not just prose  |
| Upgrade Path           | 8/10   | TypeScript compiler is the safety net      |
| Dev Environment        | 8/10   | Cross-platform, CI, hot reload all covered |
| Community               | N/A    | Not applicable — closed-source internal    |
| DX Measurement          | N/A    | Deferred to a real /devex-review boomerang |
+--------------------------------------------------------------------+
| TTHW                    | ~4 min (target) | undefined (before) |
| Competitive Rank        | Competitive tier (chosen over Champion)     |
| Magical Moment          | designed — 3-server live token reload       |
| Product Type            | Library/SDK (internal)                      |
| Mode                    | DX POLISH                                    |
| Overall DX              | 8/10 (target, once built)                    |
+====================================================================+
| DX PRINCIPLE COVERAGE                                               |
| Zero Friction               | covered (README + dev:web)             |
| Learn by Doing               | covered (magical moment, real example) |
| Fight Uncertainty            | covered (CI prod build + lint rule)    |
| Opinionated + Escape Hatches | covered (rebind default, spike decides scope) |
| Code in Context               | covered (README example in real app)  |
| Magical Moments                | covered (live 3-server reload)        |
+====================================================================+
```

## DX Implementation Checklist

```
[ ] Time to hello world < 5 min (target: 2-5min, Competitive tier)
[x] Installation is one command (pnpm install, already true)
[ ] First run produces meaningful output (dev:web + magical moment)
[ ] Magical moment delivered via 3-server live token reload
[ ] Every error message has: problem + cause + fix — RN-boundary lint rule addresses this for one known failure mode
[x] API/CLI naming is guessable without docs (inherits shadcn)
[x] Every parameter has a sensible default (inherited from shadcn components)
[ ] Docs have copy-paste examples that actually work (README, setup step 1)
[ ] Examples show real use cases (a real app, not a toy)
[x] Upgrade path documented (TypeScript compiler, no separate doc needed)
n/a Breaking changes have deprecation warnings + codemods (not applicable, monorepo)
[x] TypeScript types included (project-wide "no any" rule already enforces this)
[ ] Works in CI/CD without special configuration (CI being built from scratch, setup step 5)
n/a Free tier available (not applicable, internal tool)
n/a Changelog exists (not applicable at this stage)
n/a Search works in documentation (single README, no search needed yet)
n/a Community channel exists (not applicable, closed-source internal)
```

---

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific
finding above. Run with Claude Code; checkbox as you ship.

- [ ] **D1 (P1, human: ~3hrs / CC: ~30min)** — packages/ui — Write README.md
  - Surfaced by: Journey Map (Discover, Real Usage stages)
  - Files: `packages/ui/README.md`
  - Verify: a fresh read-through by someone unfamiliar with this session's decisions covers rebind rationale, RN-safe boundary, and dev loop without needing to ask
- [ ] **D2 (P1, human: ~1hr / CC: ~15min)** — monorepo — Add `dev:web` script + Turbo `dependsOn` wiring
  - Surfaced by: Magical Moment spec, Journey Map (Hello World stage). **Elevated from "convenience" to "required" post outside voice:** plain `pnpm dev` (`turbo dev`) runs the `dev` script in every workspace with one — including `apps/mobile`'s `expo start --dev-client`, an interactive TTY process that doesn't behave inside Turbo's multiplexed output. Without `dev:web` filtering to just the 3 Next.js apps, the "3 servers hot-reload" magical moment doesn't just have friction, it doesn't work as described.
  - Files: root `package.json`, `turbo.json`, `packages/ui/package.json` (new `dev` task)
  - Verify: `pnpm dev:web` starts exactly console+admin+portal (not mobile); editing `packages/ui/theme.css` hot-reloads all 3 without a manual restart
- [x] ~~D3 — ESLint RN-boundary import rule~~ — **DROPPED, post outside-voice verification.** Confirmed via `grep -n "document\|window\|navigator\|localStorage"` against both `power-tree.ts` files: zero matches. `generateTreeSVG()` is pure string concatenation, no DOM references — it is already RN-safe. The Metro-crash scenario this rule existed to prevent cannot happen with the actual code in this repo; it was a hypothetical treated as fact. No replacement needed.
- [x] ~~D4 — Stand up CI from scratch~~ — **DROPPED AS SPECIFIED, replaced with D4-revised below.** Outside voice found the original version doesn't detect its own target failure: a missing Tailwind `@source` directive causes silent CSS purge, which exits `pnpm build` with code 0 — a full CI pipeline built to catch this would pass green anyway. It would also need the shared production Supabase service-role key as a CI secret (real security exposure, unnamed in the original plan) to satisfy `turbo.json`'s declared env vars, and would validate a build path (`turbo build`) that isn't confirmed to match what Vercel actually deploys for console (T0 is still unconfirmed). Repo also has a single branch, no PR flow today — a CI gate has nothing to gate yet.
- [ ] **D4-revised (P2, human: ~1hr / CC: ~15min)** — verification — Direct check for the actual failure mode, not a CI pipeline
  - Surfaced by: outside voice's correct diagnosis of D4's flaw
  - Files: a small local script (or a step in whichever CI eventually gets built for real reasons) that runs `pnpm build` then `grep`s the emitted CSS output for one known shared-component class name — directly proves `@source` is working, no prod secrets, no exit-code trust
  - Verify: deliberately remove an `@source` directive, confirm the grep check fails; restore it, confirm it passes
- [x] ~~D5 — Document the Vercel rollback flow~~ — **kept, unchanged**, folded into D6 below alongside the free documentation fix outside voice found.
- [ ] **D6 (P1, human: ~15min / CC: ~10min)** — docs — Fix stale CLAUDE.md + document rollback (the actual highest-leverage TTHW fix, per outside voice)
  - Surfaced by: outside voice — `CLAUDE.md` currently states console/portal/admin run on ports 3000/3001/3002 (actual: 3200/3100/3300 — confirmed via each app's `package.json`), Expo SDK "51+" (actual: 54), and lists `chain`/`email`/`geo`/`governance` as shared packages that are empty, untracked directories. A contractor following the documented commands today would hit wrong ports immediately. This is a 15-minute fix with more real TTHW impact than any other item in this checklist, and was outside this review's original scope because it targets an existing file, not new packages/ui infrastructure.
  - Files: root `CLAUDE.md` (fix ports, Expo version, package list; add a `## Rollback` section documenting `vercel rollback` / dashboard → Deployments → Promote to Production)
  - Verify: every command and version number in `CLAUDE.md` matches what's actually in each app's `package.json` and `next dev` script

## Unresolved Decisions

None — the outside-voice corrections above (dropping D3/D4-as-specified,
elevating D2, adding D6) were applied directly given the strength of the
evidence (verified via grep/file reads, not just argued) and the product
owner's explicit call to move to session close-out rather than re-litigate
each one individually. Flagged transparently here rather than silently.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | Not run. Outside voice reiterated the eng-plan's own strategic-priority flag: this redesign is absent from NEXT.md's priority list (which names contract `owner()` on a single EOA as the highest-leverage remaining security item, plus 68 unchecked `process.env.X!`, 5 failing admin tests, zero console coverage), with no success metric, cost, or kill criteria stated anywhere. |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | Not run as a standalone skill. Outside-voice pass ran inline (Codex CLI absent, Claude subagent fallback). |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | issues_open | Separate review, see `sessions/web-eng-plan-output.md`. |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | Not run this session — session 3 already produced its own approved artifact review. |
| DX Review | `/plan-devex-review` | Developer experience gaps | 1 | issues_open | Full 8-pass review + persona/benchmark/journey ceremony run at product owner's explicit request. Outside voice found the review's central error-handling finding rested on a **verified-false premise** (generateTreeSVG has no DOM deps, the crash it guarded against cannot occur) and that the proposed CI check would not have detected the failure it existed to catch (silent Tailwind purge exits 0) while requiring production DB secrets — both dropped, replaced with a direct verification script. Also surfaced that the devex plan's own centerpiece (the "magical moment") assumed an artifact (`packages/ui/theme.css` as tokens' actual source of truth) that the eng-plan's T4.5 as originally scoped never created — fixed in `web-eng-plan-output.md` directly. Two new eng-plan tasks added (T4.6 mobile workspace dep, T4.7 admin transpilePackages) that neither plan had covered. |

**CROSS-MODEL:** The outside-voice subagent verified claims directly against source (grep for DOM references, actual dev ports, actual next.config.ts content, actual git status) rather than arguing from priors — every claim checked against source independently in this session confirmed accurate. This is a stronger signal than typical cross-model agreement: it's cross-model fact-checking with 100% verification hit rate on checked claims.

**VERDICT:** DX REVIEW ISSUES RESOLVED THIS SESSION — 2 findings dropped as factually false, 1 cross-plan contradiction fixed, 2 new tasks added, 1 free high-leverage fix identified (stale CLAUDE.md docs) that this review's original scope had missed entirely. Not independently CLEARED — see unresolved items below, primarily the still-open strategic-priority question shared with the eng review.

**UNRESOLVED DECISIONS:**
- Whether to run `/plan-ceo-review` given this project's absence from NEXT.md's own stated priorities — same open item as the eng review, not resolved by either DX or eng review since it's outside both skills' scope
- The uncommitted-repo-state finding (CLAUDE.md, DESIGN.web.md, docs/, security migrations, all untracked) — discovered via this outside-voice pass but resolved as its own separate action this session (see WORKLOG.md), not left open
