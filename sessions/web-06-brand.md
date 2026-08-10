# Loop Governance Web: brand application — 2026-08-09

## Run first

Read `sessions/web-design-system-output.md` (output from session 2).
Read `sessions/web-frontend-design-output.md` (output from session 3).
Then invoke `/brand-loop` with the context below.

---

## Context

The winning shotgun direction (session 1) was chosen as a fresh exploration,
explicitly *not* constrained to match mobile's shipped "Dark Civic" system
(`DESIGN.mobile.md`). Before implementation starts, this session forces an
explicit decision on how the web direction relates to the Loop brand overall
— rather than that relationship happening by accident once both are live.

### 1. Resolve the mobile/web relationship explicitly

Answer directly, in writing, in the output doc:
- Does web deliberately diverge from mobile's Dark Civic (different
  typography, different surface treatment), while still sharing the
  functional tier colour system (Diamond/Platinum/Gold/Silver/Bronze — these
  gate real features on both platforms and should almost certainly stay
  colour-identical everywhere)?
- Or did the shotgun winner end up close enough to Dark Civic that aligning
  fully is the better call?
- Either answer is fine — what's not fine is shipping both without anyone
  having decided on purpose. State the decision and the reasoning.

### 2. Brand assets

- Favicons and OG/social preview images for all three apps (portal's badge
  pages are shared externally today with no custom OG image — check current
  state and fix if missing)
- Loop wordmark/logomark treatment for console sidebar, admin sidebar,
  portal header/footer
- Any marketing asset portal needs for the public conversion pattern
  (session 3): hero imagery, social proof treatment for badge pages

### 3. Design token file

Produce the canonical token file for `packages/ui` (structure mirrors
`apps/mobile/src/theme/tokens.ts` but as Tailwind v4 `@theme` CSS custom
properties, since these are web apps): colours (base + tier + semantic +
data-viz ramp from session 2), spacing, radius, typography, motion timing.
This is the file session 7 (scaffold) wires into all three apps.

### 4. Typography licensing/loading

Confirm licensing and self-hosting terms for whatever typefaces session 2
specified (if it's not a Google Font or an open license, this needs a real
answer before session 7 ships font files into the repo).

### 5. Component-level brand specs

For the highest-visibility components identified in session 3 (dashboard
stat tiles, chart colour application, map hex styling, badge cards, chat
message treatment if carried over from mobile) — precise brand specs:
exact colour/opacity/border values, not "use the primary colour."

---

## Deliverable

- `packages/ui/tokens.css` (or equivalent Tailwind v4 `@theme` file) — the
  token file, ready to import from all three apps
- `packages/ui/assets/brand/` — SVG source files for logo, icon, OG images
- `sessions/web-brand-output.md` — the explicit mobile/web relationship
  decision, plus component specs in final form, ready to hand to session 7
