# Web brand — output — 2026-08-10

Session: `sessions/web-06-brand.md`. Deliverables: `packages/ui/theme.css`,
`packages/ui/assets/brand/` (+ `packages/ui/fonts/`), this doc. Read
`DESIGN.web.md` alongside this — that file remains the full spec; this doc
records the decisions this session made explicit, the assets it produced,
and what it corrected in prior sessions' output.

---

## 1. Mobile/web relationship — the explicit decision

**Web deliberately diverges from mobile's Dark Civic system in aesthetic
treatment, while sharing tier colour, data typography, and dark-first
identity exactly.** This was actually decided back in session 2
(`DESIGN.web.md` §"Relationship to mobile") — this session's job per the
brief was to make sure that decision doesn't just sit in a design doc by
accident but gets carried forward on purpose into the assets everyone
actually ships. Restated here as the formal record, plus one piece of new
supporting evidence found this session:

| | Mobile (Dark Civic) | Web (Signal Pulse) |
|---|---|---|
| Brand/interactive colour | Diamond tier blue doubles as the universal accent — every CTA carries tier aspiration | A separate blue-violet gradient (`#4f6bff → #8b5cf6`) — tier colour stays 100% reserved for status, zero brand overlap |
| Surface material | Flat, no blur/glass | Frosted glass (`backdrop-filter: blur`) — new to the platform |
| Motion | Ceremonial (rare, meaningful — tier promotion pulse, Diamond shimmer) | Live (frequent, small, functional — a glowing dot on genuinely live data) |
| **Same on both** | Tier hex values (identical, five colours), JetBrains Mono for data, Geist for body, dark-as-default |

**Reasoning (from session 2, holds up):** mobile is a single-screen,
chat-first product — one unifying accent colour makes sense there. Web is
three surfaces at once (dense console, marketing portal, ops admin); an
accent that is itself a status signal (Diamond blue) would make tier
colour ambiguous the moment it showed up on a button. Keeping them
separate is what lets tier colour mean exactly one thing everywhere it
appears, on every platform.

**New evidence found this session, worth recording:** the existing Loop
Cmbntr icon glyph (`apps/portal/public/logo-full.png`, already shipped,
already used across all three apps' chrome) renders as a blue-to-violet
gradient infinity loop — visually almost identical to Signal Pulse's
`#4f6bff → #8b5cf6` accent, chosen independently in session 2 with no
reference to that glyph's colouring. This isn't causal (the shotgun
process that produced Signal Pulse didn't reference the glyph), but it's a
real point of continuity: the new web accent doesn't clash with the one
icon asset that's shared with the parent brand and already in front of
users today. See `packages/ui/assets/brand/README.md` for how this shaped
the icon asset (reused directly, not redrawn).

### A second, related decision this session had to make explicitly

The brief said to invoke `/brand-loop` for this session. That skill loads
**Loop Cmbntr's marketing-site brand** (loopcmbntr.live): crimson red
`#E8173A` accent, Roboto typography, dark slate backgrounds. That is a
different, already-locked colour system from Signal Pulse (blue-violet
gradient, General Sans/Geist/JetBrains Mono) — approved twice over
(session 2, then re-confirmed session 3) specifically for this product.
**Decision: adopt brand-loop's identity conventions (the "Loop_" wordmark
with its underscore, dark-mode-first rule, "Loop_" naming for sub-brands)
but not its colour system or typeface** — Signal Pulse is the locked
system for this product and this session is not the place to relitigate
it. This is exactly the kind of relationship that needs deciding on
purpose rather than by accident, same as item 1 above: the governance
product's brand is a child of Loop's identity, not a copy of Loop
Cmbntr's marketing skin. `packages/ui/theme.css` and every asset this
session produced reflect Signal Pulse, not brand-loop's red/Roboto.

---

## 2. Brand assets

Full inventory and reasoning: `packages/ui/assets/brand/README.md`. Summary:

- **Icon glyph** — cropped from the existing Loop Cmbntr infinity mark
  (already blue-violet, see §1), not redrawn. Exported as
  favicon-16/32, apple-touch-icon (180px), and 256/512px masters, plus a
  thin SVG wrapper for inline use.
- **Wordmark lockups** — `wordmark-console.svg`, `wordmark-portal.svg`,
  `wordmark-admin.svg`: icon + "Loop_" (underscore rendered in the accent
  gradient) + app label ("Console" / "Governance" / "Admin"). **Decision:**
  dropped the "cmbntr" suffix that the current sidebar/nav code renders
  next to the icon (`Loop_cmbntr`) inside the governance product's own
  chrome — "cmbntr" is the parent marketing entity's name, which reads
  oddly inside a daily-use civic tool; "Loop_" (the identity marker brand-
  loop explicitly says never to drop) plus the actual app name is clearer
  for a user who already knows which product they're in.
- **Favicon strategy across the three apps:** kept the icon **identical**
  across console/portal/admin rather than inventing a per-app colour
  variant. Favicons render at 16–32px — a tint or ring meant to
  differentiate them would be invisible at that size, so the actual
  differentiator between three browser tabs is the tab title text (already
  distinct: "Loop_cmbntr Console" / "Governance" / "Admin"), not the icon.
  Considered and rejected a per-app accent-ring favicon variant for this
  reason — stating it so it reads as a decision, not an oversight.
- **OG images** — real per-app static 1200×630 images
  (`og-portal.png`, `og-console.png`, `og-admin.png`), generated from
  `scripts/generate-brand-assets.py` (kept in the repo, not scratchpad, so
  it can be re-run if copy or tokens change).
  - **Correction to the brief's assumption:** "portal's badge pages are
    shared externally today with no custom OG image" — checked
    `apps/portal/src/app/badge/[userId]/[subject]/og/route.tsx` directly;
    badge pages already have a real, working, per-user dynamic OG image
    (Satori + `ImageResponse`, embeds the actual power-tree SVG and stats).
    Nothing to fix there. What genuinely had no image: the portal root
    page and other non-badge portal pages — `apps/portal/src/app/
    layout.tsx` sets `openGraph.title`/`description` but no `images`
    array, and console/admin have no `openGraph` block at all. That's
    what `og-portal.png`/`og-console.png`/`og-admin.png` are for.
- **What this session did NOT touch:** any file under `apps/*/public/` or
  any app component. All new assets live in `packages/ui/assets/brand/`.
  The exact list of existing call sites that need to be repointed at the
  new assets is in `packages/ui/assets/brand/README.md`'s wiring
  checklist — ready for session 7, not executed here (session 6 authors,
  session 7 wires in, per `NEXT.md`'s own stated sequencing).

---

## 3. Token file — `packages/ui/theme.css`

Structural decisions worth flagging (values themselves are in the file,
commented against `DESIGN.web.md` line-by-line):

- **Three-way theming via a single attribute contract**, not `next-themes`'
  default `.dark` class: `data-app="console|portal|admin"` (required on
  every app's `<html>`) plus `data-theme="dark|light"` (console/admin
  only; portal ignores it, always fixed-light). This is what lets one file
  serve three apps where two of them share a light/dark toggle and the
  third doesn't, and where "light" means two genuinely different token
  sets (console/admin light ≠ portal light, per `DESIGN.web.md`'s explicit
  "own token set, not portal's" call). Documented in the file's header
  comment so session 7 knows exactly what each app's root layout must set.
- **Spacing: no new scale needed.** Tailwind v4's default numeric spacing
  (4px steps) already lands exactly on `DESIGN.web.md`'s spacing tokens
  (8/16/24/32/48px = `space-2/4/6/8/12`). `theme.css` aliases the named
  tokens (`--spacing-md` etc.) to Tailwind's existing scale rather than
  hand-maintaining a second set of pixel values that could drift from it.
- **Fonts are a contract, not `@font-face` rules.** `next/font/local`
  generates its own `@font-face` at build time; `theme.css` only declares
  the CSS variable *names* (`--font-general-sans` etc.) each app's
  `layout.tsx` must produce via the loader's `variable` option. Spelled
  out with a real code example in the file so session 7 isn't guessing at
  the contract.
- **Display weight corrected 800 → 700.** See §4 — General Sans doesn't
  ship an 800 weight. `DESIGN.web.md`'s type table still says 800 and
  should be corrected there too on next edit; `theme.css` already reflects
  the real value with a comment explaining why.

---

## 4. Typography licensing — confirmed, and one correction

All three faces are free for commercial self-hosted use. Full terms,
sources, and the actual bundled license text: `packages/ui/fonts/
README.md`.

| Family | License | Self-hosting |
|---|---|---|
| General Sans | ITF Free Font License (Fontshare) | Yes |
| Geist | SIL OFL 1.1 | Yes |
| JetBrains Mono | SIL OFL 1.1 | Yes |

**Correction to `sessions/web-eng-plan-output.md` decision 11:** that
session recorded real `.woff2` files for all three faces as "already
sourced during session 3's review-artifact build and are reusable." This
session checked before reusing them (per this repo's established pattern
of verifying prior sessions' claims rather than rubber-stamping them) and
found no such files anywhere reachable — not in the repo, not in git
history, not in any local scratchpad this session could access. Most
likely explanation: session 3's interactive review was published as an
external Claude Artifact with fonts embedded as base64 inside that HTML,
which doesn't leave a file on disk. Not a real problem — re-sourced all
three faces fresh this session, license-verified each one against its
actual bundled license text (not a third-party summary), and vendored
them at `packages/ui/fonts/`. Flagging the correction so nobody spends
time later looking for files that were never durably reachable.

Also found in the process, unrelated but worth recording: General Sans's
real weight ceiling is 700, not the 800 `DESIGN.web.md` specs for Display
— see §3.

---

## 5. Component-level brand specs

Precise values for the highest-visibility surfaces, per the brief's ask
for exact numbers rather than "use the primary colour." All values below
are aliases already defined in `theme.css` — reference the token name,
not a raw hex, in component code.

### Dashboard stat tiles (`StatTile`)

- Container: `bg-card` (`--surface`, glass) · `border border-border`
  (`--surface-border`) · `rounded-[var(--radius-card)]` (10px) ·
  `backdrop-blur-[var(--blur-glass)]` (14px)
- Label: Caption scale, `text-muted-foreground`
- Value: Data-lg scale (JetBrains Mono 700, 22px), `text-foreground`,
  tabular figures
- Trend delta (if present): Data-sm scale, `--color-success` or
  `--color-error` — never the accent gradient (gradient means action, not
  a data value)
- Hover: `--duration-hover` (150ms) `ease-out`, border brightens to
  `rgba(255,255,255,.14)` (dark) / `rgba(20,20,40,.16)` (light) — no
  translateY, matches brand-loop's own "no translateY on dark backgrounds"
  rule, extended to light mode for consistency
- Live variant (Realtime-backed tile only): `LiveDot` in the corner using
  `--accent-gradient`-filled dot, `--duration-live-dot` pulse, wrapped in
  `@media (prefers-reduced-motion: reduce) { animation: none }`

### Chart colour application

Per `DESIGN.web.md`'s existing rule (no second saturated hue) — this
session's contribution is making it a literal per-series recipe:

- Single-series (balance over time, token price): stroke =
  `--accent-gradient` applied along the line direction; fill = same
  gradient at `12%` opacity, falling off to `0%` at the bottom of the
  chart area (`linearGradient` with 2 stops: `--accent-start` at 12% →
  transparent)
- Two-series comparison (inflow vs outflow, votes-for vs votes-against):
  primary series = `--accent-start` solid (`#4f6bff`, not the full
  gradient — a moving line reading a gradient along its own length is
  visually noisy); comparison series = `--color-text-secondary`
  (`#9297ad`), same stroke width, no fill
- Tier-composition segments (e.g. a bar showing how many Diamond/Gold/...
  voters backed a proposal): tier fills exactly (`--color-tier-*`), full
  opacity, this is the one chart type allowed to use more than one hue —
  because the hue *is* the data (tier), not decoration
- Axis lines/gridlines: `--surface-border` at existing opacity, never a
  brand or tier colour
- Tooltip: `bg-popover` glass card, value in Data-sm JetBrains Mono

### Map (`community-map.tsx` → `PowerDensityMap`)

Concrete, not hypothetical — the current implementation
(`apps/console/src/app/(dashboard)/map/community-map.tsx`) uses **seven**
unrelated saturated hues keyed by community level (`global`=amber,
`continental`=red, `national`=blue, `state`=violet, `city`=green,
`local`=cyan, `micro`=gray) via a `LEVEL_COLORS` map. This is exactly the
pattern `DESIGN.web.md`'s data-viz rule already forbids ("do not invent a
second saturated hue") — it just predates the rule and was never revisited.
Concrete fix for session 7:

- **Keep `LEVEL_RADIUS` exactly as-is** — encoding hierarchy depth via
  node size already works and isn't a colour decision.
- **Replace `LEVEL_COLORS`'s seven hues with one hue at varying
  intensity**, interpolated by hierarchy depth along the accent gradient:
  `global` → `--accent-end` (`#8b5cf6`) at full opacity, stepping down
  through the gradient toward `--accent-start` (`#4f6bff`) at `micro`,
  with opacity also easing from `100%` (global) to `55%` (micro) so the
  least-significant nodes visually recede rather than compete.
- **Polylines (parent-child edges):** currently coloured per-child-level
  (same 7-hue set) at `opacity: 0.3`. Change to flat
  `--color-text-secondary` (`#9297ad`), `opacity: 0.25`, dashed — edges
  are structure, not data, and should recede under the node colouring.
- **Selected node:** ring using `--accent-glow` (the same live-glow
  token used elsewhere), not a colour change to the fill.
- Base tile layer (CartoDB `dark_all`) needs no change — already reads
  consistently with `--background: #0a0a0a`.

### Badge cards (portal conversion pattern, chrome around the untouched
power-tree component)

- The power-tree SVG itself: **zero changes**, per the standing scope
  boundary (session 2, reconfirmed session 3).
- Card wrapping the badge on portal (share page, conversion cards): `bg-
  card` glass, `border-border`, `rounded-[var(--radius-panel)]` (12px —
  one step up from the 10px card default, badge cards read as a bigger
  "hero" object on the page)
- Tier label pill next to the badge: `--color-tier-{tier}-text` for the
  label text (light mode contrast-safe variant, portal is fixed-light so
  this always applies), pill background = tier fill at `12%` opacity, not
  a solid tier fill (keeps the pill legible against portal's light
  background without needing a second contrast pass per tier)
- CTA below the badge ("Join the Network" / "Give Power"): solid
  `--accent-gradient` fill, white text — standard primary-action treatment,
  never tier-coloured even when the badge above it is, say, Gold (this is
  the exact case `DESIGN.web.md` calls out by name: "A Gold-tier user's
  primary 'Vote for' button is gradient-coloured, not gold-coloured")

### Chat message treatment (carried over from mobile's leadership-message
pattern, adapted to web's glass material)

Mobile's pattern (`DESIGN.mobile.md` "Leadership Message Treatment"): 2px
tier-coloured left border + tier-colour-at-4%-opacity background,
triggered when sender's power score clears the leadership threshold for
the active subject. Web adaptation:

- Community message (below leadership threshold): `bg-card` glass, no
  left border, standard `--surface-border` hairline — identical to any
  other card, no special treatment
- Leadership message: `border-l-2` in the sender's tier fill colour
  (`--color-tier-{tier}`, not the text-safe variant — this is a fill/
  border use, same rule as avatar rings) · background tints toward the
  same tier colour at `4%` opacity, layered *on top of* the existing glass
  surface (i.e. `background: color-mix(in srgb, var(--tier-color) 4%,
  var(--surface))`, not a flat override — keeps the blur/glass material
  consistent instead of leadership messages looking like a different
  component)
- Score pill: Data-sm scale, tier fill colour, positioned as mobile does
  (bottom-right of avatar) — same visual grammar across platforms even
  though the surrounding chrome differs, since this is genuinely shared
  UI (chat is one of the few patterns present on both mobile and web)
- Entrance motion: reuse mobile's timing exactly (community 100ms,
  leadership 200ms, both `ease-out`) rather than inventing new numbers —
  no reason for chat message entrance to feel different across platforms
  when the interaction (a message arriving live) is identical

---

## Next

`sessions/web-07-scaffold.md` — first real code changes. Has everything it
needs now: `packages/ui/theme.css` (source of truth for the T4.5 rebind
spike), `packages/ui/fonts/` (real, licensed, already the right weights),
`packages/ui/assets/brand/` (icon, wordmarks, OG images) plus the wiring
checklist in that directory's `README.md` for repointing the eight+
existing `/logo.png`/favicon call sites, and this doc's component specs
for the five highest-visibility surfaces. Two corrections carried forward
into that session: General Sans Display weight is 700 not 800
(`DESIGN.web.md`'s type table still needs updating to match), and the
map's `LEVEL_COLORS` seven-hue set needs replacing per §5 above.
