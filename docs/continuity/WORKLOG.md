# Loop Governance — WORKLOG

> Reverse-chronological session history. Append new sessions at the top.
> Each entry: date, what was done, decisions made, what was left open.

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
