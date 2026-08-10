# Loop Governance Web: design shotgun — 2026-08-09

## Run first

Invoke `/design-shotgun` with the brief below as your input.

---

## Why this session exists

Full platform UX/design audit (done 2026-08-09, from source inspection, not
opinion) found the web platform is running on unmodified defaults everywhere
mobile is bespoke:

| App | URL | Current state |
|---|---|---|
| `apps/console` | console.loopcmbntr.live | Dark shadcn theme, near-black bg (`oklch(0.12 0.005 250)`), amber accent (`oklch(0.75 0.18 75)` — reads as stock Tailwind `amber-500`), fonts are `next/font/google` Geist + Geist Mono with zero customisation, `--radius: 0.5rem` (shadcn default), 18 untouched shadcn/ui primitives, no motion tokens, `lucide-react` default icons |
| `apps/portal` | gov.loopcmbntr.live | `globals.css` is a single line: `@import "tailwindcss";` — **no theme at all**. This is the public conversion surface (badges, join flows, Power Tree, Stripe checkout) and it currently has zero design system |
| `apps/admin` | internal (client.loopcmbntr.live) | Same shadcn boilerplate pattern as console |
| `packages/ui` | shared component package (per CLAUDE.md) | **Empty.** Each app has its own copy-pasted shadcn primitives already drifting from each other |

By contrast, `apps/mobile` went through `/design-consultation` →
`/frontend-design` → `/plan-eng-review` → `/plan-devex-review` → `/brand-loop`
→ scaffold in July 2026 and landed a bespoke system ("Dark Civic": Cabinet
Grotesk + Geist + JetBrains Mono, tier colours as the only accent layer, true
near-black surfaces, intentional motion — see `DESIGN.mobile.md`). The web
platform — the primary interface most members actually use — never got the
same treatment. That gap is the root cause of "looks like off-the-shelf
Claude/shadcn code."

**Decision already made (2026-08-09):** this redesign covers all three web
apps as one shared system (built once in `packages/ui`, not three separate
efforts), and the visual direction is a **fresh exploration** — not
constrained to replicate mobile's Dark Civic. Mobile and web are allowed to
diverge; session 6 (`web-06-brand.md`) is where that divergence gets an
explicit, documented decision rather than happening by accident.

---

## Brief for `/design-shotgun`

You are exploring visual direction for a civic governance platform: citizens
delegate governance power and accredit expertise to community leaders, who
vote on proposals across ten subject domains (governance, economics, ecology,
health, technology, education, culture, agriculture, energy, housing). Real
money and real on-chain tokens (LOOP, Base L2) move through this platform via
a treasury cascade, so it has to read as credible and serious — not a meme
project — while still feeling modern, fast, and unmistakably not "default AI
tool output."

**Three surfaces, one shared visual language, three different jobs:**

1. **Console** (member dashboard, dark-first today) — data-dense: treasury
   balances, earnings, token activity charts, a Leaflet+H3 hex geo map,
   proposal/election voting UI, delegation trees, community chat. Daily-use
   tool for engaged members.
2. **Portal** (public marketing + conversion, currently undesigned) — badge
   pages people share externally, join/enrollment funnels, Stripe checkout
   for LOOP tokens, the Power Tree visualisation. This is the platform's
   first impression for outsiders and has to convert, not just look good.
3. **Admin** (internal ops tool) — moderation queue, governance config
   editor, audit log, treasury oversight. Utilitarian but should not look
   like a different product.

**Existing brand anchors to reference, not necessarily reuse:**
- Loop brand system (`/brand-loop` — load it before generating variants)
- Tier system with real meaning across the platform: Diamond (500+,
  `#b9f2ff`), Platinum (200+, `#e5e4e2`), Gold (80+, `#f59e0b`), Silver (30+,
  `#94a3b8`), Bronze (0+, `#cd7f32`) — these colours are functionally
  meaningful (they gate features), not decoration, on both mobile and web
- Mobile's "Dark Civic" direction exists at `DESIGN.mobile.md` — read it for
  context on what's already shipped, but do not treat it as a constraint

**Explicitly asked for:** direction options that read as "futuristic" —
think less "SaaS dashboard template," more command-center / control-plane
energy: real-time data, on-chain state, geographic power visualisation,
proposal voting as it happens. Bad reference point: generic shadcn dark-mode
admin templates (which is what exists today). Good reference points to draw
from (not copy): trading terminals, blockchain explorers with strong art
direction, mission-control dashboards, modern civic-tech products that treat
data as the hero.

**Constraints:**
- Next.js 15 + Tailwind v4 (`@theme` tokens) + shadcn/ui as the component
  primitive layer (can be heavily reskinned, doesn't have to look like
  shadcn defaults)
- Console is dark-only today; open question whether portal needs a light
  mode for SEO/marketing/share-card legibility — surface this as a question
  for variants to answer, don't assume
- Whatever direction wins has to work at both dashboard density (console,
  admin) and marketing/hero density (portal) — ask each variant to show one
  screen of each kind, not just a hero shot
- Real Supabase Realtime data will drive a lot of surfaces (chat, live vote
  counts) — direction should account for how live-updating data looks, not
  just static states

**Deliverables:**
1. Multiple distinct direction variants (comparison board), each shown
   against at least: one console dashboard-density screen, one portal
   marketing/hero screen, one data-viz element (chart or map)
2. Structured feedback captured from Samuel on each variant
3. A single winning direction, with the reasoning for why it won
4. Explicit note on the light-mode-for-portal question, resolved one way or
   the other

Save the winning direction + feedback log to:
`sessions/web-design-shotgun-output.md`
