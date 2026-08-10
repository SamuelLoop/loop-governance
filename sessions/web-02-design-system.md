# Loop Governance Web: design system — 2026-08-09

## Run first

Read `sessions/web-design-shotgun-output.md` (output from session 1).
Then invoke `/design-consultation` with the context below, treating the
winning shotgun variant as the starting aesthetic direction to formalise
(not a decision to re-litigate — this session turns a direction into a
complete, implementable system).

---

## Context

Formalising the winning direction from the design shotgun into a full design
system for `packages/ui`, shared across `apps/console`, `apps/portal`, and
`apps/admin`.

**What exists today (for continuity, not constraint — see session 1's
decision that web is a fresh direction):**
- Console: Tailwind v4 `@theme inline` tokens in `apps/console/src/app/
  globals.css`, oklch colour space, `--radius` scale already parametrised
  (`sm`/`md`/`lg`/`xl`/`2xl`/`3xl`/`4xl` as multiples of a base `--radius`),
  chart tokens `--chart-1` through `--chart-5` already wired for data viz
- Admin: same token shape as console, values likely need independent review
- Portal: no tokens exist yet — this session defines them from scratch
- Tier colours are load-bearing across the whole platform (gate real
  features) and must be defined once in the shared system, not per-app

**What this session must produce, per surface density:**

1. **Typography** — full type scale (display through caption + a data/mono
   face for numbers: token amounts, power scores, timestamps — precision
   matters when real money is shown). Specify exact typefaces, weights,
   loading strategy (self-hosted via `next/font/local` vs `next/font/google`
   — three separate Next.js apps need to share font files without
   duplicating downloads).

2. **Colour** — base dark palette (and resolve the light-mode-for-portal
   question from session 1's output), tier palette integration (reuse the
   five existing tier colours as-is; they're functional, not decorative —
   confirm this explicitly), semantic states (success/warning/error/info),
   and a **data-viz ramp** for treasury/earnings/token-activity charts and
   the H3 hex map (this needs more than 5 colours if the map encodes
   community density or power distribution — check `chart-1..5` sufficiency).

3. **Spacing & layout** — base unit, density tokens for each surface
   (console/admin can be denser than portal's marketing pages), sidebar/nav
   dimensions, max content widths, breakpoints (desktop-first is fine but
   console must degrade to tablet — members do check delegation status on
   iPad-class screens).

4. **Motion** — where animation carries meaning vs decoration (mirror the
   discipline from `DESIGN.mobile.md`'s motion table: live vote count
   ticking up, treasury balance updates via Realtime, delegation confirmed,
   map hex hover/select). Explicitly design the "live data" moment — this
   platform's differentiator is real-time on-chain and community state.

5. **Radius, borders, elevation** — full component-level tokens ready to
   replace the shadcn defaults.

6. **Information architecture notes** — not a redesign of the IA (existing
   23 console pages / 9 admin pages / 11 portal pages stay as-is unless this
   session finds a clear problem), but confirm nav structure and hierarchy
   per surface: console's sidebar nav, admin's sidebar nav, portal's public
   nav — and whether all three should visually announce "same platform"
   (e.g. shared header treatment) even with different chrome.

7. **Iconography** — replace or keep `lucide-react`; if keeping, define
   which weight/style variant and any custom icons needed (tier badges,
   subject-domain icons for the ten governance domains, treasury/token
   glyphs).

Save the full design system doc to: `sessions/web-design-system-output.md`
(same format as `DESIGN.mobile.md` — this becomes `DESIGN.web.md` once
approved).
