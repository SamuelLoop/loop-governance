# Web design shotgun — output — 2026-08-09

Session: `sessions/web-01-design-shotgun.md`. Run manually (coded HTML/CSS mockups,
not the gstack `design` binary — see "Process note" below) rather than through
`/design-shotgun`'s automated flow, but the same decision-capture applies.

## Winning direction: "Signal Pulse"

A synthesis of two of five initial directions, arrived at after round 1 (five
distinct directions: Terminal Noir, Signal Bright, Orbital Grid, Vault Gold,
Live Pulse) got the verdict "none are jumping out at me as very good" — with
Signal Bright and Live Pulse flagged as having something worth keeping.

**What it is:** dark base (console, admin) with one signature accent — a
blue-violet gradient (`#4f6bff` → `#8b5cf6`) — carried through nav, CTAs,
tier pills, chart lines, and vote bars. Cards are dark frosted glass
(translucent, blurred, hairline border) rather than flat panels. Anything
live-updating (an in-progress vote, a chart's newest data point) gets a soft
glow/pulse to signal "this is happening now." Typography is a confident
geometric sans, bold weight on numbers, tight tracking on headings.

**Why dark for console, not light:** existing precedent (current console
theme, mobile's shipped Dark Civic system, the original brief's
"command-center" framing) all point dark for the daily-use dashboard. The
light-mode need identified in session 1's brief was specifically about
portal's marketing/conversion job, not console's.

**Resolves the light-mode-for-portal question:** yes, but not as a second
design system — portal gets the *same* gradient + glass-card language,
inverted onto a light near-white ground. Verified in the final round by
mocking portal's actual home page (nav, hero, badge card, 3-step "how it
works") in this light variant. It reads as the same product, not two.

**What was explicitly dropped from the Live Pulse parent:** the three-colour
category system on stat cards (cyan/magenta/lime per-card top border) read as
busy without adding real meaning. Replaced with one coherent gradient family
used consistently.

## Verified across five real screens (not just a hero shot)

1. Console dashboard — daily-use home screen
2. Console treasury — data-dense: 90-day area chart + transaction ledger
   (proves the language holds up under real numbers, not just marketing copy)
3. Console map — H3 hex grid as a genuine hero surface with a density legend
   and top-communities rail, not a teaser card
4. Console proposal detail / live vote — the core governance action
5. Portal home, light mode — same accent system inverted

User verdict: **approved as a baseline** — "a FAR better baseline to improve
from at the very least." This is explicitly not a finished, polished design
system. It's the direction session 2 (`/design-consultation`) formalises.

## Open items for session 2 to resolve (not decided in this round)

1. **Tier colours were not reconciled.** The mockups show a "Gold" tier pill
   styled in the blue-violet gradient, not in the tier's actual gold
   (`#f59e0b`). Session 1's brief was explicit that tier colours
   (Diamond/Platinum/Gold/Silver/Bronze) are functionally load-bearing across
   the platform, not decorative — session 2 must decide how the tier palette
   and the new blue-violet accent coexist (tier colour as a secondary badge
   system alongside the gradient accent? Tier colour only on tier-specific
   UI, gradient everywhere else?). This was glossed over in the shotgun round
   and needs a real answer before implementation.
2. Exact typeface (the mockups use system-ui/sans-serif fallback stacks, not
   a chosen, licensed typeface — session 2 must pick and verify licensing)
3. Full colour token scale beyond the one gradient (semantic states,
   data-viz ramp beyond the single gradient, admin-specific needs)
4. Spacing scale, motion timing values, radius scale — none formalised yet,
   the mockups used ad hoc values
5. Admin app wasn't mocked at all in this round — session 2/3 need to design
   its variant of Signal Pulse (utilitarian, not marketing, not the primary
   daily dashboard)
6. Glow/pulse effects need a `prefers-reduced-motion` fallback plan — not
   addressed in static mockups

## Process note (why this ran manually, not via `/design-shotgun`'s automated path)

The gstack `design` binary (`~/.claude/skills/gstack/design/dist/design`)
generates AI-rendered mockups via OpenAI's image API only — confirmed by
inspecting the binary directly (`api.openai.com`, `gpt-image-2`, no
alternate provider path). No OpenAI key is configured on this machine, and
the user preferred not to pay for one. Coded HTML/CSS mockups were built by
hand instead, iterated through three rounds based on live feedback. This
worked better for this decision than static AI images would have: real CSS
gradients/blur/glow that map directly onto session 2's token work, not
photos to reverse-engineer.

Mockups live in this conversation's Artifact (not committed to the repo —
they're throwaway comparison boards, not production code). If needed again,
rebuild from this doc's description rather than hunting for the file.
