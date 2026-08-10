# Loop Governance Web: frontend design — 2026-08-09

## Run first

Read `sessions/web-design-system-output.md` (output from session 2).
Then invoke `/frontend-design` with the context below. Use `/design-html`
instead if the output needs to be production-ready HTML/CSS rather than
React/Tailwind component specs — default to `/frontend-design` since the
target is real Next.js components.

---

## Context

Applying the approved design system to real screens across all three apps.
Given the page count (23 console + 9 admin + 11 portal = 43 pages), design
**canonical patterns first**, then show each pattern applied to its highest-
value real screen — not 43 bespoke designs.

### Canonical patterns to design (in priority order)

1. **Dashboard/stats pattern** — console `(dashboard)/page.tsx` (home),
   admin `(dashboard)/page.tsx`. Live numbers (treasury, earnings, member
   count, active proposals), the "command-center" feel from the shotgun
   winner should peak here.

2. **Data-viz pattern** — console `treasury`, `earnings`, `token-activity`
   pages. Charts showing on-chain token flow and treasury cascade over time.
   **Read the `dataviz` skill before designing these** — it defines a
   validated colour/form methodology so charts read as one system, not
   default recharts/shadcn chart output.

3. **Geo pattern** — console `map/page.tsx` (Leaflet + H3 hex overlay
   showing community power/density geographically). This is one of the most
   distinctive things this platform could show — treat it as a signature
   surface, not a generic embedded map.

4. **Governance action pattern** — `proposals`, `proposals/new`,
   `proposals/[id]`, `elections`, `elections/[id]`, `campaigns`,
   `campaigns/new`. Voting UI, proposal detail with the tiptap rich-text
   body already in use, campaign creation forms.

5. **Delegation/accreditation pattern** — console `delegations`,
   `accreditation`, `give-power`, `members`. The power-tree relationship
   visualisations (reuse `apps/portal/src/lib/power-tree.ts` generation
   logic, per the mobile eng-plan's finding that it's already portable).

6. **Community/chat pattern** — `communities`, `communities/[id]`,
   `communities/[id]/chat`. Web equivalent of the mobile dual-layer
   leadership/community chat — check whether the mobile chat interaction
   model (tier-coloured left border, avatar tap for power-tree sheet)
   should carry over even though the visual system differs.

7. **Admin ops pattern** — `moderation`, `governance`, `audit`, `settings`,
   `communities`, `members`, `treasury` (all under `apps/admin`). Table-
   heavy, form-heavy, needs to feel like the same platform without
   console's density or portal's marketing polish.

8. **Public conversion pattern** — portal `page.tsx` (home), `badge/[userId]/
   [subject]`, `join/[slug]`, `buy`, `buy/success`, `create`, `c/[slug]`.
   This is the pattern with the most at stake commercially (Stripe checkout
   lives here) — design should not sacrifice conversion clarity for style.
   Badge pages are shared externally (social proof surface) — they need to
   look impressive out of context, on a stranger's timeline.

9. **Auth pattern** — `login` (console, admin), magic-link flow. Currently
   the least differentiated screens across all three apps; low effort, high
   frequency (every session starts here).

### Deliverables

1. High-fidelity screen designs for each pattern above, applied to its named
   real page (not a generic placeholder)
2. Full component inventory per pattern with states (loading, empty, error,
   live-updating) — Supabase Realtime means several surfaces need an
   explicit "data just changed" state, not just loading/loaded
3. Motion application: where session 2's motion tokens actually get used on
   each pattern
4. Responsive notes: console/admin must degrade gracefully to tablet width;
   portal must work on mobile web (it's a public conversion surface, most
   traffic from shared badge links will be mobile browsers)
5. Handoff spec ready for the engineering plan session: exact component
   names, props/variants, and which existing shadcn primitives each
   replaces

Save outputs to: `sessions/web-frontend-design-output.md`
