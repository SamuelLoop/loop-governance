# Loop Governance — NEXT

> Current state and priorities. Update at every session end.
> Last updated: 2026-08-10

## Deployed state

| App | URL | Status |
|---|---|---|
| console | console.loopcmbntr.live | Live |
| portal | gov.loopcmbntr.live | Live |
| admin | (internal) | Live |
| mobile | iOS + Android | Built, distribution status unknown — verify |

Shared DB: `oztfzqkpwwfnxrydmsuo` (Supabase, named "loop-trading" for historical reasons)

## What is built and working

- Full console dashboard: delegation, accreditation, proposals, elections, treasury cascade, community chat, badge, campaigns, token activity, map
- Portal: public badge pages, Power Tree visualisation (SVG, OG image), join flows, Stripe checkout for LOOP tokens
- Admin: moderation queue, governance config editor, audit log, org-admin/manager roles
- Mobile: Power score (PowerCard), community chat (realtime), delegation/accreditation flows, UserBottomSheet, PowerBar, GivePowerSheet
- ESLint + TypeScript quality baseline (2026-07-28)
- Scale sessions 01-05: DB indexes, vote/proposal count materialisation, OG cache + rate limiting, connection pooling, Realtime audit

## Next sessions — ready to execute (priority order)

### -1. Web platform redesign (NEW 2026-08-09 — full UX/design overhaul)

Full brief chain: `sessions/web-01-design-shotgun.md` through
`sessions/web-07-scaffold.md`, then `sessions/web-implementation-backlog.md`.

Console/portal/admin currently run stock shadcn dark theme with zero brand
customisation (portal has literally no theme at all — `globals.css` is one
line). Mobile already solved this problem in July with a bespoke "Dark
Civic" system (`DESIGN.mobile.md`); web never got the same treatment. This
is a planned, not-yet-started process to fix that across all three Next.js
apps as one shared design system (`packages/ui`, currently empty).

Decisions already made (2026-08-09): scope covers console + portal + admin
together (not console alone); visual direction is a fresh `/design-shotgun`
exploration, explicitly not constrained to replicate mobile's Dark Civic
(session `web-06-brand.md` is where the mobile/web relationship gets an
explicit decision). Process mirrors the proven mobile session chain
(`design-consultation` → `frontend-design` → `plan-eng-review` →
`plan-devex-review` → `brand-loop` → scaffold), with `/design-shotgun`
added at the front since the direction isn't predetermined this time.

**Session 1 done (2026-08-09):** direction "Signal Pulse" approved as a
baseline. Output in `sessions/web-design-shotgun-output.md`.

**Session 2 done (2026-08-09):** full design system written to
`DESIGN.web.md` (pointer: `sessions/web-design-system-output.md`). Signal
Pulse confirmed as final (not just baseline) after a fork against an outside
Claude-subagent alternative ("Civic Mint") — resolved by showing both next
to the real, unmodified badge/power-tree SVG output. Tier-colour open item
resolved: tier colour = status (badge/avatar/pills, untouched), blue-violet
gradient = brand/action, never mixed. **Hard constraint for all later
sessions: the badge/power-tree component
(`apps/*/src/lib/power-tree.ts`) is not being redesigned**.

**Session 3 done (2026-08-09/10):** design applied to 9 canonical patterns
covering all 44 pages (recounted from source: 24 console + 9 admin + 11
portal — session 2's "43" was off by one on console), delivered as an
interactive HTML review artifact (real embedded fonts, working state
toggles) rather than static mockups. Approved across two rounds. **New
decision added mid-review, not in the original scope:** console and admin
get a real user-toggleable light/dark mode (own token set, contrast-safe
tier-colour text variants) — portal stays fixed-light. `DESIGN.web.md`
updated with the full spec. Output: `sessions/web-frontend-design-output.md`.

**Session 4 done (2026-08-10):** engineering plan at
`sessions/web-eng-plan-output.md` — 11 decisions covering token strategy
(Tailwind v4 `@theme`, **rebind** existing shadcn variables not a parallel
set), chart library (Recharts), map (reskin Leaflet, not a MapLibre
migration), migration order (**Admin → Console → Portal**, revised from an
initial Console-first call after outside-voice review), font self-hosting,
theme persistence (localStorage + DB sync, cross-app), and more. An
outside-voice pass caught a real bug in the plan's own first draft (moving
`apps/portal/src/lib/power-tree.ts` wholesale into `packages/ui` would have
dragged live Supabase query code — `fetchPowerTree()` — into a UI package,
violating the plan's own "no Supabase changes" constraint; corrected to
scope only `types`/`placeNodes`/`generateTreeSVG`). **Also fixed this
session, unrelated to the design work:** `loop-console`'s Vercel dashboard
had a Build Command override (`pnpm build`) that silently didn't match its
own committed `apps/console/vercel.json` (turbo-filtered) — toggled off in
the dashboard so it falls back to the file; **not yet confirmed via an
actual deployment**, check build logs on the next real push to console.
Also deleted a dead, unused repo-root `vercel.json`.

**Session 5 done (2026-08-10):** dev-experience checklist at
`sessions/web-devex-checklist.md` — README + `pnpm dev:web` script (now
load-bearing, not just convenience: plain `pnpm dev`/`turbo dev` also
launches `apps/mobile`'s interactive Expo process, breaking the intended
3-app dev loop). Two DX-review findings (an ESLint import-boundary rule, a
full CI pipeline) were dropped after outside-voice verification proved
their premises false — see that session's `GSTACK REVIEW REPORT` for
detail. Two new eng-plan tasks added retroactively (T4.6: `apps/mobile` has
zero `@loop/ui` dependency today; T4.7: `apps/admin/next.config.ts` is
empty, no `transpilePackages`). **`sessions/web-eng-plan-output.md`
task T4.5 corrected**: the token rebind must write into
`packages/ui/theme.css` as source of truth first, not directly into
`apps/admin/globals.css` as originally scoped — the devex plan's "edit
packages/ui/theme.css, 3 apps hot-reload" magical moment would otherwise
have pointed at a file nothing actually reads.

Next up: `sessions/web-06-brand.md`, then `web-07-scaffold.md` (first real
code changes). **Not yet run:** `/plan-ceo-review` — flagged twice now
(sessions 4 and 5) that this redesign doesn't appear on this file's own
priority list below and has no stated success metric, cost, or kill
criteria. Worth resolving before scaffold if you want it resolved formally,
otherwise it stays an acknowledged open question.

**Unrelated but discovered this session, already fixed:** `CLAUDE.md`,
`DESIGN.web.md`, and the entire `docs/` directory (this file included) were
untracked in git — never committed, existed only in the local working
directory. Confirmed via `git status`/`git ls-files` and committed this
session alongside the security migrations (051-054) and all session
outputs. If you're reading this from a fresh clone, that commit is why.

### 0. Audit readiness + BMM self-assessment prep (2026-08-09 — external trigger)
Full brief: `sessions/security-05-audit-readiness-and-bmm.md`

Triggered by a real exchange/review-board contact asking about a smart-contract
audit badge and a GBA BMM self-assessment before they'll pair Loop Token.

**Done this session:**
- Slither run against `packages/contracts`: 21 findings, all fixed in
  Loop's own code (0 left; remaining 10 are inherent/OpenZeppelin-only).
- `LoopTokenV2.sol` test suite written: 100% stmts/funcs/lines, 98.57% branch.
- Confirmed V2 is the only deployed contract (V1 is dead code — flagged
  for deletion, not yet done).
- **`supabase` CLI installed and linked** (`brew install supabase/tap/supabase`,
  `supabase link --project-ref oztfzqkpwwfnxrydmsuo`) — unblocks live-DB
  work in this environment going forward, not just this session.
- **security-03 done**: found and fixed a live vote/fund-integrity bug
  bigger than its own scope — 3 console server actions (`castVote`,
  `createProposal`, `createDelegation`) trusted a client-submitted user ID
  with zero session check (anyone could vote/propose/delegate as anyone
  else); `revokeDelegation` had no ownership check either. All 4 fixed,
  type-checked clean. Separately: `pay_governance_motivation` had 2 dead
  overloads with zero cap enforcement, plus `cascade_treasury` and
  `approve_funding_request` had the same missing-auth pattern. Migration
  `051_treasury_function_hardening.sql` applied and verified live
  (`SET ROLE anon` denied, `SET ROLE service_role` still works).
- **security-04 done**: `increment_votes_for`/`increment_votes_against`
  (1-arg overloads) were a live, trivial vote-stuffing bug — zero auth,
  callable by anyone with a proposal ID. `award_leader_activity` let
  anyone self-mint real LOOP_TKN. `compute_accreditation_scores*` had
  uncapped iteration counts — a real DoS vector on the shared DB. Migration
  `052_voting_function_hardening.sql` applied and verified the same way.

- **security-02 done**: every one of the 15 flagged RLS policies on
  loop-governance's own tables was scoped to `{public}` (not `service_role`
  as several names implied) with an unconditional `true` check —
  including `admin_assignments` (direct privilege-escalation to
  `platform_admin`, zero auth), `governance_settings` (anyone could
  rewrite quorum/motivation-cap settings, routing around `security-03`'s
  fix entirely), and `token_purchases` (fake purchase rows). Migration
  `053_tighten_governance_rls_policies.sql` applied: 12 policies restricted
  to `service_role`, 3 given real ownership checks for `authenticated`
  (`delegations`, `messages` — mobile writes both directly, confirmed via
  `apps/mobile/src/components/GivePowerSheet.tsx`/`MessageInput.tsx`).
  Functional re-testing (real `SET ROLE` sessions, rolled back, not just
  `tsc`) caught a genuine regression from `052`: `recompute_power_score`
  is called by `SECURITY INVOKER` triggers on delegation/accreditation
  inserts, which mobile fires directly as `authenticated` — fixed with a
  targeted re-grant in `054_restore_recompute_power_score_grant.sql`.
  Loop Cmbntr's `cmbntr_*` tables have the identical issue — flagged as a
  separate background task, not touched (different product, same shared DB).

- **BMM SDP + self-assessment done**: `docs/bmm/solution-documentation-package.md`
  and `docs/bmm/self-assessment.md`. Rated honestly, not aspirationally —
  platform-wide effective level is **1**, capped by Distribution, Identity
  Management, Resilience, and Infrastructure Sustainability (all Level 1).
  Governance (4) and Security (3) are the strongest elements — this
  session's fixes are exactly why Security cleared Validated. Identity
  Management is the one gap with no quick fix (KYC/biometric Sybil
  resistance is a documented product intent, never built). See the self-
  assessment's "What would move the platform-wide rating" section for the
  prioritized next steps.

**Still open:**
- Move `owner()` off single EOA (Gnosis Safe multisig + Timelock) —
  highest-leverage remaining item per the self-assessment.
- Delete dead `LoopToken.sol` (V1) — needs your go-ahead, it's a deletion.
- Write the actual Infrastructure Sustainability plan (pure writing, zero
  engineering cost, closes a Level-1 gap outright).
- Confirm/document Supabase backup/PITR config + write a one-page COOP
  (Resilience element).
- Get 2-3 real audit quotes once contract ownership is off a single EOA.

### 1. Scale power scores + tree (HIGH — session prompt ready)
Full brief: `NEXT-SESSION-scaling-power-scores.md`

Four problems to solve:
- **Problem 1 (highest):** No caching on `getPowerStats()` — KV cache with 5-min TTL
- **Problem 2:** Power score computed on read not write — `user_power_scores` table + triggers
- **Problem 3:** Nightly PageRank batch will time out at scale — incremental edge-triggered updates
- **Problem 4:** Power Tree `IN` clauses grow unbounded — `tree_snapshot` JSONB on `user_power_scores`

TDD test suite is fully specified in the session prompt (Blocks A-E, ~26 tests). Write and get sign-off before implementing.

### 2. Power Tree (if not yet done)
Brief: `NEXT-SESSION-power-tree.md`
Layout decision needed (Radial Orbital vs Hierarchical Columns). Check `apps/portal/src/lib/power-tree.ts` — if the file exists and is implemented, this session is done. If not, implement per the brief.

### 3. Bugfix backlog
File: `sessions/bugfix-backlog.md`

Open items:
- **68 unchecked `process.env.X!` accesses** — add `requireEnv()` helper to each app's `src/lib/env.ts`, replace call-site by call-site (portal: 45, console: 13, admin: 10)
- **Admin test failures** — `tests/admin-console.test.mjs` has 5 failing assertions from FK violations; needs test fixture setup/teardown
- **`useSyncExternalStore` refactor** — `use-mobile.ts` in console + admin; not urgent, currently suppressed inline

### 4. Console test suite
No Vitest test suite exists for `apps/console`. The portal has one (`src/__tests__/scaling/`). Console is the most user-facing app and has zero coverage.

## Blocked / needs verification

- Mobile distribution (App Store / TestFlight / Google Play status) — unknown, verify
- `user_power_scores` table: does not yet exist in DB (as of 2026-07-28 session notes). Confirm before building Problem 1 KV cache that reads it.
- Stripe live keys: portal currently wired with test keys — verify before any real payment goes through

## Do not touch without reading SOUL.md first

- Any new read path for `accreditation_scores` — must use `community_id IS NULL` filter
- Any new DB migration — one shared DB, affects all four apps simultaneously
- Treasury tables — service-role client only, no user-facing direct access
