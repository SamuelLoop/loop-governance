# Web frontend design — output — 2026-08-09/10

Session: `sessions/web-03-frontend-design.md`. Applied `DESIGN.web.md` (Signal
Pulse) to 9 canonical patterns covering all 43 pages. Delivered as an
interactive HTML review (real embedded fonts, working state toggles,
real console/admin light-mode toggle) rather than static images — reviewed
and approved by Samuel 2026-08-09/10. This doc is the written handoff for
session 4 (eng-plan); the review artifact itself is the visual source of
truth if any detail here is ambiguous.

**Scope-boundary reminders carried forward unchanged:** badge/power-tree
component not redesigned (chrome around it only); tier colour vs brand
gradient never mixed; no IA/nav changes; no second saturated data-viz hue.

**New decision from this review pass (not in original `DESIGN.web.md`):**
console and admin get a real user-facing light/dark toggle (topbar,
sun/moon icon, default dark). Portal stays fixed light-only, unchanged.
Full token spec, including tier-colour light-mode text-safe variants (4 of
5 tier hexes fail WCAG text contrast on a light ground — fills/dots/rings
unaffected, only pill *text* colour changes), written to `DESIGN.web.md`
under "Console/admin light mode."

---

## Component inventory (all 9 patterns → shadcn replacement map)

| New component | Replaces / extends | Used in patterns |
|---|---|---|
| `AppShell` | manual flex layout per page | Dashboard, Governance, Delegation, Chat, Admin |
| `Sidebar` + `NavItem` | shadcn `Sidebar` (unused currently) | all console/admin patterns |
| `StatTile` | shadcn `Card` (metric use) | Dashboard |
| `LiveDot` / `LiveTag` | none — new, Realtime-bound | Dashboard, Governance |
| `Glass` (base surface primitive) | shadcn `Card` | all patterns — foundational |
| `TierPill` | ad hoc badge spans | Dashboard, Governance, Delegation, Chat |
| `Avatar` (+ tier ring modifier) | shadcn `Avatar` | all patterns with people |
| `ThemeToggle` | none — new | Dashboard, Governance, Admin (console/admin only) |
| `TreasuryCascadeChart` / `AreaLineChart` | none — chart lib TBD, see eng-plan point 4 | Dashboard, Data-viz |
| `GroupedBarChart` | none | Data-viz |
| `TierCompositionBar` | none — segmented, tier tokens only | Governance, Data-viz |
| `ProposalHeader` / `ProposalBody` (tiptap render) | ad hoc | Governance |
| `VoteTally` / `VoteBar` | shadcn `Progress` | Governance |
| `VoteActionPanel` | ad hoc buttons | Governance |
| `DiscussionThread` | reuses `ChatMessage` | Governance |
| `ChatMessage` (tier-bordered) | ad hoc | Chat, Dashboard activity feed, Governance discussion |
| `CommunityRail` | ad hoc list | Chat |
| `PowerTreeSheet` | existing modal, restyled chrome only | Chat, Delegation |
| `PowerDensityMap` | current raw Leaflet embed | Geo |
| `CommunityRankList` | ad hoc | Geo |
| `DelegationTable` | shadcn `Table` | Delegation |
| `GivePowerDrawer` | shadcn `Sheet` | Delegation |
| `AccreditationProgress` | ad hoc | Delegation |
| `DataTable` | shadcn `Table` (denser variant) | Admin |
| `StatusChip` | ad hoc — semantic colour only | Admin |
| `PortalNav` / `StatStrip` | none — portal has zero shared components today | Public conversion |
| `BadgeHero` | ad hoc — wraps unmodified power-tree | Public conversion |
| `ConversionCard` | shadcn `Card` (light variant) | Public conversion |
| `AuthCard` | ad hoc | Auth |

**Current duplication confirmed via source:** `button.tsx` exists separately
in `apps/console/src/components/ui` and `apps/admin/src/components/ui` (19
and 14 shadcn primitives respectively, portal has 0). All of this collapses
into `packages/ui` per eng-plan point 1.

**Power-tree duplication confirmed:** `apps/console/src/lib/power-tree.ts`
and `apps/portal/src/lib/power-tree.ts` are separate copies today — eng-plan
point 7 (move to `packages/ui`) is real, not speculative.

**Font loading confirmed:** `apps/console/src/app/layout.tsx` and
`apps/admin/src/app/layout.tsx` both already `import { Geist, Geist_Mono }
from "next/font/google"` independently — exactly the 2x duplication
eng-plan point 2 needs to resolve. Portal has no font loading at all today.

---

## States covered (per pattern, from the review artifact)

- **Dashboard:** live, loading (skeleton), empty (new member), error (Realtime disconnect), plus light/dark
- **Governance:** open/not-voted, open/voted, closed, plus light/dark
- **Public conversion:** desktop, mobile (badge hero specifically must hold at every width — it's shared out of app context)
- All other patterns: populated state only in the mockup; loading/empty/error follow the Dashboard pattern's established approach (skeleton via shimmer, `state-panel` empty/error card) — not re-designed per-pattern, reuse the primitive

## Motion tokens actually used

Live-dot pulse (1.6s, Dashboard + Governance tallies only, gated on real Realtime connection); card hover lift (150ms, universal); vote-bar width transition (400ms, Governance); chart rightmost-point pulse (Dashboard, Data-viz); all with `prefers-reduced-motion` fallback per `DESIGN.web.md`.

## Responsive notes

Console/admin: sidebar collapses to 64px icon rail below 1024px, stat grids drop 4→2 columns, not designed below tablet width (desktop-first daily tool). Portal: centred/responsive to 375px, badge hero single-column at every width.

## Next

`sessions/web-04-eng-plan.md` — turn this into a real implementation plan: `packages/ui` bring-up, font loading consolidation, migration order across the 3 apps, chart library choice, map renderer evaluation, visual regression safety net, power-tree consolidation, deploy/rollout plan, risk register.
