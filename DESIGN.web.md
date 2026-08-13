# Design System — Loop Governance Web
**Platforms:** Next.js 15 — `apps/console`, `apps/portal`, `apps/admin`
**Created:** 2026-08-09 by `/design-consultation` (session `web-02-design-system.md`)
**Direction:** Signal Pulse

---

## Product Context

- **What this is:** the web surfaces of a civic governance platform — a dense daily-use member console, a public conversion portal, and an internal ops admin tool, sharing one Supabase backend and one visual system
- **Who it's for:** console/admin — engaged community members and platform staff, daily use, desktop-first; portal — the public, first impression, mobile-heavy traffic (shared badge links)
- **Space/industry:** civic tech, decentralised governance, real treasury/token movement (Base L2)
- **Memorable thing:** "My voice has real weight here" — power is earned and visible, not symbolic
- **Sibling system:** `DESIGN.mobile.md` (Dark Civic, shipped July 2026). Web is a **deliberate partial divergence**, not a copy — see "Relationship to mobile" below.

---

## Process note (why this doc looks the way it does)

This direction went through three real decision rounds, not one:
1. Five distinct directions generated as coded HTML/CSS (gstack's AI image binary needs an OpenAI key not configured on this machine — confirmed by inspecting the binary, `api.openai.com`/`gpt-image-2` hardcoded, no alternate provider). None landed.
2. A remix of two of the five ("Signal Bright" + "Live Pulse") produced "Signal Pulse," verified across 5 real console/portal screens.
3. Before formalizing, an independent Claude subagent proposed a sharply different alternative ("Civic Mint" — warm ledger black, flat crimson, tier-colors-only-saturation, ceremonial motion). Both directions were shown side by side against the platform's **real, unmodified, already-shipped badge/power-tree SVG** (`apps/portal/src/lib/power-tree.ts`, `generateTreeSVG()`, run for real — not approximated). Signal Pulse was chosen anyway, with eyes open to the contrast.

That real badge is not being restructured. Its existing colour logic (tier colour drives every stroke/fill/glow, `#090909` background, no separate brand hue) is the reason for the resolution below.

---

## Aesthetic Direction

- **Direction:** Signal Pulse — dark, modern, alive. Blue-violet gradient as the one invented accent; frosted dark glass surfaces; soft glow on anything genuinely live-updating.
- **Decoration level:** Restrained-but-warm — glass and glow carry real information (liveness), not just texture.
- **Mood:** A command-center for a governance platform that moves real money — energetic without losing credibility.

---

## Tier colour vs. brand accent — the resolution

This was flagged as an open item after the shotgun round and is now resolved:

**Tier colours (`#b9f2ff` Diamond, `#e5e4e2` Platinum, `#f59e0b` Gold, `#94a3b8` Silver, `#cd7f32` Bronze) are untouched, exactly as used in the existing badge/power-tree component. They mean status. They appear only on tier-identity UI:** avatar rings, tier pills/badges, the badge page itself, any per-user status indicator. Do not use a tier colour to mean anything other than "this is someone's tier."

**The blue-violet gradient (`#4f6bff` → `#8b5cf6`) is the brand/action accent. It means "do this" or "this is Loop."** It appears on: primary CTAs, active nav state, links, chart lines (except where a chart is explicitly plotting tier composition — see Data-viz below), the live-glow treatment.

**These two signals never merge and never substitute for each other.** A Gold-tier user's primary "Vote for" button is gradient-coloured, not gold-coloured. A vote-tally bar that shows the tier composition of voters uses tier colours in its segments, not the gradient. This is a hard rule, not a preference — mixing them recreates the exact ambiguity that was flagged as unresolved.

---

## Space-tint — panel ownership (added 2026-08-13, session `web-08-space-tint-addendum.md`)

Tier colour (status) and brand accent (action) never mix — see above. This adds a **third, narrower signal**: which audience a panel belongs to. It's scoped tightly enough that it can't collide with either existing rule.

Discovered live during the community chat build (`apps/console/.../communities/[id]/chat/`), shipped that day as one-off CSS (`.live-dot`, `.leadership-glow`, `.community-shade` in `apps/console/src/app/globals.css`), formalised here and retrofitted onto real `Glass`/`LiveDot` components in `packages/ui` so sessions 09-11 have something to import instead of re-deriving the CSS.

| Space | Tint | Where it means something |
|---|---|---|
| Community / general | Flat neutral shade — `#17171b` dark / `#e9eaee` light | Any panel open to all members |
| Leadership / restricted | Static blue-violet gradient border (`color-mix` off `--accent-end`) + a "Members only" pill | Any panel restricted to quorum/leadership roles |
| Admin | Static teal gradient border (`color-mix` off `--admin-tint`, `#2dd4bf`) + an "Admin only" pill | Any panel that's `apps/admin`-only, or an admin-only control embedded in console |

**Admin colour, confirmed 2026-08-13:** every other saturated hue in the system was already spoken for (blue-violet = brand, gold = warning + Gold tier, green = success, red = error, plus Diamond/Platinum/Silver/Bronze). Teal (`#2dd4bf`) reads as "oversight/verified" rather than alarm or celebration, and is distinct from all of those. Two alternates (a deeper `#14b8a6`, and cyan `#06b6d4`) were mocked up side by side against the real Glass-panel treatment for comparison — teal, the original proposal, was picked as-is.

**Explicit rule, matching the tier/brand-accent discipline above:** space-tint only ever appears as background/border treatment on a `Glass`-family panel. It never appears on body text, on a button's fill, or as a data-viz colour — those stay governed by the rules above, untouched.

**Motion:** the leadership tint was originally a rotating conic-gradient border; reverted same-day to static after direct feedback that continuous motion was distracting. Keep it static — admin's tint follows the same rule from day one. `LiveDot` (small pulsing status dot, 1.6s, `prefers-reduced-motion`-gated) is the only thing in this pattern allowed to move, and only when it reflects a real Realtime subscription, never decoratively.

### Decisions Log (space-tint)

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-13 | Space-tint formalised as a third colour signal, narrower than tier/brand accent | Discovered live during the chat build; needed a real spec before sessions 09-11 (Admin/Console/Portal rollout) reuse the pattern |
| 2026-08-13 | Admin tint = teal `#2dd4bf` (`--admin-tint`) | Only unclaimed saturated hue left in the system; reads as oversight/verified, not alarm or celebration; confirmed against 2 alternates via a real Glass-panel mockup, not a swatch |
| 2026-08-13 | Space-tint never appears on text, button fills, or data-viz — chrome only | Keeps it structurally incapable of colliding with the tier-colour/brand-accent rule above |

---

## Typography

- **Display / headings / large numerals (treasury balance, hero stat tiles):** General Sans — confident geometric sans, open license, distinct from Inter/Roboto/Arial/system defaults and from what mobile uses for display (Cabinet Grotesk), avoiding a licensing dependency while still reading as deliberate, not default.
- **Body / UI copy:** Geist — already loaded via `next/font/google` in `apps/console` and `apps/admin` today (no new font-loading work), and matches mobile's body face (`DESIGN.mobile.md`: "Body/chat: Geist"). The problem was never Geist itself, it was zero customisation around it — pairing it with a real display face and a real system fixes that.
- **Data / numerals (treasury figures, power scores, timestamps, vote counts):** JetBrains Mono, tabular figures throughout. Matches mobile's data face exactly — a member moving between app and web sees the same numeral treatment.
- **Loading:** General Sans and JetBrains Mono via self-hosted `next/font/local` in `packages/ui` (session 4/eng-plan decides the exact file pipeline); Geist stays `next/font/google`, already working.

### Scale (8px base, desktop-first)

| Level | Font | Size | Weight | Usage |
|---|---|---|---|---|
| Display | General Sans | 32px | 700 | Treasury balance, hero numerals |
| H1 | General Sans | 22px | 700 | Page titles |
| H2 | General Sans | 16px | 700 | Section headers, card titles |
| Body | Geist | 14px | 400 | UI copy, table cells, form labels |
| Caption | Geist | 12px | 400 | Metadata, timestamps, muted text |
| Data-lg | JetBrains Mono | 22px | 700 | Stat tile values |
| Data-sm | JetBrains Mono | 12px | 500 | Inline numerals, vote counts, table figures |

---

## Colour

### Base (dark — console, admin)

| Token | Hex | Notes |
|---|---|---|
| Background | `#0a0a0a` | Tuned to sit next to the badge's `#090909` — near-identical, not "close but off" |
| Surface | `rgba(255,255,255,.045)` on background, `backdrop-filter: blur(14px)` | Frosted glass card |
| Surface border | `rgba(255,255,255,.08)` | Hairline |
| Text primary | `#f5f5f4` | |
| Text secondary | `#9297ad` | |
| Text muted | `#6b6f80` | |

### Brand / action accent

| Token | Value |
|---|---|
| Accent | `linear-gradient(90deg, #4f6bff, #8b5cf6)` |
| Accent glow | `0 0 16px rgba(124,109,255,.4)` — used only on the primary CTA and live-state indicators, never decoratively on static chrome |

### Tier (unchanged — source of truth is `apps/*/src/lib/power-tree.ts`)

| Tier | Hex |
|---|---|
| Diamond | `#b9f2ff` |
| Platinum | `#e5e4e2` |
| Gold | `#f59e0b` |
| Silver | `#94a3b8` |
| Bronze | `#cd7f32` |

### Semantic

| State | Hex |
|---|---|
| Success | `#22c55e` |
| Error | `#ef4444` |
| Warning | reuse Gold `#f59e0b` (already load-bearing, no new hue needed) |

### Data-viz ramp (treasury/earnings/token-activity charts, non-tier data)

Single-series charts (balance over time, token price): the brand gradient, applied as a stroke with a soft fill falloff — matches the validated treasury mockup from round 1.
Multi-series or categorical charts (e.g. inflow vs outflow): brand accent for the primary series, `text-secondary` grey for comparison series. **Do not invent a second saturated hue for charts** — this was Civic Mint's strongest, evidence-backed critique (a second bright hue competes with tier colour for the viewer's attention) and it holds even though Signal Pulse won overall. Read `/dataviz` skill guidance in session 3 before building real charts.

### Portal — light mode

Signal Pulse's light inversion (validated in round 1's 5-screen review): background `#faf9f6`, surface `rgba(255,255,255,.7)` with `backdrop-filter: blur(8px)`, same gradient accent, same tier-colour rule. No new decisions needed here, carry forward as shown.

### Admin

No dedicated exploration yet — inherits the console dark palette and typography. Session 3 (frontend design) designs admin's specific density/table patterns; token values here already apply.

---

## Console/admin light mode (added 2026-08-09, after session 3 mockup review)

Originally console/admin were scoped dark-only, with light mode reserved for portal's separate marketing context (see "Portal — light mode" above). After reviewing session 3's mockups, decision: **console and admin also get a real, user-toggleable light mode** — not a copy of portal's light tokens (different density and mood; portal is comfortable-spacious/marketing, console/admin stay comfortable-dense/command-center in either theme), a dedicated light variant of the console/admin token set.

**Toggle location:** a sun/moon control in the topbar (both console and admin), persists per-user (localStorage + profile setting, exact mechanism decided in session 4/eng-plan). Default remains dark — that's still the primary "command-center" identity from the shotgun round.

### Console/admin — light tokens

| Token | Hex/value | Notes |
|---|---|---|
| Background | `#f4f4f8` | Cool, faint violet-grey bias toward the brand gradient — deliberately not pure white or warm cream |
| Surface | `rgba(255,255,255,.72)` on background, `backdrop-filter: blur(14px)` | Same blur strength as dark, glass language carries over |
| Surface border | `rgba(20,20,40,.08)` | |
| Text primary | `#15151d` | |
| Text secondary | `#5b5b6b` | |
| Text muted | `#8d8d9b` | |
| Accent glow | `0 0 14px rgba(124,109,255,.25)` | Dialed down from dark's `.4` — the same opacity reads muddier on a light ground, so glow stays a restrained hint, not a halo |

Brand gradient (`#4f6bff → #8b5cf6`) is unchanged in light mode — it was already validated against a light ground in portal's round-1 review.

### Tier colour — light-mode text-safe variants (new resolution)

The five tier hex values were tuned to glow on `#0a0a0a`. Several fail text contrast on a light background — Diamond, Platinum, Gold, and Silver all sit under 3:1 against `#f4f4f8`, well below the 4.5:1 needed for small text. Fix: **the tier hex stays exactly as-is everywhere it's a fill (dots, avatar rings, the badge/power-tree component, segment charts) — light mode only swaps the color used for tier *text* (pill labels).**

| Tier | Fill (unchanged, both themes) | Light-mode text colour |
|---|---|---|
| Diamond | `#b9f2ff` | `#0e7fa3` |
| Platinum | `#e5e4e2` | `#6b6f78` |
| Gold | `#f59e0b` | `#92400e` |
| Silver | `#94a3b8` | `#475569` |
| Bronze | `#cd7f32` | `#92562a` |

This is scoped narrowly: it's a contrast fix for text-on-tint, not a new colour decision. The badge/power-tree component is unaffected (out of scope, and it doesn't render tier names as text regardless).

### Decisions Log (addendum)

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-09 | Console/admin get a real light mode, toggle in topbar, dark stays default | User request after reviewing session 3 mockups |
| 2026-08-09 | Console/admin light mode gets its own token set, not reused from portal | Different density/mood per surface — portal is marketing-spacious, console/admin stay command-center-dense in both themes |
| 2026-08-09 | Tier colour text-safe variants for light mode only, fills unchanged | Four of five tier hexes fail WCAG text contrast on a light ground; fills (dots/rings/badge) don't have this problem and stay untouched |

---

## Spacing

- **Base unit:** 8px
- **Density:** console/admin comfortable-dense (daily-use tool); portal comfortable-spacious (marketing)

| Token | Value |
|---|---|
| space-xs | 4px |
| space-sm | 8px |
| space-md | 16px |
| space-lg | 24px |
| space-xl | 32px |
| space-2xl | 48px |

---

## Layout

- Console/admin: fixed left sidebar (190px), content area with 24px page padding, max content width unconstrained (data-dense, desktop-first, degrades to tablet — test at 1024px minimum)
- Portal: centred content, 40px horizontal nav/section padding, standard responsive breakpoints down to 375px (badge links get opened on mobile)
- Stat-tile grids: 4-column on desktop, 2-column at tablet, 1-column below 480px

## Radius

| Context | Value |
|---|---|
| Cards, panels | 10-12px |
| Buttons | 8px |
| Pills (tier badges, tags) | 999px |
| Avatars | 999px |

(Not sharp/zero-radius — that was Civic Mint's language, not Signal Pulse's. Keep the modern-glass read.)

---

## Motion

- **Approach:** liveness is the point, but restrained — a small glowing dot on genuinely live elements (an in-progress vote, a just-updated chart point), not ambient glow on every surface.
- **Reduced motion:** every glow/pulse animation must have a `prefers-reduced-motion: reduce` fallback (static dot, no animation) — not addressed in the static mockups, required before implementation.

| Event | Duration | Notes |
|---|---|---|
| Live-dot pulse | 1.6s ease-in-out, infinite | Only on data confirmed live via Realtime, never decorative |
| Card hover | 150ms ease-out | Subtle border/shadow lift |
| Vote bar update | 400ms ease-out | Width transition when a new vote lands |
| Page/route transition | none specified yet | Next.js App Router default; revisit if it reads as jarring |

---

## Iconography

Keep `lucide-react` (already a dependency in console/admin) — the issue was never the icon set, it was everything else being default. No new icon library needed.

---

## Information architecture

No changes to existing nav structure (23 console pages, 9 admin pages, 11 portal pages) — this design pass is visual system, not IA. Session 3 confirms whether any single page's structure needs to change to fit new patterns (unlikely) but the default is: same pages, same nav, new skin.

---

## Relationship to mobile (`DESIGN.mobile.md`)

Deliberate partial divergence, decided explicitly rather than by accident:
- **Same:** tier colour values, JetBrains Mono for data, Geist for body, dark-first
- **Different:** mobile made Diamond blue its universal brand/interactive colour ("every CTA carries tier aspiration"); web instead introduces a separate gradient so tier colour stays 100% reserved for status, with zero brand overlap. Mobile has no glass/blur material; web's glass-card language is new to the platform. Mobile's motion is "ceremonial" (rare, meaningful); web's is "live" (frequent, small, functional).
- **Why the divergence is fine:** mobile's chat-first, single-screen product needed one unifying accent. Web's dashboard-first, multi-surface product (dense console + marketing portal + ops admin) needs an accent that isn't itself a status signal, so tier colour can stay unambiguous everywhere it appears.

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-09 | Signal Pulse over Civic Mint | User's explicit call after seeing both against the real badge — not a taste default, a considered choice with the tension visible |
| 2026-08-09 | Tier colour and brand gradient are separate, non-substituting signals | Resolves the shotgun round's flagged open item; matches the real badge's existing tier-only colour logic without touching the badge |
| 2026-08-09 | Background tuned to `#0a0a0a` (near-identical to badge's `#090909`) | Continuity with the one asset that's already shipped and staying untouched |
| 2026-08-09 | General Sans (display) + Geist (body, reused) + JetBrains Mono (data, reused from mobile) | Avoids new font-loading infra for body text; kills the "zero customisation" complaint without abandoning what's already wired |
| 2026-08-09 | No second saturated data-viz hue | Civic Mint's critique holds regardless of which direction won — a second bright colour competes with tier colour for attention |
| 2026-08-09 | Badge/power-tree component structurally untouched | Explicit instruction — highly detailed, already invested, colours already fit, no redesign |
| 2026-08-10 | Display weight corrected 800 → 700 | General Sans's actual released family tops out at Bold (700) — verified against the downloaded variable font's `fvar` axis (`wght` 200–700, no 800 instance). Requesting 800 would make browsers synthetically embolden inconsistently. Session `web-06-brand.md`, see `sessions/web-brand-output.md` §3-4 |
