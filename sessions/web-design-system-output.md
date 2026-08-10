# Web design system — output — 2026-08-09

Session: `sessions/web-02-design-system.md`. Full doc written to
`DESIGN.web.md` (repo root, same pattern as `DESIGN.mobile.md`) — this file
is a pointer + summary, read `DESIGN.web.md` for the actual system.

## Summary

Direction: **Signal Pulse**, confirmed after a fork against an outside-voice
alternative ("Civic Mint") and, critically, after seeing both directions
placed next to the platform's real, unmodified, already-shipped
badge/power-tree SVG (`apps/*/src/lib/power-tree.ts`). User's explicit call.

Key resolution (was the open item from session 1): **tier colour and the new
blue-violet brand gradient are separate, non-substituting signals.** Tier
colour = status (badge, avatar rings, tier pills — untouched, exactly as
shipped). Gradient = brand/action (CTAs, active nav, links, live-glow).
Never mixed.

Typography: General Sans (display) + Geist (body, already loaded in
console/admin — reused, no new infra) + JetBrains Mono (data, reused from
mobile's system).

Full type scale, colour tokens, spacing, radius, motion, and the mobile
relationship decision are in `DESIGN.web.md`.

## Explicit scope boundary (do not violate in later sessions)

The badge/power-tree component (`apps/console/src/lib/power-tree.ts`,
`apps/portal/src/lib/power-tree.ts`) and its rendering are **not being
redesigned**. Highly detailed, already invested, colours already fit the
new system with zero changes needed. Any future session touching this
component should be reviewed against this note before changing anything
beyond what this doc's colour tokens already specify.

The simpler text-tree list at `apps/console/src/app/(dashboard)/
accreditation/power-tree.tsx` is a different, much simpler component built
on generic shadcn tokens — it inherits new token values automatically via
session 7's scaffold, no special handling needed.

## Next

`sessions/web-03-frontend-design.md` — apply this system to real screens
(canonical patterns: dashboard, data-viz, geo/map, governance action,
delegation/accreditation, chat, admin ops, public conversion, auth).
