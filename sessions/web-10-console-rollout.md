# Web: console rollout — the other ~20 pages

## Run first

Read `sessions/web-08-space-tint-output.md` and `sessions/web-09-admin-
rollout-output.md` first (uses the same `Glass`/`LiveDot`/`DataTable`/
`StatusChip` components, now proven on admin). Read
`sessions/web-frontend-design-output.md` for the full pattern → component
map — this session executes patterns 1, 2, 3, 4, 5 against real pages
(pattern 6/chat is already done; pattern 7/admin is session 09; pattern
8/portal is session 11; pattern 9/auth is low-priority, fold in last if
time allows).

## Scope, grouped by the already-approved canonical pattern

**1. Dashboard/stats** — `(dashboard)/page.tsx` (home). Live numbers
(treasury balance, active proposals, member count) — this is where the
"command-center" feel should peak, per session 3's own framing.

**2. Data-viz / money pages** — `treasury`, `earnings`, `token-activity`,
`claim`. Read the `dataviz` skill before touching charts — it's a
validated colour/form methodology, session 3 flagged this explicitly.
`treasury/page.tsx` already renders a real "Projects vs Governance" split
bar and a governance-split breakdown (leaders/participants/delegators) —
that's existing *content*, not a page-access restriction; don't tint it
by space unless a specific panel is genuinely gated (e.g. an
admin-cascade control visible only to `isPlatformAdmin` — that panel
gets `space="admin"`, the rest of the page doesn't).

**3. Geo** — `map/page.tsx`. Leaflet + H3 hex overlay. Note:
`community-map.tsx`'s hue violation (7 unrelated saturated hues, flagged
session 6) was already fixed in session 7 — single-hue accent-gradient
ramp, computed at module load since Leaflet draws to canvas. Nothing to
redo here; this pattern is about the surrounding page chrome (`Glass`
panel, filters, legend), not the map's own colour logic.

**4. Governance action** — `proposals`, `proposals/new`, `proposals/[id]`,
`elections`, `elections/[id]`, `campaigns`, `campaigns/new`. This is the
pattern most likely to have genuine leadership-only content (e.g. a
quorum-only discussion thread on a proposal, mirroring chat's Leadership
panel) — apply `space="leadership"` only where such a real, already-coded
restriction exists (check for an `isQuorum`/role check guarding the
specific panel before tinting it, same discipline as chat).

**5. Delegation / accreditation / identity** — `delegations`,
`accreditation`, `give-power`, `members`, `badge` (console's own, not
portal's public one), `account`. Power-tree visualisations reuse
`apps/*/src/lib/power-tree.ts` per the mobile eng-plan's finding it's
already portable — don't rebuild that logic, only restyle its chrome
(explicit constraint carried from session 2 onward: the power-tree
component itself is not being redesigned).

**Not in this session:** `communities/[id]/chat` (already done, retrofit
handled in session 08), `login` (low-value, fold in only if time remains).

## Deliverables

1. Every page above on real `Glass` panels, space-tint applied only where
   a genuine, already-coded audience restriction exists — default to
   untinted `Glass` otherwise. This is a hard rule, not a suggestion: the
   whole point of space-tint is that it means something. Tinting a
   general-audience panel "leadership" because it looks nice defeats it.
2. `LiveDot` wired to genuinely Realtime-backed values only (verify each
   candidate actually has a Supabase Realtime subscription before adding
   the dot — don't fake liveness, same rule chat followed).
3. `StatTile` (dashboard home), `VoteTally`/`VoteBar`/`VoteActionPanel`
   (governance action pages), `DelegationTable`, `AccreditationProgress`,
   `GivePowerDrawer` — all from the session 3 inventory, built for real
   for the first time.
4. Community-map hue fix (see pattern 3 above) landed in the same pass,
   not deferred again.
5. Verify: `pnpm --filter console run type-check && lint && build` clean.
   Screenshot diff chat before/after to confirm the session 08 retrofit
   didn't visually regress it. Get an explicit visual sign-off from the
   user before deploying — see the standing rule at the end of
   `sessions/web-08-space-tint-addendum.md`.

Save outputs to: `sessions/web-10-console-rollout-output.md`
