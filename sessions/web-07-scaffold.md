# Loop Governance Web: design system scaffold — 2026-08-09

## Read first

- `sessions/web-eng-plan-output.md` — approved package structure and
  migration order
- `sessions/web-devex-checklist.md` — Turbo wiring, dev-loop setup
- `packages/ui/tokens.css` (or equivalent) — if session 6 ran; otherwise
  use the values in `sessions/web-brand-output.md` directly

---

## Goal

Stand up `packages/ui` for real and land the shell/chrome of the new design
on all three apps — navigation, sidebar, typography, base cards/buttons —
**with zero feature-level redesign yet**. This session proves the token
pipeline and base primitives work end-to-end before session 8+ (the
implementation backlog) touches any individual page's content.

This mirrors how `apps/mobile` was scaffolded (`sessions/mobile-06-
scaffold.md`): navigation + tokens + auth-adjacent shell first, empty or
near-untouched page bodies, verified visually before building on top.

This session produces **no new feature code** and changes **no data-
fetching logic**. If a page's content still reads with the old shadcn
styling underneath the new shell/nav/typography, that's expected and fine
for this session.

---

## Scope (per session 4's recommended migration order)

1. Build out `packages/ui`: token file wired via Tailwind v4 `@theme`,
   base primitives replacing the 18 currently-duplicated shadcn components
   (button, card, input, table, dialog, sheet, sidebar, tabs, avatar,
   badge, breadcrumb, dropdown-menu, label, progress, select, separator,
   skeleton, textarea, tooltip)
2. Wire `apps/console` to `@loop/ui`, apply new sidebar/nav/typography
   shell — verify against `pnpm --filter console dev` on localhost
3. Wire `apps/admin` the same way — verify on localhost
4. Wire `apps/portal` last (currently has no theme at all, highest visual
   delta, and touches the Stripe checkout flow — be careful not to break
   `buy`/`buy/success`) — verify on localhost

## Verification

Per project convention: **no preview-pane tools.** Start each app's dev
server locally and verify visually via real browser tooling against
`localhost`, not a hosted preview. For each app:
- Nav/sidebar renders with new typography, colours, spacing
- Login page (console, admin) not broken
- At least one list page and one detail page load without console errors
- Portal's `buy` page (Stripe) still functions end-to-end — this is revenue
  code, confirm nothing broke before ending the session
- Run `/design-review` against each localhost app before closing the
  session — catch AI-slop patterns/spacing issues at the shell level while
  they're cheap to fix, before 40+ pages are built on top of them

## Deliverable

- `packages/ui` committed with tokens + base primitives
- All three apps importing from `@loop/ui`, shell/nav/typography updated
- `docs/continuity/NEXT.md` updated to point at
  `sessions/web-implementation-backlog.md` for the remaining per-surface
  work
- Token budget: no per-page feature redesign in this session — that's the
  backlog
