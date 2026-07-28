# Governance: Power Tree implementation — 2026-07-25

## Where we left off

Library evaluation is complete. The evaluation artifact is at:
https://claude.ai/code/artifact/6ad77c23-d70b-4538-a7ca-80d5ce664933

It contains: 8-library comparison matrix, two rendered canvas samples (radial orbital + hierarchical columns), SSR strategy notes, and a full Postgres recursive CTE draft.

**No production code has been touched yet.**

## Decision needed first

Open the artifact and pick a layout:
- **Option A — Radial Orbital** (recommended): root at centre, concentric rings, reads as "crown of influence". Best for the competition mechanic.
- **Option B — Hierarchical Columns**: left-to-right authority flow, easier to scan names at depth.

## Then implement in this order

### 1. Postgres RPC
Create `get_power_tree(p_receiver_id uuid, p_subject text)` in Supabase. The recursive CTE is drafted in Step 4 of the evaluation artifact. It walks `delegations` three levels, left-joins `accreditation_scores` (community_id IS NULL per migration 035), returns `tail_count` for the "+N more" summary node. Call via `supabase.rpc('get_power_tree', ...)`.

Indexes to verify exist: `delegations(delegate_id, active)`, `delegations(delegator_id)`, `accreditation_scores(user_id, subject_tag, community_id)`.

### 2. generateTreeSVG(rows)
Server function, lives in a shared lib (e.g. `packages/ui/src/power-tree.ts` or `apps/portal/src/lib/power-tree.ts`). Takes the RPC rows, computes SVG positions, returns an SVG string. Library: pure trig (0 kb) or d3-hierarchy (~28 kb). Theme: #080808 bg, #f59e0b amber, solid edges for delegation, dashed for accreditation, node size scales with `power_score`.

### 3. Wire into badge pages
- `apps/console/src/app/(dashboard)/badge/page.tsx` — add below the stats grid
- `apps/portal/src/app/badge/[userId]/[subject]/page.tsx` — add below the stats grid

Both are server components; call the RPC server-side, pass rows to `generateTreeSVG`, render as `<svg dangerouslySetInnerHTML={{ __html: svgContent }} />`.

### 4. Wire into OG route
`apps/portal/src/app/badge/[userId]/[subject]/og/route.tsx` uses `ImageResponse` (Satori). Embed the SVG string inside the JSX via a `<div dangerouslySetInnerHTML={{ __html: svgContent }} />`. Satori parses inline SVG natively; no browser required.

## Key files
- `apps/console/src/app/(dashboard)/badge/page.tsx`
- `apps/portal/src/app/badge/[userId]/[subject]/page.tsx`
- `apps/portal/src/app/badge/[userId]/[subject]/og/route.tsx`
- `apps/portal/src/app/badge/[userId]/[subject]/power.ts` (existing stats loader, reference for Supabase client pattern)
