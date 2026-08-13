# Loop Governance — NEXT

> Current state and priorities. Update at every session end.
> Last updated: 2026-08-13

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

**Session 6 done (2026-08-10):** brand session at `sessions/web-brand-
output.md`. Mobile/web relationship formally restated as a decision (was
already implicit in `DESIGN.web.md` since session 2, now on record as
deliberate). New: also decided the *Loop Cmbntr marketing brand* vs
*Signal Pulse product brand* relationship (the `/brand-loop` skill loads
crimson/Roboto marketing identity — adopted its naming conventions only,
not its colour system, which stays Signal Pulse). Produced
`packages/ui/theme.css` (the real rebind source for T4.5), `packages/ui/
fonts/` (General Sans + Geist + JetBrains Mono, actually downloaded and
license-verified this session, not just referenced), and `packages/ui/
assets/brand/` (favicons, wordmark SVGs, 3 static OG images). **Two
corrections to prior sessions' output, both applied:** (1)
`web-eng-plan-output.md` decision 11 claimed real font files were already
sourced and reusable from session 3 — checked, found unreachable (likely
sourced into an external Claude Artifact, not the repo), re-sourced fresh
instead, no repo change needed beyond a note in `packages/ui/fonts/
README.md`. (2) `DESIGN.web.md`'s Display type spec said weight 800 —
General Sans doesn't ship that weight (verified via the font's own `fvar`
axis), corrected to 700 in `DESIGN.web.md` directly. Also found and
documented (not yet fixed — session 7's job): the live `community-map.tsx`
uses 7 unrelated saturated hues for community level, which the already-
locked data-viz rule (no second saturated hue) forbids; exact single-hue
replacement spec is in `web-brand-output.md` §5. Confirmed the brief's
badge-OG-image concern was already resolved (dynamic per-badge OG images
exist and work) — nothing to fix there.

**Unrelated but discovered this session, already fixed:** `CLAUDE.md`,
`DESIGN.web.md`, and the entire `docs/` directory (this file included) were
untracked in git — never committed, existed only in the local working
directory. Confirmed via `git status`/`git ls-files` and committed this
session alongside the security migrations (051-054) and all session
outputs. If you're reading this from a fresh clone, that commit is why.

**Session 7 done (2026-08-10):** scaffold session at `sessions/web-07-
scaffold.md` — first real code changes, all three apps now import from a
real `@loop/ui`. `packages/ui` stood up for real: `package.json` (mirrors
`@loop/db`'s exports pattern), `src/components/ui/*` (all 19 shadcn
primitives — console's copies were byte-identical to admin's 14-item
subset, verified by diff before consolidating; portal had zero local
copies, now consumes `@loop/ui` directly for the first time), `src/lib/
utils.ts` (`cn()`), `src/hooks/use-mobile.ts`, and new `src/theme/`
(font loaders for all 3 self-hosted faces, a flash-of-wrong-theme-
prevention init script, and the sun/moon `ThemeToggle` — console/admin
only). `theme.css` wired into all 3 apps' `globals.css` via a relative
import plus a `@source` directive (Tailwind v4 doesn't scan workspace
packages by default — verified live against real production builds, not
just dev, per eng-plan task T3.6: grepped each app's emitted `.next/
static/css/*.css` for a class that only exists inside `packages/ui`
source, e.g. `.bg-sidebar`, confirmed present in console/admin/portal's
prod CSS). `transpilePackages: ["@loop/ui"]` added to all 3 apps'
`next.config.ts` (admin had none at all before this — eng-plan T4.7,
done). `data-app`/`data-theme` attribute contract wired on all 3 root
layouts per `theme.css`'s own documented contract.

**Scoping decision, not in the original brief, made explicit:** wiring
console/admin to `@loop/ui` did NOT rewrite the 58 existing `@/components/
ui/*` import call sites (eng-plan task T3.5's full 143-site rewrite across
console+admin is unchanged, tracked separately). Instead each local
`components/ui/*.tsx` file became a one-line re-export shim
(`export { X } from "@loop/ui"`), so `packages/ui` is the real source of
truth end-to-end with zero call-site churn this session. Cheap, reversible
cleanup whenever T3.5 actually runs — full rationale in `packages/ui/
README.md`.

Brand wiring checklist from `packages/ui/assets/brand/README.md` executed
in full: favicons/apple-touch-icon swapped in-place in all 3 apps'
`public/`, new `wordmark-{app}.svg`/`icon-mark-256.png`/`og-{app}.png`
copied in, `openGraph.images` + `metadataBase` added to all 3 layouts
(console/portal use their real production domains; admin's left unset
since `NEXT.md` itself records admin as having no public URL — guessing
one would've been worse than the harmless dev warning), old crimson
`logo.png`/`logo-full.png` removed from all 3 apps' `public/` and every
source call site (sidebar headers, both login pages, portal nav/homepage/
footer, the Stripe receipt email) repointed at the new assets — 8 call
sites from the checklist, all done, zero remaining `grep`
hits confirmed before deleting the old files.

`community-map.tsx`'s `LEVEL_COLORS` fixed per `web-brand-output.md` §5:
the 7 unrelated saturated hues replaced with a single-hue intensity ramp
along the accent gradient (computed at module load from the same
`--accent-start`/`--accent-end` hex values as `theme.css`, since Leaflet
draws to canvas and can't read a CSS custom property — same duplication
pattern already accepted for tier colours in `power-tree.ts`).
`LEVEL_RADIUS` untouched. Polylines flattened to `--color-text-secondary`
dashed. Selected-node ring now uses the accent-glow colour instead of a
fill change.

**Bug found and fixed, would have broken every app's CSS build:** a
`/* ... apps/*/src/lib/power-tree.ts ... */` block comment in both
`theme.css` (pre-existing, from session 6) and this session's own
`community-map.tsx` addition contained a literal `*/` substring inside
`apps/*/src` — which prematurely closes a CSS/JS block comment. Portal's
dev server actually hit this live (`CssSyntaxError`, 500 on every route)
before it was caught; console/admin hadn't rendered any page that forced
the CSS compile yet. Fixed by rewording both comments to avoid the
`*/`-as-substring trap. Worth a `LESSONS.md` entry (added).

**Verification, not just `pnpm dev`:** all 3 apps type-check clean, lint
clean (0 errors, only pre-existing warnings), and — critically — **all 3
apps' production builds (`pnpm build`) pass**, including portal's
`/buy`, `/buy/success`, `/api/stripe/checkout`, `/api/stripe/webhook`
routes (untouched by this session, confirmed still compiling and
generating). `/design-review` was deliberately **not** run — it requires
a clean git tree and runs its own autonomous multi-commit fix loop that
can rewrite spacing/typography beyond this session's own "zero
feature-level redesign" boundary; this repo's tree wasn't clean (a
concurrent audit-readiness session had its own uncommitted work in
flight), so running it risked either committing unrelated work or an
uncontrolled scope-creep fix loop. Manual verification against
`DESIGN.web.md`'s own rules substituted instead (see WORKLOG.md).

**Not done this session, explicitly deferred:**
- Power-tree consolidation into `packages/ui/power-tree` (eng-plan T1,
  decision 6) — out of scope per this session's own brief, badge/
  power-tree component stays untouched.
- `apps/mobile` still has zero `@loop/ui` dependency (eng-plan T4.6).
- DB-backed cross-app theme sync (eng-plan decision 8 / task T8) — the
  toggle built this session is localStorage-only, console and admin
  won't share a light-mode choice across origins yet.
- The 143-site `@/components/ui/*` import rewrite (eng-plan T3.5).
- `/design-review` (see above) — worth running properly once this
  session's commit lands and the tree is clean.
- `/plan-ceo-review` — flagged for the fourth session running now
  (4, 5, 6, 7) as still not run; this redesign still doesn't appear on
  this file's own priority list below.

Next up: `sessions/web-implementation-backlog.md` — per-page migration
of all 44 pages (24 console + 9 admin + 11 portal) onto the shell this
session landed, following the 9 canonical patterns from session 3.

**Sessions 08-11 added 2026-08-11** (real user request, triggered by
today's ad hoc chat redesign — see that day's own session for the chat
work itself, not tracked in this numbered chain since it happened outside
this process): `web-08-space-tint-addendum.md` (formalizes a new
leadership/community/admin panel-tint pattern discovered live during the
chat build, retrofits chat onto real `Glass`/`LiveDot` components instead
of the one-off CSS it shipped with) → `web-09-admin-rollout.md` →
`web-10-console-rollout.md` → `web-11-portal-rollout.md`. These are the
concrete, dependency-ordered promotion of `web-implementation-backlog.md`'s
checklist items (that file said to do exactly this "when picked up") —
run 08-11 instead of working the backlog ad hoc, they carry the correct
order and the space-tint colour is a new, not-yet-confirmed design
decision (admin tint proposed as teal, needs real sign-off in session 08
itself before 09 depends on it). **All four carry forward the "Post-deploy
correction" standing rule below: explicit visual sign-off before
deploying, every session, not just portal's.**

**Session 8 done (2026-08-13):** `sessions/web-08-space-tint-output.md`.
Admin tint confirmed as `#2dd4bf` (the brief's own proposal) — mocked up
as a real artifact against 2 alternates, both on the actual Glass-panel
treatment, not a swatch; user picked the original proposal as-is.
`DESIGN.web.md` got a new "Space-tint — panel ownership" section;
`packages/ui/theme.css` got `--admin-tint` plus the `live-pulse` keyframes
(moved from console-only `globals.css` since `LiveDot` isn't console-only
anymore); two new real components, `Glass` (space=`"community"|
"leadership"|"admin"`) and `LiveDot`, in `packages/ui/src/components/`.
Console chat (`DualChatPanel`, and `ChatMobileLayout` via the shared
`ThreadPanel`) retrofitted onto both — dead `.live-dot`/`.leadership-glow`/
`.community-shade` CSS removed from `apps/console/src/app/globals.css`
after confirming via grep nothing else referenced it.
`pnpm --filter console run build` clean (exit 0), 0 lint errors (only
pre-existing warnings). Visual parity verified by grepping the actual
compiled production CSS chunk for every token/class this change touches
(admin-tint value, live-pulse keyframes, rounded-panel, bg-surface,
backdrop-blur var, and the community light/dark hex pair) — all present,
matching the session's own proven method for catching silent Tailwind
purge bugs (see LESSONS.md #13). **Not done:** a real logged-in
screenshot — starting the console dev server was blocked by this
session's tool-permission classifier, not a code issue. Real seeded test
credentials exist for next time (`scripts/seed-users.mjs`:
`diana@looptest.dev` / `LoopTest2026!`, seeded `quorum` role). Nothing in
this session deployed anything — only local build/CSS verification: see
web-08's own "Left open" for the screenshot gap, which should close
before whichever of 09/10/11 deploys first, per the standing rule above.
Also flagged (not fixed, out of scope): `apps/console/.../communities/
[id]/chat/chat-panel.tsx` (`ChatPanel`) is dead code, nothing imports it.

**Session 9 done (2026-08-13):** `sessions/web-09-admin-rollout-output.md`.
All 8 real admin dashboard pages rebuilt on `Glass space="admin"` (brief's
title said "7 pages," its own file list and the real filesystem both say
8 — noted as a discrepancy, not silently corrected). Two new real
`packages/ui` components, `DataTable` (denser table wrapper, presentational
only — pages keep their own filter/search/expand logic) and `StatusChip`
(4 semantic variants only: success/warning/error/neutral), used across
audit/communities/governance/members/moderation/treasury. Several
pre-existing admin tables had ad hoc categorical hues (blue/purple/second-
blue) that don't map to the locked semantic palette — deliberately
collapsed onto the 4-value `StatusChip` set rather than reinventing hues,
full old→new mapping table in the output doc; flagged as a real, visible
simplification worth a look once seen live, not silently done.
`LiveDot` checked and correctly **not** added anywhere — grepped
`apps/admin/src` for Realtime usage, zero matches, admin has no live
subscriptions today. **Real bug found and documented, not fixed:**
`packages/ui/theme.css`'s `--font-*` (family) and `--font-weight-*`
(weight) namespaces both define `display` and `body` keys, so
`font-display`/`font-body` utility classes collide — confirmed via
compiled CSS that `.font-body` only ever emits the family declaration,
never the weight one. This session's new code avoids the collision
entirely (built-in `font-bold`/`font-medium`/`font-normal` for weight,
the safe `text-{name}` tokens for size); LESSONS.md #14 added, real fix
still open. `pnpm --filter admin run build` clean (exit 0, 105s), 0 lint
errors (28 pre-existing warnings, none new), `@loop/ui` and `admin`
type-check clean. Compiled-CSS grep confirmed every new token/class
present and correct, including a regression check that lesson #13's
`max-w-*` fix is still holding. **Not done:** a real logged-in screenshot
— no browser/dev-server tool access this session at all (worse than
session 8, which at least attempted and hit a permission block);
verification is 100% static (token tracing + compiled CSS). Also found:
session 8's own changes (`Glass`/`LiveDot`, `theme.css`/`DESIGN.web.md`
edits) were still uncommitted when this session started — folded into
this session's commit since they're a hard prerequisite, flagged as a
likely process gap in session 8's own closeout.

**Session 10 done (2026-08-13):** `sessions/web-10-console-rollout-output.md`.
Patterns 1-5 executed (dashboard, data-viz/money, geo, governance action,
delegation/identity — `/login` folded out, `communities`/`communities/[id]`
confirmed out of scope per the brief's own file lists). Five new real
`packages/ui` components (`StatTile`, `VoteTally`/`VoteBar`/
`VoteActionPanel`, `DelegationTable`, `AccreditationProgress`,
`GivePowerDrawer`). Two real data-viz colour violations fixed on
treasury's existing charts (second saturated hue, invented amber) per the
brief's own instruction to read the `dataviz` skill first. Exactly one
genuine space-tint applied (token-activity's admin-only table, a real
role gate) — everything else checked and left untinted. **Two real bugs
found and fixed at the source**, both affecting already-shipped session 09
code: `DataTable`'s hardcoded `space="admin"` (fixed + retroactively
patched all 7 admin call sites) and `cn()`'s tailwind-merge not
recognizing custom `text-{name}` classes as size/colour conflict groups
(fixed with a real `extendTailwindMerge` config, verified with direct
`twMerge()` calls). `pnpm --filter console run build` clean (exit 0), 0
lint errors, compiled-CSS regression checks all pass (including a
LESSONS.md numbering collision found and fixed while writing this up).
Committed (`3018c3e`) and pushed to `origin/chat-signal-pulse-redesign`.
**Deployed to console.loopcmbntr.live** — the `vercel --prod` command was
blocked by this session's own tool-permission classifier, so Samuel ran
it directly from the command given; not independently re-verified by this
session. Dev server was left running for Samuel to
review directly (no agent-captured screenshot, per the project's standing
preference), same sign-off rule as 08/09.

Next up: `sessions/web-11-portal-rollout.md`.

**Post-deploy correction (2026-08-10, same day):** the real user checked
the live deploy and found gov.loopcmbntr.live "totally broken" and never
authorized the logo change. Root cause: portal's `<body>` was switched to
`theme.css`'s Signal Pulse **light**-mode tokens (per `DESIGN.web.md`'s
"portal — fixed light" call, sessions 2/3), but portal's actual page
content (hero, sections) was never retouched and still had 90+ instances
of near-white hardcoded text (`text-neutral-50`) and dark-only section
backgrounds — a real contrast failure the moment the shell flipped light
underneath it, not a stylistic disagreement. **`packages/ui`'s decision
that portal is fixed-light was never actually validated with the real
user** — it was carried forward from session 2 through 6 as an internal
design-doc decision without a live sign-off checkpoint. Same root issue
for the logo swap: the brand wiring checklist (session 6) and its
execution (session 7) were never shown to the user before shipping.

**Reverted same day:** `apps/portal` fully reverted to its pre-session-7
state (hardcoded dark, zero `@loop/ui` usage, old logo). `apps/console`
and `apps/admin` had their logo/branding reverted to the original
`logo.png` + "Loop_cmbntr" (the Signal Pulse dark theme/tokens and the
new light/dark toggle were **not** reverted — not flagged as broken).
Deployed and confirmed live. Full detail in WORKLOG.md.

**Standing rule going forward, this redesign specifically:** get an
explicit visual sign-off from the real user before extending Signal
Pulse's light-mode application to any more of portal's actual page
content, and before any further brand-asset swap ships to production.
`packages/ui/assets/brand/` and `theme.css`'s portal-light-mode section
still exist and are still a valid option — they're just unconfirmed with
the person who actually has to approve it, not unconfirmed as in
"wrong."

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
  and `docs/bmm/self-assessment.md`. Rated honestly, not aspirationally.
  Governance (4) and Security (3) are the strongest elements — this
  session's fixes are exactly why Security cleared Validated.
- **2026-08-10: Infrastructure Sustainability + Resilience plans written.**
  `docs/bmm/infrastructure-sustainability-plan.md` and `docs/bmm/
  continuity-of-operations-plan.md` — both move their elements from
  Level 1 to Level 2 per BMM's own "documented" definition, without
  pretending the underlying gaps are closed. Confirmed live (not assumed)
  via `supabase backups list --project-ref oztfzqkpwwfnxrydmsuo`:
  **`pitr_enabled: false`** — point-in-time recovery is off on the shared
  project. Named as the single highest-leverage open action in the COOP.
  Infrastructure Sustainability plan names the real gap plainly: one
  maintainer (Samuel), no succession plan, no operating-budget carve-out
  from token economics.
- **2026-08-10: multisig deployment started, stalled on hardware.**
  Confirmed live via direct `eth_call` to Base mainnet that `LoopTokenV2`'s
  current owner (`0xdb113f65D3368e5C0379486755fc3Fc0b7Fb97CE`) is already
  a Ledger, not a hot key — this is "harden further," not urgent exposure.
  Attempted to deploy a 1-of-1 Gnosis Safe via app.safe.global as an
  interim step (path to 2-of-3 once real co-signers are lined up) — blocked
  by a persistent Ledger error (`OpenAppCommandError` / code 6807,
  "Unknown application name") that a firmware update didn't resolve.
  Recommended next: try Ledger Live Mobile + WalletConnect instead of
  desktop USB, or resolve directly with Ledger support. **Platform-wide
  BMM rating is now capped by only two elements: Distribution (this) and
  Identity Management** — see self-assessment's "What would move the
  platform-wide rating" section.

**Still open:**
- Resume the multisig deployment once the Ledger connection issue is
  sorted (owner's call on timing — not urgent).
- Delete dead `LoopToken.sol` (V1) — needs your go-ahead, it's a deletion.
- Enable PITR on the Supabase project (billing/dashboard action, Samuel
  only) — moves Resilience Level 2 → 3.
- Identity Management design decision (KYC/biometric approach) — the one
  remaining gap with no quick fix.
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
