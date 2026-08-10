# Loop Governance Web: developer experience review — 2026-08-09

## Run first

Read `sessions/web-eng-plan-output.md` (output from session 4).
Then invoke `/plan-devex-review` with the context below.

---

## Context

The approved engineering plan is in `sessions/web-eng-plan-output.md`. This
session reviews the developer experience of building and iterating on
`packages/ui` and the three-app reskin, for a single developer (Samuel).

Per project convention, **all UI verification happens against localhost dev
servers, never a hosted preview pane** — see the project's standing rule
against `mcp__Claude_Preview__*`/preview-pane tools. Plan this workflow
around `pnpm --filter console dev` / `--filter portal dev` / `--filter admin
dev` and real browser tooling against `localhost`.

### What to review

1. **Component isolation loop** — with 18+ shared primitives moving into
   `packages/ui`, changing a button's radius today means checking it in
   3 running apps. Evaluate whether a lightweight isolated preview (a
   minimal `apps/ui-preview` Next.js app, or Storybook/Ladle) is worth the
   setup cost for a team of one, vs just running all 3 dev servers side by
   side. Recommend based on how often session 7+ implementers will need to
   eyeball a component in isolation.

2. **Turbo task wiring** — `packages/ui` needs a `dev` task (watch mode,
   TypeScript + Tailwind) that the 3 app dev servers depend on via Turbo's
   `dependsOn`, so editing a token or primitive hot-reloads in whichever app
   is running without a manual rebuild step.

3. **Token single-sourcing** — confirm the plan from session 4 doesn't
   require hand-copying token values into 3 separate `globals.css` files
   (that's the current failure mode — portal already drifted to nothing).
   The dev loop should make it structurally hard for the 3 apps' themes to
   drift again.

4. **Font asset pipeline** — if session 4 recommends self-hosted fonts in
   `packages/ui/fonts`, confirm each app's `next/font/local` config resolves
   correctly through the pnpm workspace symlink and that `pnpm build`
   (Turbo) picks up font files as build inputs, not just source files.

5. **Visual regression / before-after checklist** — operationalise
   session 4's recommendation: if it's a manual checklist, produce the
   actual checklist template here (one row per pattern from session 3,
   columns for console/portal/admin, a screenshot-and-compare step using
   the project's real browser tooling against each localhost dev server).

6. **CI checks** — extend the existing `pnpm type-check` / `pnpm lint`
   GitHub Actions-equivalent (check what currently runs, if anything, for
   this repo) to cover `packages/ui` once it has real content.

7. **Rollback plan** — since this touches live, deployed, revenue-touching
   apps, confirm each app can be reverted independently on Vercel if a
   `packages/ui` change ships a regression to one app but not the others.

### Deliverable

`sessions/web-devex-checklist.md` with every setup step numbered and
actionable, plus the visual-regression checklist template from point 5,
ready to be used directly by session 7 (scaffold) and the implementation
backlog.
