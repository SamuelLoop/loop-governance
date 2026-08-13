# Web: portal rollout — public conversion surfaces

## Run first

Read `sessions/web-08-space-tint-output.md` (components) and
`sessions/web-frontend-design-output.md` pattern 8 ("Public conversion
pattern") for the already-approved component map (`PortalNav`/`StatStrip`,
`BadgeHero`, `ConversionCard`).

## Why portal is last, different, AND currently reverted — read before starting

Already-decided rollout order puts portal last (`sessions/web-eng-plan-
output.md` decision 7). Portal is also structurally different from the
other two apps: it's fixed-light (no theme toggle, per `DESIGN.web.md`),
public and mostly pre-authentication, and most traffic lands here from
shared badge links on someone else's timeline — conversion clarity
matters more than visual flourish (session 3's own framing: "design should
not sacrifice conversion clarity for style").

**Portal does not currently have the `packages/ui`/Signal Pulse
foundation applied — it was reverted.** Session 7 wired it in, shipped
without a live sign-off checkpoint, and the real user found
gov.loopcmbntr.live "totally broken" (light-mode tokens applied to the
shell while 90+ instances of hardcoded near-white text and dark-only
section backgrounds were never retouched — a real contrast failure, not
a taste disagreement) plus an unauthorized logo swap. `apps/portal` was
fully reverted same day to hardcoded dark, zero `@loop/ui` usage, the old
logo. Full detail: `docs/continuity/NEXT.md`'s "Post-deploy correction"
entry and `docs/continuity/WORKLOG.md`.

**Standing rule from that incident, binding on this session:** get an
explicit visual sign-off from the real user — a mockup or artifact they
actually look at, not a design doc — before extending Signal Pulse to
any more of portal's real page content, and before any brand-asset swap
(logo, favicon) ships to production. This session's first deliverable is
therefore the foundation re-application PLUS that sign-off checkpoint,
not styled pages shipped straight to prod.

**Space-tint does not apply here as a pattern** — leadership/community/
admin only mean something once you're inside a community with a role.
Portal visitors mostly aren't there yet. Use plain, untinted `Glass` for
structural polish; skip the tint prop entirely rather than forcing a
meaning that doesn't exist pre-auth.

**Check `apps/portal/src/app/admin/page.tsx` before deciding it's exempt**
— it's named like an admin surface but lives in portal, not
`apps/admin`. If it's genuinely restricted to platform/community admins
(check its access-control code, don't assume from the route name), it's
the one portal page that should get `space="admin"` from session 08's
work, same restraint rule as session 10: only tint where a real,
already-coded restriction exists.

## Scope — all 10 real portal pages

```
/page.tsx                              (home / marketing)
/badge/[userId]/[subject]/page.tsx     (public badge — shared out of context)
/badge/demo/[tier]/[subject]/page.tsx
/buy/page.tsx
/buy/success/page.tsx
/c/[slug]/page.tsx
/create/page.tsx
/join/[slug]/page.tsx
/admin/page.tsx                        (verify scope — see above)
/privacy/page.tsx, /terms/page.tsx     (low-priority, legal boilerplate)
```

## Deliverables

0. Re-apply the `packages/ui`/`theme.css` foundation to portal (session
   7's work, reverted). This time: grep every portal page for hardcoded
   `text-neutral-50`/near-white classes and dark-only section backgrounds
   *before* flipping the shell to light tokens, fix content alongside the
   shell in the same pass — not shell-first-content-later, that ordering
   is exactly what broke it last time. Get a real screenshot/artifact
   sign-off from the user before this or anything downstream in this
   session deploys to production.
1. `PortalNav`/`StatStrip` built for real, used on home + join/create
   flows.
2. `BadgeHero` wrapping the existing, unmodified power-tree component
   (hard constraint carried since session 2: power-tree itself is not
   redesigned, chrome only) — must hold at every width down to 375px,
   this is the one surface that gets shared completely out of app
   context onto a stranger's timeline.
3. `ConversionCard` (light-mode `Card` variant) used on `buy`, `buy/
   success`, `create`, `join/[slug]` — the pages with actual Stripe
   checkout / conversion stakes. Don't sacrifice form/checkout clarity
   for glass-panel styling here; session 3 flagged this risk explicitly.
4. Responsive check at 375px minimum on every page in scope — portal is
   the one app that must work on mobile web, unlike console/admin's
   desktop-first stance.
5. Verify: `pnpm --filter portal run type-check && lint && build` clean,
   plus a manual pass on `buy`/`buy/success` confirming the Stripe flow
   itself is untouched (this session is styling only, no checkout logic
   changes).

Save outputs to: `sessions/web-11-portal-rollout-output.md`
