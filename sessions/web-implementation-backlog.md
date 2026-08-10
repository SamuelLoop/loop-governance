# Loop Governance Web: implementation backlog — 2026-08-09

> Run `web-01` through `web-07` first (design shotgun → design system →
> frontend design → eng plan → devex review → brand → scaffold). This
> backlog is the per-surface build-out that follows, once `packages/ui` and
> the app shells exist. Each item below is a self-contained session brief —
> expand into its own `sessions/web-NN-*.md` file when picked up, same as
> `bugfix-backlog.md` items get promoted to session files.

Read first, every time an item here is picked up:
- `sessions/web-frontend-design-output.md` — the canonical pattern this
  surface belongs to
- `sessions/web-brand-output.md` — exact component specs
- `sessions/web-devex-checklist.md` — the visual-regression checklist

Verify every item against localhost dev servers, never a preview pane.

---

## Console (`console.loopcmbntr.live`)

- [ ] **Dashboard + nav** — `(dashboard)/page.tsx`, sidebar, breadcrumb. The
      "command-center" pattern should peak here — this is the first thing
      every member sees.
- [ ] **Data-viz surfaces** — `treasury`, `earnings`, `token-activity`. Wire
      the chart library chosen in `web-04-eng-plan.md`; apply the `dataviz`
      skill's colour/form methodology so all three read as one system.
- [ ] **Map** — `map/page.tsx`. Apply whatever renderer session 4 landed on
      (Leaflet reskin or MapLibre/deck.gl swap). Signature surface — budget
      real time here.
- [ ] **Governance actions** — `proposals`, `proposals/new`, `proposals/
      [id]`, `elections`, `elections/[id]`, `campaigns`, `campaigns/new`.
      Voting UI, tiptap-based proposal body, campaign creation forms.
- [ ] **Delegation/accreditation** — `delegations`, `accreditation`,
      `give-power`, `members`. Power-tree visuals — confirm reuse of
      `packages/ui`'s `generateTreeSVG()` (moved here per `web-04`).
- [ ] **Communities + chat** — `communities`, `communities/[id]`,
      `communities/[id]/chat`. Decide whether the mobile dual-layer chat
      interaction model carries over (tier-coloured message treatment).
- [ ] **Account, claim, badge** — `account`, `claim`, `badge`. Lower
      traffic, still visible to every member at least once.

## Portal (`gov.loopcmbntr.live`)

- [ ] **Home + nav/footer** — `page.tsx`. First impression for outsiders;
      currently has zero design system.
- [ ] **Badge pages** — `badge/[userId]/[subject]`, `badge/demo/[tier]/
      [subject]`. Shared externally on social media — must look impressive
      out of context. Confirm OG image generation matches new brand.
- [ ] **Join/create flows** — `join/[slug]`, `create`, `c/[slug]`.
      Conversion-critical — validate against real users if possible, not
      just visual review.
- [ ] **Checkout** — `buy`, `buy/success`. Stripe-integrated, revenue-
      critical. Restyle only, zero logic changes; test the full purchase
      flow with Stripe test keys after restyling, before calling this done.
- [ ] **Legal** — `privacy`, `terms`. Low design priority, just bring into
      the new shell for consistency.
- [ ] **Portal admin** — `admin/page.tsx` (portal's own lightweight admin,
      distinct from `apps/admin`) — confirm scope/overlap with `apps/admin`
      before redesigning; may be legacy/redundant.

## Admin (internal ops)

- [ ] **Dashboard** — `(dashboard)/page.tsx`.
- [ ] **Moderation queue** — `moderation`. High-frequency for whoever's
      doing ops; prioritise scanability over polish.
- [ ] **Governance config editor** — `governance`.
- [ ] **Audit log** — `audit`. Table-heavy; a good candidate to prove out
      the shared "list/table pattern" from `web-03`.
- [ ] **Treasury oversight** — `treasury`. Shares the data-viz pattern with
      console's treasury page — confirm both consume the same `packages/ui`
      chart components, not two implementations.
- [ ] **Members, communities, settings** — `members`, `communities`,
      `settings`. Standard CRUD/table patterns.
- [ ] **Login** — bring into new shell; low effort, every admin session
      starts here.

---

## Final pass

- [ ] **Full-platform `/design-review`** — once every item above is done,
      run `/design-review` across all three apps' localhost dev servers in
      one pass, looking specifically for cross-app inconsistency (not just
      per-page issues) — places where console/portal/admin still don't read
      as one product.
- [ ] **Update `DESIGN.mobile.md`'s sibling** — if `web-02-design-system.md`
      produced `DESIGN.web.md`, confirm it's committed and accurate to what
      actually shipped (design docs drift from implementation fast — true up
      at the end, not just at the start).
- [ ] **Update `docs/continuity/NEXT.md`** — remove this backlog once
      cleared, log what shipped in `docs/continuity/WORKLOG.md`.
