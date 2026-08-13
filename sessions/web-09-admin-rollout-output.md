# Web session 09 output: admin rollout (Signal Pulse) — 2026-08-13

Brief: `sessions/web-09-admin-rollout.md`. All 6 deliverables done for all 8
real admin pages.

## 0. Scope discrepancy vs the brief

The brief's title says "all 7 real admin pages" but its own file listing
enumerates 8 paths:

```
audit/page.tsx, communities/page.tsx, governance/page.tsx, members/page.tsx,
moderation/page.tsx, page.tsx (dashboard home), settings/page.tsx,
treasury/page.tsx
```

Verified against the real filesystem
(`find apps/admin/src/app/(dashboard) -name page.tsx`) — there are 8, matching
the brief's own list, not its "7" headline count. `DESIGN.web.md`'s IA
section independently confirms "9 admin pages" (which includes `/login`,
outside the dashboard shell). All 8 dashboard pages were rebuilt this
session; `/login` was left untouched (outside `(dashboard)`, not in the
brief's own file list, no Glass/table/status content to migrate).

## 1. New shared components — `packages/ui/src/components/`

- **`data-table.tsx`** — `DataTable` + `DataTableHeader`/`DataTableBody`/
  `DataTableRow`/`DataTableHead`/`DataTableCell`/`DataTableEmpty`. A denser
  presentational wrapper around plain `<table>` markup (px-3/py-2, `text-
  caption` headers), wrapped in `<Glass space="admin">` instead of a plain
  bordered div. Deliberately **not** a data-fetching/sorting abstraction —
  every admin page already has its own real filter/search/expand-row logic
  wired to server actions, so pages keep that logic and just swap raw
  `<table>`/`<tr>`/`<td>` tags for the matching `DataTable*` piece.
- **`status-chip.tsx`** — `StatusChip`, 4 variants only: `success` /
  `warning` / `error` / `neutral`, matching the semantic palette
  `DESIGN.web.md` actually defines a hue for. See §3 below for why this is
  narrower than what several pre-existing admin tables did.

Both exported from `packages/ui/src/index.ts`.

## 2. Pages rebuilt on `Glass space="admin"`

All 8 dashboard pages plus every "ad hoc `rounded-lg border border-border
bg-card` panel" pattern used by them, replaced with `<Glass space="admin">`:
stat tiles (dashboard home, members role-count tiles, treasury totals),
the "Quick Actions" panel, the shared `PageDescription` component (used by
all 8 pages — one edit, once, covers every page's info banner), moderation's
flag cards, settings' Branding/Loyalty Tokens panels and empty state, the
members "Edit Role" modal panel, governance's "choose a scope" empty state,
and the Impact Treasury card on the treasury page.

Type scale actually consumed for the first time in this redesign
(`text-h1`/`text-h2`/`text-body`/`text-caption`/`text-data-lg`/
`text-data-sm` from `theme.css` §2) — see §4 for a real bug this surfaced.
Stat-tile numerals use `font-mono` (JetBrains Mono, already safe/rebound)
+ `text-data-lg` + explicit `font-bold`, matching DESIGN.web.md's "Data-lg"
row for stat tile values.

Files touched: `apps/admin/src/app/(dashboard)/page.tsx`,
`.../audit/page.tsx`, `.../audit/audit-table.tsx`, `.../communities/
page.tsx`, `.../governance/page.tsx`, `.../governance/governance-editor.tsx`,
`.../members/page.tsx`, `.../members/members-table.tsx`, `.../moderation/
page.tsx`, `.../moderation/flag-queue.tsx`, `.../settings/page.tsx`,
`.../settings/settings-form.tsx`, `.../treasury/page.tsx`, `.../treasury/
impact-treasury-card.tsx`, `apps/admin/src/components/page-description.tsx`.

**Explicitly left untouched, out of scope per the brief:** `apps/admin/src/
app/(dashboard)/layout.tsx`, `app-sidebar.tsx`, `apps/admin/src/app/login/
page.tsx`, `apps/admin/src/app/error.tsx` — none are in the brief's own
8-path list, and the sidebar/layout weren't flagged as needing Glass
treatment (they already use theme-token classes, e.g. `bg-background`/
`text-destructive`, that are correctly light/dark-aware). `apps/*/src/lib/
power-tree.ts` not touched (hard constraint, and admin doesn't render it
anyway).

## 3. `DataTable` + `StatusChip` used on the table-heavy pages

`audit`, `moderation`, `communities`, `members`, `treasury` (the brief's own
"likely" list, all 5 confirmed to actually have tables) plus `governance`'s
settings-cascade table (not in the brief's explicit list but structurally
identical — a table, in scope per "every primary content panel").

**A real design decision, not a mechanical swap:** several admin tables
pre-dated this session with ad hoc *categorical* hues that don't map to
severity (blue for "moderation" events, purple for "settings" events, a
second blue for "org_manager" role, amber for cascade-source "subject",
etc.) — not part of the locked Signal Pulse palette (brand blue-violet =
action only, tier colours = status only, "no invented second saturated
hue" — `DESIGN.web.md`). `StatusChip` is deliberately constrained to
`success`/`warning`/`error`/`neutral` only. Every existing colour-coded
badge was re-mapped onto that 4-value palette:

| Page | Field | Old (ad hoc) | New (`StatusChip` variant) |
|---|---|---|---|
| Audit | event category | role=red, treasury=amber, moderation=blue, settings=purple | role/treasury=`warning`, moderation/settings=`neutral` |
| Communities | level | global=amber, continental/national=blue, other=neutral | global=`warning`, other=`neutral` |
| Communities | visibility | public=green text, other=muted text | public=`success`, other=`neutral` |
| Governance | cascade source | community=red, subject=amber, white_label=blue, platform=neutral | community=`warning` (most specific, silently wins), others=`neutral` |
| Members | role | platform_admin=red, org_admin=amber, org_manager=blue, member=neutral | platform_admin=`error`, org_admin=`warning`, org_manager/member=`neutral` |
| Moderation | flag status | pending=amber, actioned=green, dismissed=neutral | pending=`warning`, actioned=`success`, dismissed=`neutral` (clean 1:1 fit) |
| Moderation | target type (message/proposal/user/community) | 4 distinct text hues | dropped colour entirely, plain `text-text-secondary` — identity carried by the label text alone |

Net effect: some category distinctions that used to be conveyed by hue
(4-5 colours per column in a couple of cases) now collapse to 2-3
semantic buckets, with the label text carrying the rest of the identity —
same trade-off the brief's own StatusChip description implies
("semantic colour only," not "a colour per category"). Flagged here in
detail rather than silently, since it's a real, visible behaviour change
for anyone who used colour-scanning on the audit/governance pages
before. If this reads as a real regression once seen live, the fix is
narrow (loosen `StatusChipVariant` or accept the pre-existing hues as a
documented exception) — a design call for the real user, not something to
guess at further in-session.

## 4. Real bug found: `theme.css`'s `--font-*` and `--font-weight-*` tokens collide on 3 keys

`theme.css` §1 defines font-*family* tokens `--font-display`/`--font-body`
under Tailwind v4's `--font-*` namespace (→ utilities `font-display`/
`font-body` for `font-family`). §2 separately defines font-*weight* tokens
`--font-weight-display`/`--font-weight-h1`/`--font-weight-h2`/`--font-
weight-body`/`--font-weight-caption`/`--font-weight-data-lg`/`--font-
weight-data-sm` under the `--font-weight-*` namespace (→ utilities
`font-display`/`font-h1`/`font-h2`/`font-body`/`font-caption`/`font-data-
lg`/`font-data-sm` for `font-weight`). **`display` and `body` are defined
under both namespaces**, so `font-display` and `font-body` are two
different declarations racing for the same generated Tailwind utility
class name. This is the same *category* of bug as LESSONS.md #13 (a named
`@theme` key silently colliding with a different reserved utility family)
but self-inflicted within `theme.css`'s own two sections rather than
against a Tailwind built-in — nobody had actually consumed `font-display`/
`font-h1`/`font-body`/etc. anywhere in the repo until this session (verified
by grep before starting: zero hits).

**Decision made this session to avoid it entirely rather than resolve the
collision:** none of this session's new code uses the custom `font-{name}`
weight utilities or `font-display`/`font-body` family utilities. Font
*size* comes from the safe, non-colliding `text-{name}` tokens
(`text-h1`, `text-h2`, `text-body`, `text-caption`, `text-data-lg`,
`text-data-sm`); font *weight* comes from Tailwind's own built-in
`font-bold`/`font-semibold`/`font-medium`/`font-normal` utilities, which
don't touch the contested namespace. Font *family* was left alone — body
text already inherits General Sans/Geist correctly via `<html>` class
`font-body`... **no** — via the existing `@layer base { html { @apply
font-body; } }` rule in `apps/admin/globals.css`, which predates this
session and was already resolving to *something* before this session ran
(unverified which of the two `font-body` declarations wins; out of scope
to chase further this session since nothing here depends on the answer).
Headings in this session's pages use their default inherited family
(Geist, same as body) rather than switching to General Sans — visually a
minor miss against `DESIGN.web.md`'s "Display / headings ... General
Sans" spec, but a safe, deliberate one given the collision is unresolved.

**Not fixed this session** (real fix belongs to whoever owns `theme.css`,
likely a rename — e.g. `--font-weight-h1` could become a differently-keyed
custom property read via inline `style`/arbitrary-value instead of a named
`@theme` token, or the two `display`/`body` weight keys could be dropped
since size alone already visually distinguishes those two levels per
`theme.css`'s own comment). Added to `LESSONS.md` (see below) so the next
session that wants a heading in General Sans doesn't lose time
rediscovering this.

## 5. `LiveDot` — deliberately not added anywhere in admin

Checked before doing anything (brief: "verify before adding, don't fake
liveness"): `grep -rn "realtime|channel(|postgres_changes" apps/admin/src`
returns **zero matches**. Admin has no Supabase Realtime subscriptions
anywhere — the moderation queue count, audit log, everything is a plain
server-rendered query with no live update path. Per `DESIGN.web.md`'s
Motion rule ("only ever render this for a genuinely live Realtime
subscription, never decoratively"), `LiveDot` is correctly absent from
every page this session touched. If a future session wires Realtime into
the moderation queue (e.g. so the pending-flag count updates live without
a refresh), that's the point `LiveDot` becomes real here, not before.

## 6. Light/dark mode — regression check, not new work

Admin's toggle infra (session 7: `ThemeInitScript`, `ThemeToggle`,
`data-theme` attribute contract) was not touched. Every class this session
added is theme-token-driven (`text-text-primary`/`text-text-secondary`/
`text-text-muted`, `bg-surface`, `border-surface-border`, `text-success`/
`text-warning`/`text-error`, `Glass`'s own internal tokens) — none are
hardcoded hex or a theme-blind Tailwind grey/blue/etc. Traced manually
against `theme.css` §6 (dark) and §8 (console/admin light): every token
referenced has a real light-mode value defined, none fall through to an
undefined CSS variable. `Glass space="admin"`'s tint math
(`color-mix(in srgb, var(--admin-tint) ...)`) reads `--admin-tint:
#2dd4bf`, which `theme.css` deliberately keeps identical between light and
dark (§6 comment: "Unchanged between light/dark, same as
`--accent-start`/`-end`") — confirmed this is still true, unaffected by
this session.

**Real limitation, same as session 8 and unresolved for the same reason:**
no logged-in screenshot, light or dark. Starting the admin dev server was
not attempted — per this session's own instructions ("you likely can't
start a dev server or browser either, so don't waste time trying") — and
this session has no browser tool access at all (unlike session 8, which at
least confirms it tried and got blocked by a tool-permission classifier).
Verification here is 100% static: manual token-reference tracing (above)
plus the compiled-CSS grep in §7. Seeded test credentials remain available
for whichever session finally closes this gap: `scripts/seed-users.mjs` →
`diana@looptest.dev` / `LoopTest2026!` (`quorum` role).

## 7. Verification

- `pnpm --filter @loop/ui run type-check` — clean, 0 errors.
- `pnpm --filter admin run type-check` — clean, 0 errors.
- `pnpm --filter admin run lint` — **0 errors**, 28 warnings, all
  pre-existing patterns (`@typescript-eslint/no-explicit-any` in server
  action files this session didn't touch the internals of,
  `@next/next/no-img-element` on pre-existing `<img>` tags, one pre-existing
  unused-var in `communities/page.tsx`'s `session` binding that was already
  unused before this session — confirmed by re-reading the original file
  before editing). No new warning categories introduced.
- `pnpm --filter admin run build` — **clean, exit 0.** "Compiled
  successfully in 105s." The only warnings are pre-existing and unrelated
  to this session (a `viem`/`ox` "Critical dependency: the request of a
  dependency is an expression" trace through `src/lib/loop-token.ts` →
  `treasury/page.tsx`, and two webpack cache "serializing big strings"
  notices) — both present before this session, neither touches any file
  this session edited beyond `treasury/page.tsx`'s unrelated existing
  `viem` import. ESLint-in-build output matches the standalone `lint` run
  exactly: 0 errors, same 28 warnings. All 13 routes generated, including
  all 8 rebuilt dashboard pages (`/`, `/audit`, `/communities`,
  `/governance`, `/members`, `/moderation`, `/settings`, `/treasury`).
- **Compiled-CSS check** (repo's own proven method, LESSONS.md #13):
  grepped `apps/admin/.next/static/css/*.css` for every token/class this
  session's new components touch — all present, none silently purged or
  mis-emitted:
  - `--admin-tint:#2dd4bf` — present.
  - `.rounded-pill{border-radius:999px}` — present (StatusChip's pill
    shape, first real consumer of this token — confirmed correct).
  - `.text-success{color:var(--success)}`, `.text-warning{...}`,
    `.text-error{...}` — present (StatusChip's 3 coloured variants).
  - `.text-h1{font-size:1.375rem;...}`, `.text-h2{font-size:1rem;...}`,
    `.text-body{font-size:.875rem;...}`, `.text-caption{font-size:.75rem;
    ...}`, `.text-data-lg{font-size:1.375rem;...}`, `.text-data-sm{
    font-size:.75rem;...}` — all six present with the exact sizes
    `DESIGN.web.md`'s type table specifies. **This confirms §4's finding
    directly**: `.font-body{font-family:var(--font-geist),...}` is the
    *only* declaration emitted for that class name — the family
    declaration from `--font-body` (§1) won, the weight declaration from
    `--font-weight-body` (§2) is nowhere in the compiled output.
    `.font-display` doesn't appear in the compiled CSS at all (nothing in
    this session's code requested it, matching the decision in §4 to
    avoid it). Confirms the collision is real, not hypothetical, and
    confirms this session's workaround (built-in `font-bold`/`font-
    medium`/`font-normal` for weight, never the custom `font-{name}`
    weight utilities) was the right call.
  - `.border-surface-border{border-color:var(--surface-border)}`,
    `.bg-surface`/`.bg-surface\/40`/`.bg-surface\/60` — present (DataTable/
    Glass row and header shading).
  - **Regression check against LESSONS.md #13** (the `max-w-*` collision
    session 7 hit and fixed by renaming to `--space-*`): `.max-w-xs{max-
    width:var(--container-xs)}`, `.max-w-md{max-width:var(--container-
    md)}`, `.max-w-2xl{max-width:var(--container-2xl)}` all still resolve
    to Tailwind's real `--container-*` scale, not a hijacked `--spacing-*`
    value — confirmed the session 7 fix is still holding and this
    session's use of `max-w-md`/`max-w-2xl` (settings form, members modal)
    renders at the correct width.

## Left open

- The `font-display`/`font-body` namespace collision (§4) — not fixed,
  documented, headings render in Geist not General Sans until it's
  resolved.
- A real logged-in screenshot, light and dark (§6) — no tool access this
  session, same gap session 8 left open.
- `StatusChip`'s narrower palette vs. several pages' prior ad hoc hues
  (§3) — a real, visible simplification worth a quick look once this is
  actually seen live.
- Session 8's own changes (`Glass`/`LiveDot`, `theme.css`/`DESIGN.web.md`
  edits, its own `NEXT.md`/`WORKLOG.md` updates) were still **uncommitted**
  when this session started (`git status` showed them modified/untracked,
  no matching commit in `git log`). This session's commit includes them,
  since they're a hard prerequisite this session builds on directly — but
  flagging that session 8's own closeout apparently never ran `git
  commit`, in case that was accidental rather than intentional.
- Not deployed. Not pushed. Per the standing rule (`web-08-space-tint-
  addendum.md`'s closing note, restated in every session 08-11 brief):
  explicit visual sign-off from the real user, with an actual screenshot
  or artifact, is required before this — or session 10/11 — ships to
  production.
