# Web session 11 output: portal rollout (Signal Pulse) — 2026-08-13

Brief: `sessions/web-11-portal-rollout.md`. All 10 in-scope pages done,
foundation re-applied, real sign-off obtained on the direction before the
full rollout proceeded — the brief's own hard requirement, given the prior
incident.

## 0. The direction decision — resolved before any page was touched

The brief's own framing was correct to worry: grepping the actual codebase
found **222 hardcoded dark-only colour instances across every portal
file** (not "90+" as the brief estimated) — the real scope was closer to a
full re-style than a touch-up either direction. More importantly,
`docs/continuity/NEXT.md`'s "Post-deploy correction" entry says the
**light-mode decision itself**, not just its execution, was never shown to
the real user before session 7 shipped it and broke gov.loopcmbntr.live.

Per this session's own "Show, don't describe visuals" standing practice, a
real side-by-side artifact was built using actual home-page copy under
both a light treatment (DESIGN.web.md's existing spec) and a dark
treatment (console/admin's actual dark tokens applied to portal), shown to
Samuel before any page-level work started. **Dark won** — portal keeps
its existing dark identity, formalised through real components instead of
raw hex.

## 1. Design system updated to match, before the rollout

- `DESIGN.web.md`: "Portal — light mode" section rewritten to "Portal —
  dark mode (reversed 2026-08-13, was light)", the superseded decision
  kept for history rather than deleted, a new Decisions Log entry added.
  The console/admin light-mode section's cross-reference to "portal's
  separate marketing context" corrected too (it no longer means "light").
- `packages/ui/theme.css` §9: `[data-app="portal"]` block rewritten from
  the light token set (`#faf9f6` background, etc.) to console/admin's
  actual dark values (`#0a0a0a` background, `rgba(255,255,255,.045)`
  surface, etc.). `--blur-glass: 8px` (vs console/admin's `14px`)
  deliberately left unchanged — that's portal's marketing-spacious
  *density* choice, independent of the light/dark axis, and still holds.
  Portal keeps its own `[data-app="portal"]` block rather than being
  merged into §6 — a future session that wants to diverge portal's colour
  from console/admin's dark identity again has a real place to do it.

## 2. Foundation wiring (deliverable 0)

- `apps/portal/package.json`: added `@loop/ui: workspace:*` (portal had
  zero `@loop/ui` usage before this session — confirmed).
- `apps/portal/src/app/globals.css`: was a single `@import "tailwindcss"`
  line; now imports `theme.css`, the `@source` line for Tailwind v4's
  workspace-package scanning (same fix session 7 needed, see
  `sessions/web-eng-plan-output.md` task T3.6), and the shared
  `@layer base` rebind block. Deliberately **not** importing
  `shadcn/tailwind.css` — portal has never used any shadcn UI primitive
  (no `components/ui/` directory existed at all before this session) and
  none of the new components need it.
- `apps/portal/src/app/layout.tsx`: `<html data-app="portal">` — no
  `data-theme`, portal has no toggle (fixed, matches the reversed
  decision). No `ThemeInitScript` either — that's console/admin-only
  flash-of-wrong-theme prevention for a toggle portal doesn't have.

## 3. New shared components — `packages/ui/src/components/`

All four from the session 3 inventory, built for real for the first time:

- **`portal-nav-shell.tsx`** — `PortalNavShell`. Presentational only
  (sticky/blur chrome + a logo slot); the real nav
  (`apps/portal/src/app/portal-nav.tsx`) still does its own `getUser()`
  lookup and passes `NavLinks` as children, same division as every other
  session's components. `logo` is a **required** prop, not a default —
  so this component structurally cannot reintroduce the unauthorized
  logo-swap mistake from session 7's revert. The real `/logo.png` +
  "Loop_cmbntr" wordmark (including its red "cmbntr" accent, an existing
  brand-identity colour, not a semantic one) is unchanged.
- **`stat-strip.tsx`** — `StatStrip`. Formalises the home page's live
  stats bar (participants/communities/proposals/subjects).
- **`badge-hero.tsx`** — `BadgeHero`. Wraps chrome around the **unmodified**
  power-tree SVG (`generateTreeSVG()`, `apps/portal/src/lib/power-tree.ts`
  — hard constraint since session 2, not touched). Takes the
  already-generated SVG markup as a string; does not regenerate or
  reinterpret it. Used on both `badge/[userId]/[subject]` and
  `badge/demo/[tier]/[subject]`.
- **`conversion-card.tsx`** — `ConversionCard`. Deliberately **not**
  `Glass` — uses `bg-popover` (opaque, `#141414`) with no
  `backdrop-filter`, per the brief's explicit warning not to sacrifice
  checkout/form clarity for the frosted look. Used on `buy`, `create`,
  `join/[slug]` (checkout/enrollment forms) — `buy/success` didn't need
  it (no form, just a confirmation + CTAs).

All exported from `packages/ui/src/index.ts`.

## 4. All 10 in-scope pages rebuilt

`page.tsx` (home), `badge/[userId]/[subject]` (+`share-buttons.tsx`),
`badge/demo/[tier]/[subject]`, `buy` (+`buy-form.tsx`), `buy/success`,
`c/[slug]` (+`poster-cta.tsx`), `create` (+`create-form.tsx`),
`join/[slug]` (+`enrollment-form.tsx`), `admin` (+`admin-panel.tsx`),
`privacy`, `terms` — plus `portal-nav.tsx`, `nav-links.tsx`, `error.tsx`
(not in the brief's own list, fixed anyway once found — 2 leftover
`neutral-*` instances, trivial).

**Brand accent correction applied throughout, not just token swaps:**
every page pre-dated the design system and used `amber-500`/`amber-400`
as its ad hoc primary accent (CTAs, eyebrows, numbered steps). Per
DESIGN.web.md's actual rule ("primary CTAs are gradient-coloured, not
[status]-coloured," amber reserved for warning/Gold-tier only), every
non-semantic amber use was moved to the real brand gradient
(`var(--accent-gradient)`) or `text-primary`. Genuine semantic colour
uses were preserved and correctly re-mapped: `success` for the "Now live
on Base L2" badge and completed-purchase states, `warning` for the
utility-token legal notice and the demo-badge banner, `error` for form
errors. Per-subject dynamic colours (`s.accent`/`subject.accent`, used on
the home page's subject cards and the entire `join/[slug]` flow) are
**untouched** — that's real, deliberate per-subject content theming, not
a hardcoded-dark-mode bug, same category as console session 10's treasury
chart data.

**`admin/admin-panel.tsx` gets `space="admin"`** — the one page the brief
flagged to verify rather than assume from its route name. Confirmed via
its actual code: `isAdmin` is checked client-side against
`platform_role === "platform_admin"` before any of the stats/Activate-AI/
info content renders — a real, already-coded restriction, not just a
route name. The "you must be a platform admin" gate message (shown to
everyone) stays untinted; only the content that renders after the check
passes gets `space="admin"`.

**Checkout/enrollment logic untouched, verified not just assumed:** for
`buy-form.tsx`, `create-form.tsx`, and `enrollment-form.tsx` — the three
files with real state machines and server actions — every diff was
grepped for non-styling lines (`const`/`function`/`useState`/
`useActionState`/`await`/`fetch`/handler bodies) after editing; only
`className`/`style` lines and the new component imports appear in each
diff. No business logic, state, handler, or server-action call was
touched.

## 5. Responsive check (375px minimum)

Manually re-read every in-scope page's layout classes for hard-coded
desktop-only assumptions (fixed multi-column grids without a `sm:`/base
single-column fallback, fixed pixel widths wider than 375px). All grids
already used mobile-first responsive classes before this session
(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`-style patterns throughout)
and were not restructured — only recoloured — so the existing responsive
behaviour carries forward unchanged. `BadgeHero`'s `max-w-lg` container
with `w-full` holds at 375px (this is the same layout the original badge
page already used, just wrapped in the new component). Not verified via
an actual 375px browser screenshot this session — see "Left open."

## 6. Verification

- `pnpm --filter @loop/ui run type-check` — clean.
- `pnpm --filter portal run type-check` — clean.
- `pnpm --filter portal run lint` — **0 errors**, 50 warnings, all
  pre-existing patterns (`@typescript-eslint/no-explicit-any` on casts
  that predate this session — spot-checked `page.tsx`'s `supabase`
  unused-var warning against `git show HEAD:...` to confirm it was
  already unused before this session touched the file; `<img>` LCP
  warnings on pre-existing `<img>` tags this session didn't add;
  `no-html-link-for-pages` on pre-existing `<a href="/">` patterns).
- `pnpm --filter portal run build` — **clean, exit 0.** All 17 routes
  generated including every page in scope (`/`, `/admin`,
  `/badge/[userId]/[subject]` +`/og`, `/badge/demo/[tier]/[subject]`
  +`/og`, `/buy`, `/buy/success`, `/c/[slug]`, `/create`, `/join/[slug]`,
  `/privacy`, `/terms`).
- **Compiled-CSS check** (repo's own proven method, LESSONS.md #13/#15):
  grepped `apps/portal/.next/static/css/23b0c6d256e56b14.css`:
  - `--background:#0a0a0a` present (portal correctly dark) — and the old
    light value `#faf9f6` **confirmed absent**, zero occurrences anywhere
    in the compiled output (not just overridden, actually gone).
  - `--admin-tint:#2dd4bf` and `--accent-start:#4f6bff`/
    `--accent-end:#8b5cf6` present (admin page's `space="admin"`, every
    page's brand-gradient CTAs).
  - **Regression check against LESSONS.md #13** (`max-w-*` collision):
    `.max-w-md{max-width:var(--container-md)}`, `.max-w-lg{...}`,
    `.max-w-2xl{...}` all still resolve to Tailwind's real
    `--container-*` scale.
  - **Regression check against LESSONS.md #14** (session 09's
    `font-display`/`font-body` collision, documented not fixed): this
    session's new code never uses the custom `font-{name}` weight
    utilities (same avoidance session 09 and 10 used) — confirmed
    `.font-body{font-family:var(--font-geist),...}` still resolves to the
    family declaration alone, matching the documented, still-open
    collision exactly, not a new or worse failure mode.
- **Dev server**: started (`pnpm --filter portal run dev`, port 3100),
  confirmed responding (`curl localhost:3100/` → 200). Left running for
  Samuel to review directly, same standing practice as sessions 09/10 (no
  agent-captured screenshot).

## Left open

- No 375px screenshot verification — reasoned about the existing
  responsive classes (see §5) rather than rendered and measured. Worth a
  real mobile-width look before or shortly after sign-off, given this is
  explicitly "the one app that must work on mobile web."
- `communities`/`communities/[id]` equivalent portal pages don't exist
  (portal has no such route) — not a gap, just noting the scope
  comparison to console session 10 doesn't apply here.
- The per-category amber→gradient/primary re-mapping (like session 09's
  StatusChip simplification) is a real, visible change on every page —
  worth a look once seen live, same standing note as sessions 09/10.
- Session 09's `font-display`/`font-body` collision (LESSONS.md #14)
  remains unfixed — this session, like 09 and 10 before it, worked around
  it rather than fixing `theme.css` itself.
- Not deployed. Not pushed. Per the standing rule (`web-08-space-tint-
  addendum.md`'s closing note, restated in every session 08-11 brief, and
  this session's own extra caution given the prior incident): explicit
  visual sign-off from Samuel, actually looking at the running dev
  server, is required before this ships to production. This is the last
  session in the 08-11 chain — once this ships, the full Signal Pulse
  rollout is complete across all three Next.js apps.
