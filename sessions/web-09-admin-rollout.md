# Web: admin rollout — first real design pass on apps/admin

## Run first

Read `sessions/web-08-space-tint-output.md` (must be done first — this
session consumes the real `Glass`/`LiveDot` components and the admin tint
colour it produces). Then read `sessions/web-frontend-design-output.md`'s
pattern 7 ("Admin ops pattern") for the already-approved component
mapping (`DataTable`, `StatusChip`).

## Why admin first

Already decided in `sessions/web-eng-plan-output.md` ("Migration order:
Admin → Console → Portal — de-risking order, not a technical dependency").
Admin is also the highest-contrast opportunity: it currently has zero
design identity of its own (`DESIGN.web.md`: "inherits the console dark
palette and typography... no dedicated exploration yet") while console's
chat page already proves the target look works.

## Scope — all 7 real admin pages

```
apps/admin/src/app/(dashboard)/audit/page.tsx
apps/admin/src/app/(dashboard)/communities/page.tsx
apps/admin/src/app/(dashboard)/governance/page.tsx
apps/admin/src/app/(dashboard)/members/page.tsx
apps/admin/src/app/(dashboard)/moderation/page.tsx
apps/admin/src/app/(dashboard)/page.tsx            (dashboard home)
apps/admin/src/app/(dashboard)/settings/page.tsx
apps/admin/src/app/(dashboard)/treasury/page.tsx
```

**Space-tint note:** unlike console, admin doesn't need per-panel
leadership/community distinctions — the whole app *is* the admin space
(only platform staff reach it). Every primary content panel gets
`<Glass space="admin">` uniformly; there's no "which audience" decision
to make per-page here the way there is in console/chat's dual-panel
layout. Table rows/detail panels that represent a specific *destructive or
high-stakes* action (revoking a role, force-closing an election, editing
`governance_settings`) are the one place to consider an additional
`StatusChip` (already in the session 3 inventory, semantic-colour only,
not space-tint) rather than inventing a second tint here.

## Deliverables

1. Every page above rebuilt on `Glass` panels (replacing whatever `Card`/
   ad hoc div structure is there today) with the `admin` space-tint.
2. `DataTable` component (denser variant per session 3's inventory) built
   for real and used on `audit`, `moderation`, `communities`, `members` —
   these are the app's table-heavy pages.
3. `StatusChip` built and used wherever a row/record has a real status
   (moderation flag state, audit action type, election/proposal status
   surfaced for admin review).
4. `LiveDot` on anything genuinely Realtime-backed (moderation queue count,
   if it's subscribed — verify before adding, don't fake liveness).
5. Light/dark toggle confirmed working on every page (admin already has
   the toggle infra from session 7 — this is a regression check, not new
   work).
6. Verify: `pnpm --filter admin run type-check && pnpm --filter admin run
   lint && pnpm --filter admin run build`, all clean, before considering
   this session done.

## Deploy note

Same monorepo-root `vercel --prod` gotcha as console applies here too —
see `docs/continuity/LESSONS.md` §-1 before deploying. Admin's Vercel
project name/IDs will differ from console's; confirm via `apps/admin/
.vercel/project.json` rather than reusing console's env vars. Get an
explicit visual sign-off from the user before deploying — see the
standing rule at the end of `sessions/web-08-space-tint-addendum.md`.

Save outputs to: `sessions/web-09-admin-rollout-output.md`
