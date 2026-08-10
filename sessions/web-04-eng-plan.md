# Loop Governance Web: engineering plan review — 2026-08-09

## Run first

Read `sessions/web-frontend-design-output.md` (output from session 3).
Then invoke `/plan-eng-review` with the context below.

---

## Context

Turning the approved design into an implementation plan across the existing
Turborepo monorepo. This is a **reskin of live, working, revenue-touching
apps** (portal handles Stripe checkout; console shows real treasury/token
data) — not a greenfield build like the mobile session. Plan for zero
functional regression while every visual surface changes underneath it.

**What must not change:** any Supabase query, RLS-scoped read path, Stripe
integration, auth flow logic, or on-chain (viem/wagmi) call. This plan is
CSS/component/token layer only. If a screen's design requires new data that
doesn't currently get fetched (e.g. a live-updating stat that's currently
static), flag it as a separate follow-up, don't fold backend changes into
this plan.

### What the plan review should cover

1. **`packages/ui` bring-up** — it's currently empty. Plan the package
   structure: base primitives (button, card, input, table, dialog, sheet,
   sidebar, tabs, etc. — the 18 components currently duplicated per-app),
   design tokens (colours, spacing, radius, motion as CSS custom properties
   or Tailwind `@theme` — Tailwind v4 native approach preferred), and how
   `apps/console`, `apps/portal`, `apps/admin` each consume it via the
   existing pnpm workspace (`@loop/ui` import, mirroring `@loop/db`).

2. **Font loading across 3 apps** — session 2 will specify typefaces; plan
   how they're loaded once and shared (self-hosted font files in
   `packages/ui/fonts` vs each app importing `next/font/google`
   independently — avoid 3x the font payload for the same typeface).

3. **Migration strategy — order of apps** — recommend an order (e.g. build
   `packages/ui` + tokens against console first since it already has the
   most token infrastructure, then admin, then portal last since portal
   currently has zero theme and is highest business risk). Each app must
   stay deployable at every step — no big-bang cutover across all three.

4. **Chart library** — console currently has no chart library wired despite
   `--chart-1..5` tokens existing. Recommend one (Recharts, Tremor, visx,
   or raw D3 — reason about bundle size, Tailwind v4 compatibility, and
   whether it can hit the `dataviz` skill's colour/form methodology from
   session 3) for treasury/earnings/token-activity.

5. **Map redesign** — current stack is `leaflet` + `react-leaflet` +
   `h3-js`. Evaluate whether the shotgun-winning "futuristic" direction is
   achievable by reskinning Leaflet tiles/overlays, or whether it needs a
   different renderer (e.g. MapLibre GL for custom vector styling, deck.gl
   for a more "control-plane" 3D/data-viz feel). Recommend with reasoning —
   this is one of the higher-risk technical calls in the whole plan.

6. **Visual regression safety net** — 43 pages across 3 apps changing
   visually at once is easy to silently break. Plan a lightweight before/
   after screenshot diff approach (even a manual checklist keyed to session
   7's scaffold + the implementation backlog is acceptable if a full visual
   regression tool is overkill for a one-developer team — recommend based
   on effort vs risk).

7. **Shared power-tree code** — confirm `apps/portal/src/lib/power-tree.ts`
   (`generateTreeSVG()`) moves into `packages/ui` as already flagged in the
   mobile eng-plan, so console, portal, admin, and mobile all consume the
   same generator instead of drifting copies.

8. **Rollout/deploy plan** — console, portal, admin each deploy separately
   on Vercel (git-integrated). Plan whether `packages/ui` changes land in
   one PR touching all three apps, or per-app PRs against a stable
   `packages/ui` — consider Turbo's dependency graph and Vercel's build
   filters (the admin `vercel.json` already exists specifically because the
   root `vercel.json` hardcodes a console build filter — read that gotcha
   before planning deploy order).

9. **Risk register** — top risks with mitigation, explicitly including:
   breaking Stripe checkout styling on portal (revenue-critical), breaking
   the login/auth screens (every session starts here), and the map
   renderer swap if recommended in point 5.

Save the approved plan to: `sessions/web-eng-plan-output.md`
