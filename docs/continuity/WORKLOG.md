# Loop Governance — WORKLOG

> Reverse-chronological session history. Append new sessions at the top.
> Each entry: date, what was done, decisions made, what was left open.

---

## 2026-08-13 — Web session 10: console rollout (Signal Pulse)

Full detail: `sessions/web-10-console-rollout-output.md`. Summary:

Patterns 1-5 of the console rollout executed: dashboard home, treasury/
earnings/token-activity/claim (data-viz), map (geo chrome only, canvas
untouched), proposals/elections/campaigns (governance action), give-power/
accreditation/members/badge/account (delegation/identity). Five new real
`packages/ui` components: `StatTile`, `VoteTally`/`VoteBar`/
`VoteActionPanel`, `DelegationTable`, `AccreditationProgress`,
`GivePowerDrawer` (first real use of the previously-unused `Sheet`
primitive). Two real design-system violations fixed while restyling
treasury's existing charts (a second saturated hue on the Projects-vs-
Governance bar, an invented amber on the "Retained" segment) — collapsed
onto the brand-accent/text-secondary two-tone rule DESIGN.web.md actually
specifies. Exactly one genuine space-tint candidate found and applied
(`token-activity`'s admin-only purchases table, a real render-time role
gate) — every other page checked and left untinted per the brief's
conservative default.

**Two real bugs found and fixed at the source, both in shared
`packages/ui` infra other sessions depend on:** (1) `DataTable` hardcoded
`space="admin"` unconditionally (correct only because session 09's call
sites all lived in `apps/admin`) — fixed to accept an explicit `space`
prop, then retroactively patched all 7 admin call sites so session 09's
already-shipped tables don't silently lose their tint. (2) `cn()`'s plain
`tailwind-merge` (no `extendTailwindMerge`) lumped every custom
`text-{name}` class into one group regardless of whether it controlled
font-size or colour — a `StatTile` colour override was silently dropping
the tile's size class too. Fixed with a real `extendTailwindMerge` config
registering the custom `font-size`/`text-color` groups; verified with
direct `twMerge()` calls before and after, not by reasoning about it.
While documenting this, also found and fixed a `LESSONS.md` numbering
collision (session 09's own new entry had been inserted at the top of the
file instead of appended in order) — reordered, renumbered #14/#15.

`pnpm --filter console run build` clean (exit 0, 11.2s, all 27 routes),
0 lint errors (127 pre-existing warnings, confirmed via diff none are
new except one real regression — an unused `Glass` import — caught and
fixed before this count). `@loop/ui`/console/admin all type-check clean.
Compiled-CSS grep confirmed every new token/class present and correct,
including the LESSONS #13 `max-w-*` regression check and a chat-specific
regression check (community-shade hex, `live-pulse` keyframes) — both
still holding. Dev server started and confirmed responding; left running
for Samuel to review directly rather than agent-captured, per the
project's standing "no preview-pane automation" preference. Not
committed, not deployed — same standing sign-off rule as 08/09.

**Also found:** two peer sessions were live-editing this exact repo
concurrently while this session was reviewing session 09's in-progress
work (before session 09 was committed) — flagged to Samuel mid-session
rather than silently risking duplicate/conflicting edits; stood down on
admin work until confirmed done, kept only the one real `Glass` bug fix
found in the process (benefits both sessions).

---

## 2026-08-13 — Web session 09: admin rollout (Signal Pulse)

Full detail: `sessions/web-09-admin-rollout-output.md`. Summary:

Rebuilt all 8 real `apps/admin/src/app/(dashboard)/*/page.tsx` dashboard
pages (audit, communities, governance, members, moderation, home/`page.tsx`,
settings, treasury — the brief's title said "7 pages," its file list and
the real filesystem both say 8, flagged as a discrepancy not silently
fixed) on `<Glass space="admin">`, replacing every ad hoc
`rounded-lg border border-border bg-card` panel, including the shared
`PageDescription` component all 8 pages use. Two new real `packages/ui`
components: `DataTable` (denser, presentational-only table wrapper — pages
keep their own filter/search/expand-row logic) and `StatusChip` (4
semantic variants only: success/warning/error/neutral), used across
audit/communities/governance/members/moderation/treasury. Several
pre-existing admin tables had ad hoc categorical hues (blue for
"moderation" events, purple for "settings" events, a second blue for
"org_manager," etc.) that don't map to Signal Pulse's locked palette —
deliberately collapsed onto `StatusChip`'s 4-value set with the label text
carrying the rest of the identity (full old→new mapping table in the
output doc). `LiveDot` checked and correctly left out entirely — grepped
`apps/admin/src` for Realtime usage first, zero matches, nothing to attach
liveness to.

**Real bug found and documented (LESSONS.md #14), not fixed:**
`packages/ui/theme.css`'s `--font-*` (family) and `--font-weight-*`
(weight) token namespaces both define `display` and `body` keys, so
`font-display`/`font-body` utility classes collide — confirmed via
compiled CSS that `.font-body` only ever emits the family declaration.
Nobody had used any of `theme.css`'s type-scale tokens before this
session (verified via grep), so this was untested territory until now.
This session's own code sidesteps it (built-in `font-bold`/`font-medium`/
`font-normal` for weight, the unaffected `text-{name}` tokens for size) —
headings render in the inherited Geist face, not General Sans, until a
future session resolves the collision properly in `theme.css`.

**Verification:** clean `type-check` (`@loop/ui` and `admin`), clean
`pnpm --filter admin run lint` (0 errors, 28 pre-existing warnings, none
new), clean `pnpm --filter admin run build` (exit 0, 105s, all 13 routes
including all 8 rebuilt pages). Compiled-CSS grep (LESSONS.md #13's
method) confirmed every new token/class present and correct, plus a
regression check that lesson #13's own `max-w-*` fix is still holding.
**Left open:** a real logged-in screenshot, light and dark — no
browser/dev-server tool access at all this session (worse off than
session 8, which at least attempted one). Also found: session 8's own
changes (`Glass`/`LiveDot`, `theme.css`/`DESIGN.web.md` edits) were still
uncommitted when this session started (`git status` showed them modified/
untracked) — folded into this session's commit as a hard prerequisite,
flagged as a likely gap in session 8's own closeout rather than corrected
silently. Nothing deployed or pushed this session — the standing
"visual sign-off before deploy" rule (sessions 08-11) still applies,
unresolved by this session, and gates whichever of 10/11 ships first.

---

## 2026-08-13 — Web session 08: space-tint addendum + real Glass/LiveDot components

Full detail: `sessions/web-08-space-tint-output.md`. Summary:

Formalized the panel-ownership tint pattern discovered live during the
2026-08-11 chat build (community/leadership tints shipped that day as
one-off CSS) into a real `DESIGN.web.md` section, picked the admin colour
(`#2dd4bf`, confirmed via a real 3-candidate Glass-panel artifact mockup,
not a prose swatch — user picked the brief's own proposal), and built the
first two real cross-app components in `packages/ui/src/components/`:
`Glass` (`space="community"|"leadership"|"admin"`) and `LiveDot`.
Retrofitted console's community chat (`DualChatPanel` + `ChatMobileLayout`
via the shared `ThreadPanel`) onto both, deleting the dead ad hoc CSS
(`.live-dot`, `.leadership-glow`, `.community-shade`) from `apps/console/
src/app/globals.css` after confirming nothing else referenced it. The
`live-pulse` keyframes moved into `packages/ui/theme.css` since `LiveDot`
is a shared component now, not console-only.

**Verification:** clean `type-check` (both `@loop/ui` and `console`),
clean `pnpm --filter console run build` (exit 0, chat route compiles, 0
lint errors), and a compiled-production-CSS grep confirming every touched
token/utility survived Tailwind's purge (the repo's own proven method for
this exact failure class — LESSONS.md #13). **Left open:** a real
logged-in screenshot of the retrofitted page — the console dev server
wouldn't start under this session's tool-permission classifier, unrelated
to the code. Real seeded credentials for next time:
`diana@looptest.dev` / `LoopTest2026!` (`scripts/seed-users.mjs`,
`quorum` role). Nothing deployed this session — the "visual sign-off
before deploy" standing rule (sessions 08-11) still gates whichever of
09/10/11 ships first, and the screenshot gap should close before that.
Also flagged, not touched: `chat-panel.tsx`'s `ChatPanel` export is dead
code (confirmed via grep, nothing imports it), spun off as a separate
background task rather than folded into this session's diff.

---

## 2026-08-10 — Web redesign: post-deploy revert (portal dark, logo everywhere)

**Trigger:** real user checked the live deploy right after session 7 shipped
and reported gov.loopcmbntr.live "totally broken", and that the logo change
was never authorized.

**Diagnosis (checked, not assumed):** curled the live homepage and counted
class usage — `bg-neutral-950`/`text-neutral-100`/`text-neutral-50` (dark-
theme hardcoded classes) still appeared 20-90+ times each across the hero
and content sections, while the `<body>`'s own `bg-background`/
`text-foreground` had flipped to portal's *light* theme.css values. Session
7 only touched shell/nav/footer per its own "zero feature-level redesign"
scope — it never retouched page.tsx's actual hero/section content, which
was written entirely against the old hardcoded-dark assumption. Flipping
the shell to light while 90%+ of the page content stayed dark-only
produced a genuine contrast/readability failure (near-white text on a
near-white background in places), not a subjective color complaint.

**Broader finding:** `DESIGN.web.md`'s "portal = fixed light" decision
(session 2, reaffirmed sessions 3/6/7) was never actually shown to or
approved by the real user before being implemented and shipped — it was
carried forward purely as an internal design-doc decision across multiple
sessions. Same gap for the brand/logo swap (session 6 wrote the wiring
checklist, session 7 executed it, neither got a pre-ship look from the
person who has to live with it).

**Fix, scoped to exactly what was reported:**
- `apps/portal`: `git checkout` to the pre-session-7 commit (`b3ae289`)
  for every file session 7 touched (`globals.css`, `layout.tsx`,
  `nav-links.tsx`, `portal-nav.tsx`, `page.tsx`, `receipt-email.ts`,
  `next.config.ts`, `package.json`), old `logo.png`/`logo-full.png`
  restored, new brand asset files removed, `pnpm-lock.yaml` resynced.
  Portal now has zero `@loop/ui` usage again, same as before session 7.
- `apps/console`, `apps/admin`: **logo/branding only** reverted — old
  `logo.png`/`logo-full.png` + favicons restored, both login pages fully
  reverted, sidebar headers restored to the original `logo.png` +
  "Loop_cmbntr" text (admin: the Shield icon badge), `openGraph`/
  `metadataBase` additions removed. **Deliberately kept:** the Signal
  Pulse dark theme/tokens and the new sun/moon theme toggle on both apps
  — the user's report only named portal as broken and only objected to
  the logo, not console/admin's color system.

**Verified before pushing:** all 3 apps type-check clean and production-
build clean post-revert. Confirmed locally (dev servers) that portal is
back to hardcoded dark and console/admin show the old logo with the
toggle still functional, before committing.

**Deployed and confirmed live:** all 3 Vercel projects redeployed
(`loop-governance`, `loop-console`, `loop-admin`), all `● Ready`. Curled
all 3 production domains post-deploy: portal shows `bg-neutral-950`
(dark) with zero `wordmark-*` references, console/admin both serve
`logo.png` with zero `wordmark-*` references. Commit `68722ac`.

**Left open:** `packages/ui/assets/brand/` and `theme.css`'s portal
light-mode section are untouched (still exist as options) — just not
live anywhere and not going live again without an explicit look-and-
approve step from the actual user first. This applies to any future
continuation of the web redesign, not just this incident.

---

## 2026-08-10 — Web redesign session 7 (scaffold)

**Done:**
- `packages/ui` stood up for real: `package.json` (mirrors `@loop/db`'s
  `exports` pattern), `tsconfig.json`, `README.md`, `src/lib/utils.ts`
  (`cn()`), `src/hooks/use-mobile.ts`, `src/components/ui/*` (all 19
  shadcn primitives, consolidated from `apps/console`'s copies — verified
  byte-identical to admin's 14-item subset by diff before merging, so
  nothing was silently dropped), and new `src/theme/` (`fonts.ts` — all 3
  self-hosted font loaders in one place; `theme-init-script.tsx` — flash-
  of-wrong-theme prevention via `next/script` `beforeInteractive`;
  `theme-toggle.tsx` — the sun/moon control, console/admin only).
- All three apps wired to `@loop/ui`: `theme.css` imported into each app's
  `globals.css` (relative path, plus a `@source` directive — verified this
  actually matters by grepping each app's real production build output,
  not just trusting dev mode), `transpilePackages: ["@loop/ui"]` added to
  all 3 `next.config.ts` (admin had *no* `transpilePackages` at all before
  this, eng-plan T4.7), `data-app`/`data-theme` set on all 3 root layouts.
- **Scoping call:** did not rewrite the 58 existing `@/components/ui/*`
  import sites in console+admin (that's eng-plan T3.5, deliberately left
  as its own task). Instead turned each local `components/ui/*.tsx` file
  into a one-line re-export shim pointing at `@loop/ui`, so the package is
  the real source of truth with zero call-site churn. Also deleted the now
  fully-dead local `lib/utils.ts` and `hooks/use-mobile.ts` copies in both
  apps once confirmed (via grep) nothing referenced them anymore.
- Brand wiring checklist from `packages/ui/assets/brand/README.md`
  executed in full — all 8+ call sites (both login pages, both sidebar
  headers, portal nav/homepage/footer, the Stripe receipt email,
  `openGraph` blocks on all 3 layouts) repointed at the new wordmark/icon/
  OG assets; old crimson `logo.png`/`logo-full.png` deleted from all 3
  apps' `public/` after confirming zero remaining references.
- `community-map.tsx`'s `LEVEL_COLORS` fixed per `web-brand-output.md`
  §5 — 7 unrelated saturated hues replaced with a single-hue intensity
  ramp along the brand accent gradient (computed in JS from the same hex
  values as `theme.css`, since Leaflet can't read a CSS custom property).
  `LEVEL_RADIUS` untouched. Polylines flattened to `--color-text-secondary`
  dashed. Selected node now gets an accent-glow ring instead of a fill
  change.
- Added `metadataBase` to console/portal's layout metadata (surfaced by a
  Next.js dev warning once `openGraph.images` was added — admin left
  unset since it has no public URL per this file's own "Deployed state"
  table).

**Bug found and fixed — would have broken every app's CSS build:** a
`/* ... apps/*/src/lib/power-tree.ts ... */`-style comment (in both
`theme.css`, pre-existing from session 6, and this session's own
`community-map.tsx` addition) contains a literal `*/` inside `apps/*/src`
— which closes a CSS/JS block comment early. Portal's dev server hit this
live (every route 500'd with a `CssSyntaxError`) before it was caught.
Fixed by rewording both comments. Added to `LESSONS.md`.

**Verification:** all 3 apps type-check clean, lint clean (0 new errors —
same pre-existing warning set as before this session), and all 3 apps'
**production builds** pass (`pnpm build`, not just `pnpm dev`) — including
portal's `/buy`, `/buy/success`, and both Stripe API routes, confirmed
still compiling untouched. Verified `@source` is actually working by
grepping each app's real emitted `.next/static/css/*.css` for a class
that only exists inside `packages/ui` source (e.g. `.bg-sidebar`) —
present in all 3 apps' prod CSS, not just dev.

**Deliberately not run:** `/design-review`. It requires a clean git tree
(this repo's wasn't — a concurrent audit-readiness session had its own
unrelated uncommitted work in flight) and runs its own autonomous,
multi-commit fix loop that can rewrite spacing/typography past what it
judges as "AI slop" — a real risk of violating this session's own "zero
feature-level redesign" scope and the badge/power-tree no-touch rule with
commits made faster than they could be reviewed. Did a manual pass against
`DESIGN.web.md`'s own rules instead (tier-colour/accent-gradient
separation held, no AI-slop patterns introduced, all new chrome uses the
same token set). Recommend running it properly in its own session once
this one's commit lands on a clean tree.

**Left open (unchanged from before this session, still tracked):**
- Power-tree consolidation into `packages/ui/power-tree` (eng-plan T1) —
  explicitly out of scope per this session's own brief.
- `apps/mobile` has zero `@loop/ui` dependency (eng-plan T4.6).
- DB-backed cross-app theme sync (eng-plan T8) — this session's toggle is
  localStorage-only; console and admin won't share a light-mode choice
  across origins yet, same gap the eng-plan flagged as a "same-day bug"
  once both apps have a real toggle (they now do).
- The 143-site `@/components/ui/*` import rewrite (eng-plan T3.5).
- `/plan-ceo-review` — 4th session in a row (4, 5, 6, 7) flagging this
  redesign still isn't on `NEXT.md`'s own priority list with no stated
  success metric, cost, or kill criteria.

**Note on concurrent work:** this session ran alongside an active,
separate "audit readiness / identity verification" session in the same
working directory (new DB migrations, `governance-settings.ts`, claim
flow, Stripe webhook changes, `docs/bmm/*` updates — none of it touched
here). Only files this session actually changed were staged for commit;
the other session's in-flight work was left as-is for it to commit
separately.

---

## 2026-08-10 — Web redesign session 6 (brand)

**Done:**
- Formally recorded the mobile/web brand relationship decision (deliberate
  partial divergence — already implicit since session 2, now explicit) and
  a second decision the brief surfaced: `/brand-loop`'s marketing identity
  (crimson/Roboto) is adopted for naming/dark-mode conventions only, not
  colour — Signal Pulse stays the locked product system.
- Produced `packages/ui/theme.css` — the real Tailwind v4 `@theme` source
  T4.5's rebind spike will point at, structured around a
  `data-app`/`data-theme` attribute contract so one file serves console
  (dark default + light toggle), admin (same), and portal (fixed light,
  own separate light token set).
- Sourced and license-verified real font files (General Sans, Geist,
  JetBrains Mono) at the exact weights `DESIGN.web.md`'s type scale uses —
  vendored at `packages/ui/fonts/` with each family's actual license text.
- Produced `packages/ui/assets/brand/`: favicon set, 4 wordmark SVG
  lockups, 3 static OG images (1200×630) — generated via a persisted
  script (`scripts/generate-brand-assets.py`), sourced from the existing
  Loop Cmbntr infinity glyph (already blue-violet, reused not redrawn).
- Wrote precise component-level brand specs (stat tiles, chart colour
  application, map, badge cards, chat) — `sessions/web-brand-output.md` §5.

**Corrections made to prior sessions' output:**
- `web-eng-plan-output.md` decision 11's claim that font files were
  "already sourced during session 3 and reusable" checked and found false
  in practice — unreachable from this session (likely inside an external
  Claude Artifact from session 3's review, not the repo). Re-sourced fresh;
  documented in `packages/ui/fonts/README.md` so it isn't hunted for again.
- `DESIGN.web.md`'s Display type spec (weight 800) doesn't exist in
  General Sans's actual released family (max weight is 700, verified via
  the font's own `fvar` axis) — corrected in `DESIGN.web.md` directly plus
  a Decisions Log entry.
- The brief assumed badge pages had no OG image — checked source
  (`apps/portal/src/app/badge/[userId]/[subject]/og/route.tsx`), found a
  real working dynamic one already. Nothing to fix.

**Left open for session 7:**
- Wiring checklist (8+ call sites still pointing at the old crimson
  `logo.png`/favicon set) — `packages/ui/assets/brand/README.md`.
- `apps/console/src/app/(dashboard)/map/community-map.tsx`'s
  `LEVEL_COLORS` uses 7 unrelated saturated hues, violating the already-
  locked "no second saturated hue" data-viz rule — exact single-hue
  replacement spec in `sessions/web-brand-output.md` §5, not applied yet
  (this session didn't touch app code, per the session-6/session-7 split).

Output: `sessions/web-brand-output.md`.

---

## 2026-08-10 — Web redesign sessions 3-5 (frontend design, eng plan, devex review) + repo hygiene

**Done:**
- **Session 3 (frontend design):** Signal Pulse applied to 9 canonical patterns
  across all 44 pages (23→24 console page-count correction). Delivered as an
  interactive HTML artifact, not static mockups. Console/admin light mode
  added as new mid-session scope (contrast-safe tier-colour text variants).
  Output: `sessions/web-frontend-design-output.md`.
- **Session 4 (eng plan):** 11 decisions in `sessions/web-eng-plan-output.md` —
  Tailwind v4 `@theme` via **rebind** (not parallel token set), Recharts,
  Leaflet reskin (not MapLibre), migration order **Admin → Console → Portal**,
  self-hosted fonts, localStorage+DB theme sync. Outside-voice review caught
  a real bug: the original plan would have moved live Supabase query code
  (`fetchPowerTree()`) into `packages/ui`, violating its own constraint —
  corrected. Fixed unrelated live bug: `loop-console`'s Vercel dashboard had
  a Build Command override silently diverging from its own committed
  `vercel.json`; toggled off (not yet confirmed via a real deploy). Deleted
  a dead repo-root `vercel.json`.
- **Session 5 (devex review):** `sessions/web-devex-checklist.md`. Full
  external-product DX ceremony run at product-owner request despite
  packages/ui having one real consumer today. Outside voice disproved two
  of the review's own findings (an ESLint rule guarding a crash that
  `generateTreeSVG` — verified DOM-free — cannot cause; a CI pipeline that
  would exit 0 on the exact failure it existed to catch) — both dropped.
  Found and fixed a contradiction between sessions 4 and 5: the eng-plan's
  T4.5 wrote tokens into `apps/admin/globals.css` directly, which would have
  silently broken the devex plan's "edit `packages/ui/theme.css`, 3 apps
  hot-reload" centerpiece — corrected so `theme.css` is the real source of
  truth. Added 2 new eng-plan tasks (T4.6 mobile `@loop/ui` dep, T4.7 admin
  `transpilePackages`).
- **Repo hygiene (found via the session-5 outside-voice pass, fixed
  immediately, unrelated to DX):** `CLAUDE.md`, `DESIGN.web.md`, and the
  entire `docs/` directory were untracked in git — confirmed via `git
  status`. Fixed stale info in `CLAUDE.md` while there: dev ports were
  documented as 3000/3001/3002 (actual: 3200/3100/3300), Expo SDK as "51+"
  (actual: 54), and `packages/chain`/`email`/`geo`/`governance` listed as
  real shared packages when they're empty directories. Added a `## Rollback`
  section (Vercel's built-in per-app rollback, no custom tooling). Committed
  everything: the continuity docs, the security migrations (051-054) and
  their session outputs, all `web-*` session files, and pre-existing
  modified files (console server actions, mobile components, contracts).

**Decisions:** See each session's own file for full reasoning — this entry
is a pointer, not a duplicate. Both outside-voice passes this session
verified their claims against source (grep, file reads, `git status`) rather
than arguing from priors; every checked claim held up.

**Left open:**
- Console's Vercel Build Command fix unconfirmed via an actual deployment —
  check build logs on the next real push to console.
- `/plan-ceo-review` not run — flagged twice now (sessions 4 and 5) that
  this redesign is absent from this file's own priority list below, no
  success metric/cost/kill criteria stated.
- Session 6 (`web-06-brand.md`) not started.
- Rebind spike (T4.5) not yet executed — still a plan, no code written for
  `packages/ui` yet.

---

## 2026-08-09 — Continuity infrastructure setup

**Done:**
- Created `docs/continuity/` folder with SOUL.md, NEXT.md, WORKLOG.md, LESSONS.md
- Created `CLAUDE.md` at repo root (auto-loaded by Claude Code at session start)
- Synthesised current platform state from session files, ARCHITECTURE.md, and source inspection

**Decisions:** Continuity docs follow the Ian/OpenClaw pattern (SOUL + NEXT + WORKLOG + LESSONS). Sessions prompts remain in `sessions/` (self-contained briefs per work arc). WORKLOG captures cross-arc history.

**Left open:** All items in NEXT.md.

---

## 2026-07-28 — Health check + quality baseline (sessions/health-check.md)

**Done:**
- Set up ESLint (flat config) in all apps: portal, console, admin, mobile
- `pnpm type-check` now passes clean across all apps
- `pnpm lint` now passes with targeted inline suppressions where intentional patterns fire
- Set up Turborepo-level `type-check` and `lint` tasks

**Deferred to bugfix-backlog.md:**
- 68 unchecked `process.env.X!` accesses (portal 45, console 13, admin 10)
- Admin test failures (FK violations from missing fixtures)
- `useSyncExternalStore` refactor for `use-mobile.ts` (suppressed inline)
- Mobile `react-hooks/set-state-in-effect` and `immutability` downgraded to warn (not per-line)

**Decision:** No logic changes in this session — quality only. Any logic issues found were filed to `sessions/bugfix-backlog.md`, not fixed inline.

---

## 2026-07-28 — Mobile sessions 01-09 (sessions/mobile-*.md)

**Done (approximate — verify in session files for detail):**
- Design consultation and brand alignment for mobile (sessions 01-02)
- Engineering plan (session 03)
- DevEx review (session 04)
- Scaffold: Expo/React Native setup integrated into Turborepo (session 06)
- Community chat with realtime via Supabase Realtime (session 07)
- Power score tab: PowerCard, PowerBar (session 08)
- User linking and seed data fixes (session 09)

**Key decisions:**
- Mobile mirrors console's core loop (power, chat, delegate/accredit) — not the full feature set
- PowerCard, UserBottomSheet, PowerBar all correctly query `accreditation_scores` with `community_id IS NULL` (migration 035 pattern) — verified correct as of health-check session

---

## ~2026-07-25 — Power Tree implementation

**Done:**
- `apps/portal/src/lib/power-tree.ts` — `fetchPowerTree()` walks delegations 3 levels, left-joins `accreditation_scores` (community_id IS NULL), returns `tail_count`
- Power Tree wired into `apps/portal/src/app/badge/[userId]/[subject]/page.tsx`
- OG image (`og/route.tsx`) updated to embed Power Tree SVG via Satori
- Console badge page updated

**Left open:** NEXT-SESSION-scaling-power-scores.md documents the live-compute scaling problem. Tree snapshot (`tree_snapshot` JSONB on `user_power_scores`) is Problem 4 of that session.

---

## ~2026-07-28 — Scale sessions 01-05

Brief summaries — see `sessions/scale-0N.md` for full detail:
- `scale-01`: DB indexes added for delegation, accreditation, vote, and proposal hot paths
- `scale-02`: Vote + proposal counts materialised (triggers to keep counts in sync vs live aggregates)
- `scale-03`: OG image route cached + rate limited
- `scale-04`: Connection pooling via Supabase Transaction pooler (`?pgbouncer=true`)
- `scale-05`: Realtime channel audit (unbounded subscription patterns fixed)

---

## ~2026-06 to 2026-07 — Security sessions 01-04

Brief summaries — see `sessions/security-0N.md` for full detail:
- `security-01`: Quick wins (env var hardening, missing RLS policies, public bucket audit)
- `security-02`: Permissive RLS policies tightened
- `security-03`: Treasury function audit (service-role usage, function ownership)
- `security-04`: Voting function audit (ballot uniqueness, vote weight validation)
